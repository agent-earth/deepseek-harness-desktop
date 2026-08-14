import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { resolveWindowsHiddenConsoleLauncher } from '../src/dsh-service.js'

if (process.platform !== 'win32') {
  console.log('windows hidden-console test: skipped on non-Windows')
  process.exit(0)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const launcher = process.env.WINDOWS_HIDDEN_CONSOLE_LAUNCHER
  ?? resolveWindowsHiddenConsoleLauncher()
const visibleLauncher = path.join(os.tmpdir(), 'deepseek-harness-visible-console.exe')
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'dsh-hidden-console-'))
const powershellScript = path.join(temporaryRoot, 'inspect-console.ps1')

writeFileSync(powershellScript, `
$source = @'
using System;
using System.Runtime.InteropServices;
public static class ConsoleInspector {
  [DllImport("kernel32.dll")]
  public static extern IntPtr GetConsoleWindow();
  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr window);
}
'@
Add-Type -TypeDefinition $source
$window = [ConsoleInspector]::GetConsoleWindow()
if ($window -eq [IntPtr]::Zero) {
  Write-Output "NO_CONSOLE"
} else {
  Write-Output ("HAS_CONSOLE_VISIBLE=" + [ConsoleInspector]::IsWindowVisible($window))
}
`, 'utf8')

const nodeScript = `
const { spawnSync } = require('node:child_process')
const result = spawnSync(
  'powershell.exe',
  ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', ${JSON.stringify(powershellScript)}],
  { encoding: 'utf8' },
)
process.stdout.write((result.stdout ?? '') + (result.stderr ?? ''))
process.exitCode = result.status ?? 1
`

try {
  const baseline = spawnSync(visibleLauncher, [process.execPath, '-e', nodeScript], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
  })
  const baselineOutput = `${baseline.stdout ?? ''}${baseline.stderr ?? ''}`.trim()

  if (baseline.error) throw baseline.error
  if (baseline.status !== 0) {
    throw new Error(`baseline launcher exited with ${String(baseline.status)}: ${baselineOutput}`)
  }
  if (!baselineOutput.includes('HAS_CONSOLE_VISIBLE=True')) {
    throw new Error(`baseline did not reproduce the visible PowerShell console: ${baselineOutput}`)
  }

  const result = spawnSync(launcher, [process.execPath, '-e', nodeScript], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`launcher exited with ${String(result.status)}: ${output}`)
  }
  if (!output.includes('HAS_CONSOLE_VISIBLE=False')) {
    throw new Error(`expected PowerShell to inherit a hidden console, got: ${output}`)
  }

  console.log(`windows hidden-console test: baseline=${baselineOutput}, fixed=${output}`)
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}
