import semver from 'semver'

const RELEASE_API = 'https://api.github.com/repos/agent-earth/deepseek-harness-desktop/releases/latest'
const RELEASES_URL = 'https://github.com/agent-earth/deepseek-harness-desktop/releases'
const STARTUP_DELAY = 30_000
const CHECK_INTERVAL = 6 * 60 * 60 * 1000
const FETCH_TIMEOUT = 15_000

function stableVersion(value) {
  const version = typeof value === 'string' ? semver.valid(value) : null
  if (!version || semver.prerelease(version)) throw new Error('The release does not contain a valid stable version.')
  return version
}

function releaseInfo(release) {
  if (release?.draft || release?.prerelease) throw new Error('The release is not a published stable release.')
  const version = stableVersion(release?.tag_name)
  const url = `${RELEASES_URL}/tag/${encodeURIComponent(release.tag_name)}`
  if (release.html_url !== url) throw new Error('The release download page is not trusted.')
  const assetPrefix = `${RELEASES_URL}/download/${encodeURIComponent(release.tag_name)}/`
  const hasInstaller = Array.isArray(release.assets) && release.assets.some((asset) => {
    if (typeof asset?.name !== 'string' || !/\.(exe|msi|dmg|zip|AppImage|deb|rpm)$/i.test(asset.name)) return false
    return asset.browser_download_url === `${assetPrefix}${encodeURIComponent(asset.name)}`
  })
  if (!hasInstaller) throw new Error('The release does not contain a desktop installation package.')
  return { version, url }
}

