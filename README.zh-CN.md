<h1 align="center">
  <img src="assets/icon.png" width="72" alt="DeepSeek Harness Desktop 标志" />
  <br />
  DeepSeek Harness Desktop
</h1>

<p align="center">
  面向 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>
  的轻量、本地优先、跨平台桌面封装。
</p>

<p align="center">
  <a href="https://deepseek-harness-desktop.vercel.app"><strong>官方网站</strong></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <a href="https://github.com/steven-kid/deepseek-harness-desktop/releases/latest"><img alt="最新版本" src="https://img.shields.io/github/v/release/steven-kid/deepseek-harness-desktop?style=flat-square&color=171513" /></a>
  <a href="LICENSE"><img alt="许可证：MIT" src="https://img.shields.io/badge/License-MIT-171513.svg?style=flat-square" /></a>
  <a href="https://github.com/steven-kid/deepseek-harness-desktop/actions/workflows/release.yml"><img alt="发行构建" src="https://github.com/steven-kid/deepseek-harness-desktop/actions/workflows/release.yml/badge.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg?style=flat-square" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg?style=flat-square" />
  <img alt="Linux" src="https://img.shields.io/badge/Linux-x64-171513.svg?style=flat-square" />
</p>

<img width="2880" height="1882" alt="DeepSeek Harness Desktop 截图" src="https://github.com/user-attachments/assets/4252ec13-c09b-4e74-996f-cf4d1bcb74c8" />

DeepSeek Harness Desktop 将官方 DeepSeek Harness Web 体验封装为独立桌面应用。无需手动启动 CLI 或管理端口，打开应用即可使用完整 Harness 界面。

本项目专注于桌面宿主能力，不 fork、也不修改上游包；桌面特有能力通过 Harness 插件和少量兼容样式完成组合。核心模型、会话、设置和 Agent Runtime 仍由官方 `@deepseek-ai/dsh` 提供。

> [!IMPORTANT]
> 本项目是非官方社区封装，目前仍属于早期版本，并依赖快速演进中的 `@deepseek-ai/dsh@0.1.0-rc.6`。macOS 构建尚未经过 Apple 公证，Windows 构建尚未进行商业代码签名。

## 下载

