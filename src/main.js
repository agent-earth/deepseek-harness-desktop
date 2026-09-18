import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  nativeImage,
  nativeTheme,
  shell,
  Tray,
} from 'electron'
import { startDshService } from './dsh-service.js'
import { applyMacTitleBarStyle } from './mac-titlebar.js'
import { createWindowOptions } from './window-options.js'
import { createTrayMenuTemplate, shouldHideWindowOnClose } from './window-lifecycle.js'
import { applyWindowsTitleBarStyle } from './windows-titlebar.js'
import { createUpdateService } from './update-service.js'
import { getUpdateMode, readUpdatePreferences, writeUpdatePreferences } from './update-settings.js'
import { createApplicationMenuTemplate, createUpdateMenuTemplate } from './update-menu.js'

const APP_NAME = 'DeepSeek Harness'
const STARTUP_PAGE = fileURLToPath(new URL('./startup.html', import.meta.url))
const TRAY_ICON = fileURLToPath(new URL('../assets/tray.png', import.meta.url))
const TRAY_TEMPLATE_ICON = fileURLToPath(new URL('../assets/trayTemplate.png', import.meta.url))

let mainWindow
let service
let serviceUrl
let tray
let trayAvailable = false
let isQuitting = false
let updateService

app.setName(APP_NAME)

async function showMainWindow() {
  if (!mainWindow) {
    await createWindow()
    if (serviceUrl) await mainWindow?.loadURL(serviceUrl)
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

async function openInBrowser() {
  try {
    const url = serviceUrl ?? await service?.ready
    if (url) await shell.openExternal(url)
  } catch (error) {
    console.warn(`Could not open Harness in the browser: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow(createWindowOptions(process.platform, nativeTheme.shouldUseDarkColors))

  if (process.platform === 'win32') {
    mainWindow.setAutoHideMenuBar(trayAvailable)
    mainWindow.setMenuBarVisibility(!trayAvailable)
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL()
    if (currentUrl && new URL(url).origin !== new URL(currentUrl).origin) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    if (process.platform === 'darwin') void applyMacTitleBarStyle(mainWindow.webContents)
    if (process.platform === 'win32') void applyWindowsTitleBarStyle(mainWindow.webContents)
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (event) => {
    if (!shouldHideWindowOnClose(isQuitting, trayAvailable)) return
    event.preventDefault()
    mainWindow?.hide()
  })
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  return mainWindow.loadFile(STARTUP_PAGE)
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(
    process.platform === 'darwin' ? TRAY_TEMPLATE_ICON : TRAY_ICON,
  )
  if (process.platform === 'darwin') trayIcon.setTemplateImage(true)
  const newTray = new Tray(trayIcon)
  try {
    newTray.setToolTip(APP_NAME)
    newTray.on('click', () => void showMainWindow())
  } catch (error) {
    newTray.destroy()
    throw error
  }
  tray = newTray
  trayAvailable = true
}

function refreshMenus() {
  const updates = updateService ? createUpdateMenuTemplate({
    locale: app.getLocale(),
    state: updateService.getState(),
    enabled: app.isPackaged,
    check: () => void updateService.check(),
    setAutoCheck: checked => updateService.setAutoCheck(checked),
    setAutoDownload: checked => updateService.setAutoDownload(checked),
  }) : []
  Menu.setApplicationMenu(Menu.buildFromTemplate(createApplicationMenuTemplate({
    platform: process.platform,
    locale: app.getLocale(),
    updates,
  })))
  if (process.platform === 'win32') {
    mainWindow?.setAutoHideMenuBar(trayAvailable)
    mainWindow?.setMenuBarVisibility(!trayAvailable)
  }
  tray?.setContextMenu(Menu.buildFromTemplate(createTrayMenuTemplate({
    locale: app.getLocale(),
    showWindow: () => void showMainWindow(),
    openInBrowser: () => void openInBrowser(),
    hideWindow: () => mainWindow?.hide(),
    updates,
    quit: () => {
      isQuitting = true
      app.quit()
    },
  })))
}

async function configureUpdates() {
  const preferencesPath = path.join(app.getPath('userData'), 'desktop-updates.json')
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const mode = getUpdateMode({ isPackaged: app.isPackaged })
  let nativeUpdater = null
  if (mode === 'nsis' || mode === 'appimage') {
    try {
      const { default: updater } = await import('electron-updater')
      nativeUpdater = mode === 'nsis' ? new updater.NsisUpdater() : new updater.AppImageUpdater()
    } catch (error) {
      console.warn(`Native updater is unavailable; using release downloads: ${error.message}`)
    }
  }
  updateService = createUpdateService({
    currentVersion: app.getVersion(),
    harnessVersion: manifest.dependencies['@deepseek-ai/dsh'],
    locale: app.getLocale(),
    nativeUpdater,
    preferences: readUpdatePreferences(preferencesPath),
    savePreferences: next => writeUpdatePreferences(preferencesPath, next),
    showMessageBox: options => dialog.showMessageBox(options),
    openExternal: url => shell.openExternal(url),
    onChange: refreshMenus,
  })
  refreshMenus()
}

async function launch() {
  const startupReady = createWindow()
  try {
    createTray()
  } catch (error) {
    console.warn(`System tray is unavailable: ${error instanceof Error ? error.message : String(error)}`)
  }
  try {
    await configureUpdates()
  } catch (error) {
    console.warn(`Could not initialize desktop updates: ${error instanceof Error ? error.message : String(error)}`)
  }

  service = startDshService({
    electronExecutable: process.execPath,
    environment: {
      ...process.env,
      NODE_OPTIONS: '',
      DSH_DESKTOP: '1',
    },
  })

  try {
    serviceUrl = await service.ready
    await startupReady
    await mainWindow?.loadURL(serviceUrl)
    if (app.isPackaged) {
      try {
        updateService?.start()
      } catch (error) {
        console.warn(`Could not schedule desktop updates: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await dialog.showMessageBox({
      type: 'error',
      title: `${APP_NAME} failed to start`,
      message: 'DeepSeek Harness could not start.',
      detail: message,
    })
    app.quit()
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    void showMainWindow()
  })

  app.whenReady().then(launch)
}

app.on('activate', () => {
  void showMainWindow()
})

app.on('window-all-closed', () => {
  if (isQuitting || (!trayAvailable && process.platform !== 'darwin')) app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
  updateService?.stop()
  service?.stop()
})
