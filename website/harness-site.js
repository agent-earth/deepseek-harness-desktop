const translations = {
  zh: {
    features: "桌面能力",
    design: "设计思路",
    downloads: "下载",
    desktopPreview: "桌面版",
    preview: "DeepSeek Harness 非官方桌面版",
    headline: "Harness 桌面即用",
    heroParagraphOne:
      "将官方 DeepSeek Harness 完整封装为桌面应用，无需命令行，也无需手动管理端口。",
    heroParagraphTwo:
      "保留模型、工具、技能、会话、沙箱和存储等全部能力，并内置 awesome-dsh-plugin 社区插件市场。",
    downloadMac: "下载 macOS 版",
    downloadWindows: "下载 Windows 版",
    downloadLinux: "下载 Linux 版",
    allDownloads: "全部下载",
    quark: "夸克网盘",
    oneClick: "一键安装",
    sourceInstall: "源码安装",
    copy: "复制",
    introTitle: "让 Agent 在桌面上持续工作",
    introDescription:
      "模型是 Agent 的灵魂。Harness 赋予 Agent 理解环境和使用工具的能力，Desktop 则让这一切打开即用。",
    capabilityOneTitle: "原生桌面封装",
    capabilityOneDescription:
      "保留官方 Web UI 与 Harness 内核，只增加桌面窗口、生命周期和系统集成。",
    capabilityTwoTitle: "内置插件市场",
    capabilityTwoDescription:
      "直接浏览、搜索、安装、更新和卸载社区插件，无需另行配置 pnpm。",
    capabilityThreeTitle: "跨平台发布",
    capabilityThreeDescription:
      "提供 Apple Silicon、Intel Mac、Windows x64 与 Linux x64 安装包。",
    designLabel: "设计思路",
    designTitle: "能力保持不变，使用方式更加自然",
    designOneTitle: "打开即用",
    designOneDescription:
      "启动应用时自动拉起 DeepSeek Harness，并在服务准备完成后加载官方 Web UI。你无需记住命令，也不必处理端口冲突。",
    designTwoTitle: "本地运行，有迹可循",
    designTwoDescription:
      "Harness 服务运行在本机，工作目录、会话与工具调用保持原有机制。桌面封装不会改变 Harness 的能力边界。",
    designThreeTitle: "适配不同系统",
    designThreeDescription:
      "在 macOS、Windows 和 Linux 上使用一致的 Harness 体验，并针对系统窗口、菜单、托盘与目录选择器进行适配。",
    runtimeReady: "已就绪",
    localDirectory: "本地目录",
    persistent: "持续保存",
    demoTitle: "完整的 DeepSeek Harness，原生的桌面体验",
    startNow: "开始使用",
    downloadTitle: "选择适合你的安装包",
    macDescription: "支持 Apple Silicon 与 Intel Mac。",
    otherPlatformsDescription: "提供 Windows 安装程序与 Linux AppImage。",
    joinTitle: "让 Harness 随手可用",
    joinDescription:
      "这是一个非官方社区项目，只封装桌面端能力，不修改 DeepSeek Harness 本身。欢迎下载、反馈与共同完善。",
    viewGithub: "查看 GitHub",
    community: "非官方社区项目",
  },
  en: {
    features: "Desktop",
    design: "Design",
    downloads: "Downloads",
    desktopPreview: "Desktop",
    preview: "Unofficial DeepSeek Harness Desktop",
    headline: "Harness on desktop",
    heroParagraphOne:
      "The official DeepSeek Harness, packaged as a desktop app. No terminal and no port management required.",
    heroParagraphTwo:
      "Models, tools, skills, sessions, sandboxes, and storage remain intact, with the awesome-dsh-plugin community market built in.",
    downloadMac: "Download for macOS",
    downloadWindows: "Download for Windows",
    downloadLinux: "Download for Linux",
    allDownloads: "All downloads",
    quark: "Quark Drive",
    oneClick: "One-click install",
    sourceInstall: "From source",
    copy: "Copy",
    introTitle: "keeps agents working on your desktop",
    introDescription:
      "The model is the soul of an agent. Harness provides the environment and tools; Desktop makes the full experience ready to open.",
    capabilityOneTitle: "Native desktop shell",
    capabilityOneDescription:
      "The official Web UI and Harness runtime remain intact. Only desktop windows, lifecycle, and system integration are added.",
    capabilityTwoTitle: "Built-in plugin market",
    capabilityTwoDescription:
      "Browse, search, install, update, and remove community plugins without setting up pnpm separately.",
    capabilityThreeTitle: "Cross-platform releases",
    capabilityThreeDescription:
      "Packages for Apple Silicon, Intel Mac, Windows x64, and Linux x64.",
    designLabel: "Design",
    designTitle: "The same capabilities, in a more natural workflow",
    designOneTitle: "Open and go",
    designOneDescription:
      "The app starts DeepSeek Harness and loads the official Web UI when the service is ready. No commands to remember and no port conflicts to handle.",
    designTwoTitle: "Local and traceable",
    designTwoDescription:
      "Harness runs locally, preserving the existing workspace, session, and tool-call mechanisms. The desktop shell does not change its capability boundaries.",
    designThreeTitle: "Adapted to every system",
    designThreeDescription:
      "A consistent Harness experience on macOS, Windows, and Linux, with native handling for windows, menus, tray, and directory pickers.",
    runtimeReady: "Ready",
    localDirectory: "Local directory",
    persistent: "Persistent",
    demoTitle: "Complete DeepSeek Harness, native desktop experience",
    startNow: "Get Started",
    downloadTitle: "Choose your installer",
    macDescription: "Available for Apple Silicon and Intel Mac.",
    otherPlatformsDescription: "Windows installer and Linux AppImage packages.",
    joinTitle: "Harness, always within reach",
    joinDescription:
      "An unofficial community project that packages the desktop experience without changing DeepSeek Harness itself. Downloads and feedback are welcome.",
    viewGithub: "View GitHub",
    community: "Unofficial community project",
  },
};

