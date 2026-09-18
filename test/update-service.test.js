import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { createUpdateService } from '../src/update-service.js'

const releaseRoot = 'https://github.com/agent-earth/deepseek-harness-desktop/releases'
const release = (version = '0.4.0') => ({
  tag_name: `v${version}`,
  html_url: `${releaseRoot}/tag/v${version}`,
  draft: false,
  prerelease: false,
  assets: [{
    name: 'Desktop.dmg',
    browser_download_url: `${releaseRoot}/download/v${version}/Desktop.dmg`,
  }],
})

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const flush = () => new Promise((resolve) => setImmediate(resolve))

function fakeTimers() {
  const timeouts = new Map()
  const intervals = new Map()
  let nextId = 1
  return {
    timeouts,
    intervals,
    setTimeout(callback, delay) { const id = nextId++; timeouts.set(id, { callback, delay }); return id },
    clearTimeout(id) { timeouts.delete(id) },
    setInterval(callback, delay) { const id = nextId++; intervals.set(id, { callback, delay }); return id },
    clearInterval(id) { intervals.delete(id) },
    fireTimeout(delay) {
      const entry = [...timeouts].find(([, task]) => task.delay === delay)
      assert.ok(entry, `Missing ${delay} ms timer`)
      timeouts.delete(entry[0])
      entry[1].callback()
    },
  }
}

function fixture(options = {}) {
  const dialogs = []
  const responses = []
  const saved = []
  const opened = []
  const warnings = []
  const calls = { check: 0, download: 0, install: [], changes: 0 }
  const updater = new EventEmitter()
  updater.checkForUpdates = async () => { calls.check++; return { updateInfo: { version: '0.4.0' } } }
  updater.downloadUpdate = async () => { calls.download++; return ['installer.exe'] }
  updater.quitAndInstall = (...args) => { calls.install.push(args) }
  const timers = fakeTimers()
  const service = createUpdateService({
    currentVersion: '0.3.8',
    harnessVersion: '0.1.1-rc.2',
    nativeUpdater: updater,
    timers,
    savePreferences: (value) => saved.push(value),
    showMessageBox: async (dialog) => { dialogs.push(dialog); return { response: responses.shift() ?? 1 } },
    openExternal: async (url) => opened.push(url),
    fetchRelease: async () => release(),
    onChange: () => { calls.changes++ },
    logger: { warn: (message) => warnings.push(message) },
    ...options,
  })
  return { service, updater, calls, dialogs, responses, saved, opened, timers, warnings }
}

test('native updater cannot download, install on quit, or select prereleases without controller approval', () => {
  const { service, updater } = fixture()
  assert.equal(updater.autoDownload, false)
  assert.equal(updater.autoInstallOnAppQuit, false)
  assert.equal(updater.allowPrerelease, false)
  assert.equal(updater.allowDowngrade, false)
  assert.deepEqual(service.getState(), { busy: false, downloaded: false, autoCheck: true, autoDownload: false, canInstall: true })
})

test('manual update downloads the whole release and installs only after explicit confirmation', async () => {
  const { service, calls, dialogs, responses } = fixture()
  responses.push(0, 0)
  await service.check()
  assert.equal(calls.check, 1)
  assert.equal(calls.download, 1)
  assert.deepEqual(calls.install, [[false, true]])
  assert.equal(service.getState().downloaded, true)
  for (const dialog of dialogs) {
    assert.match(dialog.detail, /Desktop: 0\.3\.8/)
    assert.match(dialog.detail, /Bundled Harness: 0\.1\.1-rc\.2/)
    assert.match(dialog.detail, /together with the desktop release/)
  }
  assert.match(dialogs[1].detail, /Running tasks will stop/)
  assert.equal(dialogs[1].cancelId, 1)
})

test('deferring installation retains the downloaded version and reuses it on manual check', async () => {
  const { service, calls, responses, dialogs } = fixture()
  responses.push(0, 1)
  await service.check()
  assert.equal(calls.install.length, 0)
  assert.equal(service.getState().downloaded, true)
  await service.check({ manual: false })
  assert.equal(dialogs.length, 2)
  responses.push(0)
  await service.check()
  assert.equal(calls.check, 1)
  assert.equal(calls.download, 1)
  assert.deepEqual(calls.install, [[false, true]])
})

test('synchronous native installation error events show once and retain the download for retry', async () => {
  const { service, updater, dialogs, responses } = fixture({ preferences: { autoDownload: true } })
  updater.quitAndInstall = () => {
    updater.emit('error', new Error('installer could not start'))
    updater.emit('error', new Error('duplicate installer error'))
  }
  responses.push(0)
  await service.check()
  assert.equal(dialogs.length, 2)
  assert.equal(dialogs[1].type, 'error')
  assert.match(dialogs[1].detail, /installer could not start/)
  assert.equal(service.getState().downloaded, true)
})

