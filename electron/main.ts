import { app, BrowserWindow, clipboard, ipcMain, shell, Tray, Menu, globalShortcut, screen, nativeImage, dialog, protocol, net, powerMonitor } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { initUpdater } from './updater';
import { createDefaultConfig, type CyberTrayConfig } from '../src/lib/configDefaults';

// Versiones asíncronas: nunca usar execSync en el proceso main, bloquea el
// tray, la ventana y todo el IPC mientras el hijo de PowerShell corre.
const execFileAsync = promisify(execFile);

// Registrar el protocolo antes de que la app esté lista
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-resource', privileges: { bypassCSP: true, secure: true, supportFetchAPI: true, allowServiceWorkers: true } }
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ocultar advertencias de seguridad para desarrollo
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Forzar nombre único para userData
app.setName('CyberTray');

const START_MINIMIZED_ARG = '--start-minimized';

function applyAutoLaunchSettings(enabled: boolean) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath('exe'),
    args: enabled ? [START_MINIMIZED_ARG] : [],
  });
}

function shouldStartHiddenThisSession(): boolean {
  if (process.argv.includes(START_MINIMIZED_ARG)) return true;
  try {
    if (app.getLoginItemSettings().wasOpenedAtLogin) return true;
  } catch { /* ignore */ }
  return false;
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (shelfWindow) {
      if (shelfWindow.isMinimized()) shelfWindow.restore();
      showShelf();
    }
  });
}

let shelfWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let isDragActive = false;
let isDialogOpen = false;
// Atajo global registrado actualmente (en formato de Electron).
let currentGlobalShortcut: string | null = null;

// ── CONFIGURACIÓN PREDETERMINADA ──
// Los valores por defecto viven en src/lib/configDefaults.ts, compartidos con
// el renderer para que main y UI nunca discrepen.

let config: CyberTrayConfig = createDefaultConfig();
// Contador monótono de cambios de configuración: permite al renderer ignorar
// recargas obsoletas en lugar de volver a un estado anterior.
let configRevision = 0;
const CONFIG_FILE = path.join(app.getPath('userData'), 'cyber-tray-config.json');

function getIconsDir(): string {
  const dir = path.join(app.getPath('userData'), 'icons');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function toLocalResourceUrl(absPath: string): string {
  return `local-resource:///${absPath.replace(/\\/g, '/')}`;
}

function iconKeyForPath(filePath: string): string {
  return crypto.createHash('sha1').update(String(filePath)).digest('hex').slice(0, 16);
}

function persistPngBuffer(buffer: Buffer, key: string): string {
  const safe = String(key).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'icon';
  const dest = path.join(getIconsDir(), `${safe}.png`);
  fs.writeFileSync(dest, buffer);
  return toLocalResourceUrl(dest);
}

function persistNativeIcon(icon: Electron.NativeImage, key: string): string {
  return persistPngBuffer(icon.toPNG(), key);
}

function persistDataUrlIfNeeded(iconPath: string, key: string): string {
  if (!iconPath || typeof iconPath !== 'string') return iconPath || '';
  if (!iconPath.startsWith('data:')) return iconPath;
  const match = iconPath.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
  if (!match) return iconPath;
  try {
    return persistPngBuffer(Buffer.from(match[1], 'base64'), key);
  } catch (err) {
    console.warn('Failed to persist data-URL icon:', err);
    return iconPath;
  }
}

function persistShortcutIconsInPlace(shortcuts?: any[]): any[] | undefined {
  if (!Array.isArray(shortcuts)) return shortcuts;
  return shortcuts.map((s: any) => {
    if (s?.iconPath && String(s.iconPath).startsWith('data:')) {
      return { ...s, iconPath: persistDataUrlIfNeeded(s.iconPath, String(s.id || iconKeyForPath(s.path || 'icon'))) };
    }
    return s;
  });
}

function localResourceToFsPath(iconPath: string): string | null {
  if (!iconPath || typeof iconPath !== 'string') return null;
  if (iconPath.startsWith('data:')) return null;
  if (iconPath.startsWith('http://') || iconPath.startsWith('https://')) return null;

  let filePath = iconPath;
  if (iconPath.startsWith('local-resource:')) {
    filePath = decodeURIComponent(iconPath.replace(/^local-resource:\/\/\/?/i, ''));
  }
  filePath = path.normalize(filePath);
  if (process.platform === 'win32' && filePath.startsWith('\\')) {
    filePath = filePath.substring(1);
  }
  return fs.existsSync(filePath) ? filePath : null;
}

function embedIconsInShortcuts(shortcuts: any[]): any[] {
  return shortcuts.map((s: any) => {
    const fsPath = localResourceToFsPath(s?.iconPath);
    if (!fsPath) return s;
    try {
      const buf = fs.readFileSync(fsPath);
      if (buf.length < 32) return s;
      const ext = path.extname(fsPath).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
      return { ...s, iconPath: `data:${mime};base64,${buf.toString('base64')}` };
    } catch {
      return s;
    }
  });
}

function embedIconsInBackupPayload(jsonData: string): string {
  try {
    const parsed = JSON.parse(jsonData);
    if (Array.isArray(parsed.shortcuts)) {
      parsed.shortcuts = embedIconsInShortcuts(parsed.shortcuts);
    }
    if (Array.isArray(parsed.shortcutsList)) {
      parsed.shortcutsList = embedIconsInShortcuts(parsed.shortcutsList);
    }
    if (parsed.config && Array.isArray(parsed.config.shortcutsList)) {
      parsed.config.shortcutsList = embedIconsInShortcuts(parsed.config.shortcutsList);
    }
    // Salvaguarda: el PIN de la bóveda nunca debe acabar en un archivo de backup.
    if (parsed.config && typeof parsed.config === 'object') {
      delete parsed.config.vaultPin;
      delete parsed.config.vaultPinHash;
      delete parsed.config.vaultPinSalt;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonData;
  }
}

function migrateConfigIconsToDisk() {
  const migrated = persistShortcutIconsInPlace(config.shortcutsList);
  if (!migrated || migrated === config.shortcutsList) return;
  const changed = migrated.some((s: any, i: number) => s.iconPath !== config.shortcutsList?.[i]?.iconPath);
  if (!changed) return;
  config.shortcutsList = migrated;
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`[CyberTray] Migrated ${migrated.filter((s: any) => String(s.iconPath || '').startsWith('local-resource:')).length} shortcut icons to disk`);
  } catch (err) {
    console.error('Error migrating shortcut icons to disk:', err);
  }
}

const TRAY_TRANSLATIONS = {
  en: {
    showHide: 'Show / Hide',
    newShortcut: 'New shortcut...',
    settings: 'Settings...',
    help: 'Help',
    faq: 'Frequently Asked Questions',
    changelog: 'Changelog',
    homepage: 'Website',
    donate: 'Donate',
    about: 'About...',
    checkUpdates: 'Check for Update...',
    mostRecent: 'Most recent',
    noRecents: 'No recent shortcuts',
    quit: 'Exit',
  },
  es: {
    showHide: 'Mostrar / Ocultar',
    newShortcut: 'Nuevo acceso...',
    settings: 'Ajustes...',
    help: 'Ayuda',
    faq: 'Preguntas frecuentes',
    changelog: 'Registro de cambios',
    homepage: 'Sitio web',
    donate: 'Donar',
    about: 'Acerca de...',
    checkUpdates: 'Buscar actualizaciones...',
    mostRecent: 'Más recientes',
    noRecents: 'Ningún acceso reciente',
    quit: 'Salir',
  },
} as const;
/**
 * Textos de los diálogos nativos de Windows (menú de edición, selectores de
 * archivo). Son la única parte de la UI que no pasa por el renderer, así que
 * necesitan su propia traducción.
 */
const NATIVE_TRANSLATIONS = {
  en: {
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    delete: 'Delete',
    selectAll: 'Select All',
    executables: 'Executables',
    allFiles: 'All Files',
    images: 'Images',
    audioFiles: 'Audio Files',
    exportTitle: 'Export Configuration',
    importTitle: 'Import Configuration',
    selectBackground: 'Select background image',
    selectSound: 'Select sound file',
    selectFolder: 'Select folder',
    vaultFolder: 'Select vault folder',
  },
  es: {
    cut: 'Cortar',
    copy: 'Copiar',
    paste: 'Pegar',
    delete: 'Eliminar',
    selectAll: 'Seleccionar todo',
    executables: 'Ejecutables',
    allFiles: 'Todos los archivos',
    images: 'Imágenes',
    audioFiles: 'Archivos de audio',
    exportTitle: 'Exportar Configuración',
    importTitle: 'Importar Configuración',
    selectBackground: 'Seleccionar imagen de fondo',
    selectSound: 'Seleccionar archivo de sonido',
    selectFolder: 'Seleccionar carpeta',
    vaultFolder: 'Seleccionar carpeta de la bóveda',
  },
} as const;

type NativeStrings = (typeof NATIVE_TRANSLATIONS)["en"] | (typeof NATIVE_TRANSLATIONS)["es"];

function nativeStrings(): NativeStrings {
  return config.language === 'es' ? NATIVE_TRANSLATIONS.es : NATIVE_TRANSLATIONS.en;
}

type TrayRecentItem = {
  name: string;
  path: string;
  isAdmin?: boolean;
  iconPath?: string;
  arguments?: string;
  cwd?: string;
};

let trayRecents: TrayRecentItem[] = [];
let lastTrayRecentsKey = '';
const recentIconCache = new Map<string, Electron.NativeImage>();

function getMenuIconsDir(): string {
  return VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../public/menu-icons')
    : path.join(__dirname, '../dist/menu-icons');
}

// Los iconos del menú no cambian durante la sesión: cachearlos evita releer
// 12 PNG del disco cada vez que se reconstruye el menú.
const menuIconCache = new Map<string, Electron.NativeImage | undefined>();

