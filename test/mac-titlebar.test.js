import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyMacTitleBarStyle,
  MAC_TITLEBAR_CSS,
  MAC_TITLEBAR_HEIGHT,
} from '../src/mac-titlebar.js'

test('macOS title bar uses the active DSH background token', () => {
  assert.match(MAC_TITLEBAR_CSS, /var\(--dsw-alias-bg-base,\s*Canvas\)/)
  assert.match(MAC_TITLEBAR_CSS, new RegExp(`env\\(titlebar-area-height, ${MAC_TITLEBAR_HEIGHT}px\\)`))
})

test('macOS title bar overlay is an explicit window drag region', () => {
  assert.match(MAC_TITLEBAR_CSS, /html::after/)
  assert.match(MAC_TITLEBAR_CSS, /-webkit-app-region:\s*drag/)
  assert.match(MAC_TITLEBAR_CSS, /env\(titlebar-area-x,\s*0px\)/)
  assert.match(MAC_TITLEBAR_CSS, /env\(titlebar-area-width,\s*100%\)/)
})

test('macOS title bar styling is inserted into each loaded page', async () => {
  let insertedCSS

  await applyMacTitleBarStyle({
    insertCSS(css) {
      insertedCSS = css
      return Promise.resolve('stylesheet-key')
    },
  })

  assert.equal(insertedCSS, MAC_TITLEBAR_CSS)
})
