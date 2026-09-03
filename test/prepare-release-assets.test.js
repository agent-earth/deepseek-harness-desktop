import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  prepareReleaseAssets,
  releaseAssetMappings,
} from '../scripts/prepare-release-assets.mjs'

test('releaseAssetMappings covers every published platform package', () => {
  assert.deepEqual(releaseAssetMappings('1.2.3'), [
    ['DeepSeek-Harness-Desktop-1.2.3-arm64.dmg', 'DeepSeek-Harness-Desktop-latest-arm64.dmg'],
    ['DeepSeek-Harness-Desktop-1.2.3-arm64.zip', 'DeepSeek-Harness-Desktop-latest-arm64.zip'],
    ['DeepSeek-Harness-Desktop-1.2.3-x64.dmg', 'DeepSeek-Harness-Desktop-latest-x64.dmg'],
    ['DeepSeek-Harness-Desktop-1.2.3-x64.zip', 'DeepSeek-Harness-Desktop-latest-x64.zip'],
    ['DeepSeek-Harness-Desktop-1.2.3-windows-x64.exe', 'DeepSeek-Harness-Desktop-latest-windows-x64.exe'],
    ['DeepSeek-Harness-Desktop-1.2.3-windows-x64.zip', 'DeepSeek-Harness-Desktop-latest-windows-x64.zip'],
    ['DeepSeek-Harness-Desktop-1.2.3-linux-x86_64.AppImage', 'DeepSeek-Harness-Desktop-latest-linux-x86_64.AppImage'],
    ['DeepSeek-Harness-Desktop-1.2.3-linux-amd64.deb', 'DeepSeek-Harness-Desktop-latest-linux-amd64.deb'],
  ])
})

test('prepareReleaseAssets copies versioned packages to stable aliases', () => {
  const distDir = mkdtempSync(path.join(tmpdir(), 'dsh-release-assets-'))
  const mappings = releaseAssetMappings('1.2.3')

  for (const [sourceName] of mappings) {
    writeFileSync(path.join(distDir, sourceName), sourceName)
  }

  const aliases = prepareReleaseAssets({ distDir, version: '1.2.3' })

  assert.deepEqual(aliases, mappings.map(([, aliasName]) => aliasName))
  for (const [sourceName, aliasName] of mappings) {
    assert.equal(readFileSync(path.join(distDir, aliasName), 'utf8'), sourceName)
  }
})

test('prepareReleaseAssets reports all missing packages before copying', () => {
  const distDir = mkdtempSync(path.join(tmpdir(), 'dsh-release-assets-'))

  assert.throws(
    () => prepareReleaseAssets({ distDir, version: '1.2.3' }),
    error => error.message.includes('DeepSeek-Harness-Desktop-1.2.3-linux-amd64.deb')
      && error.message.includes('DeepSeek-Harness-Desktop-1.2.3-arm64.dmg'),
  )
})
