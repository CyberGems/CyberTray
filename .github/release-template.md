<p align="center">
  <img src="https://raw.githubusercontent.com/CyberGems/CyberTray/main/public/icon.png" width="120" alt="CyberTray">
</p>

## 🚀 CyberTray {{VERSION}}: Release Notes

### 🚀 What's new in this release

<!-- IMPORTANT FOR AGENTS & MAINTAINERS: Always rewrite this entire section and highlights with the ACTUAL release notes for this specific new version before tagging. NEVER leave or copy previous version notes! Use 25-45 words for the summary, lead with user-facing changes, and do not repeat the app name or version. -->
<!-- changelog-summary:start -->
A portable edition joins the installer, a type filter sorts shortcuts by destination, and Store apps resolve to their app id from the desktop file. Icons refresh on demand and the boot screen animates the icon piece by piece.
<!-- changelog-summary:end -->

### ✨ Key Features & Highlights

- 💼 **Portable edition**:
  - A second download ships as one executable that keeps its data in a `data` folder beside it, so the install travels on a USB stick with nothing to set up.
  - Auto-launch registers the portable file, About shows a PORTABLE badge and explains the manual update path, and the updater sends you to the releases page instead of trying to swap the running file.

- 🗂️ **Filter the grid by type**:
  - Every shortcut is classified by its destination: programs, Microsoft Store apps, Steam games, links, scripts, and files or folders.
  - The filter shows how many of each kind exist inside the folder and the search you have open, not the whole library.
  - The kind is derived on the fly, so an existing library classifies itself without a migration.

- 🏪 **Store apps now behave like Store apps**:
  - A desktop shortcut pointing at a Microsoft Store app resolves to its app user model id by reading the package identity stored inside the file, and launches through the same activation helper as a Store import.
  - Deleting the desktop shortcut no longer breaks the entry, and a desktop import of those apps lands on the identifier the first time.
  - The line under the name shows a short origin label instead of the raw identifier, which stays available in the edit dialog.

- 🖼️ **Refresh an icon on demand**:
  - The shortcut menu gains Refresh icon: it drops the memoized extraction and resolves again, re-reading the package manifest for Store apps or repeating the 256 px extraction for files.
  - The new file carries a content digest in its name, so the grid requests the image again instead of showing the cached copy.

- 🌟 **A boot screen worth watching**:
  - The icon is drawn as vector art at full resolution, and its three squares and plus sign zoom in and out one at a time before the shelf appears.
  - The sequence is tuned so all four pulses are actually seen, and it is skipped when the system asks for reduced motion.

- 🔧 **Smaller fixes that add up**:
  - The context menu measures its own height, so opening it near the bottom no longer cuts off delete and kill process.
  - The search field keeps a sweeping underline instead of the hard cyan focus box, and the destination line uses the interface face, so more of the path fits.
  - Long paths in tooltips wrap after separators instead of breaking mid-word or overflowing the card.
  - The launch counter reads "3 launches" and "1 launch" in place of the old abbreviation.

<details>
<summary><b>🌐 Ver notas de la versión en Español</b></summary>

### 🚀 Novedades de esta versión

- **Edición portable**: un segundo archivo es un solo ejecutable que guarda sus datos en una carpeta `data` junto a él, así la instalación viaja en un USB sin nada que configurar. El inicio automático registra el archivo portable, Acerca de muestra la insignia PORTABLE y explica la actualización manual, y el actualizador te lleva a la página de releases en lugar de intentar reemplazar el archivo en ejecución.
- **Filtro por tipo en la cuadrícula**: cada acceso se clasifica por su destino (programas, apps de Microsoft Store, juegos de Steam, enlaces, scripts y archivos o carpetas), y el filtro cuenta cuántos hay de cada tipo dentro de la carpeta y la búsqueda abiertas, no en toda la biblioteca. El tipo se deriva al vuelo, así una biblioteca existente se clasifica sin migración.
- **Las apps de la Store se comportan como tales**: un acceso de escritorio que apunta a una app de Microsoft Store resuelve a su identificador leyendo la identidad del paquete guardada dentro del archivo, y se lanza por el mismo asistente de activación que una importación de la Store. Borrar el acceso de escritorio ya no rompe la entrada, y bajo el nombre se ve una etiqueta corta de origen en lugar del identificador crudo, que sigue disponible en el diálogo de edición.
- **Refrescar un icono cuando haga falta**: el menú del acceso añade Refrescar icono, que descarta la extracción memorizada y vuelve a resolver, releyendo el manifiesto del paquete para apps de la Store o repitiendo la extracción a 256 px para archivos. El archivo nuevo lleva un digest de contenido en el nombre, así la cuadrícula pide la imagen otra vez en lugar de mostrar la copia cacheada.
- **Una pantalla de arranque que se deja mirar**: el icono se dibuja en vectorial a resolución completa y sus tres cuadrados y el signo "+" hacen zoom de uno en uno antes de que aparezca el estante. La secuencia está ajustada para que los cuatro pulsos se vean de verdad, y se omite cuando el sistema pide movimiento reducido.
- **Arreglos pequeños que suman**: el menú contextual mide su propia altura, así abrirlo cerca del borde inferior ya no corta eliminar ni matar proceso; el buscador conserva el subrayado que barre en lugar del recuadro cian duro; la línea de destino usa la tipografía de la interfaz y cabe más ruta; las rutas largas de los tooltips cortan tras los separadores en vez de partir palabras; y el contador dice "3 ejecuciones" y "1 ejecución" en lugar de "3 ex.".

</details>

---

### 📦 Downloads & Packages

> ⬇️ **Direct download:** click the file name to download it now. Same file as in **Assets** at the bottom of this page.

| File | Description | Platform |
| :--- | :--- | :--- |
| **[`CyberTray-Setup-{{VERSION_NUM}}.exe`](https://github.com/CyberGems/CyberTray/releases/download/{{VERSION}}/CyberTray-Setup-{{VERSION_NUM}}.exe)** | 🚀 **Recommended Installer** (NSIS Setup with Start Menu & Desktop shortcuts) | Windows 10 / 11 (x64) |
| **[`CyberTray-Portable-{{VERSION_NUM}}.exe`](https://github.com/CyberGems/CyberTray/releases/download/{{VERSION}}/CyberTray-Portable-{{VERSION_NUM}}.exe)** | 💼 **Portable Edition** (single executable, keeps its data in a `data` folder beside it, no installation) | Windows 10 / 11 (x64) |

---

### 🔐 VirusTotal and SHA256

> 🛡️ The report opens on VirusTotal in a new tab and does not download anything.

**Installer**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{INSTALLER_HASH}})

```text
{{INSTALLER_HASH}}
```

**Portable edition**: [View VirusTotal report](https://www.virustotal.com/gui/file/{{PORTABLE_HASH}})

```text
{{PORTABLE_HASH}}
```

---

*Crafted with precision by [CyberGems](https://cybergems.org)*