test('asynchronous native installation errors are visible even after an automatic check completes', async () => {
  const { service, updater, dialogs, responses } = fixture({ preferences: { autoDownload: true } })
  responses.push(0)
  await service.check({ manual: false })
  updater.emit('error', new Error('installation failed asynchronously'))
  await flush()
  assert.equal(dialogs.length, 2)
  assert.equal(dialogs[1].type, 'error')
  service.stop()
  updater.emit('error', new Error('late error after shutdown'))
  assert.equal(dialogs.length, 2)
})

test('thrown installation errors are visible after background automatic downloads without duplicate event dialogs', async () => {
  for (const emitFirst of [false, true]) {
    const { service, updater, dialogs, responses } = fixture({ preferences: { autoDownload: true } })
    updater.quitAndInstall = () => {
      const error = new Error('installation failed')
      if (emitFirst) updater.emit('error', error)
      throw error
    }
    responses.push(0)
    await service.check({ manual: false })
    assert.equal(dialogs.length, 2)
    assert.equal(dialogs[1].type, 'error')
  }
})

test('Later never downloads and background checks do not repeat the same version prompt', async () => {
  const { service, calls, dialogs } = fixture()
  await service.check({ manual: false })
  await service.check({ manual: false })
  assert.equal(calls.check, 2)
  assert.equal(calls.download, 0)
  assert.equal(dialogs.length, 1)
  await service.check()
  assert.equal(dialogs.length, 2)
})

test('automatic download still asks before restarting and can be enabled after deferring', async () => {
  const { service, calls, dialogs, saved } = fixture()
  await service.check({ manual: false })
  assert.equal(service.setAutoDownload(true), true)
  await service.check({ manual: false })
  assert.equal(calls.download, 1)
  assert.equal(calls.install.length, 0)
  assert.equal(dialogs.length, 2)
  assert.match(dialogs[1].message, /ready to install/)
  assert.deepEqual(saved, [{ autoCheck: true, autoDownload: true }])
})

test('manual current or older releases show no update and background checks stay quiet', async () => {
  for (const version of ['0.3.8', '0.3.7']) {
    const { service, updater, dialogs, calls } = fixture()
    updater.checkForUpdates = async () => ({ updateInfo: { version } })
    await service.check({ manual: false })
    assert.equal(dialogs.length, 0)
    await service.check()
    assert.match(dialogs[0].message, /latest desktop release/)
    assert.equal(calls.download, 0)
  }
})

test('native staged rollout exclusions and inactive updater results never trigger a download', async () => {
  for (const result of [null, { isUpdateAvailable: false, updateInfo: { version: '0.4.0' } }]) {
    const { service, updater, dialogs, calls } = fixture({ preferences: { autoDownload: true } })
    updater.checkForUpdates = async () => result
    await service.check({ manual: false })
    assert.equal(dialogs.length, 0)
    await service.check()
    assert.match(dialogs[0].message, /No desktop update is available/)
    assert.equal(calls.download, 0)
  }
})

test('version comparison uses semver and rejects prerelease or malformed native metadata', async () => {
  for (const version of ['0.4.0-rc.1', 'not-a-version']) {
    const { service, updater, dialogs, calls } = fixture()
    updater.checkForUpdates = async () => ({ updateInfo: { version } })
    await service.check()
    assert.equal(dialogs[0].type, 'error')
    assert.equal(calls.download, 0)
  }
  const { service, updater, dialogs } = fixture({ currentVersion: '0.9.0' })
  updater.checkForUpdates = async () => ({ updateInfo: { version: '0.10.0' } })
  await service.check()
  assert.match(dialogs[0].message, /0\.10\.0 is available/)
})

test('manual network errors show once even when updater also emits error; background errors stay quiet', async () => {
  const { service, updater, dialogs, warnings } = fixture()
  updater.checkForUpdates = async () => {
    const error = new Error('offline')
    updater.emit('error', error)
    throw error
  }
  await service.check({ manual: false })
  assert.equal(dialogs.length, 0)
  await service.check()
  assert.equal(dialogs.length, 1)
  assert.equal(dialogs[0].type, 'error')
  assert.match(dialogs[0].detail, /offline/)
  assert.ok(warnings.length >= 2)
  assert.equal(service.getState().busy, false)
})

test('download failure is shown after a user download request and does not mark the update downloaded', async () => {
  const { service, updater, dialogs, responses, calls } = fixture()
  responses.push(0)
  updater.downloadUpdate = async () => { throw new Error('disk full') }
  await service.check({ manual: false })
  assert.equal(dialogs[1].type, 'error')
  assert.match(dialogs[1].detail, /disk full/)
  assert.equal(service.getState().downloaded, false)
  assert.equal(calls.install.length, 0)
})

