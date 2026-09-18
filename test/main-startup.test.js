import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { registerHooks } from 'node:module'
import test from 'node:test'

const mainUrl = new URL('../src/main.js', import.meta.url).href
let sequence = 0

async function launchFixture(t, options = {}) {
  const id = ++sequence
  const key = `__desktopStartupTest${id}`
  const fixture = { windows: [], trays: [], menus: [], dialogs: [], starts: 0, stops: 0, updateStarts: 0, updateStops: 0, quits: 0 }
  const app = Object.assign(new EventEmitter(), {
    isPackaged: options.packaged ?? true,
    setName() {},
    getPath() {
      if (options.configurationFailure) throw new Error('Injected update configuration failure')
      return '/unused/test-user-data'
    },
    getLocale: () => 'en',
    getVersion: () => '0.3.8',
    requestSingleInstanceLock: () => true,
    whenReady: () => ({ then(callback) { fixture.launch = Promise.resolve().then(callback); return fixture.launch } }),
    quit() { fixture.quits++; app.emit('before-quit') },
  })
  class BrowserWindow extends EventEmitter {
    constructor() {
      super()
      this.webContents = Object.assign(new EventEmitter(), { setWindowOpenHandler() {}, getURL: () => this.url })
      fixture.windows.push(this)
    }
    loadFile() { return Promise.resolve() }
    loadURL(url) { this.url = url; return Promise.resolve() }
    setAutoHideMenuBar(value) { this.autoHide = value }
    setMenuBarVisibility(value) { this.menuVisible = value }
    show() {}
    hide() { this.hidden = true }
    focus() {}
    isMinimized() { return false }
  }
  class Tray extends EventEmitter {
    constructor() { super(); fixture.trays.push(this) }
    setToolTip() { if (options.trayFailure) throw new Error('Injected unavailable tray') }
    setContextMenu(menu) { assert.equal(this.destroyed, undefined); this.menu = menu }
    destroy() { this.destroyed = true }
  }
  fixture.electron = {
    app, BrowserWindow, Tray,
    dialog: { async showMessageBox(value) { fixture.dialogs.push(value); return { response: 0 } } },
    Menu: {
      buildFromTemplate: value => value,
      setApplicationMenu(value) {
        if (options.menuFailure) throw new Error('Injected menu failure')
        fixture.menus.push(value)
      },
    },
    nativeImage: { createFromPath: () => ({ setTemplateImage() {} }) },
    nativeTheme: { shouldUseDarkColors: false },
    shell: { async openExternal() {} },
  }
  fixture.dsh = {
    startDshService() {
      fixture.starts++
      return { ready: Promise.resolve('http://127.0.0.1:54321'), stop() { fixture.stops++ } }
    },
  }
  fixture.updates = {
    createUpdateService() {
      return {
        getState: () => ({ autoCheck: true, autoDownload: false, busy: false, canInstall: false }),
        start() {
          fixture.updateStarts++
          if (options.scheduleFailure) throw new Error('Injected scheduling failure')
        },
        stop() { fixture.updateStops++ },
      }
    },
  }
  fixture.settings = {
    getUpdateMode: () => 'manual',
    readUpdatePreferences: () => ({ autoCheck: true, autoDownload: false }),
    writeUpdatePreferences() {},
  }
  globalThis[key] = fixture
  const modules = new Map([
    ['electron', 'electron'], ['./dsh-service.js', 'dsh'],
    ['./update-service.js', 'updates'], ['./update-settings.js', 'settings'],
  ])
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const name = context.parentURL?.startsWith(mainUrl) && modules.get(specifier)
      return name ? { url: `desktop-test:${id}:${name}`, shortCircuit: true } : nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      if (!url.startsWith(`desktop-test:${id}:`)) return nextLoad(url, context)
      const name = url.split(':')[2]
      return {
        format: 'module', shortCircuit: true,
        source: Object.keys(fixture[name]).map(exportName =>
          `export const ${exportName} = globalThis[${JSON.stringify(key)}][${JSON.stringify(name)}][${JSON.stringify(exportName)}];`,
        ).join('\n'),
      }
    },
  })
  const platform = Object.getOwnPropertyDescriptor(process, 'platform')
  if (options.platform) Object.defineProperty(process, 'platform', { value: options.platform })
  t.mock.method(console, 'warn', () => {})
  t.after(() => { hooks.deregister(); delete globalThis[key]; Object.defineProperty(process, 'platform', platform) })
  await import(`${mainUrl}?startup-test=${id}`)
  await fixture.launch
  assert.equal(fixture.starts, 1)
  assert.equal(fixture.windows[0].url, 'http://127.0.0.1:54321')
  assert.equal(fixture.quits, 0)
  assert.deepEqual(fixture.dialogs, [])
  return fixture
}

test('packaged startup schedules updates and normal quit stops Harness and updates', async t => {
  const fixture = await launchFixture(t)
  assert.equal(fixture.updateStarts, 1)
  fixture.electron.app.emit('before-quit')
  assert.equal(fixture.stops, 1)
  assert.equal(fixture.updateStops, 1)
})

test('development starts Harness without scheduling updates and disables update actions', async t => {
  const fixture = await launchFixture(t, { packaged: false })
  assert.equal(fixture.updateStarts, 0)
  const items = fixture.menus.flatMap(menu => menu.flatMap(item => item.submenu ?? []))
  assert.equal(items.find(item => item.label === 'Check for Updates…').enabled, false)
  assert.equal(items.find(item => item.label === 'Automatically Check for Updates').enabled, false)
})

for (const fault of ['configurationFailure', 'menuFailure', 'scheduleFailure']) {
  test(`update ${fault} does not prevent Harness startup or quit the application`, async t => {
    await launchFixture(t, { [fault]: true })
  })
}

test('failed Windows tray is discarded and updates remain visible in the application menu', async t => {
  const fixture = await launchFixture(t, { trayFailure: true, platform: 'win32' })
  assert.equal(fixture.trays[0].destroyed, true)
  assert.equal(fixture.windows[0].autoHide, false)
  assert.equal(fixture.windows[0].menuVisible, true)
  assert.equal(fixture.menus.at(-1)[0].label, 'Updates')
  let prevented = false
  fixture.windows[0].emit('close', { preventDefault() { prevented = true } })
  assert.equal(prevented, false)
})
