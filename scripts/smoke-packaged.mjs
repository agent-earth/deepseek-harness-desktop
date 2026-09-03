import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { once } from 'node:events'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { startDshService } from '../src/dsh-service.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultAppPath = process.platform === 'win32'
  ? path.join(root, 'dist', 'win-unpacked', 'DeepSeek Harness.exe')
  : process.platform === 'linux'
    ? path.join(root, 'dist', 'linux-unpacked', 'deepseek-harness')
    : path.join(root, 'dist', process.arch === 'x64' ? 'mac' : 'mac-arm64', 'DeepSeek Harness.app')
const appPath = process.env.PACKAGED_APP_PATH ?? defaultAppPath
const electronExecutable = process.platform === 'win32' || process.platform === 'linux'
  ? appPath
  : path.join(appPath, 'Contents', 'MacOS', 'DeepSeek Harness')
const packagedResourcesRoot = process.platform === 'win32' || process.platform === 'linux'
  ? path.join(path.dirname(appPath), 'resources', 'app')
  : path.join(appPath, 'Contents', 'Resources', 'app')
const temporaryRoot = process.env.PACKAGED_APP_PATH ? undefined : mkdtempSync(path.join(os.tmpdir(), 'dsh-packaged-smoke-'))
const resourcesRoot = temporaryRoot === undefined
  ? packagedResourcesRoot
  : path.join(temporaryRoot, 'app')

if (temporaryRoot !== undefined) {
  cpSync(packagedResourcesRoot, resourcesRoot, { recursive: true })
}

const windowsNodeExecutable = path.join(resourcesRoot, 'assets', 'dsh-node.exe')

function verifyPackagedWindowsNodePty() {
  if (process.platform !== 'win32') return

  const nodePtyPath = path.join(resourcesRoot, 'node_modules', 'node-pty')
  const script = `
const path = require('node:path')
const { loadNativeModule } = require(path.join(${JSON.stringify(nodePtyPath)}, 'lib', 'utils.js'))
const loaded = ['conpty', 'conpty_console_list'].map((name) => {
  const result = loadNativeModule(name)
  return name + '=' + result.dir
})
process.stdout.write('PACKAGED_NODE_PTY_OK ' + loaded.join(','))
`
  const result = spawnSync(windowsNodeExecutable, ['-e', script], {
    cwd: resourcesRoot,
    encoding: 'utf8',
    timeout: 15_000,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  if (result.error) throw result.error
  if (result.status !== 0 || !output.includes('PACKAGED_NODE_PTY_OK')) {
    throw new Error(
      `Packaged Node runtime could not load node-pty (status ${String(result.status)}): ${output}`,
    )
  }
  console.log(`packaged node-pty smoke: ${output}`)
}

function verifyPackagedWindowsAclSandbox() {
  if (process.platform !== 'win32') return

  const workspace = path.join(resourcesRoot, 'smoke-acl-workspace')
  const tempRoot = path.join(resourcesRoot, 'smoke-acl-temp')
  const runner = path.join(
    resourcesRoot,
    'node_modules',
    '@deepseek-ai',
    'dsh-sandbox-windows-acl',
    'lib',
    'runner.js',
  )
  const script = `
const { mkdirSync, rmSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const workspace = ${JSON.stringify(workspace)}
const tempRoot = ${JSON.stringify(tempRoot)}
mkdirSync(workspace)
mkdirSync(tempRoot)
try {
  const result = spawnSync(
    process.execPath,
    [
      ${JSON.stringify(runner)},
      '--workspace', workspace,
      '--temp', tempRoot,
      '--mode', 'read-only',
      '--',
      'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
      '-NoLogo', '-NoProfile', '-NonInteractive',
      '-Command', 'Write-Output PACKAGED_ACL_POWERSHELL_OK',
    ],
    { encoding: 'utf8' },
  )
  process.stdout.write((result.stdout ?? '') + (result.stderr ?? ''))
  process.exitCode = result.status ?? 1
} finally {
  rmSync(workspace, { recursive: true, force: true })
  rmSync(tempRoot, { recursive: true, force: true })
}
`
  const launcher = path.join(resourcesRoot, 'assets', 'windows-hidden-console.exe')
  const result = spawnSync(launcher, [windowsNodeExecutable, '-e', script], {
    cwd: resourcesRoot,
    encoding: 'utf8',
    timeout: 60_000,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  if (result.error) throw result.error
  if (result.status !== 0 || !output.includes('PACKAGED_ACL_POWERSHELL_OK')) {
    throw new Error(
      `Packaged Windows ACL sandbox could not start PowerShell (status ${String(result.status)}): ${output}`,
    )
  }
  console.log(`packaged ACL sandbox smoke: ${output}`)
}

verifyPackagedWindowsNodePty()
verifyPackagedWindowsAclSandbox()

const service = startDshService({
  electronExecutable,
  entry: path.join(resourcesRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  windowsLauncher: path.join(resourcesRoot, 'assets', 'windows-hidden-console.exe'),
  windowsNodeExecutable,
  environment: {
    ...process.env,
    NODE_OPTIONS: '',
    NODE_PATH: '',
  },
})

try {
  const url = await service.ready
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Packaged DeepSeek Harness returned HTTP ${response.status}`)
  }
  const html = await response.text()
  if (!html.includes('__DSH_BOOT__')) {
    throw new Error('Packaged DeepSeek Harness did not return its Web UI')
  }
  if (!html.includes('dshmarket/client')) {
    throw new Error('Packaged app did not inject the plugin market client')
  }
  const marketResponse = await fetch(`${url}/dsh-market/status`)
  if (!marketResponse.ok) {
    throw new Error(`Packaged plugin market returned HTTP ${marketResponse.status}`)
  }
  const marketStatus = await marketResponse.json()
  if (marketStatus.version !== '1.40.0') {
    throw new Error(`Packaged plugin market has unexpected version ${String(marketStatus.version)}`)
  }
  if (marketStatus.restart !== false) {
    throw new Error('Packaged plugin market must delegate restarts to the desktop host')
  }
  if (marketStatus.pnpm !== true) {
    throw new Error('Packaged plugin market could not use the bundled pnpm runtime')
  }
  if (process.platform === 'win32' && !html.includes('@deepseek-ai/dsh-client-ui-directory-picker-browse')) {
    throw new Error('Packaged Windows app did not mount the browse directory picker')
  }
  console.log(`packaged smoke: ${response.status} ${url}, dshmarket ${marketStatus.version}, pnpm ready`)
} finally {
  service.stop()
  if (service.child.exitCode === null) {
    await once(service.child, 'exit')
  }
  if (temporaryRoot !== undefined) {
    try {
      rmSync(temporaryRoot, {
        recursive: true,
        force: true,
        maxRetries: process.platform === 'win32' ? 10 : 0,
        retryDelay: 200,
      })
    } catch (error) {
      if (process.platform !== 'win32') throw error
      console.warn(`packaged smoke cleanup skipped: ${error.message}`)
    }
  }
}
