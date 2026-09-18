import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const DEFAULTS = { autoCheck: true, autoDownload: false }

export function readUpdatePreferences(filePath, logger = console) {
  try {
    const stored = JSON.parse(readFileSync(filePath, 'utf8'))
    return {
      autoCheck: typeof stored?.autoCheck === 'boolean' ? stored.autoCheck : DEFAULTS.autoCheck,
      autoDownload: typeof stored?.autoDownload === 'boolean' ? stored.autoDownload : DEFAULTS.autoDownload,
    }
  } catch (error) {
    if (error.code !== 'ENOENT') logger.warn(`Could not read update preferences: ${error.message}`)
    return { ...DEFAULTS }
  }
}

export function writeUpdatePreferences(filePath, preferences) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporaryPath, `${JSON.stringify({
      autoCheck: preferences.autoCheck === true,
      autoDownload: preferences.autoDownload === true,
    }, null, 2)}\n`, { mode: 0o600 })
    renameSync(temporaryPath, filePath)
  } finally {
    rmSync(temporaryPath, { force: true })
  }
}

// ZIP distributions have no NSIS uninstaller; never run an installer against them.
// The macOS build currently has only an ad-hoc signature, so it uses release links.
export function getUpdateMode({
  isPackaged,
  platform = process.platform,
  executablePath = process.execPath,
  appImage = process.env.APPIMAGE,
  exists = existsSync,
}) {
  if (!isPackaged) return 'development'
  if (platform === 'linux' && appImage) return 'appimage'
  if (platform === 'win32'
    && exists(path.win32.join(path.win32.dirname(executablePath), 'Uninstall DeepSeek Harness.exe'))) {
    return 'nsis'
  }
  return 'manual'
}
