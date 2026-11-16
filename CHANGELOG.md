# Changelog

All notable changes to CyberTray are documented here.

## [1.9.1] - 2026-11-16

### 🇺🇸 English

- Rework the folder sidebar: drop the duplicate folder row, list child folders before a folder's shortcuts, and scroll overflowing names and counts on hover.
- Rebuild the status bar on a single typographic scale and give empty views a contained panel with a minimal add-shortcut action instead of banners.
- Refine the panel background with a fine grain, size the global tooltip to its content, and match the settings drawer to CyberLauncher's layout.
- Refresh the tray menu styling with app-style tooltip bubbles, a red donate heart, a diamond website icon, and an exit icon that stays red on hover.
- Prevent corner hotspots from firing after a UAC prompt: a native helper verifies the secure desktop, the shelf hides during the switch, and the gesture waits for a fresh corner entry.
- Show the CyberTray website and description in the Windows uninstall entry.
- Hide the Before you install guidance from the in-app update notes, because updates install automatically.
- Fix the forced-close retry when uninstalling the all-users installation.
- Ship winget manifests with every release and automate Windows Package Manager submissions.

### 🇪🇸 Español

- Renueva la barra lateral de carpetas: elimina la fila de carpeta duplicada, lista las subcarpetas antes de los accesos de una carpeta y desplaza los nombres y conteos que no caben al pasar el ratón.
- Reconstruye la barra de estado en una única escala tipográfica y da a las vistas vacías un panel contenido con una acción mínima de añadir acceso en lugar de banners.
- Refina el fondo del panel con un grano fino, ajusta el tooltip global a su contenido y empareja el cajón de ajustes con el diseño de CyberLauncher.
- Renueva el estilo del menú de la bandeja con tooltips tipo burbuja de la app, corazón de donación en rojo, icono de web en rombo y salida que se mantiene roja al pasar el ratón.
- Evita que los hotspots de esquina se activen tras un aviso de UAC: un asistente nativo comprueba el escritorio seguro, el estante se oculta durante el cambio y el gesto exige una entrada nueva a la esquina.
- Muestra el sitio web de CyberTray y su descripción en la entrada de desinstalación de Windows.
- Oculta la guía Antes de instalar de las notas de actualización dentro de la app, porque las actualizaciones se instalan automáticamente.
- Corrige el reintento de cierre forzado al desinstalar la instalación para todos los usuarios.
- Publica manifiestos winget con cada release y automatiza los envíos al Windows Package Manager.

## [1.9.0] - 2026-10-31

### 🇺🇸 English

- Portable edition: a single executable that keeps its data in a `data` folder beside it, so the whole install can travel on a USB stick; auto-launch registers the portable file, About shows a PORTABLE badge, and new versions are downloaded by hand from the releases page.
- Type filter: every shortcut is classified by its destination (programs, Microsoft Store apps, Steam games, links, scripts, files and folders) and the toolbar reports how many of each kind exist inside the current folder and search; the kind is derived, never stored, so existing libraries classify without a migration.
- Desktop shortcuts that point at a Microsoft Store app now resolve to the app user model id by reading the package identity written inside the file and launch through the same activation helper as a Store import; they no longer depend on the desktop file, so deleting it cannot break them, a short origin label appears under the name, and the full identifier stays available in the edit dialog.
- Refresh icon in the shortcut menu: it drops the memoized extraction and resolves again, re-reading the package manifest for Store apps and repeating the 256 px extraction for files.
- The boot screen is rebuilt around a vector icon whose three squares and plus sign zoom in and out one at a time before the shelf appears.
- The search field leaves the title bar and shares the breadcrumb row with the grid it filters, focusing with a sweeping underline and a soft halo instead of the hard cyan box it previously drew.
- Clearer text under each shortcut: the destination line uses the interface face instead of monospace, so more of the path fits and a path that does not fit scrolls on hover instead of being cut with an ellipsis, the launch counter reads "3 launches" and "1 launch" instead of "3 ex.", and tooltips no longer break long paths inside a word or overflow the card when the path has no spaces.
- The context menu measures its own box and clamps both axes, and the folder submenu opens upwards when the menu had to be flipped, so opening it near the bottom of the screen no longer cuts off delete and kill process.
- Fixed Store apps offering open location, containing folder and terminal actions that opened a random directory, and packaged apps on some systems falling back to the 32 px icon with the shortcut arrow because the Appx query used a parameter that is not present in every module.

### 🇪🇸 Español

