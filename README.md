<h1 align="center">
  <img src="assets/icon.png" width="72" alt="DeepSeek Harness Desktop logo" />
  <br />
  DeepSeek Harness Desktop
</h1>

<p align="center">
  A minimal, local-first, cross-platform desktop shell for
  <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.
</p>

<p align="center">
  <a href="https://deepseek-harness-desktop.vercel.app"><strong>Official Website</strong></a>
</p>

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/steven-kid/deepseek-harness-desktop/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/steven-kid/deepseek-harness-desktop?style=flat-square&color=171513" /></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg?style=flat-square" /></a>
  <a href="https://github.com/steven-kid/deepseek-harness-desktop/actions/workflows/release.yml"><img alt="Release build" src="https://github.com/steven-kid/deepseek-harness-desktop/actions/workflows/release.yml/badge.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg?style=flat-square" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg?style=flat-square" />
  <img alt="Linux" src="https://img.shields.io/badge/Linux-x64-171513.svg?style=flat-square" />
</p>

<img width="2880" height="1882" alt="image" src="https://github.com/user-attachments/assets/4252ec13-c09b-4e74-996f-cf4d1bcb74c8" />

DeepSeek Harness Desktop packages the official DeepSeek Harness Web experience as a standalone desktop application. It removes the need to start the CLI manually or manage local ports while preserving the full Harness interface.

This project focuses on desktop hosting. It does not fork or modify the upstream package; desktop-specific capabilities are composed through Harness plugins and small compatibility styles. The core models, sessions, settings, and agent runtime remain provided by the official `@deepseek-ai/dsh` package.

> [!IMPORTANT]
> This is an unofficial community wrapper and an early-stage project. It depends on the rapidly evolving `@deepseek-ai/dsh@0.1.0-rc.6`. The macOS builds are not Apple-notarized, and the Windows builds are not commercially code-signed.

## Download

| Platform | Architecture | Package | Download |
| --- | --- | --- | --- |
| macOS | Apple Silicon | DMG | [Download for Apple Silicon](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.3-arm64.dmg) |
| macOS | Intel | DMG | [Download for Intel Mac](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.3-x64.dmg) |
| Windows | x64 | Setup installer | [Download Windows installer](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.3-windows-x64.exe) |
| Windows | x64 | Portable ZIP | [Download Windows ZIP](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.3-windows-x64.zip) |
| Linux | x64 | AppImage | [Download AppImage](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.3-linux-x86_64.AppImage) |
| Debian / Ubuntu | x64 | deb | [Download deb](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.3-linux-amd64.deb) |

All current and historical packages are available on the [GitHub Releases page](https://github.com/steven-kid/deepseek-harness-desktop/releases), and you can also download from the Quark Drive mirror: [Quark Drive - DeepSeek Harness Desktop v0.3.1](https://pan.quark.cn/s/e2dfc232c52d)

## Why this project exists

DeepSeek Harness already provides the complete agent runtime and Web UI. This project supplies the host capabilities required for a desktop product:

- Start and stop the local Harness service automatically
- Allocate a random `127.0.0.1` loopback port
- Wait for Harness readiness before displaying the window
- Provide a single-instance desktop window and safe external navigation
- Enable sandboxing, `contextIsolation`, and navigation restrictions
- Package installable releases for macOS, Windows, and Linux

## Features

- Opens the official Harness interface as soon as the local service is ready
- Shows a lightweight loading screen while the local Harness service starts
- Keeps running in the system tray when the main window is closed
- Preserves the complete settings, models, sessions, plugins, and agent experience
- Adds an Archived settings page with restore support through the built-in [dsh-archived-sessions](https://github.com/smackgg/dsh-archived-sessions) all-in plugin
- Gracefully terminates the Harness child process on application exit
- Listens only on a random local loopback port
- Supports macOS on Apple Silicon and Intel
- Blends the macOS title bar with the active DSH light or dark theme
- Provides a Windows x64 installer and portable ZIP
- Provides Linux x64 AppImage and deb packages
- Uses the official in-app directory browser on Windows to avoid packaged native-dialog worker failures
- Removes the default Electron File, Edit, View, and Window menu bar on Windows

## Installation

### macOS

The macOS builds are integrity-signed but are not Apple-notarized. On first launch:

1. Open the DMG and drag **DeepSeek Harness** into **Applications**.
2. Try to open the app; if macOS blocks it, click **Done**.
3. Open **System Settings → Privacy & Security**.
4. Find DeepSeek Harness in the **Security** section and click **Open Anyway**.
5. Confirm by clicking **Open** once more.

This confirmation is normally required only once.

### Windows

The Windows installer is not commercially code-signed. If Microsoft Defender SmartScreen appears:

1. Click **More info**.
2. Click **Run anyway**.
3. Complete the setup wizard.

### Linux

- AppImage: run `chmod +x DeepSeek-Harness-Desktop-*.AppImage`, then launch it directly.
- Debian / Ubuntu: open the deb with the system software installer, or run `sudo apt install ./DeepSeek-Harness-Desktop-*.deb`.

## Security model

- Harness binds only to `127.0.0.1` on a random port
- Node.js integration is disabled in the renderer
- `contextIsolation` and the Chromium sandbox are enabled
- New windows and cross-origin navigation open in the system browser
- Harness runs in a separate Electron Node child process
- The `--expose-internals` permission required by Cordis HMR is granted only to the Harness child process

## Runtime architecture

```text
DeepSeek Harness Desktop
├── Electron Main
│   ├── Single-instance window
│   ├── Harness child-process lifecycle
│   ├── Random loopback port and readiness checks
│   └── Platform menu and external-link handling
│
├── Harness Child Process
│   └── @deepseek-ai/dsh web
│       └── http://127.0.0.1:<random-port>
│
└── Sandboxed BrowserWindow
    └── DeepSeek Harness Web UI
```

## Validation status

| Platform | Packaging | Packaged startup | Web UI |
| --- | --- | --- | --- |
| macOS Apple Silicon | DMG / ZIP passed | Passed | HTTP 200 |
| macOS Intel | DMG / ZIP passed | Passed | HTTP 200 |
| Windows x64 | NSIS / ZIP passed | Passed | HTTP 200 |
| Linux x64 | AppImage / deb passed | Passed | HTTP 200 |

Every release package is built on a matching GitHub-hosted runner and runs a packaged-app smoke test before publication.

## Known limitations

- Upstream DSH is still an RC release and may change rapidly
- Apple Developer ID signing and notarization are not integrated
- Commercial Windows code signing is not integrated, so SmartScreen may appear
- Windows ARM64 and Linux ARM64 packages are not currently provided
- Automatic updates are not integrated

## Upstream version and license

The project currently pins `@deepseek-ai/dsh@0.1.0-rc.6` for reproducible packaging.

The desktop wrapper is available under the [MIT License](LICENSE). The bundled DeepSeek Harness package is also MIT-licensed; its notice is preserved in [`third-party-licenses/deepseek-harness-LICENSE`](third-party-licenses/deepseek-harness-LICENSE).

This project is not affiliated with or endorsed by DeepSeek. DeepSeek Harness and related names belong to their respective owners. The application icon uses the black whale artwork from the upstream DeepSeek Harness Web favicon.
