import { app, BrowserWindow, ipcMain, shell, Tray, Menu, globalShortcut, screen, nativeImage, dialog, protocol, net } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { exec, execSync } from 'node:child_process';
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

let shelfWindow: BrowserWindow | null = null;
let handleWindow: BrowserWindow | null = null;
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
  bgType: 'solid' | 'gradient' | 'image';
  bgSolidColor: string;
  bgGradient: string;
  bgImage: string;
  bgCustomPath: string;
  language?: 'en' | 'es';
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
  bgType: 'solid',
  bgSolidColor: '#070b13',
  bgGradient: 'preset-1',
  bgImage: 'preset-1',
  bgCustomPath: '',
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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    if (shelfWindow && !shelfWindow.isDestroyed()) {
      shelfWindow.webContents.send('reload-config');
    }
    if (handleWindow && !handleWindow.isDestroyed()) {
      handleWindow.webContents.send('reload-config');
    }
    createTray();
  } catch (err) {
    console.error('Error saving config:', err);
  }
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

// --- Monitores e Identificación ---
function getTargetDisplay(): Electron.Display {
  const displays = screen.getAllDisplays();
  if (config.monitorId) {
    const matched = displays.find(d => d.id.toString() === config.monitorId);
    if (matched) return matched;
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
  const handleWidth = 150;
  const handleHeight = 28;
  
  let x = workArea.x + Math.round((workArea.width - handleWidth) / 2);
  if (config.handlePosition === 'left') {
    x = workArea.x + 40;
  } else if (config.handlePosition === 'right') {
    x = workArea.x + workArea.width - handleWidth - 40;
  }
  
  let y = workArea.y;
  if (config.dockPosition === 'bottom') {
    y = workArea.y + workArea.height - handleHeight;
  }
  
  return { x, y, width: handleWidth, height: handleHeight };
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
    transparent: false, // Fondo opaco para rendimiento nativo 60fps sin composición de pantalla
    alwaysOnTop: config.alwaysOnTop,
    resizable: true,
    skipTaskbar: !config.showTaskbarIcon,
    backgroundColor: '#070b13', // Fondo sólido cyberpunk oscuro
    show: false,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
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

  // 2. Ventana Secundaria: Cyber-Handle (Manigueta)
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
    },
    autoHideMenuBar: true,
  });

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

  shelfWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      hideShelf();
    }
  });
}

// ── CONTROL DE VISIBILIDAD DE SHELF ──
function showShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  
  // Reposicionar antes de mostrar por si cambiaron de pantalla
  alignWindows();
  
  shelfWindow.show();
  shelfWindow.focus();
  shelfWindow.webContents.send('shelf-state-change', true);
  
  // Ocultar suavemente el Cyber-Handle al abrir la bandeja para evitar ruido visual
  if (handleWindow && !handleWindow.isDestroyed()) {
    handleWindow.hide();
  }
}

function hideShelf() {
  if (!shelfWindow || shelfWindow.isDestroyed()) return;
  shelfWindow.hide();
  shelfWindow.webContents.send('shelf-state-change', false);
  
  // Volver a mostrar el Cyber-Handle al ocultar la bandeja
  if (config.handleVisible && handleWindow && !handleWindow.isDestroyed()) {
    handleWindow.show();
  }
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
        saveConfig({ dockPosition: 'top' });
        alignWindows();
      }
    },
    {
      label: t.pos_bottom,
      type: 'radio',
      checked: config.dockPosition === 'bottom',
      click: () => {
        saveConfig({ dockPosition: 'bottom' });
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
  if (hotspotTimer) clearInterval(hotspotTimer);
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

    if (config.hotspotCorners.length === 0) return;

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
function startUACGuard() {
  if (uacGuardTimer) clearInterval(uacGuardTimer);
  let uacWasActive = false;

  uacGuardTimer = setInterval(() => {
    exec('tasklist /FI "IMAGENAME eq consent.exe" /NH', { windowsHide: true }, (err, stdout) => {
      const isActive = !err && stdout.includes('consent.exe');
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
      uacWasActive = isActive;
    });
  }, 200);
}

// ── IPC INTERACTIVE COMMS BINDERS ──
function registerIpcHandlers() {
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
    saveConfig({ monitorId });
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
      uptime: os.uptime()
    };
  });
  let diskCache: { data: any[], ts: number } | null = null;

  ipcMain.handle('get-disk-info', async () => {
    if (diskCache && (Date.now() - diskCache.ts) < 60000) {
      return diskCache.data;
    }
    return new Promise((resolve) => {
      exec('wmic logicaldisk get size,freespace,caption', { timeout: 3000, encoding: 'utf-8' }, (err, stdout) => {
        if (err) {
          resolve(diskCache?.data || [{ drive: 'C:', total: 500, free: 250, used: 250, percent: 50 }]);
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
  loadConfig();
  registerLocalResourceProtocol();
  registerIpcHandlers();
  createWindows();
  createTray();
  registerGlobalShortcutKey(config.shortcut);
  startHotspotPolling();
  startUACGuard();

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
