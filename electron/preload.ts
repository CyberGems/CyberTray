import { contextBridge, ipcRenderer, webUtils } from 'electron';

// =====================================
// Electron API Bridge for CyberTray
// =====================================
contextBridge.exposeInMainWorld('electronAPI', {
  // --- Launch App ---
  launchApp: (appPath: string, isAdmin?: boolean, args?: string, cwd?: string) =>
    ipcRenderer.invoke('launch-app', appPath, isAdmin, args, cwd),

  // --- Native File Dialogs ---
  selectFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke('select-file', options),
  selectImage: () => ipcRenderer.invoke('select-image'),
  selectAudio: () => ipcRenderer.invoke('select-audio'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getImageData: (filePath: string) => ipcRenderer.invoke('get-image-data', filePath),
  getBundledAssetUrl: (relativePath: string) => ipcRenderer.invoke('get-bundled-asset-url', relativePath),

  // --- Monitors ---
  getMonitors: () => ipcRenderer.invoke('get-monitors'),
  setMonitor: (monitorId: string) => ipcRenderer.invoke('set-monitor', monitorId),

  // --- Global Keyboard Shortcut ---
  registerShortcut: (shortcut: string) => ipcRenderer.invoke('register-shortcut', shortcut),

  // --- Window Controls ---
  windowHideToTray: () => ipcRenderer.invoke('window-hide-to-tray'),

  // --- Settings Binders ---
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  setHideOnBlur: (enabled: boolean) => ipcRenderer.invoke('set-hide-on-blur', enabled),
  setShowTaskbarIcon: (enabled: boolean) => ipcRenderer.invoke('set-show-taskbar-icon', enabled),

  // --- Neural Metrics (CPU/RAM/Disks) ---
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getDiskInfo: () => ipcRenderer.invoke('get-disk-info'),
  getRunningProcesses: () => ipcRenderer.invoke('get-running-processes'),
  killProcess: (pid: number) => ipcRenderer.invoke('kill-process', pid),

  // --- Drag & Drop helpers ---
  resolveFilePath: (filePath: string) => ipcRenderer.invoke('resolve-file-path', filePath),
  scanImportSources: (sources: unknown[]) => ipcRenderer.invoke('import:scan', sources),
  cancelImportScan: () => ipcRenderer.invoke('import:cancel'),
  onImportProgress: (callback: (progress: { completed: number; total: number; sourceId: string }) => void) => {
    const handler = (_event: any, progress: { completed: number; total: number; sourceId: string }) => callback(progress);
    ipcRenderer.on('import:progress', handler);
    return () => { ipcRenderer.removeListener('import:progress', handler); };
  },
  applyImportPlan: (plan: unknown, sources: unknown[]) => ipcRenderer.invoke('import:apply', { plan, sources }),
  getImportBackupStatus: () => ipcRenderer.invoke('import:backup-status'),
  undoLastImport: () => ipcRenderer.invoke('import:undo'),
  openFileLocation: (filePath: string) => ipcRenderer.invoke('open-file-location', filePath),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  openFolder: (targetPath: string) => ipcRenderer.invoke('open-folder', targetPath),
  openInTerminal: (targetPath: string) => ipcRenderer.invoke('open-in-terminal', targetPath),
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
  saveConfig: (config: any, options?: { broadcastReload?: boolean }) =>
    ipcRenderer.invoke('saveConfig', config, options),
  loadConfig: () => ipcRenderer.invoke('loadConfig'),
  resetConfig: () => ipcRenderer.invoke('config:reset'),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  onReloadConfig: (callback: (nextConfig?: any) => void) => {
    const handler = (_event: any, nextConfig?: any) => {
      callback(nextConfig);
    };
    ipcRenderer.on('reload-config', handler);
    return () => { ipcRenderer.removeListener('reload-config', handler); };
  },

  // --- Pinning (Always on Top) ---
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke('set-always-on-top', enabled),

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
  onOpenAbout: (callback: (opts?: { checkUpdates?: boolean }) => void) => {
    const handler = (_event: any, opts?: { checkUpdates?: boolean }) => callback(opts);
    ipcRenderer.on('open-about', handler);
    return () => { ipcRenderer.removeListener('open-about', handler); };
  },
  onOpenAddShortcut: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('open-add-shortcut', handler);
    return () => { ipcRenderer.removeListener('open-add-shortcut', handler); };
  },
  onShortcutLaunched: (callback: (payload: { path: string; name: string }) => void) => {
    const handler = (_event: any, payload: { path: string; name: string }) => callback(payload);
    ipcRenderer.on('shortcut-launched', handler);
    return () => { ipcRenderer.removeListener('shortcut-launched', handler); };
  },
  onHotkeyConflict: (callback: (payload: { name: string; hotkey: string }) => void) => {
    const handler = (_event: any, payload: { name: string; hotkey: string }) => callback(payload);
    ipcRenderer.on('hotkey-conflict', handler);
    return () => { ipcRenderer.removeListener('hotkey-conflict', handler); };
  },
  setTrayRecents: (items: Array<{ name: string; path: string; isAdmin?: boolean; iconPath?: string; arguments?: string; cwd?: string }>) =>
    ipcRenderer.invoke('tray:set-recents', items),

  // --- App versions / updates ---
  getAppVersions: () => ipcRenderer.invoke('app:get-versions'),
  getUpdateStatus: () => ipcRenderer.invoke('update:get-status'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  setAutoUpdate: (enabled: boolean) => ipcRenderer.invoke('set-auto-update', enabled),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  onUpdateStatus: (callback: (status: any) => void) => {
    const handler = (_event: any, status: any) => callback(status);
    ipcRenderer.on('update:status', handler);
    return () => { ipcRenderer.removeListener('update:status', handler); };
  },

  // --- CyberTray Specific IPC channels ---
  setDragActive: (active: boolean) => ipcRenderer.invoke('set-drag-active', active),
  onShelfStateChange: (callback: (visible: boolean) => void) => {
    const handler = (_event: any, visible: boolean) => callback(visible);
    ipcRenderer.on('shelf-state-change', handler);
    return () => { ipcRenderer.removeListener('shelf-state-change', handler); };
  },
  onPlayLaunchSound: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('play-launch-sound', handler);
    return () => { ipcRenderer.removeListener('play-launch-sound', handler); };
  },

  // --- Cyber-Sweep & Vault Channels ---
  runDesktopSweep: () => ipcRenderer.invoke('run-desktop-sweep'),
  getDefaultVaultPath: () => ipcRenderer.invoke('get-default-vault-path'),
  openVaultFolder: () => ipcRenderer.invoke('open-vault-folder'),
  selectVaultFolder: () => ipcRenderer.invoke('select-vault-folder'),
  importFileToVault: (filePath: string) => ipcRenderer.invoke('import-file-to-vault', filePath),

  // --- Respaldo automático ---
  backup: {
    getStatus: () => ipcRenderer.invoke('backup:status'),
    runNow: () => ipcRenderer.invoke('backup:now'),
    list: () => ipcRenderer.invoke('backup:list'),
    openFolder: () => ipcRenderer.invoke('backup:open-folder'),
    selectFolder: () => ipcRenderer.invoke('backup:select-folder'),
    restore: (fileName: string) => ipcRenderer.invoke('backup:restore', fileName),
    remove: (fileName: string) => ipcRenderer.invoke('backup:delete', fileName),
    onCompleted: (callback: (payload: { at: string; file: string; folder: string; reason: string; warning?: string }) => void) => {
      const handler = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on('backup:completed', handler);
      return () => { ipcRenderer.removeListener('backup:completed', handler); };
    },
  },

  // --- Vigilante de escritorio ---
  watcher: {
    onPrompt: (callback: (state: any) => void) => {
      const handler = (_event: any, state: any) => callback(state);
      ipcRenderer.on('watcher-prompt-state', handler);
      return () => { ipcRenderer.removeListener('watcher-prompt-state', handler); };
    },
    add: (payload: { keys: string[]; categoryId: string }) => ipcRenderer.invoke('watcher:add', payload),
    dismiss: () => ipcRenderer.invoke('watcher:dismiss'),
    checkNow: () => ipcRenderer.invoke('watcher:check-now'),
    status: () => ipcRenderer.invoke('watcher:status'),
  },

  // --- Custom tray menu ---
  trayMenu: {
    onState: (callback: (state: any) => void) => {
      const handler = (_event: any, state: any) => callback(state);
      ipcRenderer.on('tray-menu-state', handler);
      return () => { ipcRenderer.removeListener('tray-menu-state', handler); };
    },
    onShow: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('tray-menu-show', handler);
      return () => { ipcRenderer.removeListener('tray-menu-show', handler); };
    },
    onReset: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('tray-menu-reset', handler);
      return () => { ipcRenderer.removeListener('tray-menu-reset', handler); };
    },
    action: (action: string, payload?: unknown) => ipcRenderer.send('tray-menu-action', action, payload),
    ready: (rect: { width: number; height: number; view: string }) => ipcRenderer.send('tray-menu-ready', rect),
    hide: () => ipcRenderer.send('tray-menu-hide'),
  },
});
