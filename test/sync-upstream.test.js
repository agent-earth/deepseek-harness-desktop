import assert from 'node:assert/strict'
import test from 'node:test'
import {
  compareSemver,
  updateReadmeVersion,
  updateUpstreamDependencies,
  upstreamDependencyNames,
  validateLockfile,
} from '../scripts/sync-upstream.mjs'

test('compareSemver handles releases and prerelease identifiers', () => {
  assert.equal(compareSemver('0.1.1-rc.2', '0.1.1-rc.1'), 1)
  assert.equal(compareSemver('0.1.1', '0.1.1-rc.2'), 1)
  assert.equal(compareSemver('0.1.1-rc.2', '0.1.1'), -1)
  assert.equal(compareSemver('1.0.0-beta.2', '1.0.0-beta.11'), -1)
  assert.equal(compareSemver('1.0.0+build.2', '1.0.0+build.1'), 0)
})

test('upstreamDependencyNames selects only the DSH package family', () => {
  assert.deepEqual(upstreamDependencyNames({
    dependencies: {
      '@deepseek-ai/dsh': '1.0.0',
      '@deepseek-ai/dsh-shell': '1.0.0',
      '@deepseek-ai/cordis': '2.0.0',
      electron: '3.0.0',
    },
  }), [
    '@deepseek-ai/dsh',
    '@deepseek-ai/dsh-shell',
  ])
})

test('updateUpstreamDependencies pins every explicit DSH dependency', () => {
  const manifest = {
    dependencies: {
      '@deepseek-ai/dsh': '1.0.0',
      '@deepseek-ai/dsh-shell': '1.0.0',
      '@deepseek-ai/cordis': '2.0.0',
    },
  }

  const result = updateUpstreamDependencies(manifest, '1.1.0')

  assert.equal(result.currentVersion, '1.0.0')
  assert.equal(manifest.dependencies['@deepseek-ai/dsh'], '1.1.0')
  assert.equal(manifest.dependencies['@deepseek-ai/dsh-shell'], '1.1.0')
  assert.equal(manifest.dependencies['@deepseek-ai/cordis'], '2.0.0')
})

test('updateUpstreamDependencies rejects a mixed upstream pin', () => {
  assert.throws(
    () => updateUpstreamDependencies({
      dependencies: {
        '@deepseek-ai/dsh': '1.0.0',
        '@deepseek-ai/dsh-shell': '0.9.0',
      },
    }, '1.1.0'),
    /expected 1\.0\.0/,
  )
})

test('updateReadmeVersion only changes the qualified upstream package version', () => {
  assert.equal(
    updateReadmeVersion(
      'Desktop 0.3.6 uses `@deepseek-ai/dsh@1.0.0`.',
      '1.0.0',
      '1.1.0',
    ),
    'Desktop 0.3.6 uses `@deepseek-ai/dsh@1.1.0`.',
  )
})

test('validateLockfile checks root and installed versions', () => {
  assert.doesNotThrow(() => validateLockfile({
    packages: {
      '': {
        dependencies: {
          '@deepseek-ai/dsh': '1.1.0',
          '@deepseek-ai/dsh-shell': '1.1.0',
        },
      },
      'node_modules/@deepseek-ai/dsh': { version: '1.1.0' },
      'node_modules/@deepseek-ai/dsh-shell': { version: '1.1.0' },
    },
  }, ['@deepseek-ai/dsh', '@deepseek-ai/dsh-shell'], '1.1.0'))
})
