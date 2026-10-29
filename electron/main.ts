import { app, BrowserWindow, clipboard, ipcMain, shell, Tray, Menu, globalShortcut, screen, nativeImage, dialog, protocol, powerMonitor } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { initUpdater } from './updater';
import { createDefaultConfig, sanitizeConfig, type CyberTrayConfig } from '../src/lib/configDefaults';
import { scanImportSources } from './importScanner';
import { activateStoreApp, isStoreAppUserModelId, resolveStoreAppLauncher } from './store-app-launch';
import { applyImportPlan, reconcileImport, type ImportPlan, type ImportSourceConfig, type ScannedShortcut, type ShortcutRecord } from '../src/lib/shortcutImport';
import type { CyberFolder } from '../src/lib/appUtils';
import { UNCATEGORIZED_ID } from '../src/lib/appUtils';
import { isUrlPath } from '../src/lib/shortcutPath';
import { createBackupService } from './backups';
import { normalizeBackupFolder, parseBackupHours, parseBackupKeep } from '../src/lib/backup';
import { refreshDesktopWatcher, markWatcherItemsHandled, stopDesktopWatcher, resetDesktopWatcherBaseline } from './desktop-watcher';
import { readWatcherSettings, limitWatcherItems, watcherSourceFromId } from '../src/lib/desktopWatcher';
import {
  clearNotificationState,
  deleteNotificationItems,
  deleteNotifications,
  findNotificationItems,
  getNotificationState,
  initNotificationStore,
  markNotificationsRead,
  pushNotificationItems,
  pushNotificationMessage,
} from './notification-store';
import type { NotificationItem } from '../src/lib/notificationCenter';

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

// Motivos por los que el renderer pide no ocultar el panel al perder el foco.
// Se guardan por nombre (no un booleano) para que dos operaciones simultáneas
// no se pisen al liberar la retención la primera de ellas.
const shelfHoldReasons = new Set<string>();

function isShelfHeld(): boolean {
  return shelfHoldReasons.size > 0;
}

// ── CONFIGURACIÓN PREDETERMINADA ──
// Los valores por defecto viven en src/lib/configDefaults.ts, compartidos con
// el renderer para que main y UI nunca discrepen.

let config: CyberTrayConfig = createDefaultConfig();
// Contador monótono de cambios de configuración: permite al renderer ignorar
// recargas obsoletas en lugar de volver a un estado anterior.
let configRevision = 0;
const CONFIG_FILE = path.join(app.getPath('userData'), 'cyber-tray-config.json');
const IMPORT_BACKUP_FILE = `${CONFIG_FILE}.before-import-backup`;
const BACKUPS_DIR = path.join(app.getPath('userData'), 'backups');

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

/**
 * Los `.url` sin icono propio comparten el globo genérico de Windows, copiado
 * byte a byte en cada acceso. Si dos accesos web tienen exactamente el mismo
 * icono es que ninguno aporta información: se vacía para que la interfaz
 * dibuje el suyo. Idempotente: sin iconos repetidos no toca nada.
 */
function migrateGenericUrlIcons(): void {
  const list: any[] = Array.isArray(config.shortcutsList) ? config.shortcutsList : [];
  const candidates = list.filter(item => isUrlPath(item?.path) && localResourceToFsPath(item?.iconPath));
  if (candidates.length < 2) return;

  const buckets = new Map<string, any[]>();
  for (const item of candidates) {
    const file = localResourceToFsPath(item.iconPath);
    if (!file) continue;
    try {
      const hash = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
      const bucket = buckets.get(hash);
      if (bucket) bucket.push(item);
      else buckets.set(hash, [item]);
    } catch {
      // Icono ilegible: se deja como está antes que romper el arranque.
    }
  }

  let cleared = 0;
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    for (const item of bucket) {
      item.iconPath = '';
      cleared += 1;
    }
  }
  if (cleared === 0) return;

  try {
    saveConfig({ shortcutsList: list });
    console.log(`[CyberTray] Cleared ${cleared} generic web icons`);
  } catch (err) {
    console.error('Error clearing generic web icons:', err);
  }
}

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
    backupFolder: 'Select backup folder',
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
    backupFolder: 'Seleccionar carpeta de respaldos',
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
    if (process.platform === 'win32' && isStoreAppUserModelId(target)) {
      if (isAdmin) return { success: false, error: 'Microsoft Store apps cannot be elevated through this launcher.' };
      if (cwd?.trim()) return { success: false, error: 'Microsoft Store apps do not support a custom working directory.' };
      const helperPath = resolveStoreAppLauncher(app.isPackaged, process.resourcesPath, app.getAppPath(), __dirname);
      await activateStoreApp(target, helperPath, hasArgs ? args : undefined);
      return { success: true };
    }
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

const TRAY_MENU_CARD_WIDTH = 292;
const TRAY_MENU_SHADOW_PAD = 24;
const TRAY_MENU_EST_HEIGHT = 520;

let trayMenuWin: BrowserWindow | null = null;
let trayMenuAnchor: any = null;
let trayMenuHideTimer: NodeJS.Timeout | null = null;
let trayMenuShowPending = false;
let trayMenuShowFallback: NodeJS.Timeout | null = null;
let trayMenuRevealTimer: NodeJS.Timeout | null = null;
let trayMenuLastShown = 0;
let mainViewHeight = TRAY_MENU_EST_HEIGHT;
let lastTrayMenuHeight = TRAY_MENU_EST_HEIGHT;

