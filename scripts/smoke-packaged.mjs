import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

const service = startDshService({
  electronExecutable,
  entry: path.join(resourcesRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  windowsLauncher: path.join(resourcesRoot, 'assets', 'windows-hidden-console.exe'),
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
  if (process.platform === 'win32' && !html.includes('@deepseek-ai/dsh-client-ui-directory-picker-browse')) {
    throw new Error('Packaged Windows app did not mount the browse directory picker')
  }
  console.log(`packaged smoke: ${response.status} ${url}`)
} finally {
  service.stop()
  if (temporaryRoot !== undefined) rmSync(temporaryRoot, { recursive: true, force: true })
}
