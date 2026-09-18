import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { dump, load, JSON_SCHEMA } from 'js-yaml'
import { validateUpdateMetadata } from '../scripts/validate-update-metadata.mjs'

const version = '1.2.3'
const windowsAsset = `DeepSeek-Harness-Desktop-${version}-windows-x64.exe`
const linuxAsset = `DeepSeek-Harness-Desktop-${version}-linux-x86_64.AppImage`
const linuxDeb = `DeepSeek-Harness-Desktop-${version}-linux-amd64.deb`

function createFixture(t) {
  const distDir = mkdtempSync(path.join(tmpdir(), 'dsh-update-metadata-'))
  t.after(() => rmSync(distDir, { recursive: true, force: true }))
  const files = new Map([windowsAsset, linuxAsset, linuxDeb].map(name => {
    const content = Buffer.from(`fixture package: ${name}`)
    writeFileSync(path.join(distDir, name), content)
    return [name, {
      url: name,
      size: content.length,
      sha512: createHash('sha512').update(content).digest('base64'),
    }]
  }))
  const metadata = {
    'latest.yml': {
      version,
      files: [files.get(windowsAsset)],
      path: windowsAsset,
      sha512: files.get(windowsAsset).sha512,
    },
    'latest-linux.yml': {
      version,
      files: [files.get(linuxAsset), files.get(linuxDeb)],
      path: linuxAsset,
      sha512: files.get(linuxAsset).sha512,
    },
  }
  const writeMetadata = () => {
    for (const [name, data] of Object.entries(metadata)) {
      writeFileSync(path.join(distDir, name), dump(data))
    }
  }
  writeMetadata()
  writeFileSync(path.join(distDir, `${windowsAsset}.blockmap`), 'fixture blockmap')
  return { distDir, metadata, writeMetadata }
}

test('validates both native update channels against immutable release artifacts', t => {
  const { distDir } = createFixture(t)
  // Public download aliases may coexist, but are never referenced by update metadata.
  writeFileSync(path.join(distDir, 'DeepSeek-Harness-Desktop-latest-windows-x64.exe'), 'alias')
  assert.deepEqual(validateUpdateMetadata({ distDir, version, releaseTag: 'v1.2.3' }), [
    'latest.yml', 'latest-linux.yml',
  ])
})

test('rejects a tag/package version mismatch before publishing a release', t => {
  const { distDir } = createFixture(t)
  assert.throws(() => validateUpdateMetadata({ distDir, version, releaseTag: 'v1.2.4' }), /does not match/)
})

test('rejects metadata from a different release', t => {
  const { distDir, metadata, writeMetadata } = createFixture(t)
  metadata['latest.yml'].version = '1.2.2'
  writeMetadata()
  assert.throws(() => validateUpdateMetadata({ distDir, version }), /must describe version/)
})

test('rejects missing artifacts and missing update channels', t => {
  const { distDir } = createFixture(t)
  rmSync(path.join(distDir, linuxAsset))
  assert.throws(() => validateUpdateMetadata({ distDir, version }), /ENOENT/)
  rmSync(path.join(distDir, 'latest.yml'))
  assert.throws(() => validateUpdateMetadata({ distDir, version }), /ENOENT/)
})

test('rejects aliases, external URLs and traversal paths in update metadata', t => {
  const { distDir, metadata, writeMetadata } = createFixture(t)
  for (const url of [
    'DeepSeek-Harness-Desktop-latest-windows-x64.exe',
    `https://example.com/${windowsAsset}`,
    `../${windowsAsset}`,
  ]) {
    metadata['latest.yml'].files[0].url = url
    writeMetadata()
    assert.throws(() => validateUpdateMetadata({ distDir, version }), /unexpected update asset/)
  }
})

test('rejects corrupt file sizes and hashes before upload', t => {
  const { distDir, metadata, writeMetadata } = createFixture(t)
  const file = metadata['latest.yml'].files[0]
  file.size += 1
  writeMetadata()
  assert.throws(() => validateUpdateMetadata({ distDir, version }), /incorrect size/)
  file.size -= 1
  file.sha512 = 'invalid hash'
  writeMetadata()
  assert.throws(() => validateUpdateMetadata({ distDir, version }), /incorrect checksum/)
})

test('requires the AppImage payload when deb is also published', t => {
  const { distDir, metadata, writeMetadata } = createFixture(t)
  metadata['latest-linux.yml'].files.shift()
  writeMetadata()
  assert.throws(() => validateUpdateMetadata({ distDir, version }), /missing the native update asset/)
})

test('rejects inconsistent legacy paths and missing NSIS blockmaps', t => {
  const { distDir, metadata, writeMetadata } = createFixture(t)
  metadata['latest.yml'].path = 'not-published.exe'
  writeMetadata()
  assert.throws(() => validateUpdateMetadata({ distDir, version }), /inconsistent legacy/)
  metadata['latest.yml'].path = windowsAsset
  writeMetadata()
  rmSync(path.join(distDir, `${windowsAsset}.blockmap`))
  assert.throws(() => validateUpdateMetadata({ distDir, version }), /ENOENT/)
})

test('release workflow carries native update metadata through artifact staging and publication', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const workflow = load(readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8'), {
    schema: JSON_SCHEMA,
  })
  assert.deepEqual(manifest.build.publish, {
    provider: 'github', owner: 'agent-earth', repo: 'deepseek-harness-desktop', releaseType: 'release',
  })
  for (const command of ['dist:win', 'dist:linux', 'dist:mac:arm64', 'dist:mac:x64']) {
    assert.match(manifest.scripts[command], /--publish never/)
  }
  assert.notEqual(manifest.build.win.verifyUpdateCodeSignature, false)
  const uploadedPaths = name => workflow.jobs[name].steps.find(step => step.uses?.startsWith('actions/upload-artifact@')).with.path.split('\n')
  assert.ok(uploadedPaths('windows').includes('dist/latest.yml'))
  assert.ok(uploadedPaths('windows').includes('dist/*.exe.blockmap'))
  assert.ok(uploadedPaths('linux').includes('dist/latest-linux.yml'))
  assert.ok(uploadedPaths('macos').every(value => !value.endsWith('.yml')))
  const releaseSteps = workflow.jobs.release.steps
  const validationIndex = releaseSteps.findIndex(step => step.run === 'npm run validate:update-metadata')
  const publishIndex = releaseSteps.findIndex(step => step.uses?.startsWith('softprops/action-gh-release@'))
  assert.ok(validationIndex >= 0 && validationIndex < publishIndex)
  const published = releaseSteps[publishIndex].with.files.split('\n')
  for (const pattern of ['dist/latest.yml', 'dist/latest-linux.yml', 'dist/*.blockmap']) {
    assert.ok(published.includes(pattern))
  }
  assert.equal(releaseSteps[publishIndex].with.fail_on_unmatched_files, true)
  assert.equal(workflow.jobs.release.if, undefined)
  assert.equal(releaseSteps[publishIndex].if, "startsWith(github.ref, 'refs/tags/')")
  assert.equal(releaseSteps[validationIndex].env.RELEASE_TAG,
    "${{ startsWith(github.ref, 'refs/tags/') && github.ref_name || '' }}")
})
