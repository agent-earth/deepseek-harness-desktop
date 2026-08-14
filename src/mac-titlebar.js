export const MAC_TITLEBAR_HEIGHT = 38

// hiddenInset paints page content over the native title bar, so the reserved
// inset needs an explicit CSS drag region or the window cannot be moved.
export const MAC_TITLEBAR_CSS = `
  html {
    background-color: Canvas;
  }

  html::after {
    content: "";
    position: fixed;
    z-index: 2147483647;
    top: 0;
    left: env(titlebar-area-x, 0px);
    width: env(titlebar-area-width, 100%);
    height: env(titlebar-area-height, ${MAC_TITLEBAR_HEIGHT}px);
    -webkit-app-region: drag;
    app-region: drag;
  }

  body {
    box-sizing: border-box !important;
    height: 100vh !important;
    padding-top: env(titlebar-area-height, ${MAC_TITLEBAR_HEIGHT}px) !important;
    background-color: var(--dsw-alias-bg-base, Canvas) !important;
    overflow: hidden !important;
  }
`

export async function applyMacTitleBarStyle(webContents) {
  await webContents.insertCSS(MAC_TITLEBAR_CSS)
}