- Edición portable: un solo ejecutable que guarda sus datos en una carpeta `data` junto a él, así la instalación entera viaja en un USB; el inicio automático registra el archivo portable, Acerca de muestra una insignia PORTABLE y las versiones nuevas se descargan a mano desde la página de releases.
- Filtro por tipo: cada acceso se clasifica por su destino (programas, apps de Microsoft Store, juegos de Steam, enlaces, scripts, archivos y carpetas) y la barra indica cuántos hay de cada tipo dentro de la carpeta y la búsqueda actuales; el tipo se deriva, nunca se guarda, así las bibliotecas existentes se clasifican sin migración.
- Los accesos de escritorio que apuntan a una app de Microsoft Store resuelven ahora al identificador de la app leyendo la identidad del paquete escrita dentro del archivo y se lanzan por el mismo asistente de activación que una importación de la Store; ya no dependen del archivo de escritorio, así que borrarlo no los rompe, bajo el nombre se ve una etiqueta corta de origen y el identificador completo sigue disponible en el diálogo de edición.
- Refrescar icono en el menú del acceso: descarta la extracción memorizada y vuelve a resolver, releyendo el manifiesto del paquete para apps de la Store y repitiendo la extracción a 256 px para archivos.
- La pantalla de arranque se reconstruye sobre un icono vectorial cuyos tres cuadrados y el signo "+" hacen zoom de uno en uno antes de que aparezca el estante.
- El buscador sale de la barra de título y comparte la fila de la ruta con la cuadrícula que filtra, con un subrayado que barre y un halo suave en lugar del recuadro cian duro que dibujaba antes.
- Texto más claro bajo cada acceso: la línea de destino usa la tipografía de la interfaz en lugar de monoespaciada, así cabe más ruta y una ruta que no cabe se desplaza al pasar el cursor en vez de cortarse con puntos suspensivos; el contador de lanzamientos dice "3 ejecuciones" y "1 ejecución" en lugar de "3 ex."; y los tooltips ya no parten las rutas largas por dentro de una palabra ni se salen de la tarjeta cuando la ruta no tiene espacios.
- El menú contextual mide su propia caja y se ajusta en ambos ejes, y el submenú de carpetas se abre hacia arriba cuando el menú tuvo que voltearse, así abrirlo cerca del borde inferior de la pantalla ya no corta sus últimas entradas, dejando eliminar y matar proceso fuera de alcance.
- Corregido que las apps de la Store ofrecían abrir ubicación, carpeta contenedora y terminal, acciones que abrían un directorio cualquiera, y que las apps empaquetadas en algunos sistemas caían al icono de 32 px con flecha de acceso porque la consulta a Appx usaba un parámetro que no existe en todos los módulos.

## [1.8.0] - 2026-10-29

### 🇺🇸 English

- Full-resolution shortcut icon extraction at 256 px with intact alpha and no shortcut arrow, AppxManifest logos for packaged Store apps, and rejection of Windows' generic placeholder icons on both rasterization routes.
- Steam shortcuts resolve to the real game executable through the library manifests, so the tile shows the game path and its folder can be opened; uninstalled games keep the original entry and launch through the system protocol handler.
- Toolbar quick controls: grid/list view toggle, watcher on/off button and import button, with the full controls kept in Settings.
- Shortcut cards adopt the CyberLauncher recipe (soft blur, gentle borders, hover lift) instead of the neon inset glow, and the search bar becomes a flexible pill sharing the card language, with an accent focus state instead of a hard ring.
- The app icon is refreshed everywhere, including the installer and the tray branding, whose logo is less desaturated at idle; icon file names carry a content digest so an upgraded icon gets a new URL and the grid stops serving the cached one.
- Tooltips reach everything and stay on screen: every shortcut tile shows name and real path on hover, including small grid tiles, the global tooltip corrects its box vertically as well as horizontally so long texts no longer spill past the bottom of the screen, the tray tooltip is standardized to the application name and global shortcut, and the importer's custom folder button explains what it opens.
- Watcher announcements are deduplicated by resolved launch target, so installers that drop the same shortcut on the desktop and the Start menu prompt once instead of twice.
- The shelf stays mounted while hidden, so opening it no longer flashes an empty panel or resizes a visible window, and the import dialog keeps the shelf open while active, so the scanned plan survives a focus change.
- Import undo works on fresh installations (the pre-import snapshot is now normalized) and is reachable from the success toast, Electron-style AUMID identifiers without a package separator now store the executable path, fixing the subtitle and launching for those shortcuts, and icons that failed to resolve no longer silently keep a generic placeholder because the fallback renders the real logo.

### 🇪🇸 Español

