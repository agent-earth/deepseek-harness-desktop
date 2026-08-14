export const WEB_CONTENT_CSS = `
  /*
   * Keep the settings content width stable when an expanded section starts
   * overflowing. DSH generates its class names, so target the modal's semantic
   * structure instead of coupling the desktop wrapper to a build-time hash.
   */
  [role="dialog"][aria-modal="true"] > nav + div > div:last-child {
    scrollbar-gutter: stable;
  }
`

export async function applyWebContentStyle(webContents) {
  await webContents.insertCSS(WEB_CONTENT_CSS)
}
