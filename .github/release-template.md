<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberTray/main/public/icon.png" width="120" alt="CyberTray">
</p>

## 🗂️ CyberTray {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section and highlights with the ACTUAL release notes for this specific new version before tagging. NEVER leave or copy previous version notes! Use 25-45 words for the summary, lead with user-facing changes, and do not repeat the app name or version. Keep the Spanish mirror inside the details block in sync: translate the summary and rewrite the highlights. -->
<!-- changelog-summary:start -->
The folder sidebar and status bar get a cleaner rebuild, empty views offer a minimal add action, and the tray menu wears app-style bubbles with red donate and exit accents. Hotspots no longer fire after UAC prompts, uninstall metadata gains the website, and releases ship winget manifests.
<!-- changelog-summary:end -->

> **New to CyberTray?** A system tray launchpad for Windows with a searchable shelf of apps, files and links, live system telemetry, a process viewer, and a PIN-protected vault.

---

### ✨ Key Features & Highlights

- 🗂️ **A calmer panel**:
  - The folder sidebar drops its duplicate row, lists child folders before a folder's shortcuts, and scrolls overflowing names and counts on hover.
  - The status bar follows one typographic scale, and empty views become a contained panel with a minimal add-shortcut action instead of banners.

- 🎨 **Refined surfaces**:
  - A fine-grain panel background replaces the dot mesh, the global tooltip sizes itself to its content, and the settings drawer matches CyberLauncher's layout.

- 🧰 **A neater tray menu**:
  - App-style tooltip bubbles, a red donate heart, a diamond website icon, and an exit icon that keeps its red hover.

- 🛡️ **Hotspots under control**:
  - A native helper verifies the input desktop, so corner gestures no longer fire after a UAC prompt: the shelf hides during the switch and the gesture waits for a fresh corner entry.

- 🧹 **Uninstall and updates**:
  - The Windows Apps entry shows the CyberTray website and description, and forced-close retries behave correctly for all-users installs.
  - The in-app update notes skip the "Before you install" guidance, and every release now ships winget manifests for the Windows Package Manager.

<details>
<summary><b>🇪🇸 Ver notas de la versión en Español</b></summary>

### 🚀 Novedades de esta versión

La barra lateral de carpetas y la barra de estado lucen una reconstrucción más limpia, las vistas vacías ofrecen una acción mínima de añadir y el menú de la bandeja viste burbujas tipo app con acentos rojos de donación y salida. Los hotspots ya no se activan tras avisos de UAC, la entrada de desinstalación suma la web y los releases publican manifiestos winget.

> **¿Nuevo en CyberTray?** Un lanzador desde la bandeja del sistema para Windows, con una estantería con búsqueda de apps, archivos y enlaces, telemetría del sistema en vivo, visor de procesos y bóveda protegida con PIN.

---

### ✨ Novedades destacadas

- 🗂️ **Un panel más sereno**:
  - La barra lateral de carpetas elimina su fila duplicada, lista las subcarpetas antes de los accesos de una carpeta y desplaza los nombres y conteos que no caben al pasar el ratón.
  - La barra de estado sigue una única escala tipográfica, y las vistas vacías pasan a un panel contenido con una acción mínima de añadir acceso en lugar de banners.

- 🎨 **Superficies refinadas**:
  - Un fondo de grano fino sustituye a la malla de puntos, el tooltip global se ajusta a su contenido y el cajón de ajustes empareja con el diseño de CyberLauncher.

- 🧰 **Un menú de bandeja más pulcro**:
  - Tooltips tipo burbuja de la app, corazón de donación en rojo, icono de web en rombo y salida que mantiene su rojo al pasar el ratón.

- 🛡️ **Hotspots bajo control**:
  - Un asistente nativo comprueba el escritorio de entrada, así los gestos de esquina ya no se activan tras un aviso de UAC: el estante se oculta durante el cambio y el gesto espera una entrada nueva a la esquina.

- 🧹 **Desinstalación y actualizaciones**:
  - La entrada de Aplicaciones de Windows muestra el sitio web y la descripción de CyberTray, y los reintentos de cierre forzado funcionan bien en instalaciones para todos los usuarios.
  - Las notas de actualización dentro de la app omiten la guía «Antes de instalar», y cada release publica manifiestos winget para el Windows Package Manager.

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
