import assert from 'node:assert/strict'
import { mkdtemp, readlink, rm } from 'node:fs/promises'
import test from 'node:test'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  buildDshArgs,
  ensureDesktopPluginLink,
  extractReadyUrl,
  resolveDesktopPatch,
  resolveDesktopPluginDirectory,
  resolveDshEntry,
  resolveWindowsPickerPatch,
  unpackedPath,
} from '../src/dsh-service.js'

test('extractReadyUrl reads the canonical loopback readiness URL', () => {
  assert.equal(
    extractReadyUrl('booting\ndsh web: http://127.0.0.1:60882\n'),
    'http://127.0.0.1:60882',
  )
})

test('extractReadyUrl ignores non-loopback output', () => {
  assert.equal(extractReadyUrl('dsh web: http://192.168.1.10:3080'), undefined)
})

test('resolveDshEntry finds the pinned CLI package', () => {
  assert.equal(
    resolveDshEntry().endsWith(path.join('@deepseek-ai', 'dsh', 'lib', 'bin.js')),
    true,
  )
})

test('unpackedPath maps packaged dependencies to Electron unpacked resources', () => {
  assert.equal(
    unpackedPath('/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/node_modules/@deepseek-ai/dsh/lib/bin.js'),
    '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh/lib/bin.js',
  )
  assert.equal(unpackedPath('/workspace/node_modules/@deepseek-ai/dsh/lib/bin.js'), '/workspace/node_modules/@deepseek-ai/dsh/lib/bin.js')
})

test('buildDshArgs includes the runtime flag required by upstream HMR', () => {
  assert.deepEqual(buildDshArgs('/app/dsh.js', {
    platform: 'darwin',
    desktopPatch: '/app/desktop.yml',
  }), [
    '--expose-internals',
    '/app/dsh.js',
    '--profile',
    'web',
    '--patch',
    '/app/desktop.yml',
    '--host',
    '127.0.0.1',
    '--port',
    '0',
  ])
})

test('buildDshArgs pins the browse directory picker on Windows', () => {
  assert.deepEqual(buildDshArgs('C:\\app\\dsh.js', {
    platform: 'win32',
    desktopPatch: 'C:\\app\\desktop.yml',
    windowsPickerPatch: 'C:\\app\\windows-picker.yml',
  }), [
    '--expose-internals',
    'C:\\app\\dsh.js',
    '--profile',
    'web',
    '--patch',
    'C:\\app\\desktop.yml',
    '--patch',
    'C:\\app\\windows-picker.yml',
    '--host',
    '127.0.0.1',
    '--port',
    '0',
  ])
  assert.equal(resolveDesktopPatch().endsWith('desktop.patch.yml'), true)
  assert.equal(resolveWindowsPickerPatch().endsWith('windows-directory-picker.patch.yml'), true)
})

test('desktop plugin is linked into the Harness profile module fallback', async (t) => {
  const dshHome = await mkdtemp(path.join(tmpdir(), 'dsh-desktop-plugin-'))
  t.after(() => rm(dshHome, { recursive: true, force: true }))

  const target = ensureDesktopPluginLink({
    environment: { DSH_HOME: dshHome },
    platform: 'darwin',
  })

  assert.equal(
    path.resolve(path.dirname(target), await readlink(target)),
    path.resolve(resolveDesktopPluginDirectory()),
  )
  assert.equal(ensureDesktopPluginLink({
    environment: { DSH_HOME: dshHome },
    platform: 'darwin',
  }), target)
})
