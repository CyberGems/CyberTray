<p align="center">
  <img src="public/icon.png" width="128" height="128" alt="CyberTray icon / icono de CyberTray" />
</p>

<h1 align="center">CyberTray — System Tray Launcher</h1>

<p align="center">
  <strong>A shortcut launcher and dock</strong> — animated shelf that slides out from your screen edge, with system monitoring, process management, and a secure file vault.
</p>

<p align="center">
  <a href="https://github.com/CyberGems/CyberTray/releases/latest"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FCyberGems%2FCyberTray%2Fmain%2Fpackage.json&query=%24.version&prefix=%E2%9A%A1%20RELEASE%20v&style=for-the-badge&label=&labelColor=555555&color=555555" alt="Download Latest Release" /><img src="https://img.shields.io/badge/-(WINDOWS_64--BIT)-0047B3?style=for-the-badge&logo=windows&logoColor=white" alt="Windows 64-bit" /></a>
  &nbsp;<a href="https://github.com/CyberGems/CyberTray/releases"><img src="https://img.shields.io/badge/All_Releases-Changelog-18181B?style=for-the-badge&logo=github&logoColor=white" alt="All Releases" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows-0078D4.svg?logo=windows&logoColor=white" alt="Platform" height="24" />&nbsp;
  <img src="https://img.shields.io/badge/Electron-42-512BD4.svg?logo=electron&logoColor=white" alt="Electron" height="24" />&nbsp;
  <a href="https://github.com/CyberGems/CyberTray/wiki"><img src="https://img.shields.io/badge/%F0%9F%93%96_Wiki-Documentation-222222?style=flat-square&logo=github&logoColor=white" alt="Wiki" height="24" /></a>
</p>

A **system tray shortcut launcher and dock** for Windows. CyberTray provides a sleek, animated shelf that slides out from the top or bottom of the screen, allowing you to organize, search, and launch applications, files, and URLs — all wrapped in a stunning neon glassmorphic interface.

*Free and open source — no ads, no tracking, and no data collection. Just enjoy it.*

---

## 🎯 Why CyberTray?

Your desktop is cluttered. The Start Menu is slow. The taskbar is full. CyberTray gives you a **dedicated launchpad** that stays out of the way until you need it — then slides out with a smooth animation, ready to launch anything in milliseconds.

| Need | Solution |
|---|---|
| Quick access to apps & files | Animated shelf with search, categories, and drag-and-drop import |
| Save taskbar space | System tray icon + auto-hiding shelf |
| Launch from anywhere | Global hotkey (`Alt+T`) and hot corners |
| Monitor your system | Real-time RAM, CPU, disk, and VRAM telemetry |
| Manage running processes | Process viewer with kill functionality |
| Secure sensitive files | PIN-protected vault with desktop sweep |
| Make it yours | 5 neon themes, custom backgrounds, grid or list layout |

---

## ✨ Key Features

### 🚀 Shortcut Launcher
- **Shortcut Management** — Register, edit, and launch applications, files, and URLs
- **Drag & Drop Import** — Drag files or executables directly into the shelf
- **Categories & Folders** — Organize shortcuts with nested folder support
- **Favorites System** — Mark shortcuts for quick access
- **Group Launch** — Launch all shortcuts in a category at once
- **Multi-Selection** — Bulk delete with selection mode (`Ctrl+A`, `Escape`)
- **Real-Time Search** — Instant filtering across all shortcuts
- **Sort Options** — Alphabetical, most used, recently added

### 🔲 Hotspots (Screen Corners)
- **Corner activation** — Trigger CyberTray by dwelling cursor in any screen corner
- **Configurable delay** before activation
- **UAC secure desktop guard** — Auto-hides when UAC prompt appears

### 📊 Neural Telemetry (System Monitoring)
- **RAM Usage** — Real-time progress bar with percentage
- **CPU Info** — Model and core count
- **Disk Space** — Per-drive monitoring via WMI
- **VRAM Detection** — Background GPU memory fetch
- **System Uptime** — Track since last boot

