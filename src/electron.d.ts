import type { ImportPlan, ImportSourceConfig } from './lib/shortcutImport';
import type { BackupItem, BackupResult, BackupStatus } from './lib/backup';

export {};

/**
 * Contrato único de la API IPC expuesta por electron/preload.ts.
 * Cualquier cambio en el preload debe reflejarse aquí.
 */
declare global {
  interface Window {
    electronAPI?: {
      launchApp: (path: string, isAdmin?: boolean, args?: string, cwd?: string) => Promise<{ success: boolean; error?: string }>;
      selectFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ name: string; path: string; iconPath?: string; arguments?: string; cwd?: string } | null>;
      selectImage: () => Promise<string | null>;
      selectAudio: () => Promise<string | null>;
      selectFolder: () => Promise<string | null>;
      getImageData: (filePath: string) => Promise<string | null>;
      getBundledAssetUrl: (relativePath: string) => Promise<string | null>;
      getMonitors: () => Promise<Array<{ id: string; label: string; isPrimary: boolean; bounds: any; size: any }>>;
      setMonitor: (monitorId: string) => Promise<void>;
      registerShortcut: (shortcut: string) => Promise<{ success: boolean; shortcut: string; error?: 'shortcut_conflict' }>;
      windowHideToTray: () => Promise<void>;
      setAutoLaunch: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      setHideOnBlur: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      setShowTaskbarIcon: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      getSystemInfo: () => Promise<{ memory: { total: number; used: number; percent: number }; cpu: { model: string; cores: number }; vram: { total: number; name: string } | null; uptime: number }>;
      getDiskInfo: () => Promise<Array<{ drive: string; total: number; free: number; used: number; percent: number }>>;
      getRunningProcesses: () => Promise<Array<{ pid: number; name: string; path: string; memory: number }>>;
      killProcess: (pid: number) => Promise<{ success: boolean; error?: string }>;
      resolveFilePath: (filePath: string) => Promise<{ name: string; path: string; ext: string; exists: boolean; iconPath: string; arguments?: string; cwd?: string } | null>;
      scanImportSources: (sources: ImportSourceConfig[]) => Promise<{ plan: ImportPlan; errors: Array<{ sourceId: string; message: string }> }>;
      cancelImportScan: () => Promise<{ success: boolean }>;
      onImportProgress: (callback: (progress: { completed: number; total: number; sourceId: string }) => void) => () => void;
      applyImportPlan: (plan: ImportPlan, sources: ImportSourceConfig[]) => Promise<{ success: boolean; created?: number; updated?: number; removed?: number; missing?: number; error?: string }>;
      getImportBackupStatus: () => Promise<{ available: boolean }>;
      undoLastImport: () => Promise<{ success: boolean; shortcuts?: number; error?: string }>;
      openFileLocation: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      copyToClipboard: (text: string) => Promise<{ success: boolean; error?: string }>;
      openFolder: (targetPath: string) => Promise<{ success: boolean; error?: string }>;
      openInTerminal: (targetPath: string) => Promise<{ success: boolean; error?: string }>;
      getPathForFile: (file: File) => string;
      setHotspots: (corners: string[], delay: number) => Promise<{ success: boolean }>;
      openDevTools: () => Promise<{ success: boolean }>;
      exportConfig: (jsonData: string) => Promise<string | null>;
      importConfig: () => Promise<string | null>;
      saveConfig: (config: any, options?: { broadcastReload?: boolean }) => Promise<{ success: boolean; revision: number }>;
      loadConfig: () => Promise<any | null>;
      getConfigPath: () => Promise<string>;
      openDataFolder: () => Promise<void>;
      onReloadConfig: (callback: (nextConfig?: any) => void) => () => void;
      showTextContextMenu: (x: number, y: number) => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<{ success: boolean }>;
      onAlwaysOnTopBlurAttempt: (callback: () => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      onOpenAbout: (callback: (opts?: { checkUpdates?: boolean }) => void) => () => void;
      onOpenAddShortcut: (callback: () => void) => () => void;
      onShortcutLaunched: (callback: (payload: { path: string; name: string }) => void) => () => void;
      onHotkeyConflict: (callback: (payload: { name: string; hotkey: string }) => void) => () => void;
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
      setDragActive: (active: boolean) => Promise<void>;
      onShelfStateChange: (callback: (visible: boolean) => void) => () => void;
      onPlayLaunchSound: (callback: () => void) => () => void;
      runDesktopSweep: () => Promise<{ success: boolean; count?: number; error?: string }>;
      getDefaultVaultPath: () => Promise<string>;
      openVaultFolder: () => Promise<boolean>;
      selectVaultFolder: () => Promise<string | null>;
      importFileToVault: (filePath: string) => Promise<{ success: boolean; path: string; iconPath: string; name: string; error?: string }>;
      backup: {
        getStatus: () => Promise<BackupStatus>;
        runNow: () => Promise<BackupResult>;
        list: () => Promise<BackupItem[]>;
        openFolder: () => Promise<{ success: boolean; folder?: string; error?: string }>;
        selectFolder: () => Promise<string | null>;
        restore: (fileName: string) => Promise<BackupResult>;
        remove: (fileName: string) => Promise<BackupResult>;
        onCompleted: (callback: (payload: { at: string; file: string; folder: string; reason: string; warning?: string }) => void) => () => void;
      };
    };
  }
}
