import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyWebContentStyle,
  WEB_CONTENT_CSS,
} from '../src/web-content-style.js'

test('settings content reserves space for its scrollbar', () => {
  assert.match(WEB_CONTENT_CSS, /scrollbar-gutter:\s*stable/)
  assert.match(
    WEB_CONTENT_CSS,
    /\[role="dialog"\]\[aria-modal="true"\]\s*>\s*nav\s*\+\s*div/,
  )
})

test('web content styling is inserted into each loaded page', async () => {
  let insertedCSS

  await applyWebContentStyle({
    insertCSS(css) {
      insertedCSS = css
      return Promise.resolve('stylesheet-key')
    },
  })

  assert.equal(insertedCSS, WEB_CONTENT_CSS)
})
