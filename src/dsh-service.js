import { spawn } from 'node:child_process'
import { lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

const READY_PATTERN = /^dsh web: (http:\/\/127\.0\.0\.1:\d+)\b/m

export function resolveDshEntry() {
  return unpackedPath(fileURLToPath(import.meta.resolve('@deepseek-ai/dsh/lib/bin.js')))
}

export function unpackedPath(path) {
  return path.replace(/([/\\])app\.asar([/\\])/, '$1app.asar.unpacked$2')
}

export function extractReadyUrl(output) {
  return READY_PATTERN.exec(output)?.[1]
}

export function resolveWindowsPickerPatch() {
  return fileURLToPath(new URL('../config/windows-directory-picker.patch.yml', import.meta.url))
}

export function resolveDesktopPatch() {
  return unpackedPath(fileURLToPath(import.meta.resolve('dsh-archived-sessions/cordis.patch.yml')))
}

export function resolveDesktopPluginDirectory() {
  return dirname(unpackedPath(fileURLToPath(import.meta.resolve('dsh-archived-sessions/package.json'))))
}

export function ensureDesktopPluginLink({
  environment = process.env,
  platform = process.platform,
  pluginDirectory = resolveDesktopPluginDirectory(),
} = {}) {
  const target = join(
    resolveDshHome(undefined, environment),
    'profiles',
    'node_modules',
    'dsh-archived-sessions',
  )
  mkdirSync(dirname(target), { recursive: true })

  try {
    const entry = lstatSync(target)
    if (!entry.isSymbolicLink()) {
      throw new Error(`Cannot mount the desktop plugin because ${target} already exists and is not a link`)
    }

    const linked = resolve(dirname(target), readlinkSync(target))
    if (linked === resolve(pluginDirectory)) return target
    unlinkSync(target)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  symlinkSync(resolve(pluginDirectory), target, platform === 'win32' ? 'junction' : 'dir')
  return target
}

export function resolveWindowsHiddenConsoleLauncher() {
  return fileURLToPath(new URL('../assets/windows-hidden-console.exe', import.meta.url))
}

export function buildDshArgs(entry, {
  platform = process.platform,
  desktopPatch = resolveDesktopPatch(),
  windowsPickerPatch = resolveWindowsPickerPatch(),
} = {}) {
  return [
    '--expose-internals',
    entry,
    '--profile',
    'web',
    '--patch',
    desktopPatch,
    ...(platform === 'win32' ? ['--patch', windowsPickerPatch] : []),
    '--host',
    '127.0.0.1',
    '--port',
    '0',
  ]
}

export function buildDshCommand({
  electronExecutable,
  entry = resolveDshEntry(),
  platform = process.platform,
  desktopPatch = resolveDesktopPatch(),
  windowsPickerPatch = resolveWindowsPickerPatch(),
  windowsLauncher = resolveWindowsHiddenConsoleLauncher(),
} = {}) {
  if (!electronExecutable) {
    throw new Error('electronExecutable is required')
  }

  const args = buildDshArgs(entry, { platform, desktopPatch, windowsPickerPatch })
  return platform === 'win32'
    ? { command: windowsLauncher, args: [electronExecutable, ...args] }
    : { command: electronExecutable, args }
}

export function startDshService({
  electronExecutable,
  entry = resolveDshEntry(),
  environment = process.env,
  platform = process.platform,
  timeoutMs = 60_000,
  windowsLauncher = resolveWindowsHiddenConsoleLauncher(),
} = {}) {
  const { command, args } = buildDshCommand({
    electronExecutable,
    entry,
    platform,
    windowsLauncher,
  })

  ensureDesktopPluginLink({ environment, platform })

  const child = spawn(command, args, {
    env: {
      ...environment,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  let settled = false

  const ready = new Promise((resolve, reject) => {
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      callback(value)
    }

    const inspect = (chunk) => {
      output += chunk.toString()
      const url = extractReadyUrl(output)
      if (url) finish(resolve, url)
    }

    child.stdout.on('data', inspect)
    child.stderr.on('data', inspect)
    child.once('error', (error) => finish(reject, error))
    child.once('exit', (code, signal) => {
      finish(
        reject,
        new Error(`DeepSeek Harness stopped before it was ready (code ${String(code)}, signal ${String(signal)}).\n${output}`),
      )
    })

    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      finish(reject, new Error(`DeepSeek Harness did not become ready within ${timeoutMs}ms.\n${output}`))
    }, timeoutMs)
  })

  const stop = () => {
    if (!child.killed && child.exitCode === null) {
      child.kill('SIGTERM')
    }
  }

  return { child, ready, stop }
}

export function dshEntryUrl() {
  return pathToFileURL(resolveDshEntry()).href
}