### ⚙️ Process Matrix
- **Running Processes** — View PID, name, and memory usage
- **Kill Processes** — Terminate directly from the list
- **Search & Sort** — Find processes quickly

### 🔐 Cyber-Vault (Secure Files)
- **PIN Protection** — 4-digit PIN to lock/unlock the vault
- **Desktop Sweep** — Move all desktop files/folders to the secure vault
- **Auto-Lock Timeout** — Configurable (immediate, 1min, 5min, 15min, session)
- **Custom Vault Path** — Store vault files in any location

### 🎨 Appearance Customization
- **5 Neon Themes** — Netrunner Cyan, Synthetic Purple, Sandevistan Amber, Arasaka Crimson, Maelstrom Emerald
- **Background Types** — Solid color, gradient presets, 4 built-in image presets, custom image
- **Blur Level** — Adjustable backdrop blur intensity
- **Opacity** — Background transparency control
- **Icon Size** — Adjustable grid icon sizing
- **View Modes** — Grid or list layout

### 🔊 Sound System
- **Launch Sound** — Default chime on shortcut launch
- **Custom Audio** — MP3, WAV, OGG, AAC, M4A support
- **Folder Navigation Sounds** — Audio feedback when browsing categories

### 💾 Data Management
- **Backup & Restore** — Export/import configuration as JSON (with embedded icons)
- **In-app Updates** — Check, download, and install from About via GitHub Releases (`electron-updater`). Auto-check on boot notifies you; install is always confirmed.
- **Bilingual UI** — Full English and Spanish interface

---

## 🛠️ Tech Stack & Architecture

- **Platform:** Windows 10 / 11
- **Framework:** Electron 42 + React 19 + TypeScript
- **Bundler:** Vite 6
- **Styling:** CSS custom properties with glassmorphism effects
- **Architecture:** Single shelf window with system tray integration

```
CyberTray/
├── electron/
│   ├── main.ts           Main process (windows, tray, IPC, hotspots, icons)
│   ├── preload.ts        Context bridge (IPC API)
│   └── updater.ts        Auto-update via GitHub Releases
├── src/
│   ├── App.tsx           Main application component
│   ├── main.tsx          React entry point
│   ├── locales.ts        i18n (English / Spanish)
│   ├── lib/appUtils.ts   Utility functions
│   ├── components/
│   │   ├── ShortcutGrid.tsx      Main shortcut display grid
│   │   ├── ShortcutFormModal.tsx Add/edit shortcut dialog
│   │   ├── SettingsPanel.tsx     Configuration modal
│   │   ├── TelemetryBar.tsx      System metrics footer
│   │   ├── ProcessMatrixModal.tsx Process viewer/killer
│   │   ├── VaultPanel.tsx        Secure file vault settings
│   │   ├── PinPadModal.tsx       PIN entry for vault
│   │   ├── AboutModal.tsx        Version and update info
│   │   ├── FolderTree.tsx        Category/folder navigation
│   │   ├── ToastStack.tsx        Notification toasts
│   │   └── CyberTrayLogo.tsx     Animated logo
├── public/               Static assets & icons
└── vite.config.ts        Vite configuration
```

### Window Architecture

| Window | Purpose | Behavior |
|---|---|---|
| **Shelf** | Main shortcut panel | Resizable, always-on-top, slide animation |

Communication between frontend and backend uses Electron IPC via `contextBridge`. Hotspot polling runs at 200ms intervals. UAC guard monitors for `consent.exe` to auto-hide during secure desktop sessions.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22+
- npm

### Development

```bash
git clone https://github.com/CyberGems/CyberTray.git
cd CyberTray
npm install
npm run dev
```

### Build for Production

```bash
npm run build
npm run build:electron
```

The installer will be in the `release/` directory.

### 🛡️ Windows SmartScreen

