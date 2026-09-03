import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyWindowsTitleBarStyle,
  WINDOWS_TITLEBAR_CSS,
  WINDOWS_TITLEBAR_HEIGHT,
} from '../src/windows-titlebar.js'

test('Windows title bar moves the Web UI below native window controls', () => {
  assert.match(
    WINDOWS_TITLEBAR_CSS,
    new RegExp(`padding-top:\\s*${WINDOWS_TITLEBAR_HEIGHT}px\\s*!important`),
  )
  assert.match(WINDOWS_TITLEBAR_CSS, /height:\s*100vh\s*!important/)
})

test('Windows title bar exposes an explicit drag region', () => {
  assert.match(WINDOWS_TITLEBAR_CSS, /html::after/)
  assert.match(WINDOWS_TITLEBAR_CSS, /-webkit-app-region:\s*drag/)
  assert.match(WINDOWS_TITLEBAR_CSS, /env\(titlebar-area-x,\s*0px\)/)
  assert.match(WINDOWS_TITLEBAR_CSS, /env\(titlebar-area-width,\s*100%\)/)
})

test('Windows title bar styling is inserted into each loaded page', async () => {
  let insertedCSS

  await applyWindowsTitleBarStyle({
    insertCSS(css) {
      insertedCSS = css
      return Promise.resolve('stylesheet-key')
    },
  })

  assert.equal(insertedCSS, WINDOWS_TITLEBAR_CSS)
})
