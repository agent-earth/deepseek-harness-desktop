export function shouldHideWindowOnClose(isQuitting, hasTray = true) {
  return !isQuitting && hasTray
}

export function createTrayMenuTemplate({
  locale = 'en',
  showWindow,
  openInBrowser,
  hideWindow,
  quit,
}) {
  const isChinese = locale.toLowerCase().startsWith('zh')

  return [
    {
      label: isChinese ? '打开 DeepSeek Harness' : 'Open DeepSeek Harness',
      click: showWindow,
    },
    {
      label: isChinese ? '在浏览器中打开' : 'Open in Browser',
      click: openInBrowser,
    },
    {
      label: isChinese ? '隐藏窗口' : 'Hide Window',
      click: hideWindow,
    },
    { type: 'separator' },
    {
      label: isChinese ? '退出' : 'Quit',
      click: quit,
    },
  ]
}