function loadMenuIcon(name: string): Electron.NativeImage | undefined {
  if (menuIconCache.has(name)) {
    return menuIconCache.get(name);
  }
  const iconPath = path.join(getMenuIconsDir(), name);
  let img: Electron.NativeImage | undefined;
  if (fs.existsSync(iconPath)) {
    const loaded = nativeImage.createFromPath(iconPath);
    img = loaded.isEmpty() ? undefined : loaded;
  }
  menuIconCache.set(name, img);
  return img;
}

function loadRecentIcon(iconPath?: string): Electron.NativeImage | undefined {
  if (!iconPath) return undefined;

  let sourceKey = iconPath;
  let image: Electron.NativeImage;

  if (/^data:image\//i.test(iconPath)) {
    const cached = recentIconCache.get(sourceKey);
    if (cached) return cached;
    image = nativeImage.createFromDataURL(iconPath);
  } else if (/^local-resource:\/\//i.test(iconPath)) {
    let filePath = iconPath
      .replace(/^local-resource:\/\//i, '')
      .split(/[?#]/, 1)[0];
    try {
      filePath = decodeURIComponent(filePath);
    } catch {
      return undefined;
    }
    if (/^\/[A-Za-z]:[\\/]/.test(filePath)) filePath = filePath.slice(1);
    filePath = filePath.replace(/\//g, path.sep);
    const cacheVersion = iconPath.match(/[?#].*$/)?.[0] || '';
    sourceKey = `${filePath}${cacheVersion}`;
    const cached = recentIconCache.get(sourceKey);
    if (cached) return cached;
    if (!fs.existsSync(filePath)) return undefined;
    image = nativeImage.createFromPath(filePath);
  } else {
    if (!path.isAbsolute(iconPath) || !fs.existsSync(iconPath)) return undefined;
    sourceKey = iconPath;
    const cached = recentIconCache.get(sourceKey);
    if (cached) return cached;
    image = nativeImage.createFromPath(iconPath);
  }

  if (image.isEmpty()) return undefined;
  const sized = image.resize({ width: 16, height: 16 });
  if (sized.isEmpty()) return undefined;
  recentIconCache.set(sourceKey, sized);
  return sized;
}

function setTrayRecents(items: unknown[]): void {
  const next: TrayRecentItem[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const itemPath = typeof item.path === 'string' ? item.path.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const iconPath = typeof item.iconPath === 'string' ? item.iconPath.trim() : '';
    const args = typeof item.arguments === 'string' ? item.arguments : '';
    const cwd = typeof item.cwd === 'string' ? item.cwd : '';
    if (!itemPath || !name) continue;
    next.push({
      name: name.slice(0, 80),
      path: itemPath,
      isAdmin: !!item.isAdmin,
      ...(iconPath ? { iconPath } : {}),
      ...(args ? { arguments: args } : {}),
      ...(cwd ? { cwd } : {}),
    });
    if (next.length >= 10) break;
  }
  const key = JSON.stringify(next);
  if (key === lastTrayRecentsKey) return;
  lastTrayRecentsKey = key;
  trayRecents = next;
  rebuildTrayMenu();
}

function getBrandMenuIcon(): Electron.NativeImage | undefined {
  const brand = loadMenuIcon('brand.png');
  if (brand) return brand;
  const iconPath = getAppIconPath();
  if (!fs.existsSync(iconPath)) return undefined;
  const img = nativeImage.createFromPath(iconPath);
  return img.isEmpty() ? undefined : img;
}

async function launchAppInternal(
  appPath: string,
  isAdmin?: boolean,
  args?: string,
  cwd?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const target = String(appPath || '').trim();
    if (!target) {
      return { success: false, error: 'Empty target' };
    }

    // Las URL se abren con el navegador, no con openPath (que espera rutas de archivo).
    if (/^https?:\/\//i.test(target)) {
      await shell.openExternal(target);
      return { success: true };
    }

    const hasArgs = typeof args === 'string' && args.trim().length > 0;
    if (process.platform === 'win32' && (isAdmin || hasArgs || (cwd && cwd.trim()))) {
      const esc = (s: string) => String(s).replace(/'/g, "''");
      let command = `Start-Process -FilePath '${esc(target)}'`;
      if (hasArgs) command += ` -ArgumentList '${esc(args)}'`;
      if (cwd && cwd.trim()) command += ` -WorkingDirectory '${esc(cwd)}'`;
      if (isAdmin) command += ` -Verb RunAs`;
      exec(`powershell -NoProfile -Command "${command}"`, { windowsHide: true });
    } else {
      // shell.openPath resuelve con un mensaje de error (o cadena vacía si fue bien).
      const failure = await shell.openPath(target);
      if (failure) {
        return { success: false, error: failure };
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || err };
  }
}

function launchShortcutFromTray(item: TrayRecentItem): void {
  void (async () => {
    try {
      const res = await launchAppInternal(item.path, item.isAdmin, item.arguments, item.cwd);
      if (!res || res.success === false) {
        return;
      }
      trayRecents = [item, ...trayRecents.filter(r => r.path !== item.path)].slice(0, 10);
      lastTrayRecentsKey = JSON.stringify(trayRecents);
      rebuildTrayMenu();
      if (shelfWindow && !shelfWindow.isDestroyed()) {
        shelfWindow.webContents.send('shortcut-launched', { path: item.path, name: item.name });
      }
    } catch (err) {
      console.warn('[TRAY] Recent launch failed:', err);
    }
  })();
}

function getTrayMenuTemplate(): Electron.MenuItemConstructorOptions[] {
  const lang = (config as any).language === 'es' ? 'es' : 'en';
  const t = TRAY_TRANSLATIONS[lang];
  const version = app.getVersion();
  const isVisible = isShelfCurrentlyOpen();
  const parts = t.showHide.split(' / ');
  const dynamicLabel = isVisible ? (parts[1] || t.showHide) : (parts[0] || t.showHide);
  const iconBrand = getBrandMenuIcon();
  const iconShow = loadMenuIcon('show-hide.png');
  const iconAdd = loadMenuIcon('add.png');
  const iconSettings = loadMenuIcon('settings.png');
  const iconHelp = loadMenuIcon('help.png');
  const iconFaq = loadMenuIcon('faq.png');
  const iconChangelog = loadMenuIcon('changelog.png');
  const iconHome = loadMenuIcon('homepage.png');
  const iconDonate = loadMenuIcon('donate.png');
  const iconAbout = loadMenuIcon('about.png');
  const iconRecent = loadMenuIcon('recent.png');
  const iconUpdate = loadMenuIcon('update.png');
  const iconQuit = loadMenuIcon('quit.png');

  return [
    {
      label: `CyberTray v${version}`,
      ...(iconBrand ? { icon: iconBrand } : {}),
      click: () => triggerOpenAbout(false),
    },
    { type: 'separator' },
    {
      label: dynamicLabel,
      ...(iconShow ? { icon: iconShow } : {}),
      accelerator: config.shortcut || undefined,
      click: () => toggleShelf(),
    },
    {
      label: t.newShortcut,
      ...(iconAdd ? { icon: iconAdd } : {}),
      click: () => {
        showShelf();
        setTimeout(() => {
          if (shelfWindow && !shelfWindow.isDestroyed()) {
            shelfWindow.webContents.send('open-add-shortcut');
          }
        }, 300);
      },
    },
    {
      label: t.settings,
      ...(iconSettings ? { icon: iconSettings } : {}),
      click: () => {
        showShelf();
        setTimeout(() => {
          if (shelfWindow && !shelfWindow.isDestroyed()) {
            shelfWindow.webContents.send('open-settings');
          }
        }, 300);
      },
    },
    {
      label: t.mostRecent,
      ...(iconRecent ? { icon: iconRecent } : {}),
      submenu: trayRecents.length > 0
        ? trayRecents.map((item, index) => {
            const itemIcon = loadRecentIcon(item.iconPath) || iconRecent;
            return {
              label: `${index + 1}. ${item.name}`,
              ...(itemIcon ? { icon: itemIcon } : {}),
              click: () => launchShortcutFromTray(item),
            };
          })
        : [{ label: t.noRecents, enabled: false }],
    },
    {
      label: t.help,
      ...(iconHelp ? { icon: iconHelp } : {}),
      submenu: [
        {
          label: t.help,
          ...(iconHelp ? { icon: iconHelp } : {}),
          click: () => { void shell.openExternal('https://github.com/CyberGems/CyberTray/wiki'); },
        },
        {
          label: t.faq,
          ...(iconFaq ? { icon: iconFaq } : {}),
          click: () => { void shell.openExternal('https://github.com/CyberGems/CyberTray/issues'); },
        },
        {
          label: t.changelog,
          ...(iconChangelog ? { icon: iconChangelog } : {}),
          click: () => { void shell.openExternal('https://github.com/CyberGems/CyberTray/releases'); },
        },
        {
          label: t.homepage,
          ...(iconHome ? { icon: iconHome } : {}),
          click: () => { void shell.openExternal('https://cybergems.org'); },
        },
        {
          label: t.donate,
          ...(iconDonate ? { icon: iconDonate } : {}),
          click: () => { void shell.openExternal('https://github.com/CyberGems/CyberTray#%EF%B8%8F-donate'); },
        },
        { type: 'separator' },
        {
          label: t.about,
          ...(iconAbout ? { icon: iconAbout } : {}),
          click: () => triggerOpenAbout(false),
        },
        {
          label: t.checkUpdates,
          ...(iconUpdate ? { icon: iconUpdate } : {}),
          click: () => triggerOpenAbout(true),
        },
      ],
    },
    { type: 'separator' },
    {
      label: t.quit,
      ...(iconQuit ? { icon: iconQuit } : {}),
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];
}

function rebuildTrayMenu(): void {
  if (!tray) return;
  const version = app.getVersion();
  tray.setToolTip(`CyberTray v${version}`);
  tray.setContextMenu(Menu.buildFromTemplate(getTrayMenuTemplate()));
}

// On Windows, pass the ICO as-is so Electron can pick the DPI-matching layer
// (16 at 100%, 20 at 125%, 24 at 150%, 32 at 200%). Resizing to 16x16 first
// throws those layers away and looks soft in the tray.
function getTrayIcon(): Electron.NativeImage {
  const iconPath = getAppIconPath();
  if (fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) return img;
  }
  return nativeImage.createEmpty();
}

// ── SYSTEM TRAY (Bandeja del sistema) ──
function createTray() {
  const trayIcon = getTrayIcon();

  if (!tray) {
    tray = new Tray(trayIcon);
    tray.setToolTip(`CyberTray v${app.getVersion()}`);
    tray.on('click', () => toggleShelf());
  } else {
    tray.setImage(trayIcon);
  }

  rebuildTrayMenu();
}

// --- Carga y Guardado de Configuración ---
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      config = { ...createDefaultConfig(), ...JSON.parse(data) };
      delete (config as { dockPosition?: unknown }).dockPosition;
      // El PIN de la bóveda solo existe hasheado: nunca se persiste en claro.
      delete (config as { vaultPin?: unknown }).vaultPin;
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

function saveConfig(
  newConfig: Partial<CyberTrayConfig>,
  options?: { broadcastReload?: boolean }
) {
  try {
    if (newConfig.shortcutsList) {
      newConfig = {
        ...newConfig,
        shortcutsList: persistShortcutIconsInPlace(newConfig.shortcutsList),
      };
    }
    const previous = config;
    config = { ...config, ...newConfig };
    configRevision += 1;

    // Los atajos por acceso dependen de la lista de accesos: se re-registran
    // solo cuando algún atajo (o su destino) ha cambiado.
    const hotkeySignature = (list: any[]) =>
      JSON.stringify((list || []).map((s: any) => `${s?.id ?? ''}:${s?.hotkey || ''}:${s?.path || ''}`));
    if (hotkeySignature(previous.shortcutsList) !== hotkeySignature(config.shortcutsList)) {
      registerShortcutHotkeys(config.shortcutsList || []);
    }
    // Salvaguarda: si un cliente antiguo o un import intenta escribir el PIN
    // en claro, se descarta antes de tocar el disco.
    delete (config as { vaultPin?: unknown }).vaultPin;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

    // Quiet saves (e.g. usageCount ticks) skip reload IPC
    if (options?.broadcastReload === false) {
      return;
    }

    if (shelfWindow && !shelfWindow.isDestroyed()) {
      // Se envía la config ya normalizada: el renderer no necesita releer el disco.
      shelfWindow.webContents.send('reload-config', { ...config, __rev: configRevision });
    }

    // Reconstruir el menú y reiniciar el polling solo cuando cambia lo que
    // depende de ellos: antes se hacía en cada guardado.
    const menuChanged =
      previous.language !== config.language ||
      previous.showTaskbarIcon !== config.showTaskbarIcon ||
      previous.alwaysOnTop !== config.alwaysOnTop;
    if (menuChanged) {
      createTray();
    }

    const hotspotsChanged =
      previous.hotspotDelay !== config.hotspotDelay ||
      JSON.stringify(previous.hotspotCorners) !== JSON.stringify(config.hotspotCorners);
    if (hotspotsChanged) {
      startHotspotPolling();
    }
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

function getVaultPath(): string {
  if (config.vaultPath && config.vaultPath.trim() !== '') {
    return config.vaultPath;
  }
  return path.join(app.getPath('userData'), 'CyberTray_files');
}

// ── HOTSPOTS & UAC GUARD STATE ──
let hotspotTimer: NodeJS.Timeout | null = null;
let lastHotspotCorner = '';
let hotspotEntryTime = 0;
let hotspotCooldown = false;
let lastHotspotActionTime = 0;
let hasCursorExitedSinceLastAction = true;
let hotspotsPausedByUAC = false;
let isCheckingUAC = false;
let lastHotspotPollTime = 0;
const HOTSPOT_LAG_THRESHOLD_MS = 400;
const HOTSPOT_CORNER_THRESHOLD = 4; // px: margen de entrada (amigable con HiDPI)
const HOTSPOT_EXIT_THRESHOLD = 30; // px: distancia mínima para considerar que el cursor abandonó la esquina
const HOTSPOT_TOGGLE_SAFETY_MS = 200;
let cachedDisplays: Electron.Display[] = [];
let uacGuardTimer: NodeJS.Timeout | null = null;
let uacResumeTimer: NodeJS.Timeout | null = null;
let uacWatchdogTimer: NodeJS.Timeout | null = null;
let shelfAnimationTimer: NodeJS.Timeout | null = null;
let shelfOpen = false;
let blurGuardUntil = 0;
let nextShowClickThrough = false;
let shelfClickThrough = false;

function updateCachedDisplays() {
  try {
    cachedDisplays = screen.getAllDisplays();
  } catch (e) {
    console.error('[MONITOR] Error updating cached displays:', e);
  }
}

function checkUACActive(callback: (active: boolean) => void) {
  if (process.platform !== 'win32') {
    callback(false);
    return;
  }
  execFile('tasklist.exe', ['/FI', 'IMAGENAME eq consent.exe', '/NH'], { windowsHide: true }, (err, stdout) => {
    const isActive = !err && !!stdout && stdout.includes('consent.exe');
    callback(isActive);
  });
}

function watchUACUntilExit() {
  if (process.platform !== 'win32') return;
  if (uacWatchdogTimer) return;

  uacWatchdogTimer = setInterval(() => {
    checkUACActive((isActive) => {
      if (!isActive) {
        if (uacWatchdogTimer) {
          clearInterval(uacWatchdogTimer);
          uacWatchdogTimer = null;
        }
        resumeHotspotsAfterUAC(600);
      }
    });
  }, 1000);
}

function pauseHotspots() {
  if (uacResumeTimer) clearTimeout(uacResumeTimer);
  hotspotsPausedByUAC = true;
  lastHotspotCorner = '';
  hotspotEntryTime = 0;
  hotspotCooldown = true;
}

function resumeHotspotsAfterUAC(delayMs = 600) {
  if (uacResumeTimer) clearTimeout(uacResumeTimer);
  if (uacWatchdogTimer) {
    clearInterval(uacWatchdogTimer);
    uacWatchdogTimer = null;
  }
  uacResumeTimer = setTimeout(() => {
    hotspotsPausedByUAC = false;
    isCheckingUAC = false;
    lastHotspotCorner = '';
    hotspotEntryTime = 0;
    hotspotCooldown = false;
    hasCursorExitedSinceLastAction = true;
  }, delayMs);
}

function resumeHotspotsImmediate() {
  if (uacResumeTimer) clearTimeout(uacResumeTimer);
  if (uacWatchdogTimer) {
    clearInterval(uacWatchdogTimer);
    uacWatchdogTimer = null;
  }
  hotspotsPausedByUAC = false;
  isCheckingUAC = false;
}

// --- Monitores e Identificación ---
/** Special monitorId: open the shelf on the display under the cursor (hotkey / hotspot / tray). */
const MONITOR_FOLLOW_CURSOR = 'follow-cursor';

function getCursorDisplay(): Electron.Display {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

function isFollowCursorMonitorMode(): boolean {
  return config.monitorId === MONITOR_FOLLOW_CURSOR;
}

function getTargetDisplay(): Electron.Display {
  if (isFollowCursorMonitorMode()) {
    return getCursorDisplay();
  }
  const displays = screen.getAllDisplays();
  // 1. Intentar match exacto por ID
  if (config.monitorId) {
    const matched = displays.find(d => d.id.toString() === config.monitorId);
    if (matched) return matched;
  }
  // 2. Fallback: buscar por bounds guardados (por si Windows cambió el ID del display)
  if (config.monitorBounds) {
    const fallback = displays.find(d =>
      d.bounds.x === config.monitorBounds.x &&
      d.bounds.y === config.monitorBounds.y &&
      d.bounds.width === config.monitorBounds.width &&
      d.bounds.height === config.monitorBounds.height
    );
    if (fallback) return fallback;
  }
  return screen.getPrimaryDisplay();
}

// ── POSICIONAMIENTO DE VENTANAS ──
function getShelfBounds(display: Electron.Display): Electron.Rectangle {
  const { x, y, width, height } = display.workArea;
  return { x, y, width, height };
}

/**
 * Size the visible client to the work area. On Windows, frameless windows keep
 * WS_THICKFRAME by default (~7px invisible DWM border), so setBounds(workArea)
 * leaves a desktop/taskbar peek on the edges. Content bounds + thickFrame:false
 * match what maximize() does in CyberLauncher without using maximize().
 */
function applyOverlayBounds(display?: Electron.Display) {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  const wa = getShelfBounds(display ?? getTargetDisplay());
  try {
    shelfWindow.setResizable(true);
    shelfWindow.setContentBounds(wa, false);
    const got = shelfWindow.getContentBounds();
    const dx = wa.x - got.x;
    const dy = wa.y - got.y;
    const dw = wa.width - got.width;
    const dh = wa.height - got.height;
    if (dx || dy || dw || dh) {
      shelfWindow.setContentBounds({
        x: got.x + dx,
        y: got.y + dy,
        width: Math.max(1, got.width + dw),
        height: Math.max(1, got.height + dh),
      }, false);
    }
  } catch {
    try {
      shelfWindow.setBounds(wa, false);
    } catch { /* ignore */ }
  } finally {
    try {
      shelfWindow.setResizable(false);
    } catch { /* ignore */ }
  }
}

// --- Iconos de la Aplicación ---
/**
 * Carpeta con los recursos empaquetados (imágenes, sonidos).
 * En desarrollo Vite los sirve desde `public/`, en producción quedan en `dist/`.
 */
function getAssetsDir(): string {
  return VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../public')
    : path.join(__dirname, '../dist');
}

/**
 * Devuelve una URL `local-resource://` para un recurso empaquetado.
 *
 * Chromium no decodifica audio servido directamente por `file://` (la
 * respuesta no lleva Content-Type), así que los sonidos tienen que pasar por
 * el protocolo propio, que sí los tipa correctamente.
 */
function getBundledAssetUrl(relativePath: string): string | null {
  const safeRelative = String(relativePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  if (!safeRelative || safeRelative.includes('..')) return null;

  const assetsDir = path.resolve(getAssetsDir());
  const absolute = path.resolve(assetsDir, safeRelative);
  if (absolute !== assetsDir && !absolute.startsWith(assetsDir + path.sep)) return null;
  if (!fs.existsSync(absolute)) return null;

  return `local-resource:///${absolute.replace(/\\/g, '/')}`;
}

function getAppIconPath(): string {
  const iconDir = getAssetsDir();
  const ico = path.join(iconDir, 'icon.ico');
  if (fs.existsSync(ico)) return ico;
  return path.join(iconDir, 'icon.png');
}

function getAppIcon() {
  const iconPath = getAppIconPath();
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createEmpty();
}

// ── CREACIÓN DE VENTANAS ──
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function createWindows() {
  const targetDisplay = getTargetDisplay();
  const shelfBounds = getShelfBounds(targetDisplay);

  // Ventana Principal: CyberTray Shelf
  shelfWindow = new BrowserWindow({
    width: shelfBounds.width,
    height: shelfBounds.height,
    x: shelfBounds.x,
    y: shelfBounds.y,
    frame: false,
    transparent: false,
    thickFrame: false,
    hasShadow: false,
    backgroundColor: '#070b13',
    alwaysOnTop: config.alwaysOnTop,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: !config.showTaskbarIcon,
    show: false,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: true,
    },
    autoHideMenuBar: true,
  });

  applyOverlayBounds(targetDisplay);

  shelfWindow.once('ready-to-show', () => {
    if (!shouldStartHiddenThisSession()) showShelf();
  });

  shelfWindow.on('blur', () => {
    if (!shelfWindow || shelfWindow.isDestroyed()) return;
    
    // Si la ventana está anclada (Always on Top), ignorar la pérdida de foco
    if (shelfWindow.isAlwaysOnTop()) {
      shelfWindow.webContents.send('always-on-top-blur-attempt');
      return;
    }

    if (!config.hideOnBlur) return;

    // Windows steals focus on frameless show(); wait out the guard then re-check.
    const delay = Math.max(200, blurGuardUntil - Date.now() + 50);
    setTimeout(() => {
      if (isDragActive || isDialogOpen) return;
      if (!shelfOpen) return;
      if (Date.now() < blurGuardUntil) return;
      if (shelfWindow && !shelfWindow.isDestroyed() && !shelfWindow.isFocused()) {
        hideShelf();
      }
    }, delay);
  });

  // Cargar URL de la aplicación React
  if (VITE_DEV_SERVER_URL) {
    shelfWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    shelfWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  shelfWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      hideShelf();
    }
  });
}

// ── CONTROL DE VISIBILIDAD DE SHELF ──
function stopShelfAnimation() {
  if (shelfAnimationTimer) {
    clearInterval(shelfAnimationTimer);
    shelfAnimationTimer = null;
  }
}

function setShelfClickThrough(enabled: boolean) {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  if (shelfClickThrough === enabled) return;
  shelfClickThrough = enabled;
  try {
    if (enabled) {
      shelfWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      shelfWindow.setIgnoreMouseEvents(false);
    }
  } catch {
    try {
      shelfWindow.setIgnoreMouseEvents(enabled);
    } catch { /* ignore */ }
  }
}

function isShelfCurrentlyOpen(): boolean {
  return !!(shelfOpen && shelfWindow && !shelfWindow.isDestroyed() && shelfWindow.isVisible());
}

function showShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  stopShelfAnimation();
  resumeHotspotsImmediate();
  syncHotspotLockAfterWindowChange();
  shelfOpen = true;

  const display = getTargetDisplay();
  shelfWindow.setAlwaysOnTop(config.alwaysOnTop);
  shelfWindow.setSkipTaskbar(!config.showTaskbarIcon);

  try {
    shelfWindow.webContents.setBackgroundThrottling(false);
  } catch { /* ignore */ }

  if (shelfWindow.isMinimized()) {
    shelfWindow.restore();
  }

  shelfWindow.setOpacity(1);
  applyOverlayBounds(display);
  blurGuardUntil = Date.now() + 1200;
  if (!config.alwaysOnTop) {
    shelfWindow.setAlwaysOnTop(true);
    shelfWindow.show();
    shelfWindow.focus();
    shelfWindow.setAlwaysOnTop(false);
  } else {
    shelfWindow.show();
    shelfWindow.focus();
  }
  applyOverlayBounds(display);

  if (nextShowClickThrough) {
    setShelfClickThrough(true);
    nextShowClickThrough = false;
  } else {
    setShelfClickThrough(false);
  }

  if (config.soundEnabled !== false) {
    shelfWindow.webContents.send('play-launch-sound');
  }
  shelfWindow.webContents.send('shelf-state-change', true);
}

function hideShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  stopShelfAnimation();
  shelfOpen = false;
  setShelfClickThrough(false);
  syncHotspotLockAfterWindowChange();
  shelfWindow.hide();
  try {
    applyOverlayBounds();
  } catch { /* ignore */ }
  shelfWindow.webContents.send('shelf-state-change', false);
  try {
    shelfWindow.webContents.setBackgroundThrottling(true);
  } catch { /* ignore */ }
}

function toggleShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) {
    createWindows();
    return;
  }
  if (shelfOpen || shelfWindow.isVisible()) {
    hideShelf();
  } else {
    showShelf();
  }
}

function triggerOpenAbout(checkUpdates = false) {
  showShelf();
  setTimeout(() => {
    if (shelfWindow && !shelfWindow.isDestroyed()) {
      shelfWindow.webContents.send('open-about', { checkUpdates });
    }
  }, 300);
}

function alignWindows() {
  const display = getTargetDisplay();

  if (shelfWindow && !shelfWindow.isDestroyed()) {
    applyOverlayBounds(display);
    shelfWindow.setAlwaysOnTop(config.alwaysOnTop);
    shelfWindow.setSkipTaskbar(!config.showTaskbarIcon);
  }
}

// ── REGISTRO DE ATAJO GLOBAL ──
/**
 * Registra el atajo global que muestra/oculta el shelf.
 *
 * No se llama a `unregisterAll()` antes: si el nuevo atajo no se puede
 * registrar (ya ocupado por otra app o formato inválido) se conserva el que
 * ya funcionaba. Devuelve `true` solo si el registro se completó.
 */
function registerGlobalShortcutKey(shortcut: string): boolean {
  const electronShortcut = shortcut.replace(/Meta/g, 'Super').replace(/Ctrl/g, 'CommandOrControl');

  try {
    if (!globalShortcut.register(electronShortcut, () => {
      toggleShelf();
    })) {
      console.warn(`Failed to register global shortcut: ${electronShortcut}`);
      return false;
    }
  } catch (err) {
    console.error('Error registering global shortcut:', err);
    return false;
  }

  // Solo se libera el atajo anterior cuando el nuevo se ha registrado bien.
  if (currentGlobalShortcut) {
    globalShortcut.unregister(currentGlobalShortcut);
  }
  currentGlobalShortcut = electronShortcut;
  return true;
}

// ── ATAJOS POR ACCESO DIRECTO ──
/**
 * Cada acceso puede tener su propio atajo global. Se registran y liberan
 * junto con la lista de accesos, y si uno está ocupado por otra aplicación se
 * avisa al renderer en lugar de fallar en silencio.
 */
const registeredShortcutHotkeys = new Map<string, any>();

function normalizeAccelerator(shortcut: string): string {
  return String(shortcut || '').replace(/Meta/g, 'Super').replace(/Ctrl/g, 'CommandOrControl').trim();
}

function unregisterShortcutHotkeys(): void {
  for (const accelerator of registeredShortcutHotkeys.keys()) {
    globalShortcut.unregister(accelerator);
  }
  registeredShortcutHotkeys.clear();
}

function registerShortcutHotkeys(shortcuts: any[]): void {
  unregisterShortcutHotkeys();
  if (!Array.isArray(shortcuts)) return;

  for (const item of shortcuts) {
    if (!item || !item.hotkey) continue;
    const accelerator = normalizeAccelerator(item.hotkey);
    if (!accelerator) continue;

    try {
      const registered = globalShortcut.register(accelerator, () => {
        void launchShortcutByHotkey(item);
      });
      if (registered) {
        registeredShortcutHotkeys.set(accelerator, item);
      } else {
        notifyHotkeyConflict(item, item.hotkey);
      }
    } catch (err) {
      console.warn(`No se pudo registrar el atajo ${accelerator}:`, err);
      notifyHotkeyConflict(item, item.hotkey);
    }
  }
}

function notifyHotkeyConflict(item: any, hotkey: string): void {
  console.warn(`Atajo ocupado: ${hotkey} (${item?.name || 'acceso'})`);
  if (shelfWindow && !shelfWindow.isDestroyed()) {
    shelfWindow.webContents.send('hotkey-conflict', {
      name: item?.name || '',
      hotkey: String(hotkey || ''),
    });
  }
}

async function launchShortcutByHotkey(item: any): Promise<void> {
  const res = await launchAppInternal(item.path, item.isAdmin, item.arguments, item.cwd);
  if (!res || res.success === false) return;

  // El renderer lleva la cuenta de usos, igual que con el menú del tray.
  if (shelfWindow && !shelfWindow.isDestroyed()) {
    shelfWindow.webContents.send('shortcut-launched', { path: item.path, name: item.name });
  }
}

// ── FILE RESOLUTION & POWERSHELL LNK RESOLVER ──
async function resolveFullFileInfo(filePath: string) {
  try {
    let normalized = path.resolve(filePath.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'));
    let ext = path.extname(normalized).toLowerCase();
    let resolvedPath = normalized;
    let resolvedName = path.basename(normalized, ext);
    let resolvedArgs = '';
    let resolvedCwd = '';
    let iconFileUrl = '';

    if (ext === '.lnk') {
      // Conservar el nombre propio del acceso (ej. "factorio SeaBlock") en vez del
      // basename del ejecutable destino, que seria identico para todos los .lnk.
      const lnkName = resolvedName;
      try {
        const shortcut = shell.readShortcutLink(normalized);
        // Capturar argumentos y directorio de trabajo del acceso para poder
        // relanzarlo tal cual (clave para apps como Factorio con flags de mod).
        resolvedArgs = shortcut.args || '';
        resolvedCwd = shortcut.cwd || '';
        if (shortcut.target && fs.existsSync(shortcut.target)) {
          resolvedPath = path.resolve(shortcut.target);
        } else {
          // Fallback con PowerShell (asíncrono para no bloquear el proceso main).
          const escapedPath = normalized.replace(/'/g, "''");
          const psCommand = `$s = New-Object -ComObject WScript.Shell; $s.CreateShortcut('${escapedPath}').TargetPath`;
          const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', psCommand], {
            windowsHide: true,
            timeout: 8000,
            encoding: 'utf-8',
          });
          const output = String(stdout || '').trim();
          if (output && fs.existsSync(output)) {
            resolvedPath = path.resolve(output);
          }
        }
        // El target solo se usa para lanzar y extraer el icono; el nombre visible
        // sigue siendo el del .lnk.
        ext = path.extname(resolvedPath).toLowerCase();
        resolvedName = lnkName;
      } catch (e) {
        console.error('Error resolving .lnk file:', e);
      }
    }

    const iconKey = iconKeyForPath(resolvedPath);

    // Extracción de Icono nativo de alta calidad → PNG en userData/icons
    try {
      if (fs.existsSync(resolvedPath)) {
        let icon = await app.getFileIcon(resolvedPath, { size: 'large' });
        if (!icon || icon.isEmpty()) {
          icon = await app.getFileIcon(resolvedPath, { size: 'normal' });
        }
        if (icon && !icon.isEmpty()) {
          iconFileUrl = persistNativeIcon(icon, iconKey);
        }
      }
    } catch (e) {
      console.warn('Error getFileIcon:', e);
    }

    // Fallback de extracción de icono con PowerShell (para evitar iconos genéricos muy pequeños)
    if (!iconFileUrl) {
      try {
        const escapedPath = resolvedPath.replace(/'/g, "''");
        const psScript = `Add-Type -AssemblyName System.Drawing; $icon=[System.Drawing.Icon]::ExtractAssociatedIcon('${escapedPath}'); if ($icon) { $bmp=$icon.ToBitmap(); $tmp=[System.IO.Path]::GetTempFileName()+'.png'; $bmp.Save($tmp,[System.Drawing.Imaging.ImageFormat]::Png); Write-Output $tmp; $icon.Dispose(); $bmp.Dispose() }`;
        const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', psScript], {
          windowsHide: true,
          timeout: 8000,
          encoding: 'utf-8',
        });
        const psOutput = String(stdout || '').trim();
        if (psOutput && fs.existsSync(psOutput)) {
          const pngBuffer = fs.readFileSync(psOutput);
          fs.unlinkSync(psOutput);
          if (pngBuffer.length > 100) {
            iconFileUrl = persistPngBuffer(pngBuffer, iconKey);
          }
        }
      } catch (psErr) {
        console.warn('PowerShell icon fallback failed:', psErr);
      }
    }

    return {
      name: resolvedName,
      path: resolvedPath,
      ext,
      exists: fs.existsSync(resolvedPath),
      iconPath: iconFileUrl,
      arguments: resolvedArgs,
      cwd: resolvedCwd,
    };
  } catch (err) {
    console.error('Error resolveFullFileInfo:', err);
    return null;
  }
}

// ── ACTIVE CORNERS (Esquinas activas / Hotspots) ──
function stopHotspotPolling() {
  if (hotspotTimer) {
    clearInterval(hotspotTimer);
    hotspotTimer = null;
  }
}

function getHotspotCorners(): string[] {
  return Array.isArray(config.hotspotCorners) ? config.hotspotCorners : [];
}

function getHotspotDelay(): number {
  return typeof config.hotspotDelay === 'number' ? config.hotspotDelay : 300;
}

function getCursorHotspotState(): { currentCorner: string; isWithinExitZone: boolean } {
  const hotspotCorners = getHotspotCorners();
  if (hotspotCorners.length === 0) {
    return { currentCorner: '', isWithinExitZone: false };
  }

  const { x, y } = screen.getCursorScreenPoint();
  const displays = cachedDisplays.length > 0 ? cachedDisplays : screen.getAllDisplays();
  let activeDisplay = displays.find(
    (d) =>
      x >= d.bounds.x &&
      x < d.bounds.x + d.bounds.width &&
      y >= d.bounds.y &&
      y < d.bounds.y + d.bounds.height
  );
  if (!activeDisplay) {
    activeDisplay = screen.getDisplayNearestPoint({ x, y });
  }
  if (!activeDisplay) {
    return { currentCorner: '', isWithinExitZone: false };
  }

  const { x: dx, y: dy, width: dw, height: dh } = activeDisplay.bounds;
  const isTop = y >= dy && y <= dy + HOTSPOT_CORNER_THRESHOLD;
  const isBottom = y >= dy + dh - 1 - HOTSPOT_CORNER_THRESHOLD && y <= dy + dh - 1;
  const isLeft = x >= dx && x <= dx + HOTSPOT_CORNER_THRESHOLD;
  const isRight = x >= dx + dw - 1 - HOTSPOT_CORNER_THRESHOLD && x <= dx + dw - 1;

  let detected = '';
  if (isTop && isLeft) detected = 'top-left';
  else if (isTop && isRight) detected = 'top-right';
  else if (isBottom && isLeft) detected = 'bottom-left';
  else if (isBottom && isRight) detected = 'bottom-right';

  if (detected && hotspotCorners.includes(detected)) {
    return { currentCorner: detected, isWithinExitZone: true };
  }

  for (const corner of hotspotCorners) {
    let inZone = false;
    if (corner === 'top-left') {
      inZone = x >= dx && x <= dx + HOTSPOT_EXIT_THRESHOLD && y >= dy && y <= dy + HOTSPOT_EXIT_THRESHOLD;
    } else if (corner === 'top-right') {
      inZone = x >= dx + dw - 1 - HOTSPOT_EXIT_THRESHOLD && x <= dx + dw - 1 && y >= dy && y <= dy + HOTSPOT_EXIT_THRESHOLD;
    } else if (corner === 'bottom-left') {
      inZone = x >= dx && x <= dx + HOTSPOT_EXIT_THRESHOLD && y >= dy + dh - 1 - HOTSPOT_EXIT_THRESHOLD && y <= dy + dh - 1;
    } else if (corner === 'bottom-right') {
      inZone = x >= dx + dw - 1 - HOTSPOT_EXIT_THRESHOLD && x <= dx + dw - 1 && y >= dy + dh - 1 - HOTSPOT_EXIT_THRESHOLD && y <= dy + dh - 1;
    }
    if (inZone) {
      return { currentCorner: '', isWithinExitZone: true };
    }
  }

  return { currentCorner: '', isWithinExitZone: false };
}

/** Arm the re-entry lock only if the cursor is still in a hotspot. */
function syncHotspotLockAfterWindowChange() {
  lastHotspotCorner = '';
  hotspotEntryTime = 0;
  lastHotspotActionTime = Date.now();
  try {
    const { isWithinExitZone } = getCursorHotspotState();
    if (isWithinExitZone) {
      hasCursorExitedSinceLastAction = false;
      hotspotCooldown = true;
    } else {
      hasCursorExitedSinceLastAction = true;
      hotspotCooldown = false;
    }
  } catch {
    hasCursorExitedSinceLastAction = true;
    hotspotCooldown = false;
  }
}

function startHotspotPolling() {
  stopHotspotPolling();
  lastHotspotPollTime = Date.now();
  lastHotspotCorner = '';
  hotspotEntryTime = 0;
  hotspotCooldown = false;
  hasCursorExitedSinceLastAction = true;

  if (getHotspotCorners().length === 0) {
    return;
  }

  hotspotTimer = setInterval(() => {
    if (hotspotsPausedByUAC || isCheckingUAC) return;

    const now = Date.now();
    const elapsed = now - lastHotspotPollTime;
    lastHotspotPollTime = now;

    if (elapsed > HOTSPOT_LAG_THRESHOLD_MS) {
      lastHotspotCorner = '';
      hotspotEntryTime = 0;
      hotspotCooldown = false;
      return;
    }

    const hotspotCorners = getHotspotCorners();
    if (hotspotCorners.length === 0) return;

    const { currentCorner, isWithinExitZone } = getCursorHotspotState();

    if (!isWithinExitZone) {
      hasCursorExitedSinceLastAction = true;
      lastHotspotCorner = '';
      hotspotEntryTime = 0;
      setShelfClickThrough(false);
    }
    if (now - lastHotspotActionTime >= HOTSPOT_TOGGLE_SAFETY_MS) {
      hotspotCooldown = false;
    }

    if (!currentCorner) return;

    if (currentCorner !== lastHotspotCorner) {
      lastHotspotCorner = currentCorner;
      hotspotEntryTime = now;
    }

    // After a hotspot toggle, the cursor must leave the corner before the next action.
    if (hotspotCooldown || !hasCursorExitedSinceLastAction) return;

    const hotspotDelay = getHotspotDelay();
    const timeInCorner = now - hotspotEntryTime;
    if (hotspotDelay > 0 && timeInCorner < hotspotDelay) return;
    if (!shelfWindow || shelfWindow.isDestroyed()) return;

    hotspotCooldown = true;
    hasCursorExitedSinceLastAction = false;
    lastHotspotActionTime = now;

    const executeHotspotAction = () => {
      if (!shelfWindow || shelfWindow.isDestroyed()) return;
      if (!(shelfOpen || shelfWindow.isVisible())) {
        nextShowClickThrough = true;
      }
      toggleShelf();
    };

    const { x, y } = screen.getCursorScreenPoint();
    const isVulnerableToUAC = (currentCorner === 'top-left' || (x === 0 && y === 0));
    if (isVulnerableToUAC) {
      isCheckingUAC = true;
      checkUACActive((isUAC) => {
        isCheckingUAC = false;
        if (isUAC) {
          pauseHotspots();
          watchUACUntilExit();
          if (shelfWindow && !shelfWindow.isDestroyed() && shelfWindow.isVisible()) {
            hideShelf();
          }
        } else {
          executeHotspotAction();
        }
      });
    } else {
      executeHotspotAction();
    }
  }, 100);
}

// ── UAC SECURE DESKTOP GUARD (consent.exe) ──
function shouldPollUAC(): boolean {
  const isShelfOpen = shelfWindow && !shelfWindow.isDestroyed() && shelfWindow.isVisible();
  return !!isShelfOpen;
}

function startUACGuard() {
  if (uacGuardTimer) clearInterval(uacGuardTimer);
  let uacWasActive = false;

  uacGuardTimer = setInterval(() => {
    if (!shouldPollUAC()) {
      uacWasActive = false;
      return;
    }
    checkUACActive((isActive) => {
      if (isActive && !uacWasActive) {
        pauseHotspots();
        hideShelf();
        watchUACUntilExit();
      } else if (!isActive && uacWasActive) {
        resumeHotspotsAfterUAC(1500);
      }
      uacWasActive = !!isActive;
    });
  }, 1000);
}

let vramCache: { data: { total: number; name: string } | null; ts: number } | null = null;
let isFetchingVram = false;

/**
 * VRAM de la GPU.
 *
 * `Win32_VideoController.AdapterRAM` es un entero de 32 bits: en cualquier GPU
 * con más de 4 GB devuelve 4 GB. Por eso se pregunta primero a nvidia-smi
 * (fuente exacta) y solo se recurre a CIM cuando no hay GPU NVIDIA.
 */
function fetchVramInfoInBackground() {
  if (isFetchingVram) return;
  isFetchingVram = true;

  const storeFallback = () => {
    isFetchingVram = false;
    if (!vramCache) {
      vramCache = { data: null, ts: Date.now() };
    }
  };

  // 1) nvidia-smi: valor real de VRAM.
  execFile('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], {
    timeout: 5000,
    encoding: 'utf-8',
  }, (err, stdout) => {
    if (!err && stdout) {
      const line = String(stdout).split(/\r?\n/).map((l) => l.trim()).find(Boolean);
      if (line) {
        const parts = line.split(',').map((p) => p.trim());
        const totalMb = parseFloat(parts[parts.length - 1]);
        const name = parts.slice(0, -1).join(',').trim();
        if (!isNaN(totalMb) && totalMb > 0) {
          vramCache = {
            data: {
              total: Math.round((totalMb / 1024) * 10) / 10,
              name: name || 'GPU',
            },
            ts: Date.now(),
          };
          isFetchingVram = false;
          return;
        }
      }
    }

    // 2) Fallback CIM (valor limitado a 4 GB en GPU modernas).
    const psCommand = `Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1 Name,@{N='AdapterRAM';E={[math]::Round($_.AdapterRAM / 1GB, 2)}} | ConvertTo-Json`;
    exec(psCommand, { encoding: 'utf-8', timeout: 8000 }, (psErr, psOut) => {
      if (!psErr && psOut) {
        try {
          const gpuData = JSON.parse(psOut);
          if (gpuData && gpuData.AdapterRAM > 0) {
            vramCache = {
              data: {
                total: gpuData.AdapterRAM,
                name: gpuData.Name?.trim() || 'GPU',
              },
              ts: Date.now(),
            };
          }
        } catch (e) {
          // ignore JSON parse error
        }
      }
      storeFallback();
    });
  });
}

// ── IPC INTERACTIVE COMMS BINDERS ──
function registerIpcHandlers() {
  ipcMain.handle('launch-app', async (_, appPath, isAdmin, args, cwd) => {
    return launchAppInternal(appPath, isAdmin, args, cwd);
  });

  ipcMain.handle('tray:set-recents', (_event, items: unknown) => {
    setTrayRecents(Array.isArray(items) ? items : []);
    return { success: true };
  });

  ipcMain.handle('select-file', async (_, options) => {
    isDialogOpen = true;
    const t = nativeStrings();
    const res = await dialog.showOpenDialog(shelfWindow!, {
      properties: ['openFile'],
      filters: options?.filters ?? [
        { name: t.executables, extensions: ['exe', 'lnk', 'url', 'bat', 'cmd', 'appx', 'msc', 'appref-ms'] },
        { name: t.allFiles, extensions: ['*'] },
      ],
    });
    isDialogOpen = false;
    showShelf();
    if (!res.canceled && res.filePaths.length > 0) {
      const info = await resolveFullFileInfo(res.filePaths[0]);
      return info;
    }
    return null;
  });

  ipcMain.handle('select-image', async () => {
    isDialogOpen = true;
    const res = await dialog.showOpenDialog(shelfWindow!, {
      title: nativeStrings().selectBackground,
      properties: ['openFile'],
      filters: [{ name: nativeStrings().images, extensions: ['jpg', 'png', 'jpeg', 'gif', 'webp'] }],
    });
    isDialogOpen = false;
    showShelf();
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('select-audio', async () => {
    isDialogOpen = true;
    const res = await dialog.showOpenDialog(shelfWindow!, {
      title: nativeStrings().selectSound,
      properties: ['openFile'],
      filters: [{ name: nativeStrings().audioFiles, extensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a'] }],
    });
    isDialogOpen = false;
    showShelf();
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('select-folder', async () => {
    isDialogOpen = true;
    const res = await dialog.showOpenDialog(shelfWindow!, {
      title: nativeStrings().selectFolder,
      properties: ['openDirectory', 'createDirectory'],
    });
    isDialogOpen = false;
    showShelf();
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('get-image-data', async (_, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        // El MIME debe corresponder al archivo: declararlo siempre como PNG
        // rompe la previsualización de los JPG que elige el usuario.
        const ext = path.extname(String(filePath)).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.gif') mime = 'image/gif';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.svg') mime = 'image/svg+xml';
        else if (ext === '.bmp') mime = 'image/bmp';
        return `data:${mime};base64,${buf.toString('base64')}`;
      }
    } catch {}
    return null;
  });

  ipcMain.handle('get-monitors', async () => {
    const displays = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id.toString();
    return displays.map(d => ({
      id: d.id.toString(),
      label: `${d.label || 'Display'} [${d.bounds.width}x${d.bounds.height}]`,
      isPrimary: d.id.toString() === primaryId,
      bounds: d.bounds,
      size: d.size
    }));
  });

  ipcMain.handle('set-monitor', async (_, monitorId) => {
    if (monitorId === MONITOR_FOLLOW_CURSOR) {
      saveConfig({ monitorId: MONITOR_FOLLOW_CURSOR, monitorBounds: undefined });
      alignWindows();
      return;
    }
    const displays = screen.getAllDisplays();
    const target = displays.find(d => d.id.toString() === monitorId);
    const monitorBounds = target ? { x: target.bounds.x, y: target.bounds.y, width: target.bounds.width, height: target.bounds.height } : undefined;
    saveConfig({ monitorId, monitorBounds });
    alignWindows();
  });

  ipcMain.handle('register-shortcut', async (_, shortcut) => {
    const registered = registerGlobalShortcutKey(shortcut);
    if (registered) {
      saveConfig({ shortcut });
      return { success: true, shortcut };
    }
    // El atajo anterior sigue activo: no se guarda un valor que no funciona.
    return { success: false, shortcut, error: 'shortcut_conflict' };
  });

  ipcMain.handle('window-hide-to-tray', async () => {
    hideShelf();
  });

  ipcMain.handle('get-bundled-asset-url', async (_event, relativePath: string) => {
    return getBundledAssetUrl(relativePath);
  });

  ipcMain.handle('set-auto-launch', async (_, enabled) => {
    saveConfig({ autoLaunch: enabled });
    applyAutoLaunchSettings(enabled);
    return { success: true, enabled };
  });

  ipcMain.handle('set-hide-on-blur', async (_, enabled) => {
    saveConfig({ hideOnBlur: enabled });
    return { success: true, enabled };
  });

  ipcMain.handle('set-show-taskbar-icon', async (_, enabled) => {
    saveConfig({ showTaskbarIcon: enabled });
    alignWindows();
    return { success: true, enabled };
  });

  ipcMain.handle('get-system-info', async () => {
    // RAM Info
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = (usedMem / totalMem) * 100;
    
    // CPU Info
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
    const cpuCores = cpus.length;

    // VRAM Info (cached permanently once successfully loaded, fetched in background)
    if (!vramCache) {
      fetchVramInfoInBackground();
    }
    const vramInfo = vramCache ? vramCache.data : null;

    return {
      memory: {
        total: totalMem / (1024 * 1024 * 1024),
        used: usedMem / (1024 * 1024 * 1024),
        percent: memPercent
      },
      cpu: {
        model: cpuModel,
        cores: cpuCores
      },
      vram: vramInfo,
      uptime: os.uptime()
    };
  });
  let diskCache: { data: any[], ts: number } | null = null;
  let driveListCache: { drives: string[]; ts: number } | null = null;

  // Lista de unidades locales. wmic está obsoleto y ausente en Windows 11 24H2+,
  // así que se usa CIM, que sigue disponible.
  const listLocalDrives = async (): Promise<string[]> => {
    if (driveListCache && (Date.now() - driveListCache.ts) < 300000) {
      return driveListCache.drives;
    }
    try {
      const psCommand = `Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object -ExpandProperty DeviceID`;
      const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', psCommand], {
        windowsHide: true,
        timeout: 8000,
        encoding: 'utf-8',
      });
      const drives = String(stdout || '')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => /^[A-Z]:$/.test(s));
      driveListCache = { drives, ts: Date.now() };
      return drives;
    } catch {
      return driveListCache?.drives || [];
    }
  };

  // Espacio real de la unidad vía statfs: sin procesos hijos y sin datos inventados.
  const readDriveSpace = async (drive: string) => {
    try {
      const stats = await fs.promises.statfs(drive);
      const totalBytes = stats.blocks * stats.bsize;
      const freeBytes = stats.bavail * stats.bsize;
      if (!totalBytes) return null;
      const usedBytes = totalBytes - freeBytes;
      const toGb = (bytes: number) => Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10;
      return {
        drive,
        total: toGb(totalBytes),
        free: toGb(freeBytes),
        used: toGb(usedBytes),
        percent: Math.round((usedBytes / totalBytes) * 100),
      };
    } catch {
      return null;
    }
  };

  ipcMain.handle('get-disk-info', async () => {
    if (diskCache && (Date.now() - diskCache.ts) < 60000) {
      return diskCache.data;
    }
    const drives = await listLocalDrives();
    const disks = (await Promise.all(drives.map(readDriveSpace))).filter(Boolean);
    const data = disks as Array<{ drive: string; total: number; free: number; used: number; percent: number }>;
    diskCache = { data, ts: Date.now() };
    return data;
  });

  let processesCache: { data: any[], ts: number } | null = null;

  ipcMain.handle('get-running-processes', async () => {
    if (processesCache && (Date.now() - processesCache.ts) < 3000) {
      return processesCache.data;
    }
    return new Promise((resolve) => {
      execFile('tasklist.exe', ['/FO', 'CSV', '/NH'], { timeout: 5000, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err || !stdout) {
          resolve(processesCache?.data || []);
          return;
        }
        const lines = stdout.split(/\r?\n/);
        const processes: Array<{ pid: number, name: string, path: string, memory: number }> = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }
          const matches = trimmed.match(/"([^"]*)"/g);
          if (matches && matches.length >= 5) {
            const name = matches[0].replace(/"/g, '');
            const pidStr = matches[1].replace(/"/g, '');
            const memStr = matches[4].replace(/"/g, '');

            const pid = parseInt(pidStr, 10);
            const cleanedMem = memStr.replace(/[^\d]/g, '');
            const memoryKb = parseInt(cleanedMem, 10);
            const memory = isNaN(memoryKb) ? 0 : memoryKb * 1024;

            if (!isNaN(pid) && name) {
              processes.push({
                pid,
                name,
                path: '',
                memory
              });
            }
          }
        }
        processesCache = { data: processes, ts: Date.now() };
        resolve(processes);
      });
    });
  });

  ipcMain.handle('kill-process', async (_, pid) => {
    return new Promise((resolve) => {
      exec(`taskkill /F /PID ${pid}`, { windowsHide: true }, (err) => {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          processesCache = null; // Invalidate cache immediately on process kill
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('resolve-file-path', async (_, filePath) => {
    return await resolveFullFileInfo(filePath);
  });

  ipcMain.handle('open-file-location', async (_, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath);
        return { success: true };
      }
      return { success: false, error: 'File does not exist' };
    } catch (e: any) {
      return { success: false, error: e?.message || e };
    }
  });

  ipcMain.handle('copy-to-clipboard', async (_, text) => {
    try {
      clipboard.writeText(String(text ?? ''));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || e };
    }
  });

  ipcMain.handle('open-folder', async (_, targetPath) => {
    try {
      const dir = path.dirname(String(targetPath || ''));
      if (!fs.existsSync(dir)) {
        return { success: false, error: 'Folder does not exist' };
      }
      const failure = await shell.openPath(dir);
      return failure ? { success: false, error: failure } : { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || e };
    }
  });

  ipcMain.handle('open-in-terminal', async (_, targetPath) => {
    try {
      const dir = path.dirname(String(targetPath || ''));
      if (!fs.existsSync(dir)) {
        return { success: false, error: 'Folder does not exist' };
      }
      // Windows Terminal si está instalado; si no, la consola clásica.
      execFile('where.exe', ['wt.exe'], { windowsHide: true }, (err) => {
        if (!err) {
          exec(`wt.exe -d "${dir}"`, { windowsHide: true });
        } else {
          exec(`cmd.exe /c start "" /d "${dir}" cmd.exe`, { windowsHide: true });
        }
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || e };
    }
  });

  ipcMain.handle('set-hotspots', async (_, corners, delay) => {
    saveConfig({ hotspotCorners: corners, hotspotDelay: delay });
    return { success: true };
  });

  ipcMain.handle('open-dev-tools', async () => {
    shelfWindow?.webContents.openDevTools({ mode: 'detach' });
    return { success: true };
  });

  ipcMain.handle('show-text-context-menu', async (_, { x, y }) => {
    const t = nativeStrings();
    const menu = Menu.buildFromTemplate([
      { label: t.cut, role: 'cut' },
      { label: t.copy, role: 'copy' },
      { label: t.paste, role: 'paste' },
      { label: t.delete, role: 'delete' },
      { type: 'separator' },
      { label: t.selectAll, role: 'selectAll' }
    ]);
    menu.popup({ window: shelfWindow!, x, y });
  });

  ipcMain.handle('export-config', async (_, jsonData) => {
    isDialogOpen = true;
    const res = await dialog.showSaveDialog(shelfWindow!, {
      title: nativeStrings().exportTitle,
      defaultPath: 'cyber-tray-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    isDialogOpen = false;
    showShelf();
    if (!res.canceled && res.filePath) {
      fs.writeFileSync(res.filePath, embedIconsInBackupPayload(jsonData), 'utf-8');
      return res.filePath;
    }
    return null;
  });

  ipcMain.handle('import-config', async () => {
    isDialogOpen = true;
    const res = await dialog.showOpenDialog(shelfWindow!, {
      title: nativeStrings().importTitle,
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    isDialogOpen = false;
    showShelf();
    if (!res.canceled && res.filePaths.length > 0) {
      return fs.readFileSync(res.filePaths[0], 'utf-8');
    }
    return null;
  });

  // --- Almacenamiento Dinámico Independiente ---
  ipcMain.handle('saveConfig', async (_, newConfig, options?: { broadcastReload?: boolean }) => {
    saveConfig(newConfig, options);
    if (options?.broadcastReload !== false) {
      alignWindows();
    }
    return { success: true, revision: configRevision };
  });

  ipcMain.handle('loadConfig', async () => {
    loadConfig();
    return config;
  });

  ipcMain.handle('get-config-path', async () => {
    return CONFIG_FILE;
  });

  ipcMain.handle('open-data-folder', async () => {
    shell.openPath(app.getPath('userData'));
  });

  ipcMain.handle('set-always-on-top', async (_, enabled) => {
    saveConfig({ alwaysOnTop: enabled });
    alignWindows();
    return { success: true };
  });

  // --- Canales de CyberTray ---
  ipcMain.handle('set-drag-active', async (_, active) => {
    isDragActive = active;
    if (!active && shelfWindow && !shelfWindow.isDestroyed() && !shelfWindow.isFocused() && config.hideOnBlur) {
      setTimeout(() => {
        if (!isDragActive && shelfWindow && !shelfWindow.isFocused()) {
          hideShelf();
        }
      }, 200);
    }
  });

  ipcMain.handle('run-desktop-sweep', async () => {
    try {
      const desktopPath = app.getPath('desktop');
      const targetVaultPath = getVaultPath();

      // Ensure vault directory exists
      if (!fs.existsSync(targetVaultPath)) {
        fs.mkdirSync(targetVaultPath, { recursive: true });
      }

      const files = fs.readdirSync(desktopPath);
      let count = 0;
      const sweptShortcuts: any[] = [];

      for (const file of files) {
        const fullPath = path.join(desktopPath, file);
        const ext = path.extname(file).toLowerCase();

        // Skip folders/files that are links (.lnk, .url), or desktop.ini
        if (ext === '.lnk' || ext === '.url' || file.toLowerCase() === 'desktop.ini') {
          continue;
        }

        try {
          const stats = fs.statSync(fullPath);
          // Determine unique target filename to prevent collisions
          let targetName = file;
          let targetFullPath = path.join(targetVaultPath, targetName);
          let suffix = 1;

          while (fs.existsSync(targetFullPath)) {
            const baseName = path.basename(file, ext);
            targetName = `${baseName}_${suffix}${ext}`;
            targetFullPath = path.join(targetVaultPath, targetName);
            suffix++;
          }

          // Move the file/folder
          fs.renameSync(fullPath, targetFullPath);
          count++;

          // Extract high-quality icon if it's a file → PNG on disk
          let iconFileUrl = '';
          try {
            if (fs.existsSync(targetFullPath) && stats.isFile()) {
              let icon = await app.getFileIcon(targetFullPath, { size: 'large' });
              if (!icon || icon.isEmpty()) {
                icon = await app.getFileIcon(targetFullPath, { size: 'normal' });
              }
              if (icon && !icon.isEmpty()) {
                iconFileUrl = persistNativeIcon(icon, `sweep-${Date.now() + count}`);
              }
            }
          } catch (e) {
            console.warn('getFileIcon fail for swept file:', e);
          }

          sweptShortcuts.push({
            id: Date.now() + count + Math.floor(Math.random() * 1000),
            name: path.basename(file, ext), // Store original clean name
            path: targetFullPath,
            category: 'vault',
            iconPath: iconFileUrl,
            isAdmin: false,
            delay: 0,
            arguments: '',
            usageCount: 0,
            addedTimestamp: Date.now()
          });

        } catch (fileErr) {
          console.error(`Error sweeping file ${file}:`, fileErr);
        }
      }

      if (count > 0) {
        // Save swept items to config shortcutsList
        const existingShortcuts = (config as any).shortcutsList || [];
        const updatedShortcuts = [...existingShortcuts, ...sweptShortcuts];
        saveConfig({ shortcutsList: updatedShortcuts });
      }

      return { success: true, count };
    } catch (err: any) {
      console.error('Desktop sweep failed:', err);
      return { success: false, error: err?.message || err };
    }
  });

  ipcMain.handle('get-default-vault-path', async () => {
    return path.join(app.getPath('userData'), 'CyberTray_files');
  });

  ipcMain.handle('open-vault-folder', async () => {
    const targetVaultPath = getVaultPath();
    if (!fs.existsSync(targetVaultPath)) {
      fs.mkdirSync(targetVaultPath, { recursive: true });
    }
    shell.openPath(targetVaultPath);
    return true;
  });

  ipcMain.handle('select-vault-folder', async () => {
    isDialogOpen = true; // Bypasa el autohide (hideOnBlur) mientras el diálogo nativo tiene el foco
    const res = await dialog.showOpenDialog(shelfWindow!, {
      title: nativeStrings().vaultFolder,
      defaultPath: getVaultPath(),
      properties: ['openDirectory', 'createDirectory'],
    });
    isDialogOpen = false;
    showShelf(); // Reenfoca y muestra el panel al cerrar el diálogo
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('import-file-to-vault', async (event, filePath: string) => {
    try {
      const targetVaultPath = getVaultPath();
      if (!fs.existsSync(targetVaultPath)) {
        fs.mkdirSync(targetVaultPath, { recursive: true });
      }

      const file = path.basename(filePath);
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);

      // Determine unique target path to prevent collisions
      let targetName = file;
      let targetFullPath = path.join(targetVaultPath, targetName);
      let suffix = 1;

      while (fs.existsSync(targetFullPath)) {
        targetName = `${baseName}_${suffix}${ext}`;
        targetFullPath = path.join(targetVaultPath, targetName);
        suffix++;
      }

      // Copy file or folder recursively
      fs.cpSync(filePath, targetFullPath, { recursive: true });

      // Extract high-quality icon → PNG on disk
      let iconFileUrl = '';
      try {
        const stats = fs.statSync(targetFullPath);
        if (stats.isFile()) {
          let icon = await app.getFileIcon(targetFullPath, { size: 'large' });
          if (!icon || icon.isEmpty()) {
            icon = await app.getFileIcon(targetFullPath, { size: 'normal' });
          }
          if (icon && !icon.isEmpty()) {
            iconFileUrl = persistNativeIcon(icon, iconKeyForPath(targetFullPath));
          }
        }
      } catch (e) {
        console.warn('getFileIcon fail for imported file:', e);
      }

      return {
        success: true,
        path: targetFullPath,
        iconPath: iconFileUrl,
        name: baseName
      };
    } catch (err: any) {
      console.error('Import file to vault failed:', err);
      return { success: false, error: err?.message || err };
    }
  });
}

// ── PROTOCOLO DE RECURSO LOCAL ──
/**
 * El protocolo `local-resource://` sirve los recursos locales que la UI
 * necesita (iconos extraídos, fondos y sonidos personalizados).
 *
 * No sirve el disco entero: solo se permiten rutas dentro de las carpetas de
 * recursos de la app, la carpeta de iconos del perfil de usuario y los
 * archivos que el usuario haya configurado explícitamente. Es una barrera de
 * defensa por capas junto con el CSP del renderer.
 */
function isLocalResourceAllowed(targetPath: string): boolean {
  let resolved: string;
  try {
    resolved = path.resolve(targetPath);
  } catch {
    return false;
  }

  const allowedRoots: string[] = [
    getIconsDir(),
    getAssetsDir(),
    app.getAppPath(),
    path.join(app.getAppPath(), 'public'),
  ];

  // Archivos que el usuario eligió personalmente como fondo o sonido.
  const explicitFiles = [config.bgCustomPath, config.soundPath];
  for (const file of explicitFiles) {
    if (file && file.trim()) {
      try {
        allowedRoots.push(path.resolve(file.trim()));
      } catch {
        // Ruta inválida: se ignora.
      }
    }
  }

  // Iconos que la propia app gestiona en los accesos guardados.
  const shortcutIcons = Array.isArray(config.shortcutsList)
    ? config.shortcutsList.map((s: any) => s?.iconPath).filter((p: any) => typeof p === 'string' && p)
    : [];
  for (const iconPath of shortcutIcons) {
    if (!iconPath.startsWith('local-resource:')) continue;
    try {
      const decoded = decodeURIComponent(iconPath.replace(/^local-resource:\/\/\/?/i, ''));
      allowedRoots.push(path.resolve(decoded));
    } catch {
      // Ruta inválida: se ignora.
    }
  }

  return allowedRoots.some((root) => {
    const normalizedRoot = path.resolve(root);
    return resolved === normalizedRoot || resolved.startsWith(normalizedRoot + path.sep);
  });
}

function registerLocalResourceProtocol() {
  protocol.handle('local-resource', (request) => {
    const decodedUrl = decodeURIComponent(request.url);
    const filePath = decodedUrl.replace(/^local-resource:\/\/\/?/i, '');
    
    // Validar y normalizar la ruta
    let normalizedPath = path.normalize(filePath);
    
    // En Windows quitar barra inicial redundante
    if (process.platform === 'win32' && normalizedPath.startsWith('\\')) {
      normalizedPath = normalizedPath.substring(1);
    }
    
    try {
      if (!isLocalResourceAllowed(normalizedPath)) {
        console.warn('[local-resource] Ruta no permitida:', normalizedPath);
        return new Response('Forbidden', { status: 403 });
      }
      if (fs.existsSync(normalizedPath)) {
        const data = fs.readFileSync(normalizedPath);
        const ext = path.extname(normalizedPath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.svg') contentType = 'image/svg+xml';
        else if (ext === '.mp3') contentType = 'audio/mpeg';
        else if (ext === '.wav') contentType = 'audio/wav';
        else if (ext === '.ogg') contentType = 'audio/ogg';
        else if (ext === '.aac') contentType = 'audio/aac';
        else if (ext === '.m4a') contentType = 'audio/mp4';
        
        return new Response(data, {
          headers: { 'Content-Type': contentType }
        });
      }
      return new Response('File not found', { status: 404 });
    } catch (err) {
      console.error('Failed to read local resource:', normalizedPath, err);
      return new Response('File not found', { status: 404 });
    }
  });
}


// ── INICIALIZACIÓN ──
app.whenReady().then(() => {
  if (!gotTheLock) return;
  loadConfig();
  if (app.isPackaged) applyAutoLaunchSettings(!!config.autoLaunch);
  migrateConfigIconsToDisk();
  registerLocalResourceProtocol();
  registerIpcHandlers();
  fetchVramInfoInBackground(); // Carga de VRAM asíncrona en segundo plano al iniciar
  createWindows();
  createTray();
  registerGlobalShortcutKey(config.shortcut);
  registerShortcutHotkeys(config.shortcutsList || []);
  // Se repite el registro unos segundos después: el renderer todavía no está
  // escuchando al arrancar, y así los conflictos de atajo se pueden notificar.
  setTimeout(() => registerShortcutHotkeys(config.shortcutsList || []), 2500);
  updateCachedDisplays();
  startHotspotPolling();
  startUACGuard();

  let bootAutoUpdate = true;
  if (typeof config.autoUpdate === 'boolean') {
    bootAutoUpdate = config.autoUpdate;
  } else if (typeof config.autoCheckUpdates === 'boolean') {
    bootAutoUpdate = config.autoCheckUpdates;
  }
  initUpdater({ autoUpdate: bootAutoUpdate });

  // Re-alinear ventanas cuando cambian los monitores (conexión / desconexión / cambio de resolución).
  // Soluciona que, tras reiniciar Windows, el monitor objetivo aún no esté disponible al arrancar
  // y la app caiga al primario sin volver a colocarse cuando el monitor real aparece.
  let displayChangeTimer: NodeJS.Timeout | null = null;
  const scheduleRealign = () => {
    if (displayChangeTimer) clearTimeout(displayChangeTimer);
    displayChangeTimer = setTimeout(() => {
      updateCachedDisplays();
      alignWindows();
    }, 400);
  };
  screen.on('display-added', scheduleRealign);
  screen.on('display-removed', scheduleRealign);
  screen.on('display-metrics-changed', scheduleRealign);

  powerMonitor.on('lock-screen', () => {
    pauseHotspots();
    if (shelfWindow && !shelfWindow.isDestroyed() && shelfWindow.isVisible()) {
      hideShelf();
    }
  });
  powerMonitor.on('unlock-screen', () => {
    resumeHotspotsAfterUAC(1000);
  });
  powerMonitor.on('suspend', () => {
    pauseHotspots();
  });
  powerMonitor.on('resume', () => {
    resumeHotspotsAfterUAC(1500);
  });

  // Reintentos diferidos al inicio: un monitor secundario puede conectarse unos segundos
  // después del login de Windows, cuando la app ya arrancó.
  setTimeout(() => alignWindows(), 1500);
  setTimeout(() => alignWindows(), 4000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindows();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Mantener corriendo en tray
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  unregisterShortcutHotkeys();
  stopHotspotPolling();
});