const platformConfig = {
  mac: {
    labelKey: "downloadMac",
    href: "https://github.com/agent-earth/deepseek-harness-desktop/releases/latest",
    iconPath:
      "M17.05 12.54c-.02-2.27 1.86-3.37 1.95-3.42a4.2 4.2 0 0 0-3.31-1.79c-1.39-.15-2.74.83-3.45.83-.72 0-1.81-.82-2.98-.8a4.38 4.38 0 0 0-3.69 2.25c-1.6 2.77-.41 6.84 1.12 9.08.76 1.09 1.64 2.31 2.81 2.27 1.14-.05 1.57-.73 2.95-.73 1.36 0 1.77.73 2.96.7 1.23-.02 2-1.1 2.73-2.2a9.08 9.08 0 0 0 1.25-2.55 3.93 3.93 0 0 1-2.34-3.64ZM14.78 5.85a4 4 0 0 0 .92-2.86 4.1 4.1 0 0 0-2.66 1.36 3.8 3.8 0 0 0-.95 2.75 3.39 3.39 0 0 0 2.69-1.25Z",
  },
  windows: {
    labelKey: "downloadWindows",
    href: "https://github.com/agent-earth/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-latest-windows-x64.exe",
    iconPath:
      "M2 4.2 10.5 3v8.15H2V4.2Zm9.5-1.34L22 1.35v9.8H11.5V2.86ZM2 12.15h8.5V20.3L2 19.1v-6.95Zm9.5 0H22v9.8l-10.5-1.51v-8.29Z",
  },
  linux: {
    labelKey: "downloadLinux",
    href: "https://github.com/agent-earth/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-latest-linux-x86_64.AppImage",
    iconPath:
      "M12.1 2.1c-2.5 0-3.7 2-3.7 4.6v1.5c-1.8 1.2-3.1 3.7-3.1 6.4 0 3.9 2.8 7.2 6.7 7.2s6.7-3.3 6.7-7.2c0-2.7-1.3-5.2-3.1-6.4V6.7c0-2.6-1.1-4.6-3.5-4.6Zm-1.7 4.7c0-1.8.5-2.8 1.7-2.8 1.1 0 1.6 1 1.6 2.8v.5a7.1 7.1 0 0 0-3.3 0v-.5Zm-1.8 7.4c.6 0 1.1.5 1.1 1.1 0 .6-.5 1.1-1.1 1.1-.6 0-1.1-.5-1.1-1.1 0-.6.5-1.1 1.1-1.1Zm6.8 0c.6 0 1.1.5 1.1 1.1 0 .6-.5 1.1-1.1 1.1-.6 0-1.1-.5-1.1-1.1 0-.6.5-1.1 1.1-1.1Zm-6.3 4c1.8.9 4 .9 5.8 0-.6 1.1-1.7 1.8-2.9 1.8s-2.3-.7-2.9-1.8Z",
  },
};

let activeLanguage = window.localStorage.getItem("language") || "zh";

function detectPlatform() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  const normalized = platform.toLowerCase();

  if (normalized.includes("win")) {
    return "windows";
  }

  if (normalized.includes("linux")) {
    return "linux";
  }

  return "mac";
}

function updatePrimaryDownload() {
  const platform = platformConfig[detectPlatform()];
  const primaryDownload = document.querySelector("#primary-download");
  const primaryLabel = document.querySelector("#primary-download-label");
  const platformIconPath = document.querySelector("#platform-icon-path");

  primaryDownload.href = platform.href;
  primaryLabel.textContent = translations[activeLanguage][platform.labelKey];
  platformIconPath.setAttribute("d", platform.iconPath);
}

function applyLanguage(language) {
  activeLanguage = translations[language] ? language : "zh";
  document.documentElement.lang = activeLanguage === "zh" ? "zh-CN" : "en";
  window.localStorage.setItem("language", activeLanguage);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const value = translations[activeLanguage][key];

    if (value) {
      element.textContent = value;
    }
  });

  document.querySelectorAll(".language-button").forEach((button) => {
    const isActive = button.dataset.language === activeLanguage;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  updatePrimaryDownload();
}

document.querySelectorAll(".language-button").forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.language));
});

const terminalCommands = {
  download: "$ open DeepSeek-Harness-Desktop*.dmg",
  source: "$ git clone https://github.com/agent-earth/deepseek-harness-desktop",
};

document.querySelectorAll(".terminal-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".terminal-tab").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
    });
    document.querySelector("#terminal-command").textContent =
      terminalCommands[button.dataset.terminal];
  });
});

document.querySelector(".copy-button").addEventListener("click", async () => {
  const command = document.querySelector("#terminal-command").textContent.replace(/^\$ /, "");
  await navigator.clipboard?.writeText(command);
});

const header = document.querySelector(".replica-header");

function updateHeader() {
  header.classList.toggle("scrolled", window.scrollY > 120);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

applyLanguage(activeLanguage);
