export const WINDOWS_TITLEBAR_HEIGHT = 40

export const WINDOWS_TITLEBAR_CSS = `
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
    height: env(titlebar-area-height, ${WINDOWS_TITLEBAR_HEIGHT}px);
    -webkit-app-region: drag;
    app-region: drag;
  }

  body {
    box-sizing: border-box !important;
    height: 100vh !important;
    padding-top: ${WINDOWS_TITLEBAR_HEIGHT}px !important;
    background-color: var(--dsw-alias-bg-base, Canvas) !important;
    overflow: hidden !important;
  }
`

export async function applyWindowsTitleBarStyle(webContents) {
  await webContents.insertCSS(WINDOWS_TITLEBAR_CSS)
}
