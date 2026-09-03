import assert from 'node:assert/strict'
import test from 'node:test'
import { createWindowOptions } from '../src/window-options.js'

test('macOS extends themed web content into the native title bar', () => {
  const options = createWindowOptions('darwin')

  assert.equal(options.titleBarStyle, 'hiddenInset')
  assert.equal(options.titleBarOverlay, true)
})

test('Windows reserves a native window-controls title bar above the Web UI', () => {
  const options = createWindowOptions('win32')

  assert.equal(options.autoHideMenuBar, true)
  assert.equal(options.titleBarStyle, 'hidden')
  assert.deepEqual(options.titleBarOverlay, {
    color: '#00000000',
    symbolColor: '#171513',
    height: 40,
  })
})

test('Windows title bar controls follow the system appearance', () => {
  assert.equal(createWindowOptions('win32', false).titleBarOverlay.symbolColor, '#171513')
  assert.equal(createWindowOptions('win32', true).titleBarOverlay.symbolColor, '#f5f5f5')
})

test('window background follows the system appearance before content loads', () => {
  assert.equal(createWindowOptions('darwin', false).backgroundColor, '#ffffff')
  assert.equal(createWindowOptions('darwin', true).backgroundColor, '#151517')
})
