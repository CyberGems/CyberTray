import { app, BrowserWindow, ipcMain, shell, Tray, Menu, globalShortcut, screen, nativeImage, dialog, protocol, net, powerMonitor } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { exec, execSync, execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { initUpdater } from './updater';

// Registrar el protocolo antes de que la app esté lista
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-resource', privileges: { bypassCSP: true, secure: true, supportFetchAPI: true, allowServiceWorkers: true } }
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ocultar advertencias de seguridad para desarrollo
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Forzar nombre único para userData
app.setName('CyberTray');

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

// ── CONFIGURACIÓN PREDETERMINADA ──
interface CyberTrayConfig {
  dockPosition: 'top' | 'bottom';
  monitorId: string;
  shortcut: string;
  hideOnBlur: boolean;
  hotspotCorners: string[];
  hotspotDelay: number;
  alwaysOnTop: boolean;
  iconSize: number;
  showTaskbarIcon: boolean;
  autoLaunch: boolean;
  hideOnDeadZoneClick: boolean;
  bgType: 'solid' | 'gradient' | 'image';
  bgSolidColor: string;
  bgGradient: string;
  bgImage: string;
  bgCustomPath: string;
  language?: 'en' | 'es';
  soundEnabled?: boolean;
  soundPath?: string;
  monitorBounds?: { x: number; y: number; width: number; height: number };
  vaultPath?: string;
  vaultPinEnabled?: boolean;
  vaultPin?: string;
  vaultLockTimeout?: number;
  shortcutsList?: any[];
  categoriesList?: any[];
  folderSchemaVersion?: number;
  totalLaunches?: number;
  autoUpdate?: boolean;
  autoCheckUpdates?: boolean;
}

const DEFAULT_CONFIG: CyberTrayConfig = {
  dockPosition: 'top', // De arriba hacia abajo por defecto
  monitorId: '',
  shortcut: 'Alt+T', // Atajo CyberTray por defecto
  hideOnBlur: true,
  language: 'en',
  hotspotCorners: [],
  hotspotDelay: 300,
  alwaysOnTop: true,
  iconSize: 52, // 52px por defecto
  showTaskbarIcon: false,
  autoLaunch: false,
  hideOnDeadZoneClick: false,
  bgType: 'solid',
  bgSolidColor: '#070b13',
  bgGradient: 'preset-1',
  bgImage: 'preset-1',
  bgCustomPath: '',
  soundEnabled: true,
  soundPath: '',
  vaultPath: '',
  vaultPinEnabled: false,
  vaultPin: '1234',
  vaultLockTimeout: 0,
  folderSchemaVersion: 2,
  totalLaunches: 0,
  autoUpdate: true,
};

let config: CyberTrayConfig = { ...DEFAULT_CONFIG };
const CONFIG_FILE = path.join(app.getPath('userData'), 'cyber-tray-config.json');
const STATE_FILE = path.join(app.getPath('userData'), 'cyber-tray-state.json');

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
    settings: 'Configuración...',
    help: 'Ayuda',
    faq: 'Preguntas frecuentes',
    changelog: 'Changelog',
    homepage: 'Sitio web',
    donate: 'Donar',
    about: 'Acerca de...',
    checkUpdates: 'Buscar actualizaciones...',
    mostRecent: 'Más recientes',
    noRecents: 'Ningún acceso reciente',
    quit: 'Salir',
  },
} as const;

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

function loadMenuIcon(name: string): Electron.NativeImage | undefined {
  const iconPath = path.join(getMenuIconsDir(), name);
  if (!fs.existsSync(iconPath)) return undefined;
  const img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) return undefined;
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
  const iconPath = getAppIconPath();
  if (!fs.existsSync(iconPath)) return undefined;
  const sized = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  return sized.isEmpty() ? undefined : sized;
}

async function launchAppInternal(
  appPath: string,
  isAdmin?: boolean,
  args?: string,
  cwd?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const hasArgs = typeof args === 'string' && args.trim().length > 0;
    if (process.platform === 'win32' && (isAdmin || hasArgs || (cwd && cwd.trim()))) {
      const esc = (s: string) => String(s).replace(/'/g, "''");
      let command = `Start-Process -FilePath '${esc(appPath)}'`;
      if (hasArgs) command += ` -ArgumentList '${esc(args)}'`;
      if (cwd && cwd.trim()) command += ` -WorkingDirectory '${esc(cwd)}'`;
      if (isAdmin) command += ` -Verb RunAs`;
      exec(`powershell -NoProfile -Command "${command}"`, { windowsHide: true });
    } else {
      shell.openPath(appPath);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || err };
  }
}

