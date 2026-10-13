import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 本文件已适配 dsh 0.1.7-rc.2（上游原版针对 0.1.1-rc.2）。
//
// 与上游原版的差异：
//  1) 删除 apiproxy 的 Windows 路径打开器补丁：目标包 @deepseek-ai/dsh-host-apiproxy
//     在 0.1.7-rc.2 中已被上游删除，功能重写进 @deepseek-ai/dsh-host-open-in-app，
//     且上游改用 -File + 位置参数，本身就没有引号转义面，补丁不再需要。
//  2) 设置导航图标补丁重新适配：0.1.7-rc.2 的 navIcon 已改用 Icon*OutlineMedium
//     图标组件（旧版是内联 SVG），锚点与插入内容都随之更新。
//  3) 其余（dshmarket 依赖钉版、dsh-node.exe 复制）保持不变。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const settingsGeneralClientPath = path.join(
  root,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-settings-general',
  'lib',
  'client.js',
)
const dshManifestPath = path.join(root, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
const nodeModulesRoot = path.join(root, 'node_modules')
const dshmarketManifestPath = path.join(root, 'node_modules', 'dshmarket', 'package.json')
const windowsNodePath = path.join(root, 'assets', 'dsh-node.exe')
const nodeLicensePath = path.join(root, 'third-party-licenses', 'nodejs-LICENSE')
const DSH_MARKET_VERSION = '1.40.0'

/** 0.1.7-rc.2 中 navIcon 的 account 分支（整条语句，避免把语句截断）。 */
const SETTINGS_NAV_ANCHOR =
  '\t\t\tif (id === "account") return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutlineMedium, {\n' +
  '\t\t\t\tclassName: SettingsRoot_module_css_default.navIcon,\n' +
  '\t\t\t\tsize: 16\n' +
  '\t\t\t});'

/** 给插件市场的导航项插一个图标；缺了它市场项会退化成默认齿轮图标。 */
const MARKET_NAV_ICON =
  '\t\t\tif (id === "market") return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPluginPinwheelOutlineMedium, {\n' +
  '\t\t\t\tclassName: SettingsRoot_module_css_default.navIcon,\n' +
  '\t\t\t\tsize: 16\n' +
  '\t\t\t});'

const MARKET_NAV_TAG = 'if (id === "market")'

export function encodeWindowsOpenCommand(targetPath) {
  const literal = `'${targetPath.replaceAll("'", "''")}'`
  const command = `Invoke-Item -LiteralPath ${literal}`
  return Buffer.from(command, 'utf16le').toString('base64')
}

export function patchSettingsMarketNavIcon(source) {
  if (source.includes(MARKET_NAV_TAG)) return source
  const matches = source.split(SETTINGS_NAV_ANCHOR).length - 1
  if (matches !== 1) {
    throw new Error(`Expected exactly one DeepSeek Harness settings nav icon anchor, found ${matches}`)
  }
  return source.replace(SETTINGS_NAV_ANCHOR, `${SETTINGS_NAV_ANCHOR}\n${MARKET_NAV_ICON}`)
}

export function prepareSettingsMarketNavIcon(target = settingsGeneralClientPath) {
  const source = readFileSync(target, 'utf8')
  const patched = patchSettingsMarketNavIcon(source)
  if (patched !== source) writeFileSync(target, patched)
}

export function patchDshManifest(source) {
  const manifest = JSON.parse(source)
  if (manifest.name !== '@deepseek-ai/dsh' || typeof manifest.dependencies !== 'object') {
    throw new Error('Expected the @deepseek-ai/dsh package manifest')
  }
  if (manifest.dependencies.dshmarket === DSH_MARKET_VERSION) return source
  manifest.dependencies.dshmarket = DSH_MARKET_VERSION
  return `${JSON.stringify(manifest, null, 2)}\n`
}

export function prepareDshManifest(target = dshManifestPath) {
  const source = readFileSync(target, 'utf8')
  const patched = patchDshManifest(source)
  if (patched !== source) writeFileSync(target, patched)
}

/**
 * dshmarket 声明的 `dsh.client.inject` 里带着 @deepseek-ai/dsh-client-runtime，
 * 但该包在 0.1.7-rc.2 中已被上游删除（改名成 dsh-client-resources）。
 * 市场面板因此解析不到依赖，React 渲染时静默抛错，设置页里显示为一片空白。
 * 这里按「注入项在内核中是否真实存在」动态裁剪，不写死包名。
 */
export function prepareDshmarketInject(
  target = dshmarketManifestPath,
  modulesRoot = nodeModulesRoot,
) {
  const source = readFileSync(target, 'utf8')
  const manifest = JSON.parse(source)
  const inject = manifest?.dsh?.client?.inject
  if (!Array.isArray(inject)) return

  const present = inject.filter(name => existsSync(path.join(modulesRoot, name, 'package.json')))
  if (present.length === inject.length) return

  const dropped = inject.filter(name => !present.includes(name))
  manifest.dsh.client.inject = present
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`)
  process.stdout.write(`prepare-dependencies: dshmarket 注入项裁剪掉 ${dropped.join(', ')}（内核中不存在）\n`)
}

export function findNodeLicense(executablePath = process.execPath) {
  const executableDirectory = path.dirname(executablePath)
  const candidates = [
    path.join(executableDirectory, 'LICENSE'),
    path.join(executableDirectory, 'LICENSE.md'),
    path.join(executableDirectory, '..', 'LICENSE'),
  ]
  return candidates.find(existsSync)
}

export function prepareWindowsNode({
  platform = process.platform,
  executablePath = process.execPath,
  outputPath = windowsNodePath,
  licenseOutputPath = nodeLicensePath,
} = {}) {
  if (platform !== 'win32') return
  const licensePath = findNodeLicense(executablePath)
  if (!licensePath) {
    throw new Error(`Could not find the Node.js license next to ${executablePath}`)
  }

  mkdirSync(path.dirname(outputPath), { recursive: true })
  mkdirSync(path.dirname(licenseOutputPath), { recursive: true })
  copyFileSync(executablePath, outputPath)
  copyFileSync(licensePath, licenseOutputPath)
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}

if (isMainModule()) {
  prepareSettingsMarketNavIcon()
  prepareDshManifest()
  prepareDshmarketInject()
  prepareWindowsNode()
  process.stdout.write('prepare-dependencies: 设置导航图标补丁 + dshmarket 注入裁剪 + dshmanifest + dsh-node.exe 完成\n')
  process.stdout.write('prepare-dependencies: 已跳过 apiproxy 补丁（该包在 0.1.7-rc.2 中已被上游移除）\n')
}