- Extracción de iconos a resolución completa (256 px) con alfa intacto y sin flecha de acceso, logos de apps empaquetadas de la Store desde el AppxManifest y rechazo de los marcadores genéricos de Windows en ambas rutas de rasterizado.
- Los accesos de Steam resuelven al ejecutable real del juego mediante los manifiestos de la biblioteca, así la tarjeta muestra la ruta del juego y se puede abrir su carpeta; los juegos sin instalar conservan su entrada y se lanzan por el gestor de protocolos del sistema.
- Controles rápidos en la barra: conmutador de vista cuadrícula/lista, botón de encendido del vigilante y botón de importación, manteniendo los controles completos en Ajustes.
- Las tarjetas de accesos adoptan la receta CyberLauncher (desenfoque suave, bordes discretos, elevación al pasar el cursor) en lugar del brillo interior de neón, y el buscador se vuelve una píldora flexible con el lenguaje de las tarjetas, con un estado de foco con acento en lugar de un anillo duro.
- El icono de la app se renueva en todas partes, incluidos el instalador y la marca de la bandeja, cuyo logo está menos desaturado en reposo; los archivos de icono llevan un digest de contenido para que un icono renovado reciba una URL nueva y la cuadrícula deje de servir la copia cacheada.
- Tooltips en todo y dentro de la pantalla: cada tarjeta de acceso muestra nombre y ruta real al pasar el cursor, también en las pequeñas de cuadrícula; el tooltip global corrige su cuadro en vertical además de en horizontal, así los textos largos ya no se salen por el borde inferior de la pantalla; el tooltip de la bandeja se estandariza con el nombre de la aplicación y el atajo global; y el botón de carpeta del importador explica qué abre.
- Los avisos del vigilante se deduplican por destino real de lanzamiento, así un instalador que suelta el mismo acceso en escritorio y menú Inicio avisa una sola vez en lugar de dos.
- El estante permanece montado mientras está oculto, así al abrirlo ya no destella un panel vacío ni se mueve o redimensiona una ventana visible, y el diálogo de importación mantiene abierto el estante mientras está activo, así el plan escaneado sobrevive a un cambio de foco.
- Deshacer la importación funciona en instalaciones nuevas (la copia previa se normaliza ahora) y se ofrece desde el toast de éxito, los identificadores AUMID de Electron sin separador de paquete guardan ahora la ruta del ejecutable, arreglando el subtítulo y el lanzamiento de esos accesos, y los iconos que fallaban al resolverse ya no conservan en silencio un marcador genérico porque el fallback dibuja el logo real.

## [1.7.0] - 2026-10-28

### 🇺🇸 English

- New-item watcher for the desktop, the Start menu and Microsoft Store apps, with its own toggles, prompt duration and a notice that never steals focus.
- Notification center (bell menu) that keeps undecided detections and lets you add, dismiss or clear them in bulk.
- Windows shortcut import and synchronization with a review step, non-destructive updates, and undo for the last import.
- Scheduled configuration backups (every 6 h, 12 h, 24 h or 7 days, keeping 1 to 7 copies) with one-click restore and an automatic pre-restore snapshot.
- First-run onboarding for language, import and global hotkey, reopenable from Settings, plus keyboard navigation, per-shortcut global hotkeys and a recent shortcuts strip.
- Searchable folder tree picker, themed tray context menu, boot loader and branded NSIS installer, and a vector glyph for shortcuts that have no icon of their own.
- Shortcuts with no folder are listed under All instead of a phantom category, and the hidden bucket is excluded from the tree, the pickers and the drop targets; the shelf no longer starts pinned and its chrome is painted above the background layer; default folder names stay localized after a factory reset.
- The vault PIN is stored hashed instead of in clear text, including inside backups.
- Silent failures when a shortcut icon cannot be resolved are now reported, and stale usage counters and a blocking process launch path found during the internal review were fixed.

### 🇪🇸 Español

- Vigilante de elementos nuevos en el escritorio, el menú Inicio y las apps de Microsoft Store, con sus propios interruptores, duración del aviso y un aviso que nunca roba el foco.
- Centro de notificaciones (menú de la campana) que conserva lo detectado y sin decidir, con acciones para añadir, descartar o limpiar en bloque.
- Importación y sincronización de accesos de Windows con paso de revisión, actualizaciones no destructivas y deshacer de la última importación.
- Copias de seguridad programadas de la configuración (cada 6 h, 12 h, 24 h o 7 días, conservando entre 1 y 7) con restauración en un clic y copia previa automática.
- Asistente de primera ejecución para idioma, importación y atajo global, reabrible desde Ajustes, más navegación por teclado, atajos globales por acceso y franja de accesos recientes.
- Selector de carpetas con búsqueda, menú contextual propio de la bandeja, cargador de arranque e instalador NSIS con imagen de marca, y glifo vectorial para los accesos que no tienen icono propio.
- Los accesos sin carpeta se listan en Todo en vez de una categoría fantasma, y el cajón oculto queda fuera del árbol, de los selectores y de las zonas donde se puede soltar; el estante ya no arranca fijado y su marco se pinta por encima de la capa de fondo; los nombres de carpeta por defecto siguen localizados tras restaurar los valores de fábrica.
- El PIN de la caja fuerte se guarda con hash en lugar de texto plano, también dentro de las copias de seguridad.
- Los fallos silenciosos al resolver el icono de un acceso ahora se notifican, y se corrigieron los contadores de uso obsoletos y una ruta de lanzamiento de procesos bloqueante detectados en la revisión interna.

