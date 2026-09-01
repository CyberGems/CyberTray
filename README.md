<h1 align="center">CyberTray — System Tray Launcher</h1>

<p align="center">
  <strong>A cyberpunk-themed shortcut launcher and dock</strong> — animated shelf that slides out from your screen edge, with system monitoring, process management, and a secure file vault.
</p>

<p align="center">
  <a href="https://github.com/CyberGems/CyberTray/releases/latest">
    <img src="https://img.shields.io/badge/⚡_Download_Latest_Release-(Windows_64--bit)-00F2FF?style=for-the-badge&logo=windows&logoColor=000000" alt="Download Latest Release" />
  </a>
  <a href="https://github.com/CyberGems/CyberTray/releases">
    <img src="https://img.shields.io/badge/All_Releases-Changelog-18181B?style=for-the-badge&logo=github&logoColor=white" alt="All Releases" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows-0078D4.svg?logo=windows&logoColor=white" alt="Platform" />
  <img src="https://img.shields.io/badge/version-1.5.1-00F0FF.svg" alt="Version" />
  <img src="https://img.shields.io/badge/Electron-42-512BD4.svg?logo=electron&logoColor=white" alt="Electron" />
  <a href="https://github.com/CyberGems/CyberTray/wiki"><img src="https://img.shields.io/badge/%F0%9F%93%96_Wiki-Documentation-222222?style=flat-square&logo=github&logoColor=white" alt="Wiki" /></a>
</p>

A cyberpunk-themed **system tray shortcut launcher and dock** for Windows. CyberTray provides a sleek, animated shelf that slides out from the top or bottom of the screen, allowing you to organize, search, and launch applications, files, and URLs — all wrapped in a stunning neon glassmorphic interface.

*Free and open source — no ads, no tracking, and no data collection. Just enjoy it.*

---

## 🎯 Why CyberTray?

Your desktop is cluttered. The Start Menu is slow. The taskbar is full. CyberTray gives you a **dedicated launchpad** that stays out of the way until you need it — then slides out with a smooth animation, ready to launch anything in milliseconds.

| Need | Solution |
|---|---|
| Quick access to apps & files | Animated shelf with search, categories, and drag-and-drop import |
| Save taskbar space | System tray icon + auto-hiding handle bar |
| Launch from anywhere | Global hotkey (`Alt+T`), hot corners, hover trigger |
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

### 🎯 Cyber-Handle (Activator Bar)
- **Always-on-top bar** docked to screen edge
- **Click to toggle** shelf visibility
- **Drag to reposition** horizontally
- **Auto-hide** after configurable inactivity delay
- **Hover trigger** option to auto-show on mouse enter
- **Context menu** for quick settings access

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
- **Auto-Updates** — Check for updates on boot via GitHub Releases API
- **Bilingual UI** — Full English and Spanish interface

---

## 🛠️ Tech Stack & Architecture

- **Platform:** Windows 10 / 11
- **Framework:** Electron 42 + React 19 + TypeScript
- **Bundler:** Vite 6
- **Styling:** CSS custom properties with glassmorphism effects
- **Architecture:** Dual-window (shelf + handle) with system tray integration

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
│   │   ├── HandleBar.tsx         Cyber-Handle activator bar
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

### Dual-Window Architecture

| Window | Purpose | Behavior |
|---|---|---|
| **Shelf** | Main shortcut panel | Resizable, always-on-top, slide animation |
| **Handle** | Activator bar | Non-focusable, mouse-pass-through, auto-hide |

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

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Scope |
|---|---|---|
| `Alt+T` (default) | Toggle CyberTray shelf | Global |
| `Escape` | Exit selection mode | Application |
| `Ctrl+A` | Select all shortcuts | Selection mode |

---

## ❓ Frequently Asked Questions

### What is CyberTray?

CyberTray is a system tray application launcher for Windows. It provides an animated shelf that slides out from your screen edge, giving you quick access to organized shortcuts, system monitoring, process management, and a secure file vault.

### How do I show/hide CyberTray?

Click the system tray icon, use the global hotkey (`Alt+T` by default), or click the Cyber-Handle bar. You can also configure hot corners to trigger it by dwelling your cursor in a screen corner.

### What is the Cyber-Handle?

The Cyber-Handle is a small, always-on-top bar docked to your screen edge. Click it to toggle the shelf, drag it to reposition horizontally, or right-click for quick settings access. It can auto-hide after inactivity.

### How does the Cyber-Vault work?

The Cyber-Vault is a PIN-protected folder for storing sensitive files. You can enable PIN protection in Settings → Vault, set an auto-lock timeout, and use the "Desktop Sweep" feature to move all desktop files into the vault.

### Can I import my existing shortcuts?

Yes. Drag and drop `.exe` or `.lnk` files directly into the shelf to add them. You can also organize shortcuts into categories and folders.

### Does CyberTray support multiple monitors?

Yes. You can choose which display CyberTray appears on, or use "Follow cursor" mode to show it on whichever screen your mouse is on.

---

## ❤️ Donate

**CyberTray** is one of the gems in [CyberGems](https://github.com/CyberGems#-all-apps--repositories), a personal suite I've spent thousands of hours building and refining for my own use. I've decided to share the whole suite with the world — completely free and open-source.

If you'd like to support this work, a donation would mean a lot. Thank you! 🙏

<p align="center">
  <a href="https://www.paypal.com/donate/?hosted_button_id=M4PY3UPJA5Y6Q"><img src="https://img.shields.io/badge/Donate-PayPal-0070BA?style=for-the-badge&logo=paypal" alt="Donate via PayPal" /></a>
  <a href="https://ko-fi.com/cybergems"><img src="https://img.shields.io/badge/Support_me_on_Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white" alt="Support me on Ko-fi" /></a>
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

<div align="center" style="background:#0D0F17; border:1px solid rgba(0,255,255,0.12); border-radius:12px; padding:28px 20px; margin-top:32px;">

### Thanks for using CyberTray! 🎉

Made by [**CyberGems**](https://cybergems.org)

</div>
