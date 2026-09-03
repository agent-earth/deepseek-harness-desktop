import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function releaseAssetMappings(version) {
  return [
    [`DeepSeek-Harness-Desktop-${version}-arm64.dmg`, 'DeepSeek-Harness-Desktop-latest-arm64.dmg'],
    [`DeepSeek-Harness-Desktop-${version}-arm64.zip`, 'DeepSeek-Harness-Desktop-latest-arm64.zip'],
    [`DeepSeek-Harness-Desktop-${version}-x64.dmg`, 'DeepSeek-Harness-Desktop-latest-x64.dmg'],
    [`DeepSeek-Harness-Desktop-${version}-x64.zip`, 'DeepSeek-Harness-Desktop-latest-x64.zip'],
    [`DeepSeek-Harness-Desktop-${version}-windows-x64.exe`, 'DeepSeek-Harness-Desktop-latest-windows-x64.exe'],
    [`DeepSeek-Harness-Desktop-${version}-windows-x64.zip`, 'DeepSeek-Harness-Desktop-latest-windows-x64.zip'],
    [`DeepSeek-Harness-Desktop-${version}-linux-x86_64.AppImage`, 'DeepSeek-Harness-Desktop-latest-linux-x86_64.AppImage'],
    [`DeepSeek-Harness-Desktop-${version}-linux-amd64.deb`, 'DeepSeek-Harness-Desktop-latest-linux-amd64.deb'],
  ]
}

export function prepareReleaseAssets({ distDir, version }) {
  const mappings = releaseAssetMappings(version)
  const missingAssets = mappings
    .map(([sourceName]) => sourceName)
    .filter(sourceName => !existsSync(path.join(distDir, sourceName)))

  if (missingAssets.length > 0) {
    throw new Error(`Missing release assets:\n${missingAssets.join('\n')}`)
  }

  for (const [sourceName, aliasName] of mappings) {
    copyFileSync(path.join(distDir, sourceName), path.join(distDir, aliasName))
  }

  return mappings.map(([, aliasName]) => aliasName)
}

function argumentValue(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  if (!value) throw new Error(`${name} requires a value`)
  return value
}

function main() {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  const version = argumentValue('--version') ?? manifest.version
  const distDir = path.resolve(root, argumentValue('--dist') ?? 'dist')
  const aliases = prepareReleaseAssets({ distDir, version })
  process.stdout.write(`Prepared stable release aliases:\n${aliases.join('\n')}\n`)
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}

if (isMainModule()) main()
