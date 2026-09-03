import { WINDOWS_TITLEBAR_HEIGHT } from './windows-titlebar.js'

export function createWindowOptions(platform = process.platform, useDarkColors = false) {
  const isMac = platform === 'darwin'
  const isWindows = platform === 'win32'

  return {
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'DeepSeek Harness',
    backgroundColor: useDarkColors ? '#151517' : '#ffffff',
    titleBarStyle: isMac ? 'hiddenInset' : isWindows ? 'hidden' : 'default',
    titleBarOverlay: isMac
      ? true
      : isWindows
        ? {
            color: '#00000000',
            symbolColor: useDarkColors ? '#f5f5f5' : '#171513',
            height: WINDOWS_TITLEBAR_HEIGHT,
          }
        : false,
    autoHideMenuBar: isWindows,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  }
}
