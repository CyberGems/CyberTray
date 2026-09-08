export {};

declare global {
  interface Window {
    electronAPI?: {
      launchApp: (path: string, isAdmin?: boolean, args?: string, cwd?: string) => Promise<{ success: boolean; error?: string }>;
      getUwpApps: () => Promise<Array<{ name: string; aumid: string; icon: string }>>;
      selectFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ name: string; path: string; iconPath?: string } | null>;
      selectImage: () => Promise<string | null>;
      selectAudio: () => Promise<string | null>;
      getMonitors: () => Promise<Array<{ id: string; label: string; isPrimary: boolean; bounds: any; size: any }>>;
      setMonitor: (monitorId: string) => Promise<void>;
      registerShortcut: (shortcut: string) => Promise<{ success: boolean; shortcut: string }>;
      windowMinimize: () => Promise<void>;
      windowMaximizeToggle: () => Promise<void>;
      windowClose: () => Promise<void>;
      windowHideToTray: () => Promise<void>;
      setAutoLaunch: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      setHideOnBlur: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      setShowTaskbarIcon: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      getSystemInfo: () => Promise<{ memory: { total: number; used: number; percent: number }; cpu: { model: string; cores: number }; vram: { total: number; name: string } | null; uptime: number }>;
      getDiskInfo: () => Promise<Array<{ drive: string; total: number; free: number; used: number; percent: number }>>;
      getRunningProcesses: () => Promise<Array<{ pid: number; name: string; path: string; memory: number }>>;
      killProcess: (pid: number) => Promise<{ success: boolean; error?: string }>;
      resolveFilePath: (filePath: string) => Promise<{ name: string; path: string; ext: string; exists: boolean; iconPath: string; arguments?: string; cwd?: string } | null>;
      openFileLocation: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      searchSystemFiles: (query: string) => Promise<Array<{ name: string; path: string; ext: string; type: 'app' | 'file' | 'folder'; icon?: string }>>;
      getIndexerSettings: () => Promise<{ enabled: boolean; maxDepth: number; paths: string[] }>;
      saveIndexerSettings: (settings: { enabled: boolean; maxDepth: number; paths: string[] }) => Promise<boolean>;
      getIndexerStats: () => Promise<{ status: 'ONLINE' | 'OFFLINE' | 'INDEXING'; totalFiles: number }>;
      selectIndexerFolder: () => Promise<string | null>;
      getSystemDrives: () => Promise<string[]>;
      getPathForFile: (file: File) => string;
      getImageData: (filePath: string) => Promise<string | null>;
      setHotspots: (corners: string[], delay: number) => Promise<{ success: boolean }>;
      openDevTools: () => Promise<{ success: boolean }>;
      exportConfig: (jsonData: string) => Promise<string | null>;
      importConfig: () => Promise<string | null>;
      saveConfig: (config: any, options?: { broadcastReload?: boolean }) => Promise<boolean>;
      loadConfig: () => Promise<any | null>;
      getConfigPath: () => Promise<string>;
      openDataFolder: () => Promise<void>;
      onReloadConfig: (callback: () => void) => () => void;
      showTextContextMenu: (x: number, y: number) => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<{ success: boolean }>;
      runShellCommand: (command: string) => Promise<{ success: boolean; cmdId?: string; error?: string }>;
      onShellOutput: (callback: (data: { id: string; type: 'stdout' | 'stderr'; text: string }) => void) => () => void;
      onShellExit: (callback: (data: { id: string; exitCode: number }) => void) => () => void;
      onAlwaysOnTopBlurAttempt: (callback: () => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      onOpenAbout: (callback: (opts?: { checkUpdates?: boolean }) => void) => () => void;
      onOpenAddShortcut: (callback: () => void) => () => void;
      onShortcutLaunched: (callback: (payload: { path: string; name: string }) => void) => () => void;
      setTrayRecents: (items: Array<{ name: string; path: string; isAdmin?: boolean; iconPath?: string; arguments?: string; cwd?: string }>) => Promise<{ success: boolean }>;
      getAppVersions: () => Promise<{
        app: string; electron: string; chrome: string; node: string;
        platform: string; arch: string; osRelease: string; osType: string;
      }>;
      getUpdateStatus: () => Promise<any>;
      checkForUpdates: () => Promise<{ ok: boolean; version?: string; error?: string }>;
      downloadUpdate: () => Promise<{ ok: boolean; error?: string }>;
      installUpdate: () => Promise<void>;
      setAutoUpdate: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      onUpdateStatus: (callback: (status: any) => void) => () => void;
      toggleShelf: () => Promise<void>;
      setDragActive: (active: boolean) => Promise<void>;
      onShelfStateChange: (callback: (visible: boolean) => void) => () => void;
      onPlayLaunchSound: (callback: () => void) => () => void;
      runDesktopSweep: () => Promise<{ success: boolean; count?: number; error?: string }>;
      getDefaultVaultPath: () => Promise<string>;
      openVaultFolder: () => Promise<boolean>;
      selectVaultFolder: () => Promise<string | null>;
      importFileToVault: (filePath: string) => Promise<{ success: boolean; path: string; iconPath: string; name: string; error?: string }>;
    };
  }
}