| 平台 | 架构 | 安装包 | 下载 |
| --- | --- | --- | --- |
| macOS | Apple Silicon | DMG | [下载 Apple Silicon 版本](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.2-arm64.dmg) |
| macOS | Intel | DMG | [下载 Intel 版本](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.2-x64.dmg) |
| Windows | x64 | 安装程序 | [下载 Windows 安装程序](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.2-windows-x64.exe) |
| Windows | x64 | 便携 ZIP | [下载 Windows ZIP](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.2-windows-x64.zip) |
| Linux | x64 | AppImage | [下载 AppImage](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.2-linux-x86_64.AppImage) |
| Debian / Ubuntu | x64 | deb | [下载 deb](https://github.com/steven-kid/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-0.3.2-linux-amd64.deb) |

全部当前和历史安装包可在 [GitHub Releases](https://github.com/steven-kid/deepseek-harness-desktop/releases) 查看，也可以通过夸克网盘镜像下载：[夸克网盘 - DeepSeek Harness Desktop v0.3.1](https://pan.quark.cn/s/e2dfc232c52d)

## 为什么需要桌面版

DeepSeek Harness 已经提供完整的 Agent Runtime 和 Web UI。本项目不重复实现这些能力，而是补充桌面应用所需的宿主层：

- 自动启动和关闭本地 Harness 服务
- 自动分配随机 `127.0.0.1` 回环端口
- 等待 Harness 就绪后再显示应用窗口
- 提供单实例桌面窗口和外部链接安全处理
- 为渲染进程启用沙箱、`contextIsolation` 和导航限制
- 为 macOS、Windows 和 Linux 提供可直接安装的发行包

## 主要特性

- Harness 就绪后直接进入官方界面，无额外操作步骤
- 启动 Harness 服务时显示轻量等待界面，不再出现无响应感
- 支持系统托盘驻留，关闭主窗口后可继续在后台运行
- 保留完整的设置、模型、会话、插件和 Agent 能力
- 通过内置的 [dsh-archived-sessions](https://github.com/smackgg/dsh-archived-sessions) all-in plugin 提供“已归档”设置页和取消归档能力
- 应用退出时自动终止 Harness 子进程
- Web 服务仅监听随机本地回环端口，不暴露到局域网
- macOS 支持 Apple Silicon 和 Intel
- macOS 标题栏会与 DSH 当前浅色或深色主题自然融合
- Windows 支持 x64 安装程序与便携 ZIP
- Linux 支持 x64 AppImage 和 deb
- Windows 使用官方应用内目录浏览器，避免打包环境下的原生文件夹对话框异常
- Windows 隐藏 Electron 默认的 File、Edit、View 和 Window 菜单栏

## 安装说明

### macOS

macOS 构建已进行完整性签名，但尚未经过 Apple 公证。首次启动：

1. 打开 DMG，将 **DeepSeek Harness** 拖入“应用程序”。
2. 尝试打开应用；如果 macOS 阻止启动，请点击“完成”。
3. 打开“系统设置 → 隐私与安全性”。
4. 在“安全性”区域找到 DeepSeek Harness，点击“仍要打开”。
5. 再次点击“打开”确认。

该确认通常只需完成一次。

### Windows

Windows 安装包尚未进行商业代码签名。如果 Microsoft Defender SmartScreen 出现提示：

1. 点击“更多信息”。
2. 点击“仍要运行”。
3. 按安装向导完成安装。

### Linux

- AppImage：执行 `chmod +x DeepSeek-Harness-Desktop-*.AppImage` 后直接运行。
- Debian / Ubuntu：使用系统软件安装器打开 deb，或运行 `sudo apt install ./DeepSeek-Harness-Desktop-*.deb`。

## 安全模型

- Harness 服务仅绑定 `127.0.0.1`，每次启动使用随机端口
- Renderer 禁用 Node.js 集成
- 启用 `contextIsolation` 和 Chromium sandbox
- 新窗口和跨域导航交由系统浏览器处理
- Harness 在独立的 Electron Node 子进程中运行
- Cordis HMR 所需的 `--expose-internals` 只授予 Harness 子进程，不暴露给 Renderer

## 运行架构

```text
DeepSeek Harness Desktop
├── Electron Main
│   ├── 单实例窗口
│   ├── Harness 子进程生命周期
│   ├── 随机回环端口与就绪检测
│   └── 平台菜单和外部链接处理
│
├── Harness Child Process
│   └── @deepseek-ai/dsh web
│       └── http://127.0.0.1:<random-port>
│
└── Sandboxed BrowserWindow
    └── DeepSeek Harness Web UI
```

## 当前验证状态

| 平台 | 构建 | 打包后启动 | Web UI |
| --- | --- | --- | --- |
| macOS Apple Silicon | DMG / ZIP 通过 | 通过 | HTTP 200 |
| macOS Intel | DMG / ZIP 通过 | 通过 | HTTP 200 |
| Windows x64 | NSIS / ZIP 通过 | 通过 | HTTP 200 |
| Linux x64 | AppImage / deb 通过 | 通过 | HTTP 200 |

所有发行包都由匹配平台的 GitHub-hosted runner 构建，并在发布前执行打包后 smoke test。

## 已知限制

- 上游 DSH 仍是 RC 版本，接口和行为可能快速变化
- macOS 尚未接入 Developer ID 和 notarization
- Windows 尚未接入商业代码签名，首次启动可能出现 SmartScreen
- 尚未提供 Windows ARM64 和 Linux ARM64 构建
- 尚未集成自动更新

## 上游版本与许可

当前固定使用 `@deepseek-ai/dsh@0.1.0-rc.6`，以保证打包结果可复现。

桌面封装采用 [MIT License](LICENSE)。内置的 DeepSeek Harness 同样采用 MIT License，其许可声明保存在 [`third-party-licenses/deepseek-harness-LICENSE`](third-party-licenses/deepseek-harness-LICENSE)。

本项目与 DeepSeek 不存在隶属或官方合作关系。DeepSeek Harness 及相关名称的权利归其各自所有者所有。应用图标使用上游 DeepSeek Harness Web favicon 中的黑色鲸鱼图案。