function launchShortcutFromTray(item: TrayRecentItem): void {
  void (async () => {
    try {
      await launchAppInternal(item.path, item.isAdmin, item.arguments, item.cwd);
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
  const isVisible = !!(shelfWindow && !shelfWindow.isDestroyed() && shelfWindow.isVisible());
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

// ── SYSTEM TRAY (Bandeja del sistema) ──
function createTray() {
  const iconPath = getAppIconPath();
  let trayIcon = nativeImage.createEmpty();
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  }

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
      config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
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
    config = { ...config, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

    // Quiet saves (e.g. usageCount ticks) skip reload IPC
    if (options?.broadcastReload === false) {
      return;
    }

    if (shelfWindow && !shelfWindow.isDestroyed()) {
      shelfWindow.webContents.send('reload-config');
    }
    createTray();
    startHotspotPolling();
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
function getShelfBounds(display: Electron.Display, customHeight?: number): Electron.Rectangle {
  const workArea = display.workArea;

  // Recuperar altura guardada o usar la mitad de la pantalla
  let height = customHeight;
  if (!height) {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        if (state.height) height = state.height;
      }
    } catch {}
  }
  if (!height) {
    height = Math.round(workArea.height * 0.5);
  }

  // Limitar altura (hasta el 95% para permitir extenderlo casi al completo)
  height = Math.max(200, Math.min(Math.round(workArea.height * 0.95), height));

  const width = workArea.width;
  const x = workArea.x;

  let y = workArea.y;
  if (config.dockPosition === 'bottom') {
    y = workArea.y + workArea.height - height;
  }

  return { x, y, width, height };
}

// --- Iconos de la Aplicación ---
function getAppIconPath(): string {
  const iconDir = VITE_DEV_SERVER_URL ? path.join(__dirname, '../public') : path.join(__dirname, '../dist');
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
    transparent: true, // Habilitar transparencia para esquinas redondeadas y acople fluido sin bordes fantasma
    alwaysOnTop: config.alwaysOnTop,
    resizable: true,
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

  const display = getTargetDisplay();
  const workArea = display.workArea;
  shelfWindow.setMinimumSize(workArea.width, 200);
  shelfWindow.setMaximumSize(workArea.width, Math.round(workArea.height * 0.95));

  let saveStateTimeout: NodeJS.Timeout | null = null;

  // Guardar dimensiones después del redimensionamiento nativo (de-bounced para evitar lag de I/O en disco)
  shelfWindow.on('resize', () => {
    if (!shelfWindow) return;
    const bounds = shelfWindow.getBounds();
    
    if (saveStateTimeout) clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(() => {
      fs.writeFile(STATE_FILE, JSON.stringify({ height: bounds.height }), 'utf-8', (err) => {
        if (err) console.error('Error saving window height state:', err);
      });
    }, 500);
  });

  shelfWindow.on('blur', () => {
    if (!shelfWindow || shelfWindow.isDestroyed()) return;
    
    // Si la ventana está anclada (Always on Top), ignorar la pérdida de foco
    if (shelfWindow.isAlwaysOnTop()) {
      shelfWindow.webContents.send('always-on-top-blur-attempt');
      return;
    }

    if (config.hideOnBlur) {
      setTimeout(() => {
        if (isDragActive || isDialogOpen) return; // Bypasar ocultamiento si hay drag o diálogo activo
        if (shelfWindow && !shelfWindow.isFocused()) {
          hideShelf();
        }
      }, 200);
    }
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
// ── SHELF SHOW/HIDE WINDOW ANIMATIONS ──
function stopShelfAnimation() {
  if (shelfAnimationTimer) {
    clearInterval(shelfAnimationTimer);
    shelfAnimationTimer = null;
  }
}

function animateShelfShow(targetBounds: Electron.Rectangle, duration = 220) {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  stopShelfAnimation();

  const isBottom = config.dockPosition === 'bottom';
  const startY = isBottom
    ? targetBounds.y + targetBounds.height
    : targetBounds.y - targetBounds.height;

  // Ensure window is fully opaque before showing (repair from any previous opacity=0 state)
  shelfWindow.setOpacity(1);
  shelfWindow.setBounds({ ...targetBounds, y: startY });
  shelfWindow.show();
  shelfWindow.focus();

  // Mount React DOM immediately when opening to prevent window duplication glitch/pop
  shelfWindow.webContents.send('shelf-state-change', true);

  const startTime = Date.now();
  shelfAnimationTimer = setInterval(() => {
    if (!shelfWindow || shelfWindow.isDestroyed()) {
      stopShelfAnimation();
      return;
    }

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - progress, 3);

    const currentY = startY + (targetBounds.y - startY) * eased;
    shelfWindow.setBounds({ ...targetBounds, y: currentY });

    if (progress >= 1) {
      stopShelfAnimation();
      shelfWindow.setBounds(targetBounds);
    }
  }, 16);
}

function animateShelfHide(targetBounds: Electron.Rectangle, duration = 180) {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  stopShelfAnimation();

  const isBottom = config.dockPosition === 'bottom';
  const endY = isBottom
    ? targetBounds.y + targetBounds.height
    : targetBounds.y - targetBounds.height;

  const startTime = Date.now();
  shelfAnimationTimer = setInterval(() => {
    if (!shelfWindow || shelfWindow.isDestroyed()) {
      stopShelfAnimation();
      return;
    }

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-in quad for acceleration away
    const eased = progress * progress;

    const currentY = targetBounds.y + (endY - targetBounds.y) * eased;

    shelfWindow.setBounds({ ...targetBounds, y: currentY });

    if (progress >= 1) {
      stopShelfAnimation();
      shelfWindow.hide();
      shelfWindow.setBounds(targetBounds);
      shelfWindow.webContents.send('shelf-state-change', false);
    }
  }, 16);
}

function showShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  resumeHotspotsImmediate();
  syncHotspotLockAfterWindowChange();

  if (config.soundEnabled !== false) {
    shelfWindow.webContents.send('play-launch-sound');
  }

  // Compute final bounds WITHOUT moving the window yet (avoid Chrome repaints)
  const display = getTargetDisplay();
  const shelfBounds = getShelfBounds(display);

  // Update constraints and flags only; do NOT call setBounds yet
  const workArea = display.workArea;
  shelfWindow.setMinimumSize(workArea.width, 200);
  shelfWindow.setMaximumSize(workArea.width, Math.round(workArea.height * 0.95));
  shelfWindow.setAlwaysOnTop(config.alwaysOnTop);
  shelfWindow.setSkipTaskbar(!config.showTaskbarIcon);

  animateShelfShow(shelfBounds);
}

function hideShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  syncHotspotLockAfterWindowChange();
  const bounds = shelfWindow.getBounds();
  animateShelfHide(bounds);
}

function toggleShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) {
    createWindows();
    return;
  }
  if (shelfWindow.isVisible()) {
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
  const shelfBounds = getShelfBounds(display);

  if (shelfWindow && !shelfWindow.isDestroyed()) {
    const workArea = display.workArea;
    shelfWindow.setMinimumSize(workArea.width, 200);
    shelfWindow.setMaximumSize(workArea.width, Math.round(workArea.height * 0.95));
    shelfWindow.setBounds({
      x: shelfBounds.x,
      y: shelfBounds.y,
      width: shelfBounds.width,
      height: shelfBounds.height,
    });
    shelfWindow.setAlwaysOnTop(config.alwaysOnTop);
    shelfWindow.setSkipTaskbar(!config.showTaskbarIcon);
  }
}

// ── REGISTRO DE ATAJO GLOBAL ──
function registerGlobalShortcutKey(shortcut: string) {
  globalShortcut.unregisterAll();
  const electronShortcut = shortcut.replace(/Meta/g, 'Super').replace(/Ctrl/g, 'CommandOrControl');

  try {
    const success = globalShortcut.register(electronShortcut, () => {
      toggleShelf();
    });
    if (!success) {
      console.warn(`Failed to register global shortcut: ${electronShortcut}`);
    }
  } catch (err) {
    console.error('Error registering global shortcut:', err);
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
          // Fallback con PowerShell
          const escapedPath = normalized.replace(/'/g, "''");
          const winCommand = `powershell -NoProfile -Command "$s = New-Object -ComObject WScript.Shell; $s.CreateShortcut('${escapedPath}').TargetPath"`;
          const output = execSync(winCommand, { encoding: 'utf-8' }).trim();
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
        const tmpPs = path.join(os.tmpdir(), `ct-icon-${Date.now()}.ps1`);
        fs.writeFileSync(tmpPs, psScript, 'utf-8');
        const psOutput = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpPs}"`, { encoding: 'utf-8', timeout: 8000 }).trim();
        fs.unlinkSync(tmpPs);
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

function fetchVramInfoInBackground() {
  if (isFetchingVram) return;
  isFetchingVram = true;
  const psCommand = `powershell -NoProfile -Command "Get-WmiObject Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1 Name,@{N='AdapterRAM';E={[math]::Round($_.AdapterRAM / 1GB, 2)}} | ConvertTo-Json"`;
  exec(psCommand, { encoding: 'utf-8', timeout: 8000 }, (err, stdout) => {
    isFetchingVram = false;
    if (!err && stdout) {
      try {
        const gpuData = JSON.parse(stdout);
        if (gpuData && gpuData.AdapterRAM > 0) {
          vramCache = {
            data: {
              total: gpuData.AdapterRAM,
              name: gpuData.Name?.trim() || 'GPU'
            },
            ts: Date.now()
          };
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }
    // If not set yet, store a fallback to avoid infinite loops/queries
    if (!vramCache) {
      vramCache = { data: null, ts: Date.now() };
    }
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

  ipcMain.handle('get-uwp-apps', async () => {
    // Paridad con CyberLauncher: obtención básica de apps UWP mediante powershell
    try {
      const psCommand = `powershell -NoProfile -Command "Get-AppxPackage -AllUsers | Where-Object { $_.NonRemovable -eq $false } | Select-Object Name, PackageFamilyName | ConvertTo-Json"`;
      const output = execSync(psCommand, { encoding: 'utf-8' });
      const raw = JSON.parse(output);
      return Array.isArray(raw) ? raw.map((item: any) => ({
        name: item.Name,
        aumid: item.PackageFamilyName,
        icon: ''
      })) : [];
    } catch {
      return [];
    }
  });

  ipcMain.handle('select-file', async (_, options) => {
    isDialogOpen = true;
    const res = await dialog.showOpenDialog(shelfWindow!, {
      properties: ['openFile'],
      filters: options?.filters,
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
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'gif', 'webp'] }],
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
      properties: ['openFile'],
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'aac', 'm4a'] }],
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
        return `data:image/png;base64,${buf.toString('base64')}`;
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
    registerGlobalShortcutKey(shortcut);
    saveConfig({ shortcut });
    return { success: true, shortcut };
  });

  ipcMain.handle('window-minimize', async () => {
    shelfWindow?.minimize();
  });

  ipcMain.handle('window-maximize-toggle', async () => {
    if (shelfWindow?.isMaximized()) {
      shelfWindow.unmaximize();
    } else {
      shelfWindow?.maximize();
    }
  });

  ipcMain.handle('window-close', async () => {
    hideShelf();
  });

  ipcMain.handle('window-hide-to-tray', async () => {
    hideShelf();
  });

  ipcMain.handle('set-auto-launch', async (_, enabled) => {
    saveConfig({ autoLaunch: enabled });
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: app.getPath('exe'),
    });
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

  ipcMain.handle('get-disk-info', async () => {
    const hasCache = !!diskCache;
    const cacheExpired = !hasCache || (Date.now() - diskCache.ts) >= 60000;

    if (cacheExpired) {
      // Revalidar en segundo plano asíncronamente para evitar congelar el hilo principal
      const runQuery = () => {
        exec('wmic logicaldisk get size,freespace,caption', { timeout: 3000, encoding: 'utf-8' }, (err, stdout) => {
          if (!err && stdout) {
            const lines = stdout.trim().split('\n').slice(1);
            const disks: Array<{ drive: string; total: number; free: number; used: number; percent: number }> = [];
            for (const line of lines) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 3) {
                const drive = parts[0];
                const free = parseInt(parts[1], 10);
                const total = parseInt(parts[2], 10);
                if (!isNaN(free) && !isNaN(total) && total > 0) {
                  const used = total - free;
                  disks.push({
                    drive,
                    total: Math.round(total / (1024 * 1024 * 1024) * 10) / 10,
                    free: Math.round(free / (1024 * 1024 * 1024) * 10) / 10,
                    used: Math.round(used / (1024 * 1024 * 1024) * 10) / 10,
                    percent: Math.round((used / total) * 100),
                  });
                }
              }
            }
            if (disks.length > 0) {
              diskCache = { data: disks, ts: Date.now() };
            }
          }
        });
      };

      if (hasCache) {
        // Si ya hay datos viejos, los devolvemos de inmediato y revalidamos de fondo (SWR)
        runQuery();
        return diskCache.data;
      }
    } else if (hasCache) {
      // Caché válido menor a 60s
      return diskCache.data;
    }

    // Primer inicio absoluto sin caché: ejecución bloqueante inicial para tener datos iniciales correctos
    return new Promise((resolve) => {
      exec('wmic logicaldisk get size,freespace,caption', { timeout: 3000, encoding: 'utf-8' }, (err, stdout) => {
        if (err || !stdout) {
          const fallback = [{ drive: 'C:', total: 500, free: 250, used: 250, percent: 50 }];
          diskCache = { data: fallback, ts: Date.now() };
          resolve(fallback);
          return;
        }
        const lines = stdout.trim().split('\n').slice(1);
        const disks: Array<{ drive: string; total: number; free: number; used: number; percent: number }> = [];
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const drive = parts[0];
            const free = parseInt(parts[1], 10);
            const total = parseInt(parts[2], 10);
            if (!isNaN(free) && !isNaN(total) && total > 0) {
              const used = total - free;
              disks.push({
                drive,
                total: Math.round(total / (1024 * 1024 * 1024) * 10) / 10,
                free: Math.round(free / (1024 * 1024 * 1024) * 10) / 10,
                used: Math.round(used / (1024 * 1024 * 1024) * 10) / 10,
                percent: Math.round((used / total) * 100),
              });
            }
          }
        }
        const result = disks.length > 0 ? disks : [{ drive: 'C:', total: 500, free: 250, used: 250, percent: 50 }];
        diskCache = { data: result, ts: Date.now() };
        resolve(result);
      });
    });
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

  ipcMain.handle('search-system-files', async (_, query) => {
    // Retorna resultados vacíos por defecto, o se integra con el indexer local
    return [];
  });

  ipcMain.handle('get-indexer-settings', async () => {
    return { enabled: false, maxDepth: 1, paths: [] };
  });

  ipcMain.handle('save-indexer-settings', async () => {
    return true;
  });

  ipcMain.handle('get-indexer-stats', async () => {
    return { status: 'OFFLINE', totalFiles: 0 };
  });

  ipcMain.handle('get-system-drives', async () => {
    return ['C:', 'D:'];
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
    const menu = Menu.buildFromTemplate([
      { label: 'Cortar', role: 'cut' },
      { label: 'Copiar', role: 'copy' },
      { label: 'Pegar', role: 'paste' },
      { label: 'Eliminar', role: 'delete' },
      { type: 'separator' },
      { label: 'Seleccionar todo', role: 'selectAll' }
    ]);
    menu.popup({ window: shelfWindow!, x, y });
  });

  ipcMain.handle('export-config', async (_, jsonData) => {
    isDialogOpen = true;
    const res = await dialog.showSaveDialog(shelfWindow!, {
      title: 'Exportar Configuración',
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
      title: 'Importar Configuración',
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
    return true;
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

  ipcMain.handle('run-shell-command', async (_, command) => {
    try {
      exec(command, (err, stdout, stderr) => {
        const id = 'cmd-once';
        if (shelfWindow && !shelfWindow.isDestroyed()) {
          if (stdout) shelfWindow.webContents.send('shell-command-output', { id, type: 'stdout', text: stdout });
          if (stderr) shelfWindow.webContents.send('shell-command-output', { id, type: 'stderr', text: stderr });
          shelfWindow.webContents.send('shell-command-exit', { id, exitCode: err ? err.code || 1 : 0 });
        }
      });
      return { success: true, cmdId: 'cmd-once' };
    } catch (e: any) {
      return { success: false, error: e?.message || e };
    }
  });

  // --- Canales de CyberTray ---
  ipcMain.handle('toggle-shelf', async () => {
    toggleShelf();
  });

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
      title: 'Seleccionar carpeta de archivos',
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
  migrateConfigIconsToDisk();
  registerLocalResourceProtocol();
  registerIpcHandlers();
  fetchVramInfoInBackground(); // Carga de VRAM asíncrona en segundo plano al iniciar
  createWindows();
  createTray();
  registerGlobalShortcutKey(config.shortcut);
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
  stopHotspotPolling();
});