## [1.6.0] - 2026-09-14

### 🇺🇸 English

- Work-area overlay: the panel fills the monitor work area instead of a thin top or bottom shelf, so menus and tooltips are no longer clipped by the window; the window is not resizable, and show/hide, hotkey, tray and hotspot activation work as before.
- Density slider: scale shortcut cards, titles and the folder tree from the header bar, with Appearance staying in sync.
- In-app tooltips: folder, grid, About and process controls use the CyberTray tooltip instead of the native Windows balloon.
- In-app updates: check, download and install new versions from About without opening a browser; an optional auto-check on boot notifies you when a release is available, and installing still requires confirmation.

### 🇪🇸 Español

- Superposición del área de trabajo: el panel llena el área de trabajo del monitor en lugar de un estante fino arriba o abajo, así los menús y los tooltips ya no se cortan por la ventana; la ventana no es redimensionable y el inicio por mostrar/ocultar, atajo, bandeja y zona activa sigue igual.
- Deslizador de densidad: escala las tarjetas de accesos, los títulos y el árbol de carpetas desde la barra de cabecera, con Apariencia sincronizada.
- Tooltips integrados: los controles de carpetas, cuadrícula, Acerca de y procesos usan el tooltip de CyberTray en lugar del globo nativo de Windows.
- Actualizaciones integradas: comprueba, descarga e instala versiones nuevas desde Acerca de sin abrir el navegador; una comprobación automática opcional al arrancar avisa cuando hay una versión disponible, e instalar sigue requiriendo confirmación.

## [1.5.2] - 2026-09-08

### 🇺🇸 English

- Official icon refresh: the renewed CyberTray icon is applied across the Windows installer, taskbar, system tray, favicon and in-app branding.
- The refreshed logo is added to the project README.

### 🇪🇸 Español

- Renovación del icono oficial: el nuevo icono de CyberTray se aplica en el instalador de Windows, la barra de tareas, la bandeja del sistema, el favicon y la marca interna de la app.
- El logo renovado se añade al README del proyecto.

## [1.5.1] - 2026-06-02

### 🇺🇸 English

- Much lower idle CPU usage: the shelf unmounts its whole interface when closed, hidden windows run with background throttling, CSS animations pause while the shelf is hidden, process scanning became on-demand, and UAC guard and hotspot polling were tuned.
- Selection mode with multi-select (select all, invert and clear) and bulk delete with a confirmation step.
- Toast notifications confirm system actions such as shortcuts added, updated or deleted, with Undo for deletions.
- Shortcuts keep their arguments and working directory at launch, so games and tools that need custom flags start correctly.
- Tray menu gains a dynamic version header, a monitor submenu to switch the target display and a checkbox to show or hide the Cyber-Handle, and windows re-align when monitors connect, disconnect or change resolution.
- Shortcut cards show their category badge while browsing the All tab.
- The Vault becomes the Files area, with a configurable physical folder path and a Browse button to pick it.
- Single instance lock keeps a second copy of the app from running.
- Fixed a doubled v in the displayed version string, an incorrect version string in About, and an invalid publisherName in the installer configuration.

### 🇪🇸 Español

- Uso de CPU en reposo mucho menor: el estante desmonta toda su interfaz al cerrarse, las ventanas ocultas se ejecutan con limitación en segundo plano, las animaciones CSS se pausan con el estante oculto, el escaneo de procesos pasa a bajo demanda y el sondeo de UAC y de zonas activas se ajustó.
- Modo de selección con selección múltiple (seleccionar todo, invertir y limpiar) y borrado en bloque con paso de confirmación.
- Toasts de confirmación para acciones del sistema, como accesos añadidos, actualizados o borrados, con Deshacer para los borrados.
- Los accesos conservan sus argumentos y su directorio de trabajo al lanzarse, así los juegos y herramientas que necesitan flags propias arrancan correctamente.
- El menú de la bandeja añade una cabecera dinámica con la versión, un submenú de monitores para cambiar la pantalla objetivo y una casilla para mostrar u ocultar el Cyber-Handle, y las ventanas se realinean cuando los monitores se conectan, desconectan o cambian de resolución.
- Las tarjetas de accesos muestran su insignia de categoría al navegar por la pestaña Todo.
- El Vault pasa a llamarse Files, con una ruta de carpeta física configurable y un botón Examinar para elegirla.
- El bloqueo de instancia única impide que la app se abra dos veces.
- Corregido un doble prefijo v en la cadena de versión mostrada, una cadena de versión incorrecta en Acerca de y un publisherName inválido en la configuración del instalador.
