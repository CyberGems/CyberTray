export const translations = {
  en: {
    // Top Bar & Toolbar
    search_placeholder: "Search shortcuts...",
    clear_search: "Clear search",
    tooltip_pin_on: "Pin window (Keep on top)",
    tooltip_pin_off: "Unpin window (Allow background)",
    tooltip_settings: "CyberTray Settings",
    tooltip_minimize: "Minimize / Hide Shelf",
    tooltip_add_shortcut: "Register new shortcut",
    tooltip_launch_all: "Launch all shortcuts in this category (Group Launch)",
    tooltip_size_slider: "Icon sizing grid",
    tooltip_sort: "Sort items",
    sort_alpha: "Alphabetical (A-Z)",
    sort_recent: "Most Used",
    sort_added: "Recently Added",

    // Shortcuts Details
    shortcut_run_admin: "Run as Administrator",
    shortcut_delay: "Launch delay: {delay}s",
    shortcut_args: "Startup arguments: {args}",
    shortcut_hotkey: "Global Hotkey: {hotkey}",
    shortcut_not_found: "File or application target not found",
    shortcut_admin_tag: "ADMIN",
    shortcut_no_items: "No shortcuts registered here yet. Drag & Drop files or executables here to register them!",

    // Sidebar Config Tabs
    tab_general: "GENERAL SYSTEM",
    tab_appearance: "INTERFACE CORE",
    tab_shortcuts: "LAUNCH SPECS",

    // Settings Panel Titles & Descriptions
    settings_title: "CYBERTRATE NEURAL CONFIG",
    general_language: "INTERFACE LANGUAGE",
    general_language_desc: "Select display language (Inglés / Español).",
    general_shortcut: "GLOBAL DISPLAY KEYBIND",
    general_shortcut_desc: "Press combinations of keys (e.g. Alt+T) to trigger CyberTray.",
    general_shortcut_rec: "Recording shortcut...",
    general_monitor: "DISPLAY MATRIX DOCK",
    general_monitor_desc: "Select the display monitor where CyberTray will be anchored.",
    general_dock_position: "SHELF DOCK POSITION",
    general_dock_position_desc: "Slide Top-Down (Drawer) or Bottom-Up (Tray).",
    dock_top: "Top Screen Edge (Slide Down)",
    dock_bottom: "Bottom Screen Edge (Slide Up)",
    general_handle_position: "CYBER-HANDLE GRID POSITION",
    general_handle_position_desc: "Set the horizontal location of the visual screen handle activator.",
    handle_left: "Left Edge Aligned",
    handle_center: "Center Screen Aligned",
    handle_right: "Right Edge Aligned",
    general_handle_visible: "CYBER-HANDLE VISIBILITY",
    general_handle_visible_desc: "Always show the cybernetic handle strip on screen borders.",
    general_hide_on_blur: "AUTO HIDE ON BLUR",
    general_hide_on_blur_desc: "Collapse the shelf back into handle view when clicking elsewhere.",
    general_hide_on_dead_zone: "HIDE ON BACKGROUND CLICK",
    general_hide_on_dead_zone_desc: "Automatically collapses the shelf when clicking on empty background areas.",
    general_show_taskbar: "SHOW IN WINDOWS TASKBAR",
    general_show_taskbar_desc: "Displays CyberTray in your native OS taskbar program stack.",

    // Appearance Config Tabs
    app_blur: "NEURAL BACKDROP BLUR",
    app_blur_desc: "Adjust the intensity of the glassmorphism backdrop shader.",
    app_opacity: "BACKDROP OPACITY INDEX",
    app_opacity_desc: "Controls absolute background transparency.",
    app_bg_type: "BACKGROUND CORE ENGINE",
    app_bg_type_solid: "Solid Color",
    app_bg_type_gradient: "Digital Gradient",
    app_bg_type_image: "Cyber Image",
    app_bg_solid_color: "SOLID FILL COLOR",
    app_bg_solid_color_desc: "Pick a solid background color for your cybernetic window.",
    app_bg_gradients: "CYBERNETIC GRADIENTS",
    app_bg_gradients_desc: "Select a custom digital gradient background preset.",
    app_bg_preset_images: "PRESET BACKGROUND IMAGES",
    app_bg_preset_images_desc: "Choose from 4 high-tech visual overlays.",
    app_bg_custom: "CUSTOM CYBER BACKGROUND",
    app_bg_custom_desc: "Specify a custom image URL or select a local path from your computer.",
    app_bg_apply: "APPLY",
    app_bg_browse: "MY COMPUTER",
    app_theme_presets: "NEON THEME DECAL COLOR",
    app_theme_presets_desc: "Choose your cybersecurity faction theme glow preset.",
    preset_cyan: "Netrunner Cyan",
    preset_purple: "Synthetic Purple",
    preset_amber: "Sandevistan Amber",
    preset_crimson: "Arasaka Crimson",
    preset_emerald: "Maelstrom Emerald",

    // System Settings
    sys_startup: "LAUNCH AUTO WITH WINDOWS",
    sys_startup_desc: "Installs registry hooks to boot CyberTray silently as Handle upon OS startup.",
    sys_backup: "DATA PERSISTENCE & CONSOLE",
    sys_backup_desc: "Import or export independent application indexes.",
    sys_export_btn: "Export Backup",
    sys_import_btn: "Import Backup",
    sys_data_dir_btn: "Open Data Folder",
    sys_diag_btn: "Open DevTools",
    general_hover_trigger: "AUTO-SHOW ON HOVER",
    general_hover_trigger_desc: "Automatically triggers CyberTray when mouse enters the handle window.",
    general_hover_delay: "HOVER ACTIVATION DELAY",
    general_hover_delay_desc: "Adjust how long the mouse must hover over the handle to open the shelf (in milliseconds).",

    // Categories
    cat_all: "ALL",
    cat_ai: "AI CORES",
    cat_browsers: "BROWSERS",
    cat_comm: "NET CHATS",
    cat_design: "CYBER ART",
    cat_dev: "GRID CODING",
    cat_ent: "CHIP MUSIC",
    cat_gaming: "HOLODECKS",
    cat_utils: "DOCK TOOLS",

    // Status Bar & Metrics
    stat_total_shortcuts: "SHORTCUTS INJECTED",
    stat_total_categories: "ACTIVE CATEGORIES",
    stat_cpu: "CPU STRUCTURE",
    stat_ram: "RAM CACHE LOAD",
    stat_disks: "STORAGE ARRAY",
    stat_uptime: "SYSTEM UPTIME",
    stat_uptime_val: "{h}h {m}m",

    // Notifications & Toasts
    notif_shortcut_added: "Injected target '{name}' to {category} successfully.",
    notif_shortcut_removed: "Purged access index for '{name}'.",
    notif_config_saved: "CyberTray configuration saved to local disk.",
    notif_group_launching: "Booting Category Group: {count} applications starting...",
    notif_backup_exported: "Backup exported successfully.",
    notif_backup_imported: "Config imported successfully. Rebooting UI...",

    // Modal Add/Edit Shortcut
    modal_title_add: "REGISTER NEW SHORTCUT MODULE",
    modal_title_edit: "CONFIGURE SHORTCUT MODULE",
    modal_label_name: "SHORTCUT ALIAS NAME",
    modal_label_path: "PHYSICAL TARGET PATH / FILE / URL",
    modal_label_args: "STARTUP EXECUTION ARGUMENTS",
    modal_label_delay: "STARTUP COOLDOWN DELAY (SECONDS)",
    modal_label_category: "GRID VIRTUAL CATEGORY",
    modal_label_admin: "LAUNCH WITH ELEVATED PRIVILEGES (ADMIN UAC)",
    modal_label_hotkey: "GLOBAL ACTIVATION HOTKEY COMBINATION",
    modal_btn_cancel: "ABORT REGISTRATION",
    modal_btn_save: "INJECT SHORTCUT",
    modal_btn_select_file: "BROWSE FILES",
    modal_btn_delete: "DELETE INDEX",
    tooltip_handle: "Open CyberTray",
    menu_launch: "Launch Module",
    menu_open_location: "Open File Location",
    menu_edit_config: "Edit Launch Config",
    menu_delete_shortcut: "Delete Shortcut",
    menu_move_to: "Move to Category",
  },
  es: {
    // Top Bar & Toolbar
    search_placeholder: "Buscar accesos directos...",
    clear_search: "Limpiar búsqueda",
    tooltip_pin_on: "Fijar ventana (Mantener al frente)",
    tooltip_pin_off: "Desfijar ventana (Permitir fondo)",
    tooltip_settings: "Configuración de CyberTray",
    tooltip_minimize: "Minimizar / Ocultar Estante",
    tooltip_add_shortcut: "Registrar nuevo acceso directo",
    tooltip_launch_all: "Lanzar todos los accesos en esta categoría (Lanzamiento en Grupo)",
    tooltip_size_slider: "Escalar tamaño de cuadrícula",
    tooltip_sort: "Ordenar elementos",
    sort_alpha: "Alfabético (A-Z)",
    sort_recent: "Más Usados",
    sort_added: "Agregados Recientes",

    // Shortcuts Details
    shortcut_run_admin: "Ejecutar como Administrador",
    shortcut_delay: "Retraso de inicio: {delay}s",
    shortcut_args: "Argumentos de inicio: {args}",
    shortcut_hotkey: "Tecla rápida global: {hotkey}",
    shortcut_not_found: "Ejecutable o archivo destino no encontrado",
    shortcut_admin_tag: "ADMIN",
    shortcut_no_items: "No hay accesos registrados aquí. ¡Arrastra y suelta archivos o ejecutables aquí para registrarlos!",

    // Sidebar Config Tabs
    tab_general: "SISTEMA GENERAL",
    tab_appearance: "NÚCLEO DE INTERFAZ",
    tab_shortcuts: "ESPECIFICACIONES",

    // Settings Panel Titles & Descriptions
    settings_title: "CONFIGURACIÓN NEURAL CYBERTRATE",
    general_language: "IDIOMA DE LA INTERFAZ",
    general_language_desc: "Selecciona el idioma de pantalla (Inglés / Español).",
    general_shortcut: "ATAJO DE ACTIVACIÓN GLOBAL",
    general_shortcut_desc: "Presiona una combinación (ej. Alt+T) para desplegar CyberTray.",
    general_shortcut_rec: "Grabando atajo...",
    general_monitor: "MONITOR DE ANCLAJE",
    general_monitor_desc: "Selecciona el monitor físico donde se acoplará CyberTray.",
    general_dock_position: "POSICIÓN DEL ESTANTE",
    general_dock_position_desc: "Deslizar de arriba hacia abajo (Cajón) o abajo hacia arriba (Bandeja).",
    dock_top: "Borde superior (Deslizar hacia abajo)",
    dock_bottom: "Borde inferior (Deslizar hacia arriba)",
    general_handle_position: "POSICIÓN DE LA MANIGUETA",
    general_handle_position_desc: "Establece la ubicación horizontal del activador en pantalla.",
    handle_left: "Alineado a la Izquierda",
    handle_center: "Alineado al Centro",
    handle_right: "Alineado a la Derecha",
    general_handle_visible: "VISIBILIDAD DE MANIGUETA",
    general_handle_visible_desc: "Mostrar siempre la manigueta cibernética interactiva en los bordes.",
    general_hide_on_blur: "OCULTAR AL PERDER EL FOCO",
    general_hide_on_blur_desc: "Repliega el estante al hacer clic en cualquier otro sitio fuera.",
    general_hide_on_dead_zone: "OCULTAR AL CLICKEAR EL FONDO",
    general_hide_on_dead_zone_desc: "Repliega automáticamente el estante al hacer clic en zonas vacías del fondo.",
    general_show_taskbar: "MOSTRAR EN BARRA DE TAREAS",
    general_show_taskbar_desc: "Muestra CyberTray en la barra de programas de Windows.",

    // Appearance Config Tabs
    app_blur: "DESENFOQUE NEURAL TRASERO",
    app_blur_desc: "Ajusta la intensidad del desenfoque de vidrio (backdrop blur).",
    app_opacity: "ÍNDICE DE OPACIDAD",
    app_opacity_desc: "Controla la transparencia absoluta del fondo.",
    app_bg_type: "NÚCLEO DE FONDO INTERNO",
    app_bg_type_solid: "Color Sólido",
    app_bg_type_gradient: "Degradado Digital",
    app_bg_type_image: "Imagen Cyber",
    app_bg_solid_color: "COLOR DE RELLENO SÓLIDO",
    app_bg_solid_color_desc: "Elige un color sólido de fondo para tu ventana cibernética.",
    app_bg_gradients: "DEGRADADOS CIBERNÉTICOS",
    app_bg_gradients_desc: "Selecciona un preset de degradado de color digital.",
    app_bg_preset_images: "IMÁGENES DE FONDO DE FÁBRICA",
    app_bg_preset_images_desc: "Selecciona entre 4 coberturas visuales tácticas de alta calidad.",
    app_bg_custom: "FONDO CYBER PERSONALIZADO",
    app_bg_custom_desc: "Especifica una URL o selecciona un archivo local de tu computadora.",
    app_bg_apply: "APLICAR",
    app_bg_browse: "EXAMINAR",
    app_theme_presets: "COLOR DE BRILLO NEÓN",
    app_theme_presets_desc: "Elige la facción de iluminación táctica cyberpunk.",
    preset_cyan: "Netrunner Cian",
    preset_purple: "Púrpura Sintético",
    preset_amber: "Ámbar Sandevistan",
    preset_crimson: "Carmesí Arasaka",
    preset_emerald: "Esmeralda Maelstrom",

    // System Settings
    sys_startup: "INICIO AUTOMÁTICO CON WINDOWS",
    sys_startup_desc: "Registra la app para que inicie oculta (solo manigueta) al arrancar la PC.",
    sys_backup: "PERSISTENCIA DE DATOS Y CONSOLA",
    sys_backup_desc: "Importar o exportar índices de aplicaciones de forma independiente.",
    sys_export_btn: "Exportar Copia",
    sys_import_btn: "Importar Copia",
    sys_data_dir_btn: "Abrir Carpeta de Datos",
    sys_diag_btn: "Abrir DevTools",
    general_hover_trigger: "ACTIVAR AL PASAR EL CURSOR (HOVER)",
    general_hover_trigger_desc: "Despliega CyberTray automáticamente al pasar el puntero sobre la manigueta.",
    general_hover_delay: "RETRASO DE HOVER",
    general_hover_delay_desc: "Ajusta el tiempo que el puntero debe permanecer sobre la manigueta para activarla (en milisegundos).",

    // Categories
    cat_all: "TODOS",
    cat_ai: "NÚCLEOS DE IA",
    cat_browsers: "NAVEGADORES",
    cat_comm: "REDES DE CHAT",
    cat_design: "CYBER ARTE",
    cat_dev: "CÓDIGO DE RED",
    cat_ent: "MÚSICA CHIP",
    cat_gaming: "HOLOCUBIERTAS",
    cat_utils: "HERRAMIENTAS",

    // Status Bar & Metrics
    stat_total_shortcuts: "ACCESOS INYECTADOS",
    stat_total_categories: "CATEGORÍAS ACTIVAS",
    stat_cpu: "NÚCLEO CPU",
    stat_ram: "MEMORIA RAM CACHE",
    stat_disks: "ARREGLO DE DISCOS",
    stat_uptime: "TIEMPO ACTIVO",
    stat_uptime_val: "{h}h {m}m",

    // Notifications & Toasts
    notif_shortcut_added: "Inyectado acceso '{name}' en la categoría {category} con éxito.",
    notif_shortcut_removed: "Purgado el registro de acceso para '{name}'.",
    notif_config_saved: "Configuración de CyberTray guardada en el disco local.",
    notif_group_launching: "Lanzando grupo: {count} aplicaciones en arranque...",
    notif_backup_exported: "Copia de seguridad exportada con éxito.",
    notif_backup_imported: "Configuración importada con éxito. Reiniciando...",

    // Modal Add/Edit Shortcut
    modal_title_add: "REGISTRAR NUEVO MÓDULO DE ACCESO",
    modal_title_edit: "CONFIGURAR MÓDULO DE ACCESO",
    modal_label_name: "ALIAS O NOMBRE DEL ACCESO",
    modal_label_path: "RUTA FÍSICA / EJECUTABLE / ARCHIVO / URL",
    modal_label_args: "ARGUMENTOS DE INICIO DE EJECUCIÓN",
    modal_label_delay: "RETRASO DE ENFRIAMIENTO AL INICIAR (SEGUNDOS)",
    modal_label_category: "CATEGORÍA VIRTUAL DE GRID",
    modal_label_admin: "LANZAR CON PRIVILEGIOS DE ADMINISTRADOR (ADMIN UAC)",
    modal_label_hotkey: "ATAJO DE TECLADO GLOBAL INDEPENDIENTE",
    modal_btn_cancel: "ABORTAR REGISTRO",
    modal_btn_save: "INYECTAR ACCESO",
    modal_btn_select_file: "BUSCAR ARCHIVO",
    modal_btn_delete: "ELIMINAR ÍNDICE",
    tooltip_handle: "Abrir CyberTray",
    menu_launch: "Iniciar Módulo",
    menu_open_location: "Abrir Ubicación de Archivo",
    menu_edit_config: "Editar Configuración de Inicio",
    menu_delete_shortcut: "Eliminar Acceso Directo",
    menu_move_to: "Mover a Categoría",
  }
};

export type TranslationKey = keyof typeof translations.en;

let currentLang: 'en' | 'es' = 'en';

export function setLocale(lang: 'en' | 'es') {
  currentLang = lang;
}

export function getLocale(): 'en' | 'es' {
  return currentLang;
}

export function translate(key: TranslationKey, variables?: Record<string, string>): string {
  const dict = translations[currentLang] || translations.en;
  let text = dict[key] || translations.en[key] || String(key);
  
  if (variables) {
    Object.entries(variables).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, 'g'), v);
    });
  }
  
  return text;
}
