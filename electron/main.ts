import { app, BrowserWindow, ipcMain, shell, Tray, Menu, globalShortcut, screen, nativeImage, dialog, protocol, net } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { exec, execSync, execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';

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
let handleWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let isDragActive = false;
let isDialogOpen = false;
let dragInterval: NodeJS.Timeout | null = null;

// ── CONFIGURACIÓN PREDETERMINADA ──
interface CyberTrayConfig {
  dockPosition: 'top' | 'bottom';
  monitorId: string;
  shortcut: string;
  hideOnBlur: boolean;
  handlePosition: 'left' | 'center' | 'right';
  handleVisible: boolean;
  hotspotCorners: string[];
  hotspotDelay: number;
  alwaysOnTop: boolean;
  iconSize: number;
  showTaskbarIcon: boolean;
  autoLaunch: boolean;
  hoverTriggerEnabled: boolean;
  hoverTriggerDelay: number;
  hideOnDeadZoneClick: boolean;
  handleAutoHide: boolean;
  handleAutoHideDelay: number;
  bgType: 'solid' | 'gradient' | 'image';
  bgSolidColor: string;
  bgGradient: string;
  bgImage: string;
  bgCustomPath: string;
  language?: 'en' | 'es';
  soundEnabled?: boolean;
  soundPath?: string;
  monitorBounds?: { x: number; y: number; width: number; height: number };
  handleOffsetPercent?: number;
  vaultPath?: string;
  vaultPinEnabled?: boolean;
  vaultPin?: string;
  vaultLockTimeout?: number;
  shortcutsList?: any[];
  categoriesList?: any[];
  totalLaunches?: number;
  autoCheckUpdates?: boolean;
}

const DEFAULT_CONFIG: CyberTrayConfig = {
  dockPosition: 'top', // De arriba hacia abajo por defecto
  monitorId: '',
  shortcut: 'Alt+T', // Atajo CyberTray por defecto
  hideOnBlur: true,
  language: 'en',
  handlePosition: 'center',
  handleVisible: true,
  hotspotCorners: [],
  hotspotDelay: 300,
  alwaysOnTop: true,
  iconSize: 52, // 52px por defecto
  showTaskbarIcon: false,
  autoLaunch: false,
  hoverTriggerEnabled: false,
  hoverTriggerDelay: 300,
  hideOnDeadZoneClick: false,
  handleAutoHide: false,
  handleAutoHideDelay: 5,
  bgType: 'solid',
  bgSolidColor: '#070b13',
  bgGradient: 'preset-1',
  bgImage: 'preset-1',
  bgCustomPath: '',
  soundEnabled: true,
  soundPath: '',
  handleOffsetPercent: 50,
  vaultPath: '',
  vaultPinEnabled: false,
  vaultPin: '1234',
  vaultLockTimeout: 0,
  totalLaunches: 0,
  autoCheckUpdates: true,
};

let config: CyberTrayConfig = { ...DEFAULT_CONFIG };
const CONFIG_FILE = path.join(app.getPath('userData'), 'cyber-tray-config.json');
const STATE_FILE = path.join(app.getPath('userData'), 'cyber-tray-state.json');

const TRAY_TRANSLATIONS = {
  en: {
    show: 'Show CyberTray',
    pos_top: 'Position: Top',
    pos_bottom: 'Position: Bottom',
    exit: 'Exit'
  },
  es: {
    show: 'Mostrar CyberTray',
    pos_top: 'Posición: Superior',
    pos_bottom: 'Posición: Inferior',
    exit: 'Salir'
  }
};

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

function saveConfig(newConfig: Partial<CyberTrayConfig>) {
  try {
    config = { ...config, ...newConfig };
    if (newConfig.handleOffsetPercent === null || newConfig.handleOffsetPercent === undefined) {
      delete (config as any).handleOffsetPercent;
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    if (shelfWindow && !shelfWindow.isDestroyed()) {
      shelfWindow.webContents.send('reload-config');
    }
    if (handleWindow && !handleWindow.isDestroyed()) {
      handleWindow.webContents.send('reload-config');
    }
    createTray();
    // startHotspotPolling(); // Temporarily disabled for CPU isolation
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

function getVaultPath(): string {
  if (config.vaultPath && config.vaultPath.trim() !== '') {
    return config.vaultPath;
  }
  return path.join(app.getPath('userData'), 'vault');
}

// ── HOTSPOTS & UAC GUARD STATE ──
let hotspotTimer: NodeJS.Timeout | null = null;
let lastHotspotCorner = '';
let hotspotEntryTime = 0;
let hotspotCooldown = false;
let hotspotsPausedByUAC = false;
let lastHotspotPollTime = 0;
const HOTSPOT_LAG_THRESHOLD_MS = 400;
let uacGuardTimer: NodeJS.Timeout | null = null;
let uacResumeTimer: NodeJS.Timeout | null = null;
let shelfAnimationTimer: NodeJS.Timeout | null = null;

// --- Monitores e Identificación ---
function getTargetDisplay(): Electron.Display {
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

function getHandleBounds(display: Electron.Display): Electron.Rectangle {
  const workArea = display.workArea;
  const handleWidth = 200;
  const windowHeight = 80;
  
  let offsetPercent = config.handleOffsetPercent !== undefined ? config.handleOffsetPercent : 50;
  if (config.handleOffsetPercent === undefined) {
    if (config.handlePosition === 'left') {
      offsetPercent = 0;
    } else if (config.handlePosition === 'right') {
      offsetPercent = 100;
    }
  }

  let x = workArea.x + Math.round((workArea.width - handleWidth) * (offsetPercent / 100));
  x = Math.max(workArea.x + 10, Math.min(workArea.x + workArea.width - handleWidth - 10, x));
  
  let y = workArea.y;
  if (config.dockPosition === 'bottom') {
    y = workArea.y + workArea.height - windowHeight;
  }
  
  return { x, y, width: handleWidth, height: windowHeight };
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
  const handleBounds = getHandleBounds(targetDisplay);
  
  // 1. Ventana Principal: CyberTray Shelf
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

  // 2. Ventana Secundaria: Cyber-Handle (Manigueta) - Temporarily disabled for CPU isolation
  /*
  handleWindow = new BrowserWindow({
    width: handleBounds.width,
    height: handleBounds.height,
    x: handleBounds.x,
    y: handleBounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false, // Evita transferencias de foco lentas al pasar o hacer clic
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: true,
    },
    autoHideMenuBar: true,
  });

  handleWindow.setIgnoreMouseEvents(true, { forward: true });

  if (VITE_DEV_SERVER_URL) {
    handleWindow.loadURL(`${VITE_DEV_SERVER_URL}?mode=handle`);
  } else {
    handleWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { mode: 'handle' } });
  }

  handleWindow.once('ready-to-show', () => {
    if (config.handleVisible) {
      handleWindow?.show();
    }
  });
  */

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
      shelfWindow.webContents.send('shelf-state-change', true);
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

      // Volver a mostrar el Cyber-Handle al ocultar la bandeja
      if (config.handleVisible && handleWindow && !handleWindow.isDestroyed()) {
        handleWindow.show();
      }
    }
  }, 16);
}

function showShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;

  // Play sound from the always-awake handleWindow if visible, otherwise fall back to shelfWindow
  if (config.soundEnabled !== false) {
    if (config.handleVisible && handleWindow && !handleWindow.isDestroyed() && handleWindow.isVisible()) {
      handleWindow.webContents.send('play-launch-sound');
    } else {
      shelfWindow.webContents.send('play-launch-sound');
    }
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

  // Ocultar suavemente el Cyber-Handle al abrir la bandeja para evitar ruido visual
  if (handleWindow && !handleWindow.isDestroyed()) {
    handleWindow.hide();
  }

  animateShelfShow(shelfBounds);
}

function hideShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
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

// Alinear posiciones de Shelf y Handle según monitor y dockPosition
function alignWindows() {
  const display = getTargetDisplay();
  const shelfBounds = getShelfBounds(display);
  const handleBounds = getHandleBounds(display);
  
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
  
  if (handleWindow && !handleWindow.isDestroyed()) {
    handleWindow.setBounds(handleBounds);
    if (config.handleVisible && (!shelfWindow || !shelfWindow.isVisible())) {
      handleWindow.show();
    } else {
      handleWindow.hide();
    }
  }
}

// ── SYSTEM TRAY (Bandeja del sistema) ──
function createTray() {
  const lang = (config as any).language === 'es' ? 'es' : 'en';
  const t = TRAY_TRANSLATIONS[lang];

  const iconPath = VITE_DEV_SERVER_URL
    ? path.join(__dirname, '../public/icon.png')
    : path.join(__dirname, '../dist/icon.png');
  
  let trayIcon = nativeImage.createEmpty();
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  }

  if (!tray) {
    tray = new Tray(trayIcon);
    tray.setToolTip('CyberTray');
    tray.on('click', () => toggleShelf());
  } else {
    tray.setImage(trayIcon);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: t.show,
      click: () => toggleShelf(),
    },
    {
      label: t.pos_top,
      type: 'radio',
      checked: config.dockPosition === 'top',
      click: () => {
        saveConfig({ dockPosition: 'top', handleOffsetPercent: null });
        alignWindows();
      }
    },
    {
      label: t.pos_bottom,
      type: 'radio',
      checked: config.dockPosition === 'bottom',
      click: () => {
        saveConfig({ dockPosition: 'bottom', handleOffsetPercent: null });
        alignWindows();
      }
    },
    { type: 'separator' },
    {
      label: t.exit,
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
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
    let iconDataUrl = '';

    if (ext === '.lnk') {
      try {
        const shortcut = shell.readShortcutLink(normalized);
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
        ext = path.extname(resolvedPath).toLowerCase();
        resolvedName = path.basename(resolvedPath, ext);
      } catch (e) {
        console.error('Error resolving .lnk file:', e);
      }
    }

    // Extracción de Icono nativo de alta calidad
    try {
      if (fs.existsSync(resolvedPath)) {
        let icon = await app.getFileIcon(resolvedPath, { size: 'large' });
        if (!icon || icon.isEmpty()) {
          icon = await app.getFileIcon(resolvedPath, { size: 'normal' });
        }
        if (icon && !icon.isEmpty()) {
          iconDataUrl = icon.toDataURL();
        }
      }
    } catch (e) {
      console.warn('Error getFileIcon:', e);
    }

    // Fallback de extracción de icono con PowerShell (para evitar iconos genéricos muy pequeños)
    if (!iconDataUrl || iconDataUrl.length < 1500) {
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
            iconDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
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
      iconPath: iconDataUrl,
    };
  } catch (err) {
    console.error('Error resolveFullFileInfo:', err);
    return null;
  }
}

// ── ACTIVE CORNERS (Esquinas activas / Hotspots) ──
function startHotspotPolling() {
  if (hotspotTimer) {
    clearInterval(hotspotTimer);
    hotspotTimer = null;
  }
  if (!config.hotspotCorners || config.hotspotCorners.length === 0) return;
  lastHotspotPollTime = Date.now();
  
  hotspotTimer = setInterval(() => {
    if (hotspotsPausedByUAC) return;

    const now = Date.now();
    const elapsed = now - lastHotspotPollTime;
    lastHotspotPollTime = now;

    if (elapsed > HOTSPOT_LAG_THRESHOLD_MS) {
      lastHotspotCorner = '';
      hotspotEntryTime = 0;
      hotspotCooldown = false;
      return;
    }

    const { x, y } = screen.getCursorScreenPoint();
    const displays = screen.getAllDisplays();
    let currentCorner = '';

    for (const display of displays) {
      const { x: dx, y: dy, width: dw, height: dh } = display.bounds;
      const isTop = y === dy;
      const isBottom = y === dy + dh - 1;
      const isLeft = x === dx;
      const isRight = x === dx + dw - 1;

      let detected = '';
      if (isTop && isLeft) detected = 'top-left';
      else if (isTop && isRight) detected = 'top-right';
      else if (isBottom && isLeft) detected = 'bottom-left';
      else if (isBottom && isRight) detected = 'bottom-right';

      if (detected) {
        if (config.hotspotCorners.includes(detected)) {
          currentCorner = detected;
        }
        break; 
      }
    }

    if (currentCorner) {
      if (hotspotCooldown) {
        // Cursor aún en la esquina activa
      } else if (currentCorner === lastHotspotCorner) {
        const timeInCorner = Date.now() - hotspotEntryTime;
        if (timeInCorner >= config.hotspotDelay) {
          toggleShelf();
          hotspotCooldown = true;
          lastHotspotCorner = '';
        }
      } else {
        lastHotspotCorner = currentCorner;
        hotspotEntryTime = Date.now();
        if (config.hotspotDelay === 0) {
          toggleShelf();
          hotspotCooldown = true;
          lastHotspotCorner = '';
        }
      }
    } else {
      lastHotspotCorner = '';
      hotspotCooldown = false;
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
    execFile('tasklist.exe', ['/FI', 'IMAGENAME eq consent.exe', '/NH'], { windowsHide: true }, (err, stdout) => {
      const isActive = !err && stdout && stdout.includes('consent.exe');
      if (isActive && !uacWasActive) {
        hotspotsPausedByUAC = true;
        hideShelf();
      } else if (!isActive && uacWasActive) {
        // Retrasar restauración tras salir de pantalla segura UAC
        if (uacResumeTimer) clearTimeout(uacResumeTimer);
        uacResumeTimer = setTimeout(() => {
          hotspotsPausedByUAC = false;
        }, 1500);
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
  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  ipcMain.handle('launch-app', async (_, appPath, isAdmin) => {
    try {
      if (isAdmin && process.platform === 'win32') {
        const escapedPath = appPath.replace(/'/g, "''");
        const command = `powershell -NoProfile -Command "Start-Process -FilePath '${escapedPath}' -Verb RunAs"`;
        exec(command, { windowsHide: true });
      } else {
        shell.openPath(appPath);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || err };
    }
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
    handleWindow?.webContents.openDevTools({ mode: 'detach' });
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

  ipcMain.handle('show-handle-context-menu', async () => {
    const HANDLE_CONTEXT_MENU_TRANSLATIONS = {
      en: {
        hide: 'Hide Cyber-Handle',
        position: 'Position',
        left: 'Left',
        center: 'Center',
        right: 'Right',
        dock_top: 'Dock to Top',
        dock_bottom: 'Dock to Bottom',
        settings: 'Settings...',
        exit: 'Exit'
      },
      es: {
        hide: 'Ocultar Cyber-Handle',
        position: 'Posición',
        left: 'Izquierda',
        center: 'Centro',
        right: 'Derecha',
        dock_top: 'Acoplar arriba',
        dock_bottom: 'Acoplar abajo',
        settings: 'Configuración...',
        exit: 'Salir'
      }
    };

    const lang = config.language === 'es' ? 'es' : 'en';
    const t = HANDLE_CONTEXT_MENU_TRANSLATIONS[lang];
    const hasCustomOffset = config.handleOffsetPercent !== undefined && config.handleOffsetPercent !== null;

    const menu = Menu.buildFromTemplate([
      {
        label: t.hide,
        click: () => {
          saveConfig({ handleVisible: false });
          alignWindows();
        }
      },
      {
        label: t.position,
        type: 'submenu',
        submenu: [
          {
            label: t.left,
            type: 'radio',
            checked: !hasCustomOffset && config.handlePosition === 'left',
            click: () => {
              saveConfig({ handlePosition: 'left', handleOffsetPercent: null });
              alignWindows();
            }
          },
          {
            label: t.center,
            type: 'radio',
            checked: !hasCustomOffset && config.handlePosition === 'center',
            click: () => {
              saveConfig({ handlePosition: 'center', handleOffsetPercent: null });
              alignWindows();
            }
          },
          {
            label: t.right,
            type: 'radio',
            checked: !hasCustomOffset && config.handlePosition === 'right',
            click: () => {
              saveConfig({ handlePosition: 'right', handleOffsetPercent: null });
              alignWindows();
            }
          },
          { type: 'separator' },
          {
            label: t.dock_top,
            type: 'radio',
            checked: config.dockPosition === 'top',
            click: () => {
              saveConfig({ dockPosition: 'top', handleOffsetPercent: null });
              alignWindows();
            }
          },
          {
            label: t.dock_bottom,
            type: 'radio',
            checked: config.dockPosition === 'bottom',
            click: () => {
              saveConfig({ dockPosition: 'bottom', handleOffsetPercent: null });
              alignWindows();
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: t.settings,
        click: () => {
          showShelf();
          setTimeout(() => {
            if (shelfWindow && !shelfWindow.isDestroyed()) {
              shelfWindow.webContents.send('open-settings');
            }
          }, 300);
        }
      },
      { type: 'separator' },
      {
        label: t.exit,
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    menu.popup({ window: handleWindow || undefined });
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
      fs.writeFileSync(res.filePath, jsonData, 'utf-8');
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
  ipcMain.handle('saveConfig', async (_, newConfig) => {
    saveConfig(newConfig);
    alignWindows();
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

  ipcMain.handle('register-app-shortcuts', async (_, shortcuts) => {
    // Registro dinámico opcional de shortcuts por app
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

  ipcMain.handle('track-handle-drag-start', async () => {
    if (!handleWindow || handleWindow.isDestroyed()) return;

    if (dragInterval) clearInterval(dragInterval);

    const cursor = screen.getCursorScreenPoint();
    const winBounds = handleWindow.getBounds();
    const offsetX = cursor.x - winBounds.x;

    const display = getTargetDisplay();
    const workArea = display.workArea;
    const handleWidth = 200;

    dragInterval = setInterval(() => {
      if (!handleWindow || handleWindow.isDestroyed()) {
        if (dragInterval) {
          clearInterval(dragInterval);
          dragInterval = null;
        }
        return;
      }

      const currentCursor = screen.getCursorScreenPoint();
      let newX = currentCursor.x - offsetX;
      newX = Math.max(workArea.x + 10, Math.min(workArea.x + workArea.width - handleWidth - 10, newX));

      handleWindow.setBounds({
        x: newX,
        y: winBounds.y,
        width: winBounds.width,
        height: winBounds.height
      });
    }, 10);
  });

  ipcMain.handle('track-handle-drag-stop', async () => {
    if (dragInterval) {
      clearInterval(dragInterval);
      dragInterval = null;
    }

    if (handleWindow && !handleWindow.isDestroyed()) {
      const finalX = handleWindow.getBounds().x;
      const display = getTargetDisplay();
      const workArea = display.workArea;
      const handleWidth = 200;

      let offsetPercent = ((finalX - workArea.x) / (workArea.width - handleWidth)) * 100;
      offsetPercent = Math.max(0, Math.min(100, offsetPercent));

      saveConfig({ handleOffsetPercent: offsetPercent });
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

          // Extract high-quality icon if it's a file
          let iconDataUrl = '';
          try {
            if (fs.existsSync(targetFullPath) && stats.isFile()) {
              let icon = await app.getFileIcon(targetFullPath, { size: 'large' });
              if (!icon || icon.isEmpty()) {
                icon = await app.getFileIcon(targetFullPath, { size: 'normal' });
              }
              if (icon && !icon.isEmpty()) {
                iconDataUrl = icon.toDataURL();
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
            iconPath: iconDataUrl,
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
    return path.join(app.getPath('userData'), 'vault');
  });

  ipcMain.handle('open-vault-folder', async () => {
    const targetVaultPath = getVaultPath();
    if (!fs.existsSync(targetVaultPath)) {
      fs.mkdirSync(targetVaultPath, { recursive: true });
    }
    shell.openPath(targetVaultPath);
    return true;
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

      // Extract high-quality icon
      let iconDataUrl = '';
      try {
        const stats = fs.statSync(targetFullPath);
        if (stats.isFile()) {
          let icon = await app.getFileIcon(targetFullPath, { size: 'large' });
          if (!icon || icon.isEmpty()) {
            icon = await app.getFileIcon(targetFullPath, { size: 'normal' });
          }
          if (icon && !icon.isEmpty()) {
            iconDataUrl = icon.toDataURL();
          }
        }
      } catch (e) {
        console.warn('getFileIcon fail for imported file:', e);
      }

      return {
        success: true,
        path: targetFullPath,
        iconPath: iconDataUrl,
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
  registerLocalResourceProtocol();
  registerIpcHandlers();
  // fetchVramInfoInBackground(); // Temporarily disabled for CPU isolation
  createWindows();
  createTray();
  registerGlobalShortcutKey(config.shortcut);
  // startHotspotPolling(); // Temporarily disabled for CPU isolation
  // startUACGuard(); // Temporarily disabled for CPU isolation

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
});