function getTrayMenuHtmlPath(): string {
  const candidates = [
    path.join(__dirname, '../public/tray/tray-menu.html'),
    path.join(__dirname, '../dist/tray/tray-menu.html'),
    path.join(app.getAppPath(), 'public/tray/tray-menu.html'),
    path.join(app.getAppPath(), 'dist/tray/tray-menu.html'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function trayMenuGeometry(iconBounds: any, windowW: number, windowH: number) {
  let b = (iconBounds && typeof iconBounds.x === 'number' && (iconBounds.width || iconBounds.height))
    ? { x: iconBounds.x, y: iconBounds.y, width: iconBounds.width || 0, height: iconBounds.height || 0 }
    : null;
  if (!b) {
    let p: any = null;
    try { p = screen.getCursorScreenPoint(); } catch (_) { p = { x: 0, y: 0 }; }
    b = { x: p.x, y: p.y, width: 0, height: 0 };
  }
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  let display: any;
  try { display = screen.getDisplayNearestPoint({ x: cx, y: cy }); }
  catch (_) { display = screen.getPrimaryDisplay(); }
  const work = (display && display.workArea) || { x: 0, y: 0, width: windowW, height: windowH };

  const gap = 4;
  const pad = TRAY_MENU_SHADOW_PAD;
  const cardW = windowW - 2 * pad;
  const cardH = windowH - 2 * pad;

  let cardX: number, cardY: number;
  const dLeft = cx - work.x;
  const dRight = (work.x + work.width) - cx;
  const dTop = cy - work.y;
  const dBottom = (work.y + work.height) - cy;

  if (dBottom <= dLeft && dBottom <= dRight && dBottom <= dTop) {
    cardX = cx - cardW / 2;
    cardY = b.y - gap - cardH;
  } else if (dTop <= dLeft && dTop <= dRight) {
    cardX = cx - cardW / 2;
    cardY = b.y + b.height + gap;
  } else if (dLeft <= dRight) {
    cardX = b.x + b.width + gap;
    cardY = cy - cardH / 2;
  } else {
    cardX = b.x - gap - cardW;
    cardY = cy - cardH / 2;
  }

  let windowX = cardX - pad;
  let windowY = cardY - pad;

  windowX = Math.min(Math.max(windowX, work.x + 2), work.x + work.width - windowW - 2);
  const screenBottom = (display.bounds ? display.bounds.y + display.bounds.height : work.y + work.height) - 2;
  windowY = Math.min(Math.max(windowY, work.y + 2), screenBottom - windowH);

  return { x: Math.round(windowX), y: Math.round(windowY), width: Math.round(windowW), height: Math.round(windowH) };
}

function ensureTrayMenuWin(): BrowserWindow {
  if (trayMenuWin && !trayMenuWin.isDestroyed()) return trayMenuWin;

  const windowW = TRAY_MENU_CARD_WIDTH + 2 * TRAY_MENU_SHADOW_PAD;
  trayMenuWin = new BrowserWindow({
    width: windowW,
    height: TRAY_MENU_EST_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  trayMenuWin.setAlwaysOnTop(true, 'pop-up-menu');
  void trayMenuWin.loadFile(getTrayMenuHtmlPath());

  trayMenuWin.on('blur', () => {
    if (trayMenuHideTimer) return;
    if (Date.now() - trayMenuLastShown < 250) return;
    trayMenuHideTimer = setTimeout(() => {
      trayMenuHideTimer = null;
      hideCustomTrayMenu();
    }, 120);
  });

  trayMenuWin.on('closed', () => {
    trayMenuWin = null;
  });

  trayMenuWin.webContents.once('did-finish-load', () => {
    if (!trayMenuWin || trayMenuWin.isDestroyed()) return;
    trayMenuWin.webContents.send('tray-menu-state', buildTrayMenuState(true));
  });

  return trayMenuWin;
}

function buildTrayMenuState(resetView = false) {
  const lang = config.language === 'es' ? 'es' : 'en';
  return {
    version: app.getVersion(),
    lang,
    isVisible: isShelfCurrentlyOpen(),
    shortcut: config.shortcut || '',
    recents: trayRecents.map((item, index) => {
      const icon = loadRecentIcon(item.iconPath);
      return {
        index,
        name: item.name,
        path: item.path,
        icon: icon ? icon.toDataURL() : '',
      };
    }),
    resetView,
  };
}

function revealTrayMenuWin() {
  if (!trayMenuWin || trayMenuWin.isDestroyed()) return;
  if (trayMenuShowFallback) { clearTimeout(trayMenuShowFallback); trayMenuShowFallback = null; }
  trayMenuShowPending = false;
  if (!trayMenuWin.isVisible()) {
    try { trayMenuWin.setOpacity(0); } catch { /* ignore */ }
    trayMenuWin.show();
    if (trayMenuRevealTimer) clearTimeout(trayMenuRevealTimer);
    trayMenuRevealTimer = setTimeout(() => {
      trayMenuRevealTimer = null;
      if (trayMenuWin && !trayMenuWin.isDestroyed()) {
        try { trayMenuWin.setOpacity(1); } catch { /* ignore */ }
      }
    }, 40);
  } else {
    try { trayMenuWin.setOpacity(1); } catch { /* ignore */ }
  }
  trayMenuWin.focus();
  trayMenuLastShown = Date.now();
}

function showCustomTrayMenu(eventBounds?: any) {
  if (!tray || tray.isDestroyed()) return;
  let b = (eventBounds && typeof eventBounds.x === 'number' && (eventBounds.width || eventBounds.height))
    ? eventBounds : null;
  if (!b) { try { b = tray.getBounds(); } catch (_) { b = null; } }
  if (!b || (!b.width && !b.height)) {
    let p: any = null;
    try { p = screen.getCursorScreenPoint(); } catch (_) { p = { x: 0, y: 0 }; }
    b = p ? { x: p.x, y: p.y, width: 0, height: 0 } : { x: 0, y: 0, width: 0, height: 0 };
  }

  trayMenuAnchor = b;
  if (trayMenuHideTimer) { clearTimeout(trayMenuHideTimer); trayMenuHideTimer = null; }

  const w = ensureTrayMenuWin();
  if (!w || w.isDestroyed()) return;

  const windowW = TRAY_MENU_CARD_WIDTH + 2 * TRAY_MENU_SHADOW_PAD;
  const initialH = mainViewHeight || lastTrayMenuHeight || TRAY_MENU_EST_HEIGHT;
  const geo = trayMenuGeometry(trayMenuAnchor, windowW, initialH);
  const current = w.getBounds();
  if (current.x !== geo.x || current.y !== geo.y || current.width !== geo.width || current.height !== geo.height) {
    w.setBounds(geo);
  }

  trayMenuShowPending = true;
  if (trayMenuShowFallback) { clearTimeout(trayMenuShowFallback); trayMenuShowFallback = null; }
  trayMenuShowFallback = setTimeout(() => {
    trayMenuShowFallback = null;
    if (trayMenuShowPending) revealTrayMenuWin();
  }, 500);

  if (!w.webContents.isLoading()) {
    w.webContents.send('tray-menu-state', buildTrayMenuState(true));
  }
}

function hideCustomTrayMenu() {
  if (trayMenuHideTimer) { clearTimeout(trayMenuHideTimer); trayMenuHideTimer = null; }
  if (trayMenuShowFallback) { clearTimeout(trayMenuShowFallback); trayMenuShowFallback = null; }
  if (trayMenuRevealTimer) { clearTimeout(trayMenuRevealTimer); trayMenuRevealTimer = null; }
  trayMenuShowPending = false;
  if (trayMenuWin && !trayMenuWin.isDestroyed()) {
    try { trayMenuWin.setOpacity(1); } catch { /* ignore */ }
    if (trayMenuWin.isVisible()) trayMenuWin.hide();
    if (!trayMenuWin.webContents.isLoading()) {
      trayMenuWin.webContents.send('tray-menu-reset');
    }
  }
}

// ── AVISO DEL VIGILANTE DE ESCRITORIO ──
//
// Ventana propia, no reutiliza la bandeja: la bandeja se oculta al perder el
// foco y el aviso debe poder quedarse mientras el usuario decide. Aparece sin
// activarse (`showInactive`) para no robar el foco a lo que estés haciendo.

const WATCHER_PROMPT_WIDTH = 392;
/** Alto del marco: cabecera, cuenta regresiva, selector de carpeta y botones. */
const WATCHER_PROMPT_CHROME = 148;
/** Fila extra que aparece cuando el lote no cabe entero en el aviso. */
const WATCHER_PROMPT_MORE_ROW = 28;
/** Alto de cada elemento listado. */
const WATCHER_PROMPT_ROW = 40;
const WATCHER_PROMPT_MARGIN = 12;

let watcherPromptWin: BrowserWindow | null = null;
let watcherPromptTimer: NodeJS.Timeout | null = null;
/** Solo lo que cabe en el aviso; la bandeja guarda el lote completo. */
let watcherPromptItems: ScannedShortcut[] = [];
/** Lote de la bandeja al que pertenece el aviso visible. */
let watcherPromptEntryId: string | null = null;
/** Elementos totales del lote, aunque el aviso solo muestre unos pocos. */
let watcherPromptTotal = 0;

function getWatcherPromptHtmlPath(): string {
  const candidates = [
    path.join(__dirname, '../public/watcher/watcher-prompt.html'),
    path.join(__dirname, '../dist/watcher/watcher-prompt.html'),
    path.join(app.getAppPath(), 'public/watcher/watcher-prompt.html'),
    path.join(app.getAppPath(), 'dist/watcher/watcher-prompt.html'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function watcherPromptHeight(itemCount: number, hasMore = false): number {
  return WATCHER_PROMPT_CHROME
    + (hasMore ? WATCHER_PROMPT_MORE_ROW : 0)
    + Math.max(1, itemCount) * WATCHER_PROMPT_ROW;
}

/** Esquina inferior derecha del monitor donde está el puntero. */
function watcherPromptBounds(itemCount: number, hasMore = false) {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const area = display.workArea;
  const height = watcherPromptHeight(itemCount, hasMore);
  return {
    x: area.x + area.width - WATCHER_PROMPT_WIDTH - WATCHER_PROMPT_MARGIN,
    y: area.y + area.height - height - WATCHER_PROMPT_MARGIN,
    width: WATCHER_PROMPT_WIDTH,
    height,
  };
}

/** Carpetas reales que se pueden elegir como destino del aviso. */
function watcherPromptFolders() {
  const folders = Array.isArray(config.categoriesList) ? config.categoriesList : [];
  return folders
    .filter((folder: any) => folder && folder.id && folder.id !== 'all' && folder.id !== 'vault')
    .map((folder: any) => ({
      id: String(folder.id),
      name: String(folder.name || folder.id),
      color: String(folder.color || ''),
    }));
}

function buildWatcherPromptState() {
  return {
    lang: config.language === 'es' ? 'es' : 'en',
    seconds: readWatcherSettings(config).promptSeconds,
    total: watcherPromptTotal,
    items: watcherPromptItems.map(item => ({
      key: item.key,
      name: item.name,
      path: item.path,
      iconPath: item.iconPath || '',
      isStore: /^[^\\/]+_[a-z0-9]+!/i.test(item.path || ''),
    })),
    folders: watcherPromptFolders(),
    defaultFolderId: UNCATEGORIZED_ID,
  };
}

function ensureWatcherPromptWindow(): BrowserWindow {
  if (watcherPromptWin && !watcherPromptWin.isDestroyed()) return watcherPromptWin;

  watcherPromptWin = new BrowserWindow({
    width: WATCHER_PROMPT_WIDTH,
    height: watcherPromptHeight(1),
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  watcherPromptWin.setAlwaysOnTop(true, 'screen-saver');
  void watcherPromptWin.loadFile(getWatcherPromptHtmlPath());

  watcherPromptWin.on('closed', () => {
    watcherPromptWin = null;
  });

  return watcherPromptWin;
}

function hideWatcherPrompt(): void {
  if (watcherPromptTimer) { clearTimeout(watcherPromptTimer); watcherPromptTimer = null; }
  watcherPromptItems = [];
  watcherPromptEntryId = null;
  watcherPromptTotal = 0;
  if (watcherPromptWin && !watcherPromptWin.isDestroyed() && watcherPromptWin.isVisible()) {
    watcherPromptWin.hide();
  }
}

/** Convierte un elemento detectado en una entrada de la bandeja. */
function toNotificationItem(item: ScannedShortcut): NotificationItem {
  return {
    key: item.key,
    name: item.name,
    path: item.path,
    iconPath: item.iconPath || '',
    source: watcherSourceFromId(item.sourceId),
    args: item.arguments || '',
    cwd: item.cwd || '',
  };
}

/**
 * Muestra el aviso. Si ya hay uno abierto se reemplaza: dos avisos apilados
 * serían peores que uno con la lista actualizada.
 *
 * El lote completo se guarda antes en la bandeja. El aviso enseña solo lo que
 * cabe, pero nada se pierde: lo que no entra (o lo que se cierra solo) sigue
 * en el centro de notificaciones.
 */
function showWatcherPrompt(items: ScannedShortcut[]): void {
  if (items.length === 0) return;

  const stored = pushNotificationItems(items.map(toNotificationItem));
  // Todo el lote ya estaba en la bandeja: no se vuelve a preguntar.
  if (!stored) return;

  const storedKeys = new Set(stored.items.map(item => item.key));
  const announced = items.filter(item => storedKeys.has(item.key));
  watcherPromptEntryId = stored.id;
  watcherPromptItems = limitWatcherItems(announced);
  watcherPromptTotal = announced.length;

  const win = ensureWatcherPromptWindow();
  const hasMore = watcherPromptTotal > watcherPromptItems.length;
  win.setBounds(watcherPromptBounds(watcherPromptItems.length, hasMore));

  const reveal = () => {
    if (!watcherPromptWin || watcherPromptWin.isDestroyed()) return;
    watcherPromptWin.webContents.send('watcher-prompt-state', buildWatcherPromptState());
    watcherPromptWin.showInactive();
    if (watcherPromptTimer) clearTimeout(watcherPromptTimer);
    const seconds = readWatcherSettings(config).promptSeconds;
    watcherPromptTimer = setTimeout(() => {
      watcherPromptTimer = null;
      // Cerrarse solo no equivale a leerlo: el lote se queda sin ver en el
      // centro y el contador de la campana lo recuerda.
      hideWatcherPrompt();
    }, seconds * 1000);
  };

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', reveal);
  } else {
    reveal();
  }
}

/** Candidato a entrar en la librería, venga del aviso o del centro. */
interface LibraryCandidate {
  key: string;
  name: string;
  path: string;
  iconPath?: string;
  args?: string;
  cwd?: string;
}

/**
 * Añade a la librería los elementos elegidos.
 *
 * Devuelve las claves procesadas, incluidas las que ya estaban en la librería:
 * unas y otras deben salir de la bandeja, o se quedarían ahí para siempre.
 */
function addShortcutsToLibrary(
  items: LibraryCandidate[],
  requestedFolderId: string,
): { added: number; folderId: string; keys: string[] } {
  const validIds = new Set((config.categoriesList || []).map((folder: any) => String(folder?.id || '')));
  const folderId = validIds.has(requestedFolderId) && requestedFolderId !== 'all' && requestedFolderId !== 'vault'
    ? requestedFolderId
    : UNCATEGORIZED_ID;

  if (items.length === 0) return { added: 0, folderId, keys: [] };

  const list: any[] = Array.isArray(config.shortcutsList) ? [...config.shortcutsList] : [];
  const knownPaths = new Set(list.map(entry => String(entry?.path || '').toLowerCase()));
  const processed: string[] = [];
  let added = 0;

  items.forEach((item, index) => {
    const pathKey = String(item.path || '').toLowerCase();
    if (!pathKey) return;
    processed.push(item.key);
    // Ya está en la librería: no se duplica, pero tampoco se vuelve a ofrecer.
    if (knownPaths.has(pathKey)) return;
    knownPaths.add(pathKey);
    list.push({
      id: Date.now() + index,
      name: item.name,
      path: item.path,
      category: folderId,
      iconPath: item.iconPath || '',
      isAdmin: false,
      delay: 0,
      arguments: item.args || '',
      cwd: item.cwd || '',
      usageCount: 0,
      addedTimestamp: Date.now(),
    });
    added += 1;
  });

  if (added > 0) saveConfig({ shortcutsList: list });
  markWatcherItemsHandled(processed);
  return { added, folderId, keys: processed };
}

function updateCustomTrayMenuState() {
  if (trayMenuWin && !trayMenuWin.isDestroyed() && !trayMenuWin.webContents.isLoading()) {
    trayMenuWin.webContents.send('tray-menu-state', buildTrayMenuState(false));
  }
}

function rebuildTrayMenu(): void {
  if (!tray) return;
  tray.setToolTip(`CyberTray v${app.getVersion()}`);
  updateCustomTrayMenuState();
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
    try { tray.setContextMenu(null); } catch { /* ignore */ }
    tray.on('click', () => {
      hideCustomTrayMenu();
      toggleShelf();
    });
    tray.on('right-click', (_event, bounds) => {
      if (trayMenuWin && trayMenuWin.isVisible()) hideCustomTrayMenu();
      else showCustomTrayMenu(bounds);
    });
    try {
      ensureTrayMenuWin();
    } catch (err: any) {
      console.warn('[TRAY] Failed to prewarm tray menu:', err?.message || err);
    }
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
      config = { ...createDefaultConfig(), ...sanitizeConfig(JSON.parse(data)) };
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
): boolean {
  try {
    if (newConfig.shortcutsList) {
      newConfig = {
        ...newConfig,
        shortcutsList: persistShortcutIconsInPlace(newConfig.shortcutsList),
      };
    }
    const previous = config;
    config = sanitizeConfig({ ...config, ...newConfig }) as CyberTrayConfig;
    // Los ajustes de respaldo se normalizan al guardar: así el archivo nunca
    // contiene una frecuencia o una cantidad de copias fuera de las permitidas.
    config.autoBackupEnabled = config.autoBackupEnabled !== false;
    config.autoBackupHours = parseBackupHours(config.autoBackupHours);
    config.autoBackupKeep = parseBackupKeep(config.autoBackupKeep);
    config.autoBackupPath = normalizeBackupFolder(config.autoBackupPath);
    configRevision += 1;
    // Los atajos por acceso dependen de la lista de accesos: se re-registran
    // solo cuando algún atajo (o su destino) ha cambiado.
    const hotkeySignature = (list?: any[]) =>
      JSON.stringify((list || []).map((s: any) => `${s?.id ?? ''}:${s?.hotkey || ''}:${s?.path || ''}:${s?.arguments || ''}:${s?.cwd || ''}:${s?.isAdmin ? 1 : 0}`));
    if (hotkeySignature(previous.shortcutsList) !== hotkeySignature(config.shortcutsList)) {
      registerShortcutHotkeys(config.shortcutsList || []);
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');

    // Quiet saves (e.g. usageCount ticks) skip reload IPC
    if (options?.broadcastReload === false) {
      return true;
    }

    if (shelfWindow && !shelfWindow.isDestroyed()) {
      // Se envía la config ya normalizada: el renderer no necesita releer el disco.
      shelfWindow.webContents.send('reload-config', { ...config, __rev: configRevision });
    }

    // Reconstruir el menú y reiniciar el polling solo cuando cambia lo que
    // depende de ellos: antes se hacía en cada guardado.
    const menuChanged =
      previous.language !== config.language ||
      previous.shortcut !== config.shortcut ||
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

    // El vigilante se reconfigura solo si cambió algo que le afecte: encenderlo,
    // apagarlo o mover sus fuentes. Cambiar la duración del aviso no re-escanea.
    const watcherChanged =
      previous.watcherEnabled !== config.watcherEnabled ||
      previous.watcherWatchDesktop !== config.watcherWatchDesktop ||
      previous.watcherWatchStartMenu !== config.watcherWatchStartMenu ||
      previous.watcherWatchStore !== config.watcherWatchStore;
    if (watcherChanged) {
      startDesktopWatcherIfEnabled();
      if (!config.watcherEnabled) hideWatcherPrompt();
    }
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
    return false;
  }
}

function getVaultPath(): string {
  if (config.vaultPath && config.vaultPath.trim() !== '') {
    return config.vaultPath;
  }
  return path.join(app.getPath('userData'), 'CyberTray_files');
}

// ── RESPALDO AUTOMÁTICO ──
// El servicio vive aparte (electron/backups.ts) para poder probarlo contra
// carpetas temporales sin levantar Electron. Aquí solo se le da acceso a la
// configuración y a las acciones que dependen de la ventana.
function broadcastConfig(): void {
  if (shelfWindow && !shelfWindow.isDestroyed()) {
    shelfWindow.webContents.send('reload-config', { ...config, __rev: configRevision });
  }
}

/** Tras restaurar una copia hay que reaplicar todo lo que dependía de la config. */
function applyRestoredConfig(): void {
  loadConfig();
  configRevision += 1;
  registerGlobalShortcutKey(config.shortcut);
  registerShortcutHotkeys(config.shortcutsList || []);
  startHotspotPolling();
  createTray();
  broadcastConfig();
}

const backupService = createBackupService({
  configFile: CONFIG_FILE,
  defaultFolder: BACKUPS_DIR,
  readSettings: () => ({
    enabled: config.autoBackupEnabled !== false,
    hours: parseBackupHours(config.autoBackupHours),
    keep: parseBackupKeep(config.autoBackupKeep),
    last: typeof config.autoBackupLast === 'string' ? config.autoBackupLast : null,
    folder: normalizeBackupFolder(config.autoBackupPath),
  }),
  patchConfig: (patch) => { saveConfig(patch as Partial<CyberTrayConfig>, { broadcastReload: false }); },
  onCompleted: (payload) => {
    if (shelfWindow && !shelfWindow.isDestroyed()) {
      shelfWindow.webContents.send('backup:completed', payload);
    }
  },
  // Un respaldo que falla cada hora sin decir nada es un respaldo que no
  // existe. El aviso va al centro, que agrupa los intentos fallidos.
  // El respaldo manual no entra aquí: quien lo lanzó ya ve el error en el
  // panel en ese mismo momento.
  onFailed: (payload) => {
    if (payload.reason === 'manual') return;
    const es = config.language === 'es';
    pushNotificationMessage({
      title: es ? 'Falló el respaldo automático' : 'Automatic backup failed',
      detail: `${es ? 'Motivo' : 'Reason'}: ${payload.error}`,
      level: 'error',
      dedupeKey: 'backup-failed',
    });
  },
  onRestored: () => applyRestoredConfig(),
});

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
  const savedBounds = config.monitorBounds;
  if (savedBounds) {
    const fallback = displays.find(d =>
      d.bounds.x === savedBounds.x &&
      d.bounds.y === savedBounds.y &&
      d.bounds.width === savedBounds.width &&
      d.bounds.height === savedBounds.height
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
      if (isDragActive || isDialogOpen || isShelfHeld()) return;
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
  const trimmed = String(shortcut || '').trim();

  // Un atajo vacío significa "sin atajo global": se libera el actual en lugar
  // de intentar registrar un acelerador inválido.
  if (!trimmed) {
    if (currentGlobalShortcut) {
      globalShortcut.unregister(currentGlobalShortcut);
      currentGlobalShortcut = null;
    }
    return true;
  }

  const electronShortcut = trimmed.replace(/Meta/g, 'Super').replace(/Ctrl/g, 'CommandOrControl');

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
    let iconSourcePath = '';
    let targetExists = true;

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
        iconSourcePath = shortcut.icon || '';
        if (shortcut.appUserModelId) {
          resolvedPath = shortcut.appUserModelId;
          targetExists = true;
        } else if (shortcut.target && fs.existsSync(shortcut.target)) {
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
            targetExists = true;
          } else {
            targetExists = false;
          }
        }
        // El target solo se usa para lanzar y extraer el icono; el nombre visible
        // sigue siendo el del .lnk.
        ext = path.extname(resolvedPath).toLowerCase();
        resolvedName = lnkName;
      } catch (e) {
        console.error('Error resolving .lnk file:', e);
      }
    } else if (ext === '.url') {
      const content = await fs.promises.readFile(normalized, 'utf8');
      const url = content.match(/^\s*URL\s*=\s*(.+)\s*$/im)?.[1]?.trim();
      if (!url) return null;
      const customIcon = content.match(/^\s*IconFile\s*=\s*(.+)\s*$/im)?.[1]?.trim();
      if (customIcon) {
        iconSourcePath = customIcon.replace(/%([^%]+)%/g, (match, name) => process.env[String(name)] || match);
      }
      resolvedPath = url;
      resolvedName = path.basename(normalized, ext);
      targetExists = true;
    }

    const iconKey = iconKeyForPath(resolvedPath);
    if (iconSourcePath) {
      // Los accesos guardan el icono como "archivo.ico,0": el índice no forma
      // parte de la ruta y pasarlo a nativeImage haría fallar la extracción.
      iconSourcePath = iconSourcePath.trim().replace(/^"(.*)"$/, '$1').replace(/,\s*-?\d+$/, '');
      if (!path.isAbsolute(iconSourcePath)) {
        iconSourcePath = path.resolve(path.dirname(normalized), iconSourcePath);
      }
      if (!fs.existsSync(iconSourcePath)) iconSourcePath = '';
    }

    // Un `.url` sin IconFile propio solo puede devolver el globo 3D genérico
    // de Windows. No se extrae: la interfaz dibuja un glifo vectorial.
    const skipGenericUrlIcon = ext === '.url' && !iconSourcePath;

    // Extracción de Icono nativo de alta calidad → PNG en userData/icons
    try {
      const effectiveIconSource = iconSourcePath || (fs.existsSync(resolvedPath) ? resolvedPath : normalized);
      if (!skipGenericUrlIcon && fs.existsSync(effectiveIconSource)) {
        let icon = iconSourcePath
          ? nativeImage.createFromPath(effectiveIconSource)
          : await app.getFileIcon(effectiveIconSource, { size: 'large' });
        if ((!icon || icon.isEmpty()) && !iconSourcePath) {
          icon = await app.getFileIcon(effectiveIconSource, { size: 'normal' });
        }
        if (icon && !icon.isEmpty()) {
          iconFileUrl = persistNativeIcon(icon, iconKey);
        }
      }
    } catch (e) {
      console.warn('Error getFileIcon:', e);
    }

    // Fallback de extracción de icono con PowerShell (para evitar iconos genéricos muy pequeños)
    if (!iconFileUrl && !skipGenericUrlIcon) {
      try {
        const fallbackIconSource = iconSourcePath || (fs.existsSync(resolvedPath) ? resolvedPath : normalized);
        const escapedPath = fallbackIconSource.replace(/'/g, "''");
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
      exists: targetExists && (isStoreAppUserModelId(resolvedPath) || /^https?:\/\//i.test(resolvedPath) || fs.existsSync(resolvedPath)),
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

function normalizeImportSources(input: unknown): ImportSourceConfig[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 32).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const source = raw as Partial<ImportSourceConfig>;
    if (!['desktop', 'start-menu', 'folder', 'store'].includes(String(source.kind))) return [];
    const kind = source.kind as ImportSourceConfig['kind'];
    const sourcePath = typeof source.path === 'string' ? source.path.trim() : '';
    if (kind === 'folder' && (!sourcePath || !path.isAbsolute(sourcePath))) return [];
    return [{
      id: String(source.id || `${kind}:${sourcePath || source.scope || 'user'}`).slice(0, 500),
      kind,
      ...(sourcePath ? { path: path.normalize(sourcePath) } : {}),
      scope: source.scope === 'common' ? 'common' as const : 'user' as const,
      ...(source.label ? { label: String(source.label).slice(0, 240) } : {}),
      targetCategory: String(source.targetCategory || UNCATEGORIZED_ID).slice(0, 200),
      preserveFolders: source.preserveFolders !== false,
      skipUninstallers: source.skipUninstallers !== false,
      includeFiles: source.includeFiles === true,
    }];
  });
}

function currentImportCategories(): CyberFolder[] {
  if (Array.isArray(config.categoriesList) && config.categoriesList.length) return config.categoriesList;
  // Sin carpetas guardadas solo existe la vista raíz: los accesos importados
  // caen en la bandeja sin categoría, que no es una carpeta.
  return [{ id: 'all', name: 'All', color: '#a1a1a1', parentId: null, order: -1 }];
}

async function scanAndPlanImport(
  sources: ImportSourceConfig[],
  options: { signal?: AbortSignal; onProgress?: (progress: { completed: number; total: number; sourceId: string }) => void } = {},
) {
  const scan = await scanImportSources(sources, resolveFullFileInfo, options);
  const plan = reconcileImport(
    (config.shortcutsList || []) as ShortcutRecord[],
    currentImportCategories(),
    scan.items,
    scan.scannedSourceIds,
  );
  return { plan, errors: scan.errors };
}

function commitImportPlan(plan: ImportPlan, sources: ImportSourceConfig[]) {
  const result = applyImportPlan(
    (config.shortcutsList || []) as ShortcutRecord[],
    currentImportCategories(),
    plan,
  );
  const removedIds = new Set(plan.items.filter(item => item.action === 'missing' && item.selected).map(item => item.existingId));
  const taskbarIds = (config.taskbarIds || []).filter(id => !removedIds.has(id) && result.shortcuts.some(item => item.id === id));
  if (fs.existsSync(CONFIG_FILE)) {
    fs.copyFileSync(CONFIG_FILE, IMPORT_BACKUP_FILE);
  } else {
    fs.writeFileSync(IMPORT_BACKUP_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }
  const success = saveConfig({
    shortcutsList: result.shortcuts,
    categoriesList: result.categories,
    taskbarIds,
    importSources: sources,
  });
  if (!success) throw new Error('Could not save the imported shortcuts.');
  return { success: true, created: result.created, updated: result.updated, removed: result.removed, missing: result.missing };
}

/**
 * Deja constancia de la sincronización de arranque en el centro. Corre sola y
 * sin ventana, así que sin esto no hay forma de saber qué hizo.
 */
function notifyStartupSync(
  created: number,
  updated: number,
  errors: Array<{ sourceId: string; message: string }>,
): void {
  const changed = created + updated;
  if (changed === 0 && errors.length === 0) return;
  const es = config.language === 'es';

  const parts: string[] = [];
  if (created > 0) parts.push(es ? `${created} añadidos` : `${created} added`);
  if (updated > 0) parts.push(es ? `${updated} actualizados` : `${updated} updated`);

  pushNotificationMessage({
    title: errors.length
      ? (es ? 'Sincronización al arrancar con problemas' : 'Startup sync had problems')
      : (es ? 'Sincronización al arrancar' : 'Startup sync'),
    detail: errors.length
      ? [...parts, `${es ? 'Fuentes con error' : 'Sources with errors'}: ${errors.length}`].join(' · ')
      : parts.join(' · '),
    level: errors.length > 0 ? 'warning' : 'info',
    dedupeKey: 'startup-sync',
  });
}

async function runStartupImportSync() {
  if (!config.autoSyncOnStartup || !config.importSources?.length) return;
  const sources = normalizeImportSources(config.importSources);
  if (!sources.length) return;
  const { plan, errors } = await scanAndPlanImport(sources);
  if (errors.length) console.warn('[IMPORT] Startup scan completed with source errors:', errors);
  const result = commitImportPlan(plan, sources);
  console.log(`[IMPORT] Startup sync: ${result.created} added, ${result.updated} updated, ${result.missing} missing`);
  notifyStartupSync(result.created, result.updated, errors);
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

  ipcMain.on('tray-menu-action', (_event, action: string, payload?: unknown) => {
    hideCustomTrayMenu();

    switch (action) {
      case 'toggle':
        toggleShelf();
        break;
      case 'new-shortcut':
        showShelf();
        setTimeout(() => {
          if (shelfWindow && !shelfWindow.isDestroyed()) {
            shelfWindow.webContents.send('open-add-shortcut');
          }
        }, 300);
        break;
      case 'settings':
        showShelf();
        setTimeout(() => {
          if (shelfWindow && !shelfWindow.isDestroyed()) {
            shelfWindow.webContents.send('open-settings');
          }
        }, 300);
        break;
      case 'recent': {
        const index = Number(payload);
        const item = Number.isInteger(index) ? trayRecents[index] : undefined;
        if (item) launchShortcutFromTray(item);
        break;
      }
      case 'help-docs':
        void shell.openExternal('https://github.com/CyberGems/CyberTray/wiki');
        break;
      case 'help-faq':
        void shell.openExternal('https://github.com/CyberGems/CyberTray/wiki/FAQ');
        break;
      case 'help-changelog':
        void shell.openExternal('https://github.com/CyberGems/CyberTray/releases');
        break;
      case 'help-website':
        void shell.openExternal('https://cybergems.org/apps/cybertray/');
        break;
      case 'help-donate':
        void shell.openExternal('https://github.com/CyberGems/CyberTray#%EF%B8%8F-donate');
        break;
      case 'about':
        triggerOpenAbout(false);
        break;
      case 'check-updates':
        triggerOpenAbout(true);
        break;
      case 'quit':
        isQuitting = true;
        app.quit();
        break;
    }
  });

  ipcMain.on('tray-menu-hide', () => {
    hideCustomTrayMenu();
  });

  ipcMain.on('tray-menu-ready', (_event, rect) => {
    if (!trayMenuWin || trayMenuWin.isDestroyed() || !rect) return;
    const pad = TRAY_MENU_SHADOW_PAD;
    const targetW = Math.round(rect.width || (TRAY_MENU_CARD_WIDTH + 2 * pad));
    const rawH = Math.round(rect.height || TRAY_MENU_EST_HEIGHT);
    const isMain = rect.view === 'main' || !rect.view;
    const desiredH = isMain ? rawH : Math.max(rawH, mainViewHeight);
    const clampedH = Math.min(Math.max(desiredH, 350), 750);

    if (isMain) {
      mainViewHeight = clampedH;
      lastTrayMenuHeight = clampedH;
    }

    const geo = trayMenuGeometry(trayMenuAnchor, targetW, clampedH);
    const current = trayMenuWin.getBounds();
    if (current.x !== geo.x || current.y !== geo.y || current.width !== geo.width || current.height !== geo.height) {
      trayMenuWin.setBounds(geo);
    }

    if (trayMenuShowPending) revealTrayMenuWin();
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

  const importScans = new Map<number, AbortController>();
  ipcMain.handle('import:scan', async (event, input) => {
    const sources = normalizeImportSources(input);
    if (!sources.length) return { plan: { items: [], scannedSourceIds: [] }, errors: [] };
    importScans.get(event.sender.id)?.abort();
    const controller = new AbortController();
    importScans.set(event.sender.id, controller);
    try {
      return await scanAndPlanImport(sources, {
        signal: controller.signal,
        onProgress: progress => {
          if (!event.sender.isDestroyed()) event.sender.send('import:progress', progress);
        },
      });
    } finally {
      if (importScans.get(event.sender.id) === controller) importScans.delete(event.sender.id);
    }
  });
  ipcMain.handle('import:cancel', async (event) => {
    importScans.get(event.sender.id)?.abort();
    return { success: true };
  });

  ipcMain.handle('import:apply', async (_, input) => {
    const sources = normalizeImportSources(input?.sources);
    const plan = input?.plan as ImportPlan | undefined;
    if (!plan || !Array.isArray(plan.items) || plan.items.length > 30000) {
      return { success: false, error: 'Invalid import plan.' };
    }
    try {
      return commitImportPlan(plan, sources);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  ipcMain.handle('import:backup-status', async () => ({ available: fs.existsSync(IMPORT_BACKUP_FILE) }));
  ipcMain.handle('import:undo', async () => {
    try {
      if (!fs.existsSync(IMPORT_BACKUP_FILE)) return { success: false, error: 'No import backup is available.' };
      const backup = JSON.parse(await fs.promises.readFile(IMPORT_BACKUP_FILE, 'utf-8')) as Record<string, unknown>;
      const shortcutsList = backup.shortcutsList;
      const categoriesList = backup.categoriesList;
      if (!Array.isArray(shortcutsList) || shortcutsList.length > 100000 || !Array.isArray(categoriesList) || categoriesList.length > 20000) {
        throw new Error('The import backup is invalid.');
      }
      const success = saveConfig({
        shortcutsList,
        categoriesList,
        taskbarIds: Array.isArray(backup.taskbarIds) ? backup.taskbarIds : [],
        importSources: normalizeImportSources(backup.importSources),
      });
      if (!success) throw new Error('Could not restore the import backup.');
      await fs.promises.unlink(IMPORT_BACKUP_FILE).catch(() => undefined);
      return { success: true, shortcuts: shortcutsList.length };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Restablecer a fábrica: nunca es irreversible. Se guarda una copia del
  // estado actual en la carpeta de respaldos antes de escribir los valores
  // por defecto, y se conservan el idioma y la carpeta de archivos del
  // usuario: un reinicio de ajustes no debe traducir la interfaz ni dejar
  // sus archivos fuera de alcance.
  ipcMain.handle('config:reset', async () => {
    try {
      const backup = backupService.run('manual');
      const defaults: CyberTrayConfig = {
        ...createDefaultConfig(),
        language: config.language === 'es' ? 'es' : 'en',
        vaultPath: config.vaultPath || '',
        shortcutsList: [],
        categoriesList: [],
        taskbarIds: [],
        importSources: [],
        monitorBounds: undefined,
        vaultPinEnabled: false,
        vaultPinHash: '',
        vaultPinSalt: '',
        vaultLockTimeout: 0,
        onboardingDone: false,
      };
      if (!saveConfig(defaults)) throw new Error('Could not write the default configuration.');
      applyRestoredConfig();
      return {
        success: true,
        backup: backup.ok && backup.file && backup.folder ? path.join(backup.folder, backup.file) : null,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // --- Vigilante de escritorio y menú Inicio ---
  ipcMain.handle('watcher:add', (_event, payload: { keys?: unknown; categoryId?: unknown }) => {
    const keys = Array.isArray(payload?.keys) ? payload!.keys.filter((key): key is string => typeof key === 'string') : [];
    const categoryId = typeof payload?.categoryId === 'string' ? payload.categoryId : UNCATEGORIZED_ID;
    const chosen = watcherPromptItems.filter(item => keys.includes(item.key));
    const result = addShortcutsToLibrary(chosen, categoryId);
    deleteNotificationItems(result.keys);
    hideWatcherPrompt();
    return { success: result.added > 0, added: result.added, folderId: result.folderId };
  });

  ipcMain.handle('watcher:dismiss', () => {
    // "Ahora no" sí es haberlo visto: se queda en el centro, pero sin marcar
    // como pendiente, porque ya se decidió dejarlo para después.
    if (watcherPromptEntryId) markNotificationsRead([watcherPromptEntryId]);
    markWatcherItemsHandled(watcherPromptItems.map(item => item.key));
    hideWatcherPrompt();
    return { success: true };
  });

  /** Fuerza un ciclo del vigilante; usado por el botón "Comprobar ahora". */
  ipcMain.handle('watcher:check-now', () => {
    resetDesktopWatcherBaseline();
    return { success: true };
  });

  ipcMain.handle('watcher:status', () => {
    const settings = readWatcherSettings(config);
    return {
      ...settings,
      promptVisible: Boolean(watcherPromptWin && !watcherPromptWin.isDestroyed() && watcherPromptWin.isVisible()),
    };
  });

  /**
   * Crece o encoge el aviso manteniendo su borde inferior: el desplegable de
   * carpeta necesita sitio hacia arriba y no cabe en el alto original.
   */
  ipcMain.handle('watcher:resize', (_event, delta: unknown) => {
    const win = watcherPromptWin;
    if (!win || win.isDestroyed()) return false;
    const amount = Math.max(-400, Math.min(400, Math.round(Number(delta) || 0)));
    if (!amount) return true;
    const bounds = win.getBounds();
    const height = Math.max(120, bounds.height + amount);
    win.setBounds({ x: bounds.x, y: bounds.y - (height - bounds.height), width: bounds.width, height });
    return true;
  });

  /** Pausa la cuenta regresiva mientras el puntero está sobre el aviso. */
  ipcMain.handle('watcher:hold', (_event, hold: unknown) => {
    if (watcherPromptTimer) { clearTimeout(watcherPromptTimer); watcherPromptTimer = null; }
    if (hold === true || watcherPromptItems.length === 0) return true;
    const seconds = readWatcherSettings(config).promptSeconds;
    watcherPromptTimer = setTimeout(() => {
      watcherPromptTimer = null;
      hideWatcherPrompt();
    }, seconds * 1000);
    return true;
  });

  // --- Centro de notificaciones ---
  ipcMain.handle('notifications:list', () => getNotificationState());

  ipcMain.handle('notifications:mark-seen', (_event, ids: unknown) => {
    const list = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    return markNotificationsRead(list);
  });

  ipcMain.handle('notifications:remove', (_event, ids: unknown) => {
    const list = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    return deleteNotifications(list);
  });

  ipcMain.handle('notifications:clear', () => clearNotificationState());

  ipcMain.handle('notifications:add-items', (_event, payload: { keys?: unknown; categoryId?: unknown }) => {
    const keys = Array.isArray(payload?.keys) ? payload!.keys.filter((key): key is string => typeof key === 'string') : [];
    const categoryId = typeof payload?.categoryId === 'string' ? payload.categoryId : UNCATEGORIZED_ID;
    const result = addShortcutsToLibrary(findNotificationItems(keys), categoryId);
    deleteNotificationItems(result.keys);
    return { success: result.added > 0, added: result.added, folderId: result.folderId };
  });

  ipcMain.handle('notifications:open-center', () => {
    // Cerrar el aviso aquí no marca nada como leído: el lote sigue pendiente
    // hasta que se vea en el centro.
    hideWatcherPrompt();
    showShelf();
    setTimeout(() => {
      if (shelfWindow && !shelfWindow.isDestroyed()) {
        shelfWindow.webContents.send('open-notification-center');
      }
    }, 300);
    return { success: true };
  });

  // --- Respaldo automático de la configuración ---
  ipcMain.handle('backup:status', () => backupService.status());
  ipcMain.handle('backup:now', () => backupService.run('manual'));
  ipcMain.handle('backup:list', () => backupService.list());
  ipcMain.handle('backup:delete', (_event, fileName) => backupService.remove(String(fileName || '')));
  ipcMain.handle('backup:restore', (_event, fileName) => backupService.restore(String(fileName || '')));

  ipcMain.handle('backup:open-folder', async () => {
    try {
      const { folder } = backupService.status();
      fs.mkdirSync(folder, { recursive: true });
      const failure = await shell.openPath(folder);
      return failure ? { success: false, error: failure } : { success: true, folder };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('backup:select-folder', async () => {
    isDialogOpen = true; // Bypasa el autohide (hideOnBlur) mientras el diálogo tiene el foco
    const res = await dialog.showOpenDialog(shelfWindow!, {
      title: nativeStrings().backupFolder,
      defaultPath: backupService.status().folder,
      properties: ['openDirectory', 'createDirectory'],
    });
    isDialogOpen = false;
    showShelf();
    if (!res.canceled && res.filePaths.length > 0) return res.filePaths[0];
    return null;
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
    const success = saveConfig(newConfig, options);
    if (success && options?.broadcastReload !== false) {
      alignWindows();
    }
    return { success, revision: configRevision };
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

  // Retención del panel: mientras haya un motivo activo el panel no se oculta
  // al perder el foco. Lo usa la UI para las vistas con estado en memoria que
  // se perdería al desmontarse (el escaneo de importación, por ejemplo). No
  // bloquea el cierre manual: botón, atajo global, bandeja y UAC siguen
  // ocultando el panel con normalidad.
  ipcMain.handle('set-shelf-hold', async (_, reason, active) => {
    const key = String(reason || 'default');
    if (active) {
      shelfHoldReasons.add(key);
    } else {
      shelfHoldReasons.delete(key);
    }
    if (!isShelfHeld() && shelfWindow && !shelfWindow.isDestroyed() && shelfWindow.isVisible() && !shelfWindow.isFocused() && config.hideOnBlur) {
      setTimeout(() => {
        if (isShelfHeld() || isDragActive || isDialogOpen) return;
        if (shelfWindow && !shelfWindow.isDestroyed() && !shelfWindow.isFocused()) {
          hideShelf();
        }
      }, 200);
    }
    return { success: true, held: isShelfHeld() };
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

  ipcMain.handle('import-file-to-vault', async (_event, filePath: string) => {
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
/**
 * Arranca (o reinicia) el vigilante con la configuración actual. El vigilante
 * solo lee: si está apagado no se registra ningún `fs.watch` ni ningún sondeo.
 */
function startDesktopWatcherIfEnabled(): void {
  refreshDesktopWatcher({
    resolveFile: resolveFullFileInfo,
    getConfig: () => config as unknown as Record<string, unknown>,
    onDetected: items => showWatcherPrompt(items),
    onError: message => console.warn('[WATCHER]', message),
  });
}

app.whenReady().then(async () => {
  if (!gotTheLock) return;
  loadConfig();
  if (app.isPackaged) applyAutoLaunchSettings(!!config.autoLaunch);
  migrateConfigIconsToDisk();
  migrateGenericUrlIcons();
  initNotificationStore({
    filePath: path.join(app.getPath('userData'), 'cyber-tray-notifications.json'),
    onChange: (next) => {
      if (shelfWindow && !shelfWindow.isDestroyed() && !shelfWindow.webContents.isLoading()) {
        shelfWindow.webContents.send('notifications:changed', next);
      }
    },
  });
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
  startDesktopWatcherIfEnabled();
  // Respaldo automático: comprueba al arrancar (diferido) y luego cada minuto.
  backupService.start();

  // La sincronización opcional no debe retrasar la ventana ni la bandeja.
  if (config.autoSyncOnStartup) {
    setTimeout(() => {
      void runStartupImportSync().catch(error => console.error('[IMPORT] Startup sync failed:', error));
    }, 2000);
  }

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
  stopDesktopWatcher();
  backupService.stop();
});
