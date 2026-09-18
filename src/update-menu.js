export function createUpdateMenuTemplate({ locale = 'en', state, enabled = true, check, setAutoCheck, setAutoDownload }) {
  const chinese = locale.toLowerCase().startsWith('zh')
  return [
    {
      label: state.busy
        ? (chinese ? '正在检查或下载更新…' : 'Checking or Downloading Update…')
        : state.downloaded
          ? (chinese ? '重启并安装更新…' : 'Restart and Install Update…')
          : (chinese ? '检查更新…' : 'Check for Updates…'),
      accelerator: 'CommandOrControl+Shift+U',
      enabled: enabled && !state.busy,
      click: check,
    },
    {
      label: chinese ? '自动检查更新' : 'Automatically Check for Updates',
      type: 'checkbox',
      checked: state.autoCheck,
      enabled,
      click: item => setAutoCheck(item.checked),
    },
    ...(state.canInstall ? [{
      label: chinese ? '自动下载更新' : 'Download Updates Automatically',
      type: 'checkbox',
      checked: state.autoDownload,
      enabled,
      click: item => setAutoDownload(item.checked),
    }] : []),
  ]
}

export function createApplicationMenuTemplate({ platform, locale = 'en', updates }) {
  const chinese = locale.toLowerCase().startsWith('zh')
  if (platform === 'win32') {
    return [{ label: chinese ? '更新' : 'Updates', submenu: updates }]
  }
  return [
    ...(platform === 'darwin' ? [{
      label: 'DeepSeek Harness',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        ...updates,
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : [{ role: 'fileMenu' }]),
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    ...(platform === 'darwin' ? [] : [{ label: chinese ? '更新' : 'Updates', submenu: updates }]),
  ]
}
