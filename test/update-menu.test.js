import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationMenuTemplate, createUpdateMenuTemplate } from '../src/update-menu.js'
import { createTrayMenuTemplate } from '../src/window-lifecycle.js'

function menuOptions(overrides = {}) {
  return {
    state: { busy: false, downloaded: false, autoCheck: true, autoDownload: false, canInstall: true },
    check() {}, setAutoCheck() {}, setAutoDownload() {},
    ...overrides,
  }
}

test('update menu reflects progress, saved preferences and download completion', () => {
  const actions = []
  const menu = createUpdateMenuTemplate(menuOptions({
    locale: 'zh-CN',
    check: () => actions.push('check'),
    setAutoCheck: checked => actions.push(['autoCheck', checked]),
    setAutoDownload: checked => actions.push(['autoDownload', checked]),
  }))
  assert.deepEqual(menu.map(item => item.label), ['检查更新…', '自动检查更新', '自动下载更新'])
  assert.equal(menu[1].checked, true)
  assert.equal(menu[2].checked, false)
  menu[0].click()
  menu[1].click({ checked: false })
  menu[2].click({ checked: true })
  assert.deepEqual(actions, ['check', ['autoCheck', false], ['autoDownload', true]])

  const busy = createUpdateMenuTemplate(menuOptions({ state: { busy: true } }))
  assert.equal(busy[0].enabled, false)
  const downloaded = createUpdateMenuTemplate(menuOptions({ state: { downloaded: true } }))
  assert.equal(downloaded[0].label, 'Restart and Install Update…')
})

test('manual distributions do not offer automatic downloads, and development disables updates', () => {
  const manual = createUpdateMenuTemplate(menuOptions({ state: { canInstall: false } }))
  assert.equal(manual.length, 2)
  const development = createUpdateMenuTemplate(menuOptions({ enabled: false }))
  assert.ok(development.every(item => item.enabled === false))
})

test('updates are reachable in tray and application menus, including when the tray is absent', () => {
  const updates = createUpdateMenuTemplate(menuOptions())
  const tray = createTrayMenuTemplate({ updates })
  assert.ok(tray.includes(updates[0]))
  for (const platform of ['darwin', 'win32', 'linux']) {
    const application = createApplicationMenuTemplate({ platform, updates })
    assert.ok(application.some(item => item.submenu?.includes(updates[0])), platform)
  }
  const windows = createApplicationMenuTemplate({ platform: 'win32', updates })
  assert.equal(windows.length, 1)
  assert.equal(windows[0].label, 'Updates')
})