Windows may show a SmartScreen warning the first time you run the CyberTray installer — this is an unsigned hobby app, so Windows hasn't built reputation for the file yet. This is expected; the source is public so you can inspect exactly what it does.

To continue:

1. Click **More info**.
2. Click **Run anyway**.

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Scope |
|---|---|---|
| `Alt+T` (default) | Toggle CyberTray shelf | Global |
| `Escape` | Exit selection mode | Application |
| `Ctrl+A` | Select all shortcuts | Selection mode |

---

## ❤️ Donate

**CyberTray** is one of the projects in [CyberGems](https://github.com/CyberGems#-all-apps--repositories), a personal set of daily-use tools for Windows. I've spent countless hours building and refining it for my own use, and it will continue to be maintained by me. I recently decided to share the entire suite with the world, completely free and open-source.

If you're enjoying CyberTray, I'd be truly grateful for your support! You can show your appreciation by [giving a star](https://github.com/CyberGems/CyberTray) on GitHub or making a donation. Thank you! 🙏

<p align="center">
  <a href="https://www.paypal.com/donate/?hosted_button_id=M4PY3UPJA5Y6Q"><img src="https://img.shields.io/badge/Donate-PayPal-0070BA?style=for-the-badge&logo=paypal" alt="Donate via PayPal" /></a>
</p>

<p align="center">
  <a href="https://ko-fi.com/cybergems"><img src="https://img.shields.io/badge/Support_me_on_Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Support me on Ko-fi" /></a>
</p>

<p align="center">
  <a href="https://buymeacoffee.com/cybergems"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee" /></a>
</p>

<div align="center">

<details>
<summary><b>Crypto donations (BTC, ETH, USDT, LTC) — click to view addresses</b></summary>

<div align="left">

| Asset | Network | Address | QR |
|---|---|---|---|
| <img src="docs/donate/btc.svg" width="18" height="18" valign="middle" alt="BTC" /> **BTC** | Bitcoin | `bc1q5mxzz05nmvsheqzx7970euswta3fksxzcfzag4` | ![BTC QR](docs/donate/qr-btc.png) |
| <img src="docs/donate/eth.svg" width="18" height="18" valign="middle" alt="ETH" /> **ETH** | Ethereum (ERC20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![ETH QR](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | Ethereum (ERC20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![USDT ERC20 QR](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | BNB Smart Chain (BEP20) | `0x79b703Ec0f77493679Fcd280aF3b983E20c580B8` | ![USDT BEP20 QR](docs/donate/qr-eth.png) |
| <img src="docs/donate/usdt.svg" width="18" height="18" valign="middle" alt="USDT" /> **USDT** | Tron (TRC20) | `TSVbSk1HSyZ1NprCnAYiw56ECwXgH887mD` | ![USDT TRC20 QR](docs/donate/qr-usdt-tron.png) |
| <img src="docs/donate/ltc.svg" width="18" height="18" valign="middle" alt="LTC" /> **LTC** | Litecoin | `LWGnEHgcFCE2BRkzLnsdPDD8Y8ZeDK577X` | ![LTC QR](docs/donate/qr-ltc.png) |

> ⚠️ Send only the selected asset on the indicated network. Using the wrong network will result in permanent loss of funds.

</div>

</details>

</div>

---

## 📄 License

CyberTray is distributed under the terms of the GNU General Public License v3.0. See [LICENSE](LICENSE) for the full license text.

---

## ❓ FAQ

For frequently asked questions, troubleshooting guides, and detailed configuration instructions, visit the [FAQ](https://github.com/CyberGems/CyberTray/wiki/FAQ) or the [online documentation](https://cybergems.org/docs/cybertray/FAQ).

---

<div align="center" style="background:#0D0F17; border:1px solid rgba(0,255,255,0.12); border-radius:12px; padding:28px 20px; margin-top:32px;">

### Thanks for using CyberTray! 🎉

Made by [**CyberGems**](https://cybergems.org)

</div>
