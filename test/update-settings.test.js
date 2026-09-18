import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { getUpdateMode, readUpdatePreferences, writeUpdatePreferences } from '../src/update-settings.js'

test('update preferences default safely and persist explicit choices across launches', t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'dsh-updates-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const file = path.join(directory, 'settings', 'updates.json')
  assert.deepEqual(readUpdatePreferences(file), { autoCheck: true, autoDownload: false })
  writeUpdatePreferences(file, { autoCheck: false, autoDownload: true })
  assert.deepEqual(readUpdatePreferences(file), { autoCheck: false, autoDownload: true })
  writeUpdatePreferences(file, { autoCheck: true, autoDownload: false })
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { autoCheck: true, autoDownload: false })
  assert.deepEqual(readdirSync(path.dirname(file)), ['updates.json'])
})

test('invalid preferences cannot turn on automatic downloads or prevent startup', t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'dsh-updates-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const file = path.join(directory, 'updates.json')
  const warnings = []
  for (const content of ['{', 'null', '{"autoCheck": "false", "autoDownload": "true"}']) {
    writeFileSync(file, content)
    assert.deepEqual(readUpdatePreferences(file, { warn: value => warnings.push(value) }), {
      autoCheck: true, autoDownload: false,
    })
  }
  assert.equal(warnings.length, 1)
})

test('native installation is restricted to packaged NSIS and AppImage distributions', () => {
  const packaged = { isPackaged: true, appImage: undefined, exists: () => false }
  assert.equal(getUpdateMode({ ...packaged, platform: 'darwin' }), 'manual')
  assert.equal(getUpdateMode({ ...packaged, platform: 'linux' }), 'manual')
  assert.equal(getUpdateMode({ ...packaged, platform: 'win32' }), 'manual')
  assert.equal(getUpdateMode({ ...packaged, platform: 'linux', appImage: '/tmp/Harness.AppImage' }), 'appimage')
  assert.equal(getUpdateMode({
    ...packaged,
    platform: 'win32',
    executablePath: 'C:\\Apps\\Harness\\DeepSeek Harness.exe',
    exists: file => file === 'C:\\Apps\\Harness\\Uninstall DeepSeek Harness.exe',
  }), 'nsis')
  assert.equal(getUpdateMode({ ...packaged, platform: 'win32', exists: () => true, isPackaged: false }), 'development')
  assert.equal(getUpdateMode({ ...packaged, platform: 'linux', appImage: '/tmp/Harness.AppImage', isPackaged: false }), 'development')
})
