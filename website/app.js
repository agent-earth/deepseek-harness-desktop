const translations = {
  zh: {
    github: "GitHub",
    eyebrow: "基于官方 DeepSeek Harness",
    headlinePrimary: "让 Harness",
    headlineAccent: "随手可用",
    description:
      "无需命令行，无需管理端口。打开桌面应用，即可使用完整的 DeepSeek Harness Agent 体验。",
    downloadMac: "下载 macOS 版",
    downloadWindows: "下载 Windows 版",
    downloadLinux: "下载 Linux 版",
    allDownloads: "全部下载",
    localFirst: "本地优先",
    ready: "开箱即用",
    noCli: "无需命令行",
    mirrorLabel: "更多下载方式",
    mirrorTitle: "选择适合你的版本",
    releaseDescription: "全部平台与历史版本",
    quark: "夸克网盘",
    quarkDescription: "国内镜像，免提取码",
    community: "非官方社区项目",
    powered: "Powered by",
  },
  en: {
    github: "GitHub",
    eyebrow: "Built on the official DeepSeek Harness",
    headlinePrimary: "Harness,",
    headlineAccent: "always within reach",
    description:
      "No terminal. No port management. Open the desktop app and get the complete DeepSeek Harness agent experience.",
    downloadMac: "Download for macOS",
    downloadWindows: "Download for Windows",
    downloadLinux: "Download for Linux",
    allDownloads: "All downloads",
    localFirst: "Local first",
    ready: "Ready to use",
    noCli: "No command line",
    mirrorLabel: "More ways to download",
    mirrorTitle: "Choose your platform",
    releaseDescription: "All platforms and versions",
    quark: "Quark Drive",
    quarkDescription: "China mirror, no passcode",
    community: "Unofficial community project",
    powered: "Powered by",
  },
};

const platformConfig = {
  mac: {
    labelKey: "downloadMac",
    href: "https://github.com/agent-earth/deepseek-harness-desktop/releases/latest/download/DeepSeek-Harness-Desktop-latest-arm64.dmg",
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

function applyLanguage(language) {
  activeLanguage = language;
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  window.localStorage.setItem("language", language);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = translations[language][key];
  });

  document.querySelectorAll(".language-button").forEach((button) => {
    const isActive = button.dataset.language === language;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  updatePrimaryDownload();
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

document.querySelectorAll(".language-button").forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.language));
});

applyLanguage(activeLanguage);
