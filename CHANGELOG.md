# Changelog

All notable changes to CyberTray are documented here. Releases before 1.7.0 are described in the [GitHub releases](https://github.com/CyberGems/CyberTray/releases) page.

## [1.9.0] - 2026-10-30

### Added

- Portable edition: a single executable that keeps its data in a `data` folder beside it, so the whole install can travel on a USB stick. Auto-launch registers the portable file, About shows a PORTABLE badge, and new versions are downloaded by hand from the releases page.
- Type filter: every shortcut is classified by its destination (programs, Microsoft Store apps, Steam games, links, scripts, files and folders) and the toolbar reports how many of each kind exist inside the current folder and search. The kind is derived, never stored, so existing libraries classify without a migration.
- Desktop shortcuts that point at a Microsoft Store app now resolve to the app user model id by reading the package identity written inside the file, and launch through the same activation helper as a Store import. They no longer depend on the desktop file, so deleting it cannot break them.
- Refresh icon in the shortcut menu: it drops the memoized extraction and resolves again, re-reading the package manifest for Store apps and repeating the 256 px extraction for files.
- The boot screen is rebuilt around a vector icon whose three squares and plus sign zoom in and out one at a time before the shelf appears.

### Changed

- The search field leaves the title bar and shares the breadcrumb row with the grid it filters, focusing with a sweeping underline and a soft halo instead of a hard box.
- The destination line under each name uses the interface face instead of monospace, so more of the path fits, and a path that does not fit scrolls on hover instead of being cut with an ellipsis.
- The launch counter reads "3 launches" and "1 launch" instead of "3 ex.", in the interface face and dimmer than the path.
- Store apps show a short origin label under the name; the full identifier stays available in the edit dialog.
- The context menu measures its own box and clamps both axes, and the folder submenu opens upwards when the menu had to be flipped.

### Fixed

- Opening the context menu near the bottom of the screen cut off its last entries, leaving delete and kill process out of reach.
- The search field drew a hard cyan focus box that survived the redesign.
- Store apps offered open location, containing folder and terminal actions that opened a random directory.
- Packaged apps on some systems fell back to the 32 px icon with the shortcut arrow, because the Appx query used a parameter that is not present in every module.
- Tooltips broke long paths inside a word, or overflowed the card when the path had no spaces.

---

## Versión en español

Los lanzamientos anteriores a la 1.7.0 están descritos en la página de [releases de GitHub](https://github.com/CyberGems/CyberTray/releases).

### [1.9.0] - 2026-10-30

#### Añadido

- Edición portable: un solo ejecutable que guarda sus datos en una carpeta `data` junto a él, así la instalación entera viaja en un USB. El inicio automático registra el archivo portable, Acerca de muestra una insignia PORTABLE y las versiones nuevas se descargan a mano desde la página de releases.
- Filtro por tipo: cada acceso se clasifica por su destino (programas, apps de Microsoft Store, juegos de Steam, enlaces, scripts, archivos y carpetas) y la barra indica cuántos hay de cada tipo dentro de la carpeta y la búsqueda actuales. El tipo se deriva, nunca se guarda, así las bibliotecas existentes se clasifican sin migración.
- Los accesos de escritorio que apuntan a una app de Microsoft Store resuelven ahora al identificador de la app leyendo la identidad del paquete escrita dentro del archivo, y se lanzan por el mismo asistente de activación que una importación de la Store. Ya no dependen del archivo de escritorio, así que borrarlo no los rompe.
- Refrescar icono en el menú del acceso: descarta la extracción memorizada y vuelve a resolver, releyendo el manifiesto del paquete para apps de la Store y repitiendo la extracción a 256 px para archivos.
- La pantalla de arranque se reconstruye sobre un icono vectorial cuyos tres cuadrados y el signo "+" hacen zoom de uno en uno antes de que aparezca el estante.

#### Cambiado

- El buscador sale de la barra de título y comparte la fila de la ruta con la cuadrícula que filtra, con un subrayado que barre y un halo suave en lugar de un recuadro duro.
- La línea de destino bajo cada nombre usa la tipografía de la interfaz en lugar de monoespaciada, así cabe más ruta, y una ruta que no cabe se desplaza al pasar el cursor en vez de cortarse con puntos suspensivos.
- El contador de lanzamientos dice "3 ejecuciones" y "1 ejecución" en lugar de "3 ex.", en la tipografía de la interfaz y más tenue que la ruta.
- Las apps de la Store muestran una etiqueta corta de origen bajo el nombre; el identificador completo sigue disponible en el diálogo de edición.
- El menú contextual mide su propia caja y se ajusta en ambos ejes, y el submenú de carpetas se abre hacia arriba cuando el menú tuvo que voltearse.

#### Corregido

- Abrir el menú contextual cerca del borde inferior de la pantalla cortaba sus últimas entradas, dejando eliminar y matar proceso fuera de alcance.
- El buscador dibujaba un recuadro de foco cian duro que sobrevivía al rediseño.
- Las apps de la Store ofrecían abrir ubicación, carpeta contenedora y terminal, acciones que abrían un directorio cualquiera.
- Las apps empaquetadas en algunos sistemas caían al icono de 32 px con flecha de acceso, porque la consulta a Appx usaba un parámetro que no existe en todos los módulos.
- Los tooltips partían las rutas largas por dentro de una palabra, o se salían de la tarjeta cuando la ruta no tenía espacios.

---

## [1.8.0] - 2026-10-29

### Added

- Full-resolution shortcut icon extraction at 256 px with intact alpha and no shortcut arrow, AppxManifest logos for packaged Store apps, and rejection of Windows' generic placeholder icons on both rasterization routes.
- Steam shortcuts resolve to the real game executable through the library manifests, so the tile shows the game path and its folder can be opened; uninstalled games keep the original entry and launch through the system protocol handler.
- Toolbar quick controls: grid/list view toggle, watcher on/off button and import button, with the full controls kept in Settings.
- Icon file names carry a content digest so an upgraded icon gets a new URL and the grid stops serving the cached one.
- Tooltips on every shortcut tile showing name and real path, including small grid tiles, and an explanation on the importer's custom folder button.

### Changed

- The search bar is a flexible pill sharing the card language, with an accent focus state instead of a hard ring.
- Shortcut cards adopt the CyberLauncher recipe (soft blur, gentle borders, hover lift) instead of the neon inset glow.
- The app icon is refreshed everywhere, including the installer and the tray branding, and the tray branding logo is less desaturated at idle.
- The tray tooltip is standardized to the application name and global shortcut.
- Watcher announcements are deduplicated by resolved launch target, so installers that drop the same shortcut on the desktop and the Start menu prompt once instead of twice.

### Fixed

- The shelf stays mounted while hidden, so opening it no longer flashes an empty panel or resizes a visible window.
- The import dialog keeps the shelf open while active, so the scanned plan survives a focus change.
- Import undo works on fresh installations (the pre-import snapshot is now normalized) and is reachable from the success toast.
- The global tooltip corrects its box vertically as well as horizontally, so long texts no longer spill past the bottom of the screen.
- Icons that failed to resolve no longer silently keep a generic placeholder; the fallback renders the real logo.
- Electron-style AUMID identifiers without a package separator now store the executable path, fixing the subtitle and launching for those shortcuts.

---

## Versión en español

Los lanzamientos anteriores a la 1.7.0 están descritos en la página de [releases de GitHub](https://github.com/CyberGems/CyberTray/releases).

### [1.8.0] - 2026-10-29

#### Añadido

- Extracción de iconos a resolución completa (256 px) con alfa intacto y sin flecha de acceso, logos de apps empaquetadas de la Store desde el AppxManifest y rechazo de los marcadores genéricos de Windows en ambas rutas de rasterizado.
- Los accesos de Steam resuelven al ejecutable real del juego mediante los manifiestos de la biblioteca, así la tarjeta muestra la ruta del juego y se puede abrir su carpeta; los juegos sin instalar conservan su entrada y se lanzan por el gestor de protocolos del sistema.
- Controles rápidos en la barra: conmutador de vista cuadrícula/lista, botón de encendido del vigilante y botón de importación, manteniendo los controles completos en Ajustes.
- Los archivos de icono llevan un digest de contenido para que un icono renovado reciba una URL nueva y la cuadrícula deje de servir la copia cacheada.
- Tooltips en cada tarjeta de acceso con nombre y ruta real, también en las pequeñas de cuadrícula, y una explicación en el botón de carpeta del importador.

#### Cambiado

- El buscador es una píldora flexible con el lenguaje de las tarjetas y un estado de foco con acento en lugar de un anillo duro.
- Las tarjetas de accesos adoptan la receta CyberLauncher (desenfoque suave, bordes discretos, elevación al pasar el cursor) en lugar del brillo interior de neón.
- El icono de la app se renueva en todas partes, incluidos el instalador y la marca de la bandeja, y el logo de la bandeja está menos desaturado en reposo.
- El tooltip de la bandeja se estandariza con el nombre de la aplicación y el atajo global.
- Los avisos del vigilante se deduplican por destino real de lanzamiento, así un instalador que suelta el mismo acceso en escritorio y menú Inicio avisa una sola vez en lugar de dos.

#### Corregido

- El estante permanece montado mientras está oculto, así al abrirlo ya no destella un panel vacío ni se mueve o redimensiona una ventana visible.
- El diálogo de importación mantiene abierto el estante mientras está activo, así el plan escaneado sobrevive a un cambio de foco.
- Deshacer la importación funciona en instalaciones nuevas (la copia previa se normaliza ahora) y se ofrece desde el toast de éxito.
- El tooltip global corrige su cuadro en vertical además de en horizontal, así los textos largos ya no se salen por el borde inferior de la pantalla.
- Los iconos que fallaban al resolverse ya no conservan en silencio un marcador genérico; el fallback dibuja el logo real.
- Los identificadores AUMID de Electron sin separador de paquete guardan ahora la ruta del ejecutable, arreglando el subtítulo y el lanzamiento de esos accesos.

---

## [1.7.0] - 2026-10-27

### Added

- New-item watcher for the desktop, the Start menu and Microsoft Store apps, with its own toggles, prompt duration and a notice that never steals focus.
- Notification center (bell menu) that keeps undecided detections and lets you add, dismiss or clear them in bulk.
- Windows shortcut import and synchronization with a review step, non-destructive updates, and undo for the last import.
- Scheduled configuration backups (every 6 h, 12 h, 24 h or 7 days, keeping 1 to 7 copies) with one-click restore and an automatic pre-restore snapshot.
- First-run onboarding for language, import and global hotkey, reopenable from Settings.
- Keyboard navigation, per-shortcut global hotkeys and a recent shortcuts strip.
- Searchable folder tree picker, themed tray context menu, boot loader and branded NSIS installer.
- Vector glyph for shortcuts that have no icon of their own.

### Changed

- Shortcuts with no folder are listed under All instead of a phantom category, and the hidden bucket is excluded from the tree, the pickers and the drop targets.
- The shelf no longer starts pinned, and its chrome is painted above the background layer.
- Default folder names stay localized after a factory reset.

### Security

- The vault PIN is stored hashed instead of in clear text, including inside backups.

### Fixed

- Silent failures when a shortcut icon cannot be resolved are now reported.
- Stale usage counters and a blocking process launch path found during the internal review.

---

## Versión en español

Los lanzamientos anteriores a la 1.7.0 están descritos en la página de [releases de GitHub](https://github.com/CyberGems/CyberTray/releases).

### [1.7.0] - 2026-10-27

#### Añadido

- Vigilante de elementos nuevos en el escritorio, el menú Inicio y las apps de Microsoft Store, con sus propios interruptores, duración del aviso y un aviso que nunca roba el foco.
- Centro de notificaciones (menú de la campana) que conserva lo detectado y sin decidir, con acciones para añadir, descartar o limpiar en bloque.
- Importación y sincronización de accesos de Windows con paso de revisión, actualizaciones no destructivas y deshacer de la última importación.
- Copias de seguridad programadas de la configuración (cada 6 h, 12 h, 24 h o 7 días, conservando entre 1 y 7) con restauración en un clic y copia previa automática.
- Asistente de primera ejecución para idioma, importación y atajo global, reabrible desde Ajustes.
- Navegación por teclado, atajos globales por acceso y franja de accesos recientes.
- Selector de carpetas con búsqueda, menú contextual propio de la bandeja, cargador de arranque e instalador NSIS con imagen de marca.
- Glifo vectorial para los accesos que no tienen icono propio.

#### Cambiado

- Los accesos sin carpeta se listan en Todo en vez de una categoría fantasma, y el cajón oculto queda fuera del árbol, de los selectores y de las zonas donde se puede soltar.
- El estante ya no arranca fijado, y su marco se pinta por encima de la capa de fondo.
- Los nombres de carpeta por defecto siguen localizados tras restaurar los valores de fábrica.

#### Seguridad

- El PIN de la caja fuerte se guarda con hash en lugar de texto plano, también dentro de las copias de seguridad.

#### Corregido

- Los fallos silenciosos al resolver el icono de un acceso ahora se notifican.
- Contadores de uso obsoletos y una ruta de lanzamiento de procesos bloqueante detectados en la revisión interna.