/** Updates the desktop and its bundled Harness as one release. */
export function createUpdateService({
  currentVersion,
  harnessVersion,
  locale = 'en',
  nativeUpdater = null,
  preferences = {},
  savePreferences = () => {},
  showMessageBox,
  openExternal,
  fetchRelease,
  onChange = () => {},
  logger = console,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
}) {
  const installedVersion = semver.valid(currentVersion)
  if (!installedVersion) throw new Error('The desktop version is invalid.')
  const zh = /^zh(?:-|$)/i.test(locale)
  const t = (english, chinese) => zh ? chinese : english
  const title = t('DeepSeek Harness updates', 'DeepSeek Harness 更新')
  const versions = t(
    `Desktop: ${currentVersion}\nBundled Harness: ${harnessVersion}\nHarness updates together with the desktop release, rather than through a separate npm update.`,
    `Desktop：${currentVersion}\n内置 Harness：${harnessVersion}\nHarness 随桌面发行包一起更新，不会单独通过 npm 热更新。`,
  )
  let autoCheck = preferences.autoCheck !== false
  let autoDownload = preferences.autoDownload === true
  let busy = false
  let downloadedVersion = null
  let lastPromptedVersion = null
  let started = false
  let stopped = false
  let startupTimer = null
  let intervalTimer = null
  let requestController = null
  let cancellationToken = null
  let installRequested = false

  function warn(error) {
    logger.warn?.(`Desktop update: ${error instanceof Error ? error.message : String(error)}`)
  }

  function changed() {
    try { onChange() } catch (error) { warn(error) }
  }

  function message(options) {
    return showMessageBox({
      type: 'info',
      title,
      ...options,
      detail: `${options.detail ? `${options.detail}\n\n` : ''}${versions}`,
    })
  }

  async function showError(error, preference = false) {
    if (stopped) return
    try {
      await message({
        type: 'error',
        message: preference
          ? t('Could not save update settings.', '无法保存更新设置。')
          : t('Could not complete the update.', '无法完成更新。'),
        detail: error instanceof Error ? error.message : String(error),
        buttons: [t('OK', '确定')],
      })
    } catch (dialogError) { warn(dialogError) }
  }

  if (nativeUpdater) {
    nativeUpdater.autoDownload = false
    nativeUpdater.autoInstallOnAppQuit = false
    nativeUpdater.allowPrerelease = false
    nativeUpdater.allowDowngrade = false
    // Keep this listener after stop: an in-flight native request may still emit an error.
    nativeUpdater.on('error', (error) => {
      warn(error)
      // quitAndInstall reports failures as events, unlike the check/download promises.
      if (installRequested) {
        installRequested = false
        void showError(error)
      }
    })
  }

  async function latestRelease() {
    requestController = new AbortController()
    const controller = requestController
    const timeout = timers.setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    timeout?.unref?.()
    try {
      if (fetchRelease) return await fetchRelease({ signal: controller.signal })
      const response = await fetch(RELEASE_API, {
        signal: controller.signal,
        redirect: 'error',
        headers: { Accept: 'application/vnd.github+json' },
      })
      if (!response.ok) throw new Error(`GitHub release check failed (${response.status}).`)
      return await response.json()
    } finally {
      timers.clearTimeout(timeout)
      if (requestController === controller) requestController = null
    }
  }

  async function askToInstall(active) {
    if (!active()) return
    const { response } = await message({
      message: t(`Desktop ${downloadedVersion} is ready to install.`, `Desktop ${downloadedVersion} 已下载，可以安装。`),
      detail: t(
        'Restarting installs the complete desktop release and its bundled Harness. Running tasks will stop. Save your work before restarting.',
        '重启后将安装完整的桌面发行包及其内置 Harness。正在运行的任务会停止，请先保存工作。',
      ),
      buttons: [t('Restart and install', '重启并安装'), t('Later', '稍后')],
      defaultId: 1,
      cancelId: 1,
    })
    if (active() && response === 0) {
      installRequested = true
      try {
        nativeUpdater.quitAndInstall(false, true)
      } catch (error) {
        if (installRequested) {
          installRequested = false
          warn(error)
          await showError(error)
        }
      }
    }
  }

  async function check({ manual = true } = {}) {
    if (stopped || busy || (!manual && !autoCheck)) return
    busy = true
    changed()
    let userRequested = manual
    const active = () => !stopped && (manual || autoCheck)
    try {
      if (downloadedVersion) {
        if (manual) await askToInstall(active)
        return
      }
      let version
      let url
      if (nativeUpdater) {
        const result = await nativeUpdater.checkForUpdates()
        cancellationToken = result?.cancellationToken ?? null
        if (stopped) cancellationToken?.cancel()
        if (!active()) return
        if (result === null || result?.isUpdateAvailable === false) {
          if (manual) await message({
            message: t('No desktop update is available for this installation.', '当前安装暂无可用的桌面更新。'),
            buttons: [t('OK', '确定')],
          })
          return
        }
        version = stableVersion(result?.updateInfo?.version)
      } else {
        const release = await latestRelease()
        if (!active()) return
        ;({ version, url } = releaseInfo(release))
      }
      if (!semver.gt(version, installedVersion)) {
        if (manual && active()) await message({
          message: t('You are running the latest desktop release.', '当前已是最新桌面发行版。'),
          buttons: [t('OK', '确定')],
        })
        return
      }
      if (!manual && lastPromptedVersion === version && !(nativeUpdater && autoDownload)) return
      if (!nativeUpdater) {
        lastPromptedVersion = version
        const { response } = await message({
          message: t(`Desktop ${version} is available.`, `Desktop ${version} 已发布。`),
          detail: t(
            'Open the release page to download a desktop installation package. This installation requires you to finish the update yourself, including macOS, ZIP, and deb packages. Automatic download and installation are unavailable for this installation type.',
            '打开发布页面下载桌面安装包。此安装方式需要你手动完成更新，包括 macOS、ZIP 和 deb 安装包；不支持自动下载和安装。',
          ),
          buttons: [t('Open downloads', '打开下载页面'), t('Later', '稍后')],
          defaultId: 1,
          cancelId: 1,
        })
        if (active() && response === 0) {
          userRequested = true
          await openExternal(url)
        }
        return
      }
      if (!autoDownload) {
        lastPromptedVersion = version
        const { response } = await message({
          message: t(`Desktop ${version} is available.`, `Desktop ${version} 已发布。`),
          detail: t('Download the complete desktop release and its bundled Harness.', '下载完整的桌面发行包及其内置 Harness。'),
          buttons: [t('Download update', '下载更新'), t('Later', '稍后')],
          defaultId: 1,
          cancelId: 1,
        })
        if (!active() || response !== 0) return
        userRequested = true
      }
      if (!active()) return
      await nativeUpdater.downloadUpdate(cancellationToken ?? undefined)
      if (stopped) return
      downloadedVersion = version
      lastPromptedVersion = version
      changed()
      await askToInstall(active)
    } catch (error) {
      if (!stopped) {
        warn(error)
        if (userRequested && active()) await showError(error)
      }
    } finally {
      cancellationToken = null
      busy = false
      if (!stopped) changed()
    }
  }

  function clearSchedule() {
    if (startupTimer !== null) timers.clearTimeout(startupTimer)
    if (intervalTimer !== null) timers.clearInterval(intervalTimer)
    startupTimer = null
    intervalTimer = null
  }

  function schedule() {
    clearSchedule()
    if (!started || stopped || !autoCheck) return
    startupTimer = timers.setTimeout(() => {
      startupTimer = null
      void check({ manual: false })
    }, STARTUP_DELAY)
    intervalTimer = timers.setInterval(() => void check({ manual: false }), CHECK_INTERVAL)
    startupTimer?.unref?.()
    intervalTimer?.unref?.()
  }

  function setPreference(key, value) {
    if (stopped) return false
    const next = { autoCheck, autoDownload, [key]: Boolean(value) }
    try {
      savePreferences(next)
    } catch (error) {
      warn(error)
      changed()
      void showError(error, true)
      return false
    }
    autoCheck = next.autoCheck
    autoDownload = next.autoDownload
    if (key === 'autoCheck') schedule()
    changed()
    return true
  }

  return {
    getState: () => ({ busy, downloaded: Boolean(downloadedVersion), autoCheck, autoDownload, canInstall: Boolean(nativeUpdater) }),
    check,
    setAutoCheck: (value) => setPreference('autoCheck', value),
    setAutoDownload: (value) => setPreference('autoDownload', value),
    start() {
      if (started || stopped) return
      started = true
      schedule()
    },
    stop() {
      stopped = true
      installRequested = false
      clearSchedule()
      requestController?.abort()
      cancellationToken?.cancel()
    },
  }
}