test('overlapping checks share one active operation and do not duplicate dialogs', async () => {
  const { service, updater, dialogs } = fixture()
  const pending = deferred()
  let checks = 0
  updater.checkForUpdates = () => { checks++; return pending.promise }
  const first = service.check()
  assert.equal(service.getState().busy, true)
  await service.check()
  await service.check({ manual: false })
  assert.equal(checks, 1)
  pending.resolve({ updateInfo: { version: '0.4.0' } })
  await first
  assert.equal(dialogs.length, 1)
  assert.equal(service.getState().busy, false)
})

test('stop cancels a pending check token and prevents dialogs or future checks', async () => {
  const { service, updater, calls, dialogs } = fixture()
  const pending = deferred()
  let cancelled = 0
  updater.checkForUpdates = () => pending.promise
  const operation = service.check()
  service.stop()
  pending.resolve({ updateInfo: { version: '0.4.0' }, cancellationToken: { cancel: () => { cancelled++ } } })
  await operation
  await service.check()
  assert.equal(cancelled, 1)
  assert.equal(dialogs.length, 0)
  assert.equal(calls.download, 0)
  assert.doesNotThrow(() => updater.emit('error', new Error('late error')))
})

test('stop cancels a pending native download and prevents installation afterward', async () => {
  const { service, updater, calls, dialogs } = fixture({ preferences: { autoDownload: true } })
  const pending = deferred()
  let cancelled = 0
  const token = { cancel: () => { cancelled++ } }
  updater.checkForUpdates = async () => ({ updateInfo: { version: '0.4.0' }, cancellationToken: token })
  updater.downloadUpdate = (received) => { assert.equal(received, token); return pending.promise }
  const operation = service.check()
  await flush()
  service.stop()
  assert.equal(cancelled, 1)
  pending.resolve(['installer.exe'])
  await operation
  assert.equal(dialogs.length, 0)
  assert.equal(calls.install.length, 0)
})

test('stop while the restart dialog is open ignores its eventual confirmation', async () => {
  const pending = deferred()
  const { service, calls } = fixture({ preferences: { autoDownload: true }, showMessageBox: () => pending.promise })
  const operation = service.check()
  await flush()
  assert.equal(service.getState().downloaded, true)
  service.stop()
  pending.resolve({ response: 0 })
  await operation
  assert.equal(calls.install.length, 0)
})

test('automatic checks start after 30 seconds, repeat every six hours, and cancel when disabled', async () => {
  const { service, timers, calls, saved } = fixture()
  service.start()
  service.start()
  assert.equal(timers.timeouts.size, 1)
  assert.equal(timers.intervals.size, 1)
  assert.equal([...timers.intervals.values()][0].delay, 6 * 60 * 60 * 1000)
  timers.fireTimeout(30_000)
  await flush()
  assert.equal(calls.check, 1)
  service.setAutoCheck(false)
  assert.equal(timers.timeouts.size, 0)
  assert.equal(timers.intervals.size, 0)
  await service.check({ manual: false })
  assert.equal(calls.check, 1)
  await service.check()
  assert.equal(calls.check, 2)
  service.setAutoCheck(true)
  assert.equal(timers.timeouts.size, 1)
  assert.equal(timers.intervals.size, 1)
  service.stop()
  assert.equal(timers.timeouts.size, 0)
  assert.equal(timers.intervals.size, 0)
  assert.deepEqual(saved, [{ autoCheck: false, autoDownload: false }, { autoCheck: true, autoDownload: false }])
})

test('disabled startup checks do not schedule; enabling before start waits for start', () => {
  const { service, timers } = fixture({ preferences: { autoCheck: false } })
  assert.equal(timers.timeouts.size, 0)
  service.setAutoCheck(true)
  assert.equal(timers.timeouts.size, 0)
  service.start()
  assert.equal(timers.timeouts.size, 1)
})

test('disabling background checks during a request suppresses its eventual prompt', async () => {
  const { service, updater, dialogs } = fixture()
  const pending = deferred()
  updater.checkForUpdates = () => pending.promise
  const operation = service.check({ manual: false })
  service.setAutoCheck(false)
  pending.resolve({ updateInfo: { version: '0.4.0' } })
  await operation
  assert.equal(dialogs.length, 0)
})

test('failed preference persistence retains state and timers, refreshes menus, and reports the error', async () => {
  const { service, timers, dialogs, calls } = fixture({ savePreferences: () => { throw new Error('read-only settings') } })
  service.start()
  assert.equal(service.setAutoCheck(false), false)
  assert.equal(service.setAutoDownload(true), false)
  await flush()
  assert.equal(service.getState().autoCheck, true)
  assert.equal(service.getState().autoDownload, false)
  assert.equal(timers.timeouts.size, 1)
  assert.equal(timers.intervals.size, 1)
  assert.equal(calls.changes, 2)
  assert.equal(dialogs.length, 2)
  assert.match(dialogs[0].message, /save update settings/)
})

