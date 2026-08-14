$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "native\windows-hidden-console.cs"
$output = Join-Path $root "assets\windows-hidden-console.exe"
$testSource = Join-Path $root "test\fixtures\windows-visible-console.cs"
$testOutput = Join-Path $env:TEMP "deepseek-harness-visible-console.exe"
$frameworkRoot = Join-Path $env:WINDIR "Microsoft.NET\Framework64"
$compiler = Get-ChildItem $frameworkRoot -Directory |
  Sort-Object { [version]$_.Name.TrimStart("v") } -Descending |
  ForEach-Object { Join-Path $_.FullName "csc.exe" } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1

if (-not $compiler) {
  throw "Could not find the .NET Framework C# compiler."
}

& $compiler /nologo /optimize+ /target:winexe /platform:anycpu /out:$output $source
if ($LASTEXITCODE -ne 0) {
  throw "Failed to compile the Windows hidden-console launcher."
}

& $compiler /nologo /optimize+ /target:winexe /platform:anycpu /out:$testOutput $testSource
if ($LASTEXITCODE -ne 0) {
  throw "Failed to compile the Windows visible-console test fixture."
}

Write-Host "Built $output"
