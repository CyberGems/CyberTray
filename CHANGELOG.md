# Changelog

All notable changes to CyberTray are documented here. Releases before 1.7.0 are described in the [GitHub releases](https://github.com/CyberGems/CyberTray/releases) page.

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
