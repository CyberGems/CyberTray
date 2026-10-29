<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberTray/main/public/icon.png" width="120" alt="CyberTray">
</p>

## 🚀 CyberTray {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section and highlights with the ACTUAL release notes for this specific new version before tagging. NEVER leave or copy previous version notes! Use 25-45 words for the summary, lead with user-facing changes, and do not repeat the app name or version. -->
<!-- changelog-summary:start -->
Shortcut icons now render at full resolution and Steam entries resolve to the real game executable. The toolbar gains quick view, watcher and import controls, tooltips reach every card and stay on screen, and watcher notices stop duplicating installed apps.
<!-- changelog-summary:end -->

### ✨ Key Features & Highlights

- 🖼️ **Real shortcut icons at full resolution**:
  - Icons are extracted at 256 px with intact alpha and no shortcut arrow, so tiles stay sharp while the grid grows.
  - Packaged Store apps take their logo from the AppxManifest, preferring the 256 px asset, with a strict package match that never borrows another app's logo.
  - Windows' two generic placeholders are detected and rejected on both rasterization routes, letting the fallback render the real logo.
  - Icon files carry a content digest, so an upgraded icon gets a new URL and the grid stops serving the cached one.

- 🎮 **Steam shortcuts resolve to the real game executable**:
  - Library manifests locate the install folder and score its executables, so the tile shows the game path instead of an opaque `steam://` string and the containing folder can be opened.
  - Launchers kept in subfolders are found too, and helper binaries like crash handlers are skipped.
  - Uninstalled games keep the original entry and now launch through the system protocol handler instead of failing.

- 🧰 **Toolbar quick controls and a card facelift**:
  - The toolbar gains a grid/list view toggle, a watcher on/off button and an import button, keeping the full controls in Settings.
  - The search bar becomes a flexible pill sharing the card language, with an accent focus state instead of a hard ring.
  - Shortcut cards adopt the CyberLauncher recipe: soft blur, gentle borders and lift on hover, dropping the neon inset glow.
  - The app icon is refreshed everywhere, including the installer and the tray branding.

- 💬 **Tooltips that reach everything and stay on screen**:
  - Every shortcut tile shows its name and real path on hover, including small grid tiles that previously offered nothing.
  - The tooltip box is corrected vertically as well as horizontally, so long texts never spill past the screen edge.
  - The tray tooltip is standardized to the application name and global shortcut, and the importer's folder button explains what it opens.

- 🛰️ **Cleaner watcher notices**:
  - Announcements are deduplicated by resolved launch target, so an installer dropping the same shortcut on the desktop and the Start menu prompts once instead of twice.
  - Different executables or arguments are still announced separately, with the desktop copy winning.

- 🔧 **Reliability**:
  - The shelf stays mounted while hidden, so opening it no longer flashes an empty panel or resizes a visible window.
  - The import dialog keeps the shelf open while active, so the scanned plan survives a focus change.
  - Import undo works on fresh installations and is now reachable right from the success toast.

<details>
<summary><b>🌐 Ver notas de la versión en Español</b></summary>

### 🚀 Novedades de esta versión

- **Iconos reales a resolución completa**: extracción a 256 píxeles con alfa intacto y sin flecha de acceso, logos de apps de la Store desde el AppxManifest y rechazo de los marcadores genéricos de Windows. Los archivos de icono llevan un digest de contenido para que la cuadrícula deje de servir la copia cacheada.
- **Steam resuelve al ejecutable real**: los manifiestos de la biblioteca localizan la carpeta de instalación y puntúan sus ejecutables, así la tarjeta muestra la ruta del juego y se puede abrir su carpeta. Los juegos sin instalar conservan su entrada y se lanzan por el gestor de protocolos del sistema.
- **Controles rápidos y tarjetas renovadas**: la barra añade conmutador de vista, botón del vigilante e importación; el buscador se vuelve una píldora con foco de acento; las tarjetas adoptan el estilo CyberLauncher y el icono de la app se renueva en todas partes.
- **Tooltips en todo y dentro de la pantalla**: cada tarjeta muestra nombre y ruta real, también en las pequeñas; el cuadro se corrige en vertical para no salirse; el tooltip de la bandeja se estandariza y el botón de carpeta del importador se explica.
- **Avisos del vigilante más limpios**: se deduplican por destino real, así un instalador que suelta el mismo acceso en escritorio y menú Inicio avisa una sola vez.
- **Fiabilidad**: el estante abre sin destello, el diálogo de importación sobrevive al cambio de foco y deshacer la importación funciona en instalaciones nuevas y se ofrece desde el toast de éxito.

</details>

---

### 📦 Downloads & Packages

> ⬇️ **Direct download:** click the file name to download it now. Same file as in **Assets** at the bottom of this page.

| File | Description | Platform |
| :--- | :--- | :--- |
| **[`CyberTray-Setup-{{VERSION_NUM}}.exe`](https://github.com/CyberGems/CyberTray/releases/download/{{VERSION}}/CyberTray-Setup-{{VERSION_NUM}}.exe)** | 🚀 **Recommended Installer** (NSIS Setup with Start Menu & Desktop shortcuts) | Windows 10 / 11 (x64) |

---

### 🔐 VirusTotal and SHA256

> 🛡️ The report opens on VirusTotal in a new tab and does not download anything.

**Installer**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{INSTALLER_HASH}})

```text
{{INSTALLER_HASH}}
```

---

*Crafted with precision by [CyberGems](https://cybergems.org)*
