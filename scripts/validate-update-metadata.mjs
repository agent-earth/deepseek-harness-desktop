import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load, JSON_SCHEMA } from 'js-yaml'
import { releaseAssetMappings } from './prepare-release-assets.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function validateUpdateMetadata({ distDir, version, releaseTag }) {
  if (releaseTag && releaseTag !== `v${version}`) {
    throw new Error(`Release tag ${releaseTag} does not match package version ${version}`)
  }

  const versionedAssets = new Set(releaseAssetMappings(version).map(([name]) => name))
  const channels = [
    ['latest.yml', `DeepSeek-Harness-Desktop-${version}-windows-x64.exe`],
    ['latest-linux.yml', `DeepSeek-Harness-Desktop-${version}-linux-x86_64.AppImage`],
  ]

  for (const [metadataName, requiredAsset] of channels) {
    const metadata = load(readFileSync(path.join(distDir, metadataName), 'utf8'), { schema: JSON_SCHEMA })
    if (!metadata || metadata.version !== version) {
      throw new Error(`${metadataName} must describe version ${version}`)
    }
    if (!Array.isArray(metadata.files) || metadata.files.length === 0) {
      throw new Error(`${metadataName} has no update files`)
    }

    const files = new Map()
    for (const file of metadata.files) {
      // Only artifacts from this release are allowed; aliases, external URLs and
      // paths outside dist must never be used as auto-update payloads.
      if (!file || typeof file.url !== 'string' || !versionedAssets.has(file.url)) {
        throw new Error(`${metadataName} references an unexpected update asset: ${file?.url}`)
      }
      if (files.has(file.url)) throw new Error(`${metadataName} repeats ${file.url}`)
      const filePath = path.join(distDir, file.url)
      const stat = statSync(filePath)
      if (!stat.isFile() || !Number.isSafeInteger(file.size) || stat.size !== file.size || stat.size === 0) {
        throw new Error(`${metadataName} has an incorrect size for ${file.url}`)
      }
      const checksum = createHash('sha512').update(readFileSync(filePath)).digest('base64')
      if (file.sha512 !== checksum) {
        throw new Error(`${metadataName} has an incorrect checksum for ${file.url}`)
      }
      files.set(file.url, file)
    }
    if (!files.has(requiredAsset)) {
      throw new Error(`${metadataName} is missing the native update asset ${requiredAsset}`)
    }
    if (metadata.path !== undefined && (
      !files.has(metadata.path) || metadata.sha512 !== files.get(metadata.path).sha512
    )) {
      throw new Error(`${metadataName} has inconsistent legacy update metadata`)
    }
  }

  const blockmap = path.join(distDir, `DeepSeek-Harness-Desktop-${version}-windows-x64.exe.blockmap`)
  if (!statSync(blockmap).isFile() || statSync(blockmap).size === 0) {
    throw new Error('The NSIS update blockmap is missing or empty')
  }

  return channels.map(([name]) => name)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  const metadataFiles = validateUpdateMetadata({
    distDir: path.join(root, 'dist'),
    version: manifest.version,
    releaseTag: process.env.RELEASE_TAG,
  })
  process.stdout.write(`Validated update metadata: ${metadataFiles.join(', ')}\n`)
}
