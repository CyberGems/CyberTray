import { contextBridge, ipcRenderer, webUtils } from 'electron';

// =====================================
// Electron API Bridge for CyberTray
// =====================================
contextBridge.exposeInMainWorld('electronAPI', {
  // --- Launch App ---
  launchApp: (appPath: string, isAdmin?: boolean) => ipcRenderer.invoke('launch-app', appPath, isAdmin),
  getUwpApps: () => ipcRenderer.invoke('get-uwp-apps'),

  // --- Native File Dialogs ---
  selectFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke('select-file', options),
  selectImage: () => ipcRenderer.invoke('select-image'),
  getImageData: (filePath: string) => ipcRenderer.invoke('get-image-data', filePath),

  // --- Monitors ---
  getMonitors: () => ipcRenderer.invoke('get-monitors'),
  setMonitor: (monitorId: string) => ipcRenderer.invoke('set-monitor', monitorId),

  // --- Global Keyboard Shortcut ---
  registerShortcut: (shortcut: string) => ipcRenderer.invoke('register-shortcut', shortcut),

  // --- Window Controls ---
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximizeToggle: () => ipcRenderer.invoke('window-maximize-toggle'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowHideToTray: () => ipcRenderer.invoke('window-hide-to-tray'),

  // --- Settings Binders ---
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  setHideOnBlur: (enabled: boolean) => ipcRenderer.invoke('set-hide-on-blur', enabled),
  setShowTaskbarIcon: (enabled: boolean) => ipcRenderer.invoke('set-show-taskbar-icon', enabled),

  // --- Neural Metrics (CPU/RAM/Disks) ---
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getDiskInfo: () => ipcRenderer.invoke('get-disk-info'),

  // --- Drag & Drop helpers ---
  resolveFilePath: (filePath: string) => ipcRenderer.invoke('resolve-file-path', filePath),
  openFileLocation: (filePath: string) => ipcRenderer.invoke('open-file-location', filePath),
  searchSystemFiles: (query: string) => ipcRenderer.invoke('search-system-files', query),
  getIndexerSettings: () => ipcRenderer.invoke('get-indexer-settings'),
  saveIndexerSettings: (settings: { enabled: boolean; maxDepth: number; paths: string[] }) =>
    ipcRenderer.invoke('save-indexer-settings', settings),
  getIndexerStats: () => ipcRenderer.invoke('get-indexer-stats'),
  selectIndexerFolder: () => ipcRenderer.invoke('select-indexer-folder'),
  getSystemDrives: () => ipcRenderer.invoke('get-system-drives'),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // --- Hotspots (Esquinas activas) ---
  setHotspots: (corners: string[], delay: number) => ipcRenderer.invoke('set-hotspots', corners, delay),

  // --- DevTools ---
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

  // --- Native Text Context Menu ---
  showTextContextMenu: (x: number, y: number) => ipcRenderer.invoke('show-text-context-menu', { x, y }),

  // --- Export/Import Centralized Config ---
  exportConfig: (jsonData: string) => ipcRenderer.invoke('export-config', jsonData),
  importConfig: () => ipcRenderer.invoke('import-config'),

  // --- Persistent Storage ---
  saveConfig: (config: any) => ipcRenderer.invoke('saveConfig', config),
  loadConfig: () => ipcRenderer.invoke('loadConfig'),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  onReloadConfig: (callback: () => void) => {
    const handler = (_event: any) => {
      console.log('[PRELOAD] reload-config event received');
      callback();
    };
    ipcRenderer.on('reload-config', handler);
    return () => { ipcRenderer.removeListener('reload-config', handler); };
  },

  // --- Pinning (Always on Top) ---
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('set-always-on-top', enabled),

  // --- Dynamic shortcuts ---
  registerAppShortcuts: (shortcuts: Array<{ id: number; path: string; shortcut: string; isAdmin: boolean }>) =>
    ipcRenderer.invoke('register-app-shortcuts', shortcuts),

  // --- Shell runner ---
  runShellCommand: (command: string) => ipcRenderer.invoke('run-shell-command', command),
  onShellOutput: (callback: (data: { id: string; type: 'stdout' | 'stderr'; text: string }) => void) => {
    const handler = (_event: any, data: { id: string; type: 'stdout' | 'stderr'; text: string }) => callback(data);
    ipcRenderer.on('shell-command-output', handler);
    return () => { ipcRenderer.removeListener('shell-command-output', handler); };
  },
  onShellExit: (callback: (data: { id: string; exitCode: number }) => void) => {
    const handler = (_event: any, data: { id: string; exitCode: number }) => callback(data);
    ipcRenderer.on('shell-command-exit', handler);
    return () => { ipcRenderer.removeListener('shell-command-exit', handler); };
  },
  onAlwaysOnTopBlurAttempt: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('always-on-top-blur-attempt', handler);
    return () => { ipcRenderer.removeListener('always-on-top-blur-attempt', handler); };
  },
  onOpenSettings: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('open-settings', handler);
    return () => { ipcRenderer.removeListener('open-settings', handler); };
  },

  // --- CyberTray Specific IPC channels ---
  toggleShelf: () => ipcRenderer.invoke('toggle-shelf'),
  setDragActive: (active: boolean) => ipcRenderer.invoke('set-drag-active', active),
  onShelfStateChange: (callback: (visible: boolean) => void) => {
    const handler = (_event: any, visible: boolean) => callback(visible);
    ipcRenderer.on('shelf-state-change', handler);
    return () => { ipcRenderer.removeListener('shelf-state-change', handler); };
  }
});
