<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberTray/main/public/icon.png" width="120" alt="CyberTray">
</p>

## 🗂️ CyberTray {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section and highlights with the ACTUAL release notes for this specific new version before tagging. NEVER leave or copy previous version notes! Use 25-45 words for the summary, lead with user-facing changes, and do not repeat the app name or version. Keep the Spanish mirror inside the details block in sync: translate the summary and rewrite the highlights. -->
<!-- changelog-summary:start -->
System tray submenus for Recent launches and Help now open as side-by-side flyout panels with number shortcuts, hover dwell, and arrow navigation. Every window gains navigation locking, validated launch targets and config writes, safer elevated launches, and clearer startup error reporting.
<!-- changelog-summary:end -->

> **New to CyberTray?** A system tray launchpad for Windows with a searchable shelf of apps, files and links, live system telemetry, a process viewer, and a PIN-protected vault.

---

### ✨ Key Features & Highlights

- 🪟 **Side-by-side tray flyout panels**: `Recent launches` (with `1` to `0` quick-launch keys) and `Help` open beside the main card on hover or click, support arrow keys and `Escape`, and anchor cleanly to any monitor edge.
- 🛡️ **Hardened windows and launching**: Navigation is locked across the shelf, tray, and watcher windows, launch actions check saved items and recents, elevated launches pass encoded PowerShell commands, config values normalize per key, and startup errors show clearly.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

### 🚀 Novedades de esta versión

Los submenús de bandeja de Lanzamientos recientes y Ayuda ahora se abren como paneles flyout laterales con atajos numéricos, retardo hover y navegación con flechas. Todas las ventanas añaden bloqueo de navegación, validación de accesos y ajustes, lanzamientos elevados más seguros e informes claros ante fallos de inicio.

> **¿Nuevo en CyberTray?** Un lanzador desde la bandeja del sistema para Windows, con una estantería con búsqueda de apps, archivos y enlaces, telemetría del sistema en vivo, visor de procesos y bóveda protegida con PIN.

---

### ✨ Novedades destacadas

- 🪟 **Paneles flyout laterales en la bandeja**: `Lanzamientos recientes` (con teclas `1` a `0`) y `Ayuda` se abren junto a la tarjeta principal al pasar el cursor o pulsar, responden a flechas y `Escape` y se orientan según el borde del monitor.
- 🛡️ **Ventanas y lanzamientos reforzados**: Se bloquea la navegación en el estante, bandeja y avisos, los lanzamientos se validan contra la biblioteca y recientes, los comandos elevados van codificados para PowerShell, los ajustes se normalizan clave a clave y los errores de arranque se muestran al usuario.

### ℹ️ Antes de instalar

- **Windows:** esta versión aún no está firmada digitalmente. SmartScreen puede avisar antes de ejecutarla: **Más información › Ejecutar de todas formas**. Cuando Smart App Control está activado, Windows rechaza programas sin firmar; consulta la [política de firma de código](https://github.com/CyberGems/.github/blob/main/CODE_SIGNING.md). Verifica la descarga con los checksums SHA256 que aparecen más abajo.

</details>

---

### ℹ️ Before you install

- **Windows:** this release is not code-signed yet. SmartScreen may ask before it runs: **More info › Run anyway**. Where Smart App Control is on, Windows refuses unsigned programs; see the [code signing policy](https://github.com/CyberGems/.github/blob/main/CODE_SIGNING.md). Verify the download with the SHA256 checksums below.

---

### 📦 Downloads & Packages

> ⬇️ **Direct download:** click a file name to download it now. Same files as in **Assets** at the bottom of this page.

| File | Description | Platform |
| :--- | :--- | :--- |
| **[`CyberTray-Setup-{{VERSION_NUM}}.exe`](https://github.com/CyberGems/CyberTray/releases/download/{{VERSION}}/CyberTray-Setup-{{VERSION_NUM}}.exe)** | 🚀 **Recommended Installer** (NSIS Setup with Start Menu & Desktop shortcuts) | Windows 10 / 11 (x64) |
| **[`CyberTray-Portable-{{VERSION_NUM}}.exe`](https://github.com/CyberGems/CyberTray/releases/download/{{VERSION}}/CyberTray-Portable-{{VERSION_NUM}}.exe)** | 💼 **Portable Edition** (single executable, keeps its data in a `data` folder beside it, no installation) | Windows 10 / 11 (x64) |

---

### 🔐 VirusTotal and SHA256

> 🛡️ The report opens on VirusTotal and does not download anything.

**Installer**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{INSTALLER_HASH}})

```text
{{INSTALLER_HASH}}
```

**Portable**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{PORTABLE_HASH}})

```text
{{PORTABLE_HASH}}
```

---

📜 **Full changelog:** browse every version in [CHANGELOG.md](https://github.com/CyberGems/CyberTray/blob/main/CHANGELOG.md).

*Crafted with precision by [CyberGems](https://cybergems.org)*