test('Chinese dialogs include both versions and the whole-release update explanation', async () => {
  const { service, dialogs } = fixture({ locale: 'zh-CN' })
  await service.check()
  assert.match(dialogs[0].message, /已发布/)
  assert.match(dialogs[0].detail, /Desktop：0\.3\.8/)
  assert.match(dialogs[0].detail, /内置 Harness：0\.1\.1-rc\.2/)
  assert.match(dialogs[0].detail, /随桌面发行包一起更新/)
})

test('manual fallback opens only the validated release page and explains manual package installation', async () => {
  const { service, dialogs, responses, opened } = fixture({ nativeUpdater: null, preferences: { autoDownload: true } })
  responses.push(0)
  await service.check()
  assert.deepEqual(opened, [`${releaseRoot}/tag/v0.4.0`])
  assert.equal(service.getState().canInstall, false)
  assert.equal(service.getState().downloaded, false)
  assert.match(dialogs[0].detail, /macOS, ZIP, and deb/)
  assert.match(dialogs[0].detail, /finish the update yourself/)
})

test('fallback suppresses repeated background prompts and handles current release quietly', async () => {
  const { service, dialogs, opened } = fixture({ nativeUpdater: null })
  await service.check({ manual: false })
  await service.check({ manual: false })
  assert.equal(dialogs.length, 1)
  assert.equal(opened.length, 0)
  const current = fixture({ nativeUpdater: null, fetchRelease: async () => release('0.3.8') })
  await current.service.check({ manual: false })
  assert.equal(current.dialogs.length, 0)
  await current.service.check()
  assert.match(current.dialogs[0].message, /latest desktop release/)
})

test('fallback rejects prerelease, draft, malformed, source-only, or untrusted releases', async () => {
  const invalid = [
    { ...release(), prerelease: true },
    { ...release(), draft: true },
    release('0.4.0-rc.1'),
    { ...release(), tag_name: 'latest' },
    { ...release(), assets: [] },
    { ...release(), assets: [{ name: 'source.tar.gz', browser_download_url: `${releaseRoot}/download/v0.4.0/source.tar.gz` }] },
    { ...release(), html_url: 'https://evil.example/install' },
    { ...release(), html_url: `${releaseRoot}/tag/v0.4.0?redirect=evil` },
    { ...release(), assets: [{ name: 'Desktop.exe', browser_download_url: 'https://evil.example/Desktop.exe' }] },
  ]
  for (const candidate of invalid) {
    const { service, dialogs, opened } = fixture({ nativeUpdater: null, fetchRelease: async () => candidate })
    await service.check()
    assert.equal(dialogs[0].type, 'error')
    assert.equal(opened.length, 0)
  }
})

test('default GitHub fetch uses the fixed API and validates downloaded metadata', async (t) => {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (...args) => {
    requests.push(args)
    return { ok: true, json: async () => release() }
  })
  const { service, timers, dialogs } = fixture({ nativeUpdater: null, fetchRelease: undefined })
  await service.check()
  assert.equal(requests[0][0], 'https://api.github.com/repos/agent-earth/deepseek-harness-desktop/releases/latest')
  assert.equal(requests[0][1].redirect, 'error')
  assert.ok(requests[0][1].signal instanceof AbortSignal)
  assert.equal(timers.timeouts.size, 0)
  assert.match(dialogs[0].message, /0\.4\.0 is available/)
})

test('default fetch timeout aborts after 15 seconds and reports manual failure', async (t) => {
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('request aborted')), { once: true })
  }))
  const { service, timers, dialogs } = fixture({ nativeUpdater: null, fetchRelease: undefined })
  const operation = service.check()
  timers.fireTimeout(15_000)
  await operation
  assert.equal(dialogs[0].type, 'error')
  assert.equal(service.getState().busy, false)
})

test('stop aborts fallback requests without a late failure dialog', async () => {
  let signal
  const { service, dialogs, timers } = fixture({ nativeUpdater: null, fetchRelease: (options) => {
    signal = options.signal
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
  } })
  const operation = service.check()
  service.stop()
  await operation
  assert.equal(signal.aborted, true)
  assert.equal(dialogs.length, 0)
  assert.equal(timers.timeouts.size, 0)
})

test('dialog and menu errors do not produce unhandled rejected operations', async () => {
  const { service, warnings } = fixture({
    showMessageBox: async () => { throw new Error('window closed') },
    onChange: () => { throw new Error('menu unavailable') },
    savePreferences: () => { throw new Error('disk unavailable') },
  })
  await assert.doesNotReject(service.check())
  assert.equal(service.setAutoDownload(true), false)
  await flush()
  assert.ok(warnings.some((warning) => warning.includes('window closed')))
  assert.equal(service.getState().busy, false)
})
