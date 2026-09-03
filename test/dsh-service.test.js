import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import {
  buildDshEnvironment,
  buildDshCommand,
  buildDshArgs,
  extractReadyUrl,
  resolveDshEntry,
  resolvePluginMarketPatch,
  resolveBundledPnpmEntry,
  resolveBundledToolDirectory,
  resolveWindowsHiddenConsoleLauncher,
  resolveWindowsNodeExecutable,
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

test('buildDshArgs includes the runtime flag required by upstream HMR and disables browser handoff', () => {
  assert.deepEqual(buildDshArgs('/app/dsh.js', {
    platform: 'darwin',
    pluginMarketPatch: '/app/plugin-market.yml',
  }), [
    '--expose-internals',
    '/app/dsh.js',
    '--profile',
    'web',
    '--patch',
    '/app/plugin-market.yml',
    '--host',
    '127.0.0.1',
    '--port',
    '0',
    '--no-open',
  ])
})

test('buildDshArgs pins the browse directory picker on Windows', () => {
  assert.deepEqual(buildDshArgs('C:\\app\\dsh.js', {
    platform: 'win32',
    pluginMarketPatch: 'C:\\app\\plugin-market.yml',
    windowsPickerPatch: 'C:\\app\\windows-picker.yml',
  }), [
    '--expose-internals',
    'C:\\app\\dsh.js',
    '--profile',
    'web',
    '--patch',
    'C:\\app\\plugin-market.yml',
    '--patch',
    'C:\\app\\windows-picker.yml',
    '--host',
    '127.0.0.1',
    '--port',
    '0',
    '--no-open',
  ])
  assert.equal(resolvePluginMarketPatch().endsWith('plugin-market.patch.yml'), true)
  assert.equal(resolveWindowsPickerPatch().endsWith('windows-directory-picker.patch.yml'), true)
})

test('buildDshCommand uses the hidden-console launcher on Windows', () => {
  assert.deepEqual(buildDshCommand({
    electronExecutable: 'C:\\app\\DeepSeek Harness.exe',
    entry: 'C:\\app\\dsh.js',
    platform: 'win32',
    windowsLauncher: 'C:\\app\\windows-hidden-console.exe',
    windowsNodeExecutable: 'C:\\app\\dsh-node.exe',
  }), {
    command: 'C:\\app\\windows-hidden-console.exe',
    args: [
      'C:\\app\\dsh-node.exe',
      '--expose-internals',
      'C:\\app\\dsh.js',
      '--profile',
      'web',
      '--patch',
      resolvePluginMarketPatch(),
      '--patch',
      resolveWindowsPickerPatch(),
      '--host',
      '127.0.0.1',
      '--port',
      '0',
      '--no-open',
    ],
  })
})

test('buildDshCommand starts Electron directly on other platforms', () => {
  assert.deepEqual(buildDshCommand({
    electronExecutable: '/app/electron',
    entry: '/app/dsh.js',
    platform: 'linux',
  }), {
    command: '/app/electron',
    args: [
      '--expose-internals',
      '/app/dsh.js',
      '--profile',
      'web',
      '--patch',
      resolvePluginMarketPatch(),
      '--host',
      '127.0.0.1',
      '--port',
      '0',
      '--no-open',
    ],
  })
})

test('buildDshEnvironment exposes the bundled pnpm wrapper on macOS and Linux', () => {
  assert.deepEqual(buildDshEnvironment({
    PATH: '/usr/bin',
    NODE_OPTIONS: '--trace-warnings',
  }, {
    platform: 'darwin',
    nodeExecutable: '/app/DeepSeek Harness',
    bundledToolDirectory: '/app/assets/bin',
    bundledPnpmEntry: '/app/node_modules/pnpm/bin/pnpm.cjs',
  }), {
    PATH: '/app/assets/bin:/usr/bin',
    NODE_OPTIONS: '--trace-warnings',
    DSH_DESKTOP_NODE_EXECUTABLE: '/app/DeepSeek Harness',
    DSH_DESKTOP_PNPM_CLI: '/app/node_modules/pnpm/bin/pnpm.cjs',
    ELECTRON_RUN_AS_NODE: '1',
  })
})

test('buildDshEnvironment exposes the bundled pnpm wrapper on Windows', () => {
  assert.deepEqual(buildDshEnvironment({
    Path: 'C:\\Windows\\System32',
  }, {
    platform: 'win32',
    nodeExecutable: 'C:\\app\\dsh-node.exe',
    bundledToolDirectory: 'C:\\app\\assets\\bin',
    bundledPnpmEntry: 'C:\\app\\node_modules\\pnpm\\bin\\pnpm.cjs',
  }), {
    Path: 'C:\\app\\assets\\bin;C:\\Windows\\System32',
    DSH_DESKTOP_NODE_EXECUTABLE: 'C:\\app\\dsh-node.exe',
    DSH_DESKTOP_PNPM_CLI: 'C:\\app\\node_modules\\pnpm\\bin\\pnpm.cjs',
  })
})

test('bundled pnpm paths point to packaged runtime assets', () => {
  assert.equal(resolveBundledToolDirectory().endsWith(path.join('assets', 'bin')), true)
  assert.equal(resolveBundledPnpmEntry().endsWith(path.join('node_modules', 'pnpm', 'bin', 'pnpm.cjs')), true)
})

test('resolveWindowsHiddenConsoleLauncher points to the packaged launcher', () => {
  assert.equal(
    resolveWindowsHiddenConsoleLauncher().endsWith(path.join('assets', 'windows-hidden-console.exe')),
    true,
  )
})

test('resolveWindowsNodeExecutable points to the packaged console-subsystem Node runtime', () => {
  assert.equal(
    resolveWindowsNodeExecutable().endsWith(path.join('assets', 'dsh-node.exe')),
    true,
  )
})
