import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

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

export function resolvePluginMarketPatch() {
  return fileURLToPath(new URL('../config/plugin-market.patch.yml', import.meta.url))
}

export function resolveBundledToolDirectory() {
  return fileURLToPath(new URL('../assets/bin', import.meta.url))
}

export function resolveBundledPnpmEntry() {
  return unpackedPath(fileURLToPath(new URL('../node_modules/pnpm/bin/pnpm.cjs', import.meta.url)))
}

export function resolveWindowsPickerPatch() {
  return fileURLToPath(new URL('../config/windows-directory-picker.patch.yml', import.meta.url))
}

export function resolveWindowsHiddenConsoleLauncher() {
  return fileURLToPath(new URL('../assets/windows-hidden-console.exe', import.meta.url))
}

export function resolveWindowsNodeExecutable() {
  return fileURLToPath(new URL('../assets/dsh-node.exe', import.meta.url))
}

export function buildDshArgs(entry, {
  platform = process.platform,
  pluginMarketPatch = resolvePluginMarketPatch(),
  windowsPickerPatch = resolveWindowsPickerPatch(),
} = {}) {
  return [
    '--expose-internals',
    entry,
    '--profile',
    'web',
    '--patch',
    pluginMarketPatch,
    ...(platform === 'win32' ? ['--patch', windowsPickerPatch] : []),
    '--host',
    '127.0.0.1',
    '--port',
    '0',
    '--no-open',
  ]
}

export function buildDshCommand({
  electronExecutable,
  entry = resolveDshEntry(),
  platform = process.platform,
  windowsLauncher = resolveWindowsHiddenConsoleLauncher(),
  windowsNodeExecutable = resolveWindowsNodeExecutable(),
} = {}) {
  if (!electronExecutable) {
    throw new Error('electronExecutable is required')
  }

  const args = buildDshArgs(entry, { platform })
  return platform === 'win32'
    ? { command: windowsLauncher, args: [windowsNodeExecutable, ...args] }
    : { command: electronExecutable, args }
}

export function buildDshEnvironment(environment, {
  platform = process.platform,
  nodeExecutable,
  bundledToolDirectory = resolveBundledToolDirectory(),
  bundledPnpmEntry = resolveBundledPnpmEntry(),
} = {}) {
  const pathKey = platform === 'win32'
    ? Object.keys(environment).find((key) => key.toLowerCase() === 'path') ?? 'Path'
    : 'PATH'
  const separator = platform === 'win32' ? ';' : ':'
  return {
    ...environment,
    [pathKey]: [bundledToolDirectory, environment[pathKey]].filter(Boolean).join(separator),
    DSH_DESKTOP_NODE_EXECUTABLE: nodeExecutable,
    DSH_DESKTOP_PNPM_CLI: bundledPnpmEntry,
    ...(platform === 'win32' ? {} : { ELECTRON_RUN_AS_NODE: '1' }),
  }
}

export function startDshService({
  electronExecutable,
  entry = resolveDshEntry(),
  environment = process.env,
  platform = process.platform,
  timeoutMs = 60_000,
  windowsLauncher = resolveWindowsHiddenConsoleLauncher(),
  windowsNodeExecutable = resolveWindowsNodeExecutable(),
} = {}) {
  const { command, args } = buildDshCommand({
    electronExecutable,
    entry,
    platform,
    windowsLauncher,
    windowsNodeExecutable,
  })

  const child = spawn(command, args, {
    env: buildDshEnvironment(environment, {
      platform,
      nodeExecutable: platform === 'win32' ? windowsNodeExecutable : electronExecutable,
    }),
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
