import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { translate, setLocale } from './locales';
import { motion, AnimatePresence } from 'motion/react';
import ProcessMatrixModal from './components/ProcessMatrixModal';
import ShortcutFormModal from './components/ShortcutFormModal';
import CyberTrayLogo from './components/CyberTrayLogo';
import ShortcutGrid from './components/ShortcutGrid';
import TelemetryBar from './components/TelemetryBar';
import ToastStack from './components/ToastStack';
import SettingsPanel from './components/SettingsPanel';
import PinPadModal from './components/PinPadModal';
import AboutModal, { UpdateStatus, peekReleaseNotes } from './components/AboutModal';
import ShelfOverlays from './components/ShelfOverlays';
import FolderTree from './components/FolderTree';
import {
  isElectron,
  INITIAL_CATEGORIES,
  FOLDER_SCHEMA_VERSION,
  normalizeCategoriesList,
  normalizeShortcutsList,
  createFolderId,
  getChildFolders,
  getDescendantFolderIds,
  getFolderPath,
} from './lib/appUtils';
import {
  Search, Grid, List as ListIcon, Plus, Clock, ArrowUpDown, Settings,
  Minus, X, LayoutGrid, Palette, Key, Trash2, Shield, Info,
  Minimize2, Power, Pin, Play, Edit, ArrowDown,
  Monitor, ExternalLink, Sliders, ChevronDown, RefreshCw, Upload, Check, Trash,
  Activity, MemoryStick, Star, Lock, Cpu, FolderOpen,
  CheckSquare, FlipHorizontal2
} from 'lucide-react';

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
      registerAppShortcuts: (shortcuts: Array<{ id: number; path: string; shortcut: string; isAdmin: boolean }>) => Promise<{ success: boolean }>;
      runShellCommand: (command: string) => Promise<{ success: boolean; cmdId?: string; error?: string }>;
      onShellOutput: (callback: (data: { id: string; type: 'stdout' | 'stderr'; text: string }) => void) => () => void;
      onShellExit: (callback: (data: { id: string; exitCode: number }) => void) => () => void;
      onAlwaysOnTopBlurAttempt: (callback: () => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      onOpenAbout: (callback: (opts?: { checkUpdates?: boolean }) => void) => () => void;
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

let globalAudioCtx: AudioContext | null = null;

export default function App() {
  // Configuración de la App
  const [config, setConfig] = useState<any>({
    dockPosition: 'top',
    monitorId: '',
    shortcut: 'Alt+T',
    hideOnBlur: true,
    hotspotCorners: [],
    hotspotDelay: 300,
    alwaysOnTop: true,
    iconSize: 60, // Tamaño de icono predeterminado
    showTaskbarIcon: false,
    autoLaunch: false,
    theme: 'cyan',
    blurLevel: 20,
    opacity: 85,
    hideOnDeadZoneClick: false,
    bgType: 'solid',
    bgSolidColor: '#070b13',
    bgGradient: 'preset-1',
    bgImage: 'preset-1',
    bgCustomPath: '',
    soundEnabled: true,
    soundPath: '',
    folderSchemaVersion: FOLDER_SCHEMA_VERSION,
    autoUpdate: true,
  });


  // Base de datos de Accesos Directos y Categorías
  const [categories, setCategories] = useState<any[]>(INITIAL_CATEGORIES);
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // UI States
  const [isPinned, setIsPinned] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'appearance' | 'shortcuts'>('general');
  const [iconSortOrder, setIconSortOrder] = useState<'alpha' | 'recent' | 'added'>('alpha');
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);
  const settingsSavedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showProcessMatrixModal, setShowProcessMatrixModal] = useState<boolean>(false);
  const [processSortOrder, setProcessSortOrder] = useState<'memory-desc' | 'memory-asc' | 'name-asc' | 'name-desc' | 'pid-asc' | 'pid-desc'>('memory-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('cybertray_view_mode') as 'grid' | 'list') || 'grid');

  // About & Updates States
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [aboutAutoCheckSeq, setAboutAutoCheckSeq] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' });
  const updateNotifSeenRef = useRef<string>('');

  useEffect(() => {
    localStorage.setItem('cybertray_view_mode', viewMode);
  }, [viewMode]);
  
  // CyberVault Security States
  const [lastVaultUnlockTime, setLastVaultUnlockTime] = useState<number>(0);
  const [vaultUnlockedSession, setVaultUnlockedSession] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [showVaultHelp, setShowVaultHelp] = useState<boolean>(() => {
    const saved = localStorage.getItem('cybertray_show_vault_help');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('cybertray_show_vault_help', String(showVaultHelp));
  }, [showVaultHelp]);
  
  // Change PIN Form States
  const [showChangePinForm, setShowChangePinForm] = useState<boolean>(false);
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [changePinError, setChangePinError] = useState<string>('');
  const [changePinSuccess, setChangePinSuccess] = useState<boolean>(false);
  
  // Disable PIN Form States
  const [showDisablePinPrompt, setShowDisablePinPrompt] = useState<boolean>(false);
  const [disablePinInput, setDisablePinInput] = useState<string>('');
  const [disablePinError, setDisablePinError] = useState<string>('');
  
  // Enable PIN Setup States
  const [showEnablePinPrompt, setShowEnablePinPrompt] = useState<boolean>(false);
  const [enablePinInput, setEnablePinInput] = useState<string>('');
  const [enableConfirmPinInput, setEnableConfirmPinInput] = useState<string>('');
  const [enablePinError, setEnablePinError] = useState<string>('');
  
  // Global Tooltip State
  const [globalTooltip, setGlobalTooltip] = useState<{
    text: string;
    subText?: string;
    borderColor?: string;
    x: number;
    y: number;
    placement: 'top' | 'bottom';
    visible: boolean;
  }>({ text: '', x: 0, y: 0, placement: 'top', visible: false });

  const showTooltip = useCallback((e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2));
    
    // Detect dock position dynamically to decide vertical placement
    const isDockTop = config.dockPosition === 'top';
    const y = isDockTop ? rect.bottom + 8 : rect.top - 8;
    
    setGlobalTooltip({
      text,
      subText,
      borderColor: borderColor || 'var(--neon-glow-border)',
      x,
      y,
      placement: isDockTop ? 'bottom' : 'top',
      visible: true
    });
  }, [config.dockPosition]);

  const hideTooltip = useCallback(() => {
    setGlobalTooltip(prev => ({ ...prev, visible: false }));
  }, []);
  
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
    isAlert?: boolean;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, danger = false) => {
    setConfirmModal({
      open: true,
      title,
      message,
      onConfirm,
      danger,
      isAlert: false,
    });
  };

  const isVaultLocked = () => {
    if (config.vaultPinEnabled !== true) return false;
    if (config.vaultLockTimeout === -1) {
      return !vaultUnlockedSession;
    }
    if (config.vaultLockTimeout === 0) {
      return lastVaultUnlockTime === 0;
    }
    const elapsedMs = Date.now() - lastVaultUnlockTime;
    const timeoutMs = (config.vaultLockTimeout || 5) * 60 * 1000;
    return elapsedMs > timeoutMs;
  };

  const handleTabClick = (tabId: string) => {
    if (tabId === 'vault') {
      if (isVaultLocked()) {
        setPinInput('');
        setPinError(false);
        setShowPinModal(true);
        return;
      }
    } else {
      if (activeCategory === 'vault' && config.vaultLockTimeout === 0) {
        setLastVaultUnlockTime(0);
      }
    }
    setActiveCategory(tabId);
    playFolderSound();
  };

  const handlePinSubmit = (enteredPin: string) => {
    if (enteredPin === config.vaultPin) {
      setLastVaultUnlockTime(Date.now());
      setVaultUnlockedSession(true);
      setShowPinModal(false);
      setActiveCategory('vault');
      playFolderSound();
    } else {
      setPinError(true);
      playPinBlockSound();
      setPinInput('');
    }
  };

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setConfirmModal({
      open: true,
      title,
      message,
      onConfirm: onConfirm || (() => {}),
      danger: false,
      isAlert: true,
    });
  };
  
  // Modales
  const [shortcutModal, setShortcutModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [newCatModal, setNewCatModal] = useState<boolean>(false);
  const [renameCatModal, setRenameCatModal] = useState<{ open: boolean; category?: any }>({ open: false });
  const [renameCatName, setRenameCatName] = useState<string>('');
  const [tempBgPath, setTempBgPath] = useState<string>('');
  const [categoryMenu, setCategoryMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    category: any;
  } | null>(null);

  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);

  // ── Sistema de toasts (avisos de acciones del sistema) ──
  type ToastType = 'success' | 'error' | 'info';
  type Toast = {
    id: number;
    type: ToastType;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    duration: number;
    detail?: string;
    onBodyClick?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
  };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef<number>(0);
  const toastTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const tm = toastTimers.current[id];
    if (tm) { clearTimeout(tm); delete toastTimers.current[id]; }
  };

  const pushToast = (
    type: ToastType,
    message: string,
    opts?: {
      actionLabel?: string;
      onAction?: () => void;
      duration?: number;
      detail?: string;
      onBodyClick?: () => void;
      secondaryActionLabel?: string;
      onSecondaryAction?: () => void;
    }
  ) => {
    const id = ++toastSeq.current;
    const duration = opts?.duration ?? (opts?.onAction || opts?.onBodyClick ? 8000 : 3000);
    // Mantener como máximo 3 visibles para no saturar el panel.
    setToasts(prev => [...prev.slice(-2), {
      id,
      type,
      message,
      actionLabel: opts?.actionLabel,
      onAction: opts?.onAction,
      duration,
      detail: opts?.detail,
      onBodyClick: opts?.onBodyClick,
      secondaryActionLabel: opts?.secondaryActionLabel,
      onSecondaryAction: opts?.onSecondaryAction,
    }]);
    toastTimers.current[id] = setTimeout(() => dismissToast(id), duration);
  };

  // ── Selección múltiple / borrado en masa ──
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const lassoStart = useRef<{ x: number; y: number } | null>(null);
  const lassoAdditive = useRef<boolean>(false);
  const lastSelectedIndex = useRef<number | null>(null);
  const gridScrollRef = useRef<HTMLElement | null>(null);

  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [shortcutMenu, setShortcutMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: any;
  } | null>(null);

  // Refs
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<any>(config);
  const usagePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUsageRef = useRef<{ shortcuts: any[]; totalLaunches: number } | null>(null);
  const shortcutsRef = useRef<any[]>(shortcuts);
  const launchAudioRef = useRef<HTMLAudioElement | null>(null);
  const folderAudioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Atajos del modo selección: Esc sale, Ctrl/Cmd+A selecciona todo.
  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitSelectionMode();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectionMode]);

  // Preload and initialize audio objects to eliminate playback delay
  useEffect(() => {
    // Initialize folder tab sound
    folderAudioRef.current = new Audio('/sounds/cybertrayfolders.mp3');
    folderAudioRef.current.volume = 0.15;
    folderAudioRef.current.load();
  }, []);

  useEffect(() => {
    const soundEnabled = config.soundEnabled !== false;
    const soundPath = config.soundPath || '';
    if (soundEnabled) {
      try {
        let url = '/sounds/cybertraylaunch.mp3';
        if (soundPath) {
          url = soundPath.startsWith('http') || soundPath.startsWith('data:')
            ? soundPath
            : `local-resource:///${soundPath.replace(/\\/g, '/')}`;
        }
        const audio = new Audio(url);
        audio.volume = 0.25;
        audio.load(); // Force preload
        launchAudioRef.current = audio;
      } catch (err) {
        console.error('Error preloading launch audio:', err);
      }
    } else {
      launchAudioRef.current = null;
    }
  }, [config.soundEnabled, config.soundPath]);
  
  // Form de Accesos Directos
  const [formName, setFormName] = useState<string>('');
  const [formPath, setFormPath] = useState<string>('');
  const [formArgs, setFormArgs] = useState<string>('');
  const [formDelay, setFormDelay] = useState<number>(0);
  const [formCategory, setFormCategory] = useState<string>('utils');
  const [formAdmin, setFormAdmin] = useState<boolean>(false);
  const [formHotkey, setFormHotkey] = useState<string>('');
  const [formIconPath, setFormIconPath] = useState<string>('');

  // Form de Nueva Categoría
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>('#3b82f6');
  const [newCatParentId, setNewCatParentId] = useState<string | null>(null);

  // Neural Telemetry States
  const [systemInfo, setSystemInfo] = useState<any>({
    memory: { total: 16, used: 8, percent: 50 },
    cpu: { model: 'AMD Ryzen Core', cores: 8 },
    vram: null as { total: number; name: string } | null,
    uptime: 3600,
  });
  const [disks, setDisks] = useState<any[]>([{ drive: 'C:', total: 500, free: 250, used: 250, percent: 50 }]);
  const [activeTasksCount, setActiveTasksCount] = useState<number>(0);
  const [runningProcesses, setRunningProcesses] = useState<Array<{ pid: number; name: string; path: string; memory: number }>>([]);
  const [isShelfVisible, setIsShelfVisible] = useState<boolean>(false);
  const [isPinFlashing, setIsPinFlashing] = useState<boolean>(false);
  const [processSearchQuery, setProcessSearchQuery] = useState<string>('');

  // Monitor e Idioma lists
  const [monitors, setMonitors] = useState<any[]>([]);
  const [langCode, setLangCode] = useState<'en' | 'es'>('en');

  // Carga Inicial
  useEffect(() => {
    // Cargar Configuración Central y Atajos
    const fetchConfig = async () => {
      if (isElectron) {
        // Cargar config general de Electron
        const loadedConfig = await window.electronAPI!.loadConfig();
        if (loadedConfig) {
          const resolvedAutoUpdate = typeof loadedConfig.autoUpdate === 'boolean'
            ? loadedConfig.autoUpdate
            : loadedConfig.autoCheckUpdates !== false;
          const configWithFolderSchema = {
            ...loadedConfig,
            folderSchemaVersion: loadedConfig.folderSchemaVersion || FOLDER_SCHEMA_VERSION,
            autoUpdate: resolvedAutoUpdate,
          };
          setConfig(configWithFolderSchema);
          setIsPinned(loadedConfig.alwaysOnTop !== undefined ? loadedConfig.alwaysOnTop : true);
          if (loadedConfig.language) {
            setLangCode(loadedConfig.language);
            setLocale(loadedConfig.language);
          }
          const sanitizedCategories = normalizeCategoriesList(loadedConfig.categoriesList || INITIAL_CATEGORIES);
          const sanitizedShortcuts = normalizeShortcutsList(loadedConfig.shortcutsList || [], sanitizedCategories);
          setCategories(sanitizedCategories);
          setShortcuts(sanitizedShortcuts);
          if (loadedConfig.folderSchemaVersion !== FOLDER_SCHEMA_VERSION) {
            await window.electronAPI!.saveConfig({
              ...configWithFolderSchema,
              folderSchemaVersion: FOLDER_SCHEMA_VERSION,
              categoriesList: sanitizedCategories,
              shortcutsList: sanitizedShortcuts,
            }, { broadcastReload: false });
          }
        }

        // Obtener Monitores
        const mons = await window.electronAPI!.getMonitors();
        setMonitors(mons);
      } else {
        // Fallback Web Mock
        const mockShortcuts = [
          { id: 1, name: 'VS Code', path: 'C:\\...', category: 'dev', iconPath: '', isAdmin: false, delay: 0, arguments: '', usageCount: 42 },
          { id: 2, name: 'Brave Browser', path: 'C:\\...', category: 'browsers', iconPath: '', isAdmin: false, delay: 0, arguments: '', usageCount: 15 },
          { id: 3, name: 'ChatGPT', path: 'https://chat.openai.com', category: 'ai', iconPath: '', isAdmin: false, delay: 0, arguments: '', usageCount: 22 },
        ];
        setShortcuts(mockShortcuts);
      }
    };

    fetchConfig();

    // Listener para recarga de configuración
    if (isElectron) {
      const unsub = window.electronAPI!.onReloadConfig(() => {
        fetchConfig();
      });
      return () => unsub();
    }
  }, []);

  // Listen to shelf visibility change to suspend/resume process monitoring
  useEffect(() => {
    if (isElectron) {
      const unsub = window.electronAPI!.onShelfStateChange((visible) => {
        setIsShelfVisible(visible);
      });
      return () => unsub();
    }
  }, []);

  const [isScanningProcesses, setIsScanningProcesses] = useState<boolean>(false);

  const handleScanProcesses = async () => {
    if (!isElectron) return;
    setIsScanningProcesses(true);
    playCyberBeep();
    try {
      const list = await window.electronAPI!.getRunningProcesses();
      if (Array.isArray(list)) {
        setRunningProcesses(list);
      }
    } catch (err) {
      console.error('Error fetching running processes:', err);
    } finally {
      setIsScanningProcesses(false);
    }
  };

  // Clear running processes list when the matrix modal is closed to release memory
  useEffect(() => {
    if (!showProcessMatrixModal) {
      setRunningProcesses([]);
    }
  }, [showProcessMatrixModal]);

  // Auto-focus search input when shelf becomes visible
  useEffect(() => {
    if (isShelfVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isShelfVisible]);

  // Listen for blur attempts when pinned (CyberLauncher-style flash feedback)
  useEffect(() => {
    if (isElectron && window.electronAPI.onAlwaysOnTopBlurAttempt) {
      const unsub = window.electronAPI.onAlwaysOnTopBlurAttempt(() => {
        playPinBlockSound();
        setIsPinFlashing(true);
        setTimeout(() => setIsPinFlashing(false), 1200);
      });
      return unsub;
    }
  }, []);

  // Helper to get active process info for a shortcut
  const getShortcutProcess = useCallback((item: any) => {
    if (!item.path || item.path.startsWith('http://') || item.path.startsWith('https://')) {
      return null;
    }
    try {
      const normalizedPath = item.path.replace(/\\/g, '/');
      const exeName = normalizedPath.split('/').pop()?.toLowerCase();
      if (!exeName) return null;

      return runningProcesses.find(p => {
        const pName = p.name.toLowerCase();
        if (pName === exeName) return true;
        if (p.path && p.path.replace(/\\/g, '/').toLowerCase() === normalizedPath.toLowerCase()) return true;
        return false;
      });
    } catch {
      return null;
    }
  }, [runningProcesses]);



  // Listener para reproducir el sonido de lanzamiento con cero latencia
  useEffect(() => {
    if (isElectron) {
      const unsub = window.electronAPI!.onPlayLaunchSound(() => {
        if (launchAudioRef.current) {
          try {
            launchAudioRef.current.currentTime = 0;
            launchAudioRef.current.play().catch((err) => console.log('Audio play error:', err));
          } catch (err) {
            console.log('Audio play catch:', err);
          }
        }
      });
      return () => unsub();
    }
  }, []);

  // Listener para abrir el panel de configuración desde el menú contextual
  useEffect(() => {
    if (isElectron && window.electronAPI.onOpenSettings) {
      const unsub = window.electronAPI.onOpenSettings(() => {
        setShowSettings(true);
        setSettingsTab('general');
      });
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onOpenAbout) return;
    const unsub = window.electronAPI.onOpenAbout((opts) => {
      setShowAboutModal(true);
      if (opts?.checkUpdates) {
        setAboutAutoCheckSeq((n) => n + 1);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onUpdateStatus) return;

    const applyStatus = (status: UpdateStatus) => {
      setUpdateStatus(status);
      if (status.state !== 'available' && status.state !== 'downloaded') return;

      const key = `${status.state}:${status.version}`;
      const seen = updateNotifSeenRef.current || localStorage.getItem('update_notif_seen') || '';
      const detail = status.releaseNotes ? peekReleaseNotes(status.releaseNotes) : undefined;
      if (seen === key) return;

      updateNotifSeenRef.current = key;
      localStorage.setItem('update_notif_seen', key);
      pushToast(
        'info',
        status.state === 'available'
          ? translate('about_notif_available', { version: status.version })
          : translate('about_notif_downloaded', { version: status.version }),
        {
          duration: 8000,
          detail,
          onBodyClick: () => setShowAboutModal(true),
          secondaryActionLabel: status.releaseUrl ? translate('about_view_release') : undefined,
          onSecondaryAction: status.releaseUrl
            ? () => {
                if (window.electronAPI?.openExternal) {
                  window.electronAPI.openExternal(status.releaseUrl!);
                }
              }
            : undefined,
          actionLabel: status.state === 'available'
            ? translate('about_download_btn')
            : translate('about_install_btn'),
          onAction: () => {
            if (status.state === 'available') {
              void window.electronAPI?.downloadUpdate?.();
              setShowAboutModal(true);
            } else {
              window.electronAPI?.installUpdate?.();
            }
          },
        }
      );
    };

    window.electronAPI.getUpdateStatus?.().then((s) => { if (s) applyStatus(s); }).catch(() => {});
    const off = window.electronAPI.onUpdateStatus(applyStatus);
    return off;
  }, []);

  useEffect(() => {
    if (!isShelfVisible) return;

    const fetchLightTelemetry = async () => {
      if (isElectron) {
        const info = await window.electronAPI!.getSystemInfo();
        setSystemInfo(info);
      } else {
        // Web fallback telemetry
        setSystemInfo({
          memory: { total: 16, used: 7.5 + Math.random(), percent: 45 + Math.random() * 5 },
          cpu: { model: 'Intel i9-14900K', cores: 24 },
          uptime: osUptimeMock += 5,
        });
      }
    };

    const fetchHeavyTelemetry = async () => {
      if (isElectron) {
        const diskInfo = await window.electronAPI!.getDiskInfo();
        setDisks(diskInfo);
      }
    };

    let osUptimeMock = 7200;

    // Defer initial telemetry calls to avoid stuttering during open animation
    const lightDelay = setTimeout(fetchLightTelemetry, 1500);
    const heavyDelay = setTimeout(fetchHeavyTelemetry, 2500);

    // Poll light telemetry (RAM/CPU/Uptime) every 5 seconds
    const lightInterval = setInterval(fetchLightTelemetry, 5000);

    // Poll heavy telemetry (Disk space via WMI) every 60 seconds
    const heavyInterval = setInterval(fetchHeavyTelemetry, 60000);

    return () => {
      clearTimeout(lightDelay);
      clearTimeout(heavyDelay);
      clearInterval(lightInterval);
      clearInterval(heavyInterval);
    };
  }, [isShelfVisible]);

  // Sincronizar tempBgPath cuando cambie en la configuración
  useEffect(() => {
    setTempBgPath(config.bgCustomPath || '');
  }, [config.bgCustomPath]);

  // Efecto global para menú contextual en todos los campos de texto
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target.tagName === 'INPUT' && 
          ['text', 'number', 'password', 'search', 'url'].includes((target as HTMLInputElement).type)) ||
        target.tagName === 'TEXTAREA'
      ) {
        if (isElectron) {
          e.preventDefault();
          window.electronAPI!.showTextContextMenu(e.clientX, e.clientY);
        }
      }
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  // Efecto global para sincronizar el estado de drag-and-drop con Electron
  useEffect(() => {
    if (!isElectron) return;

    const handleWindowDragEnter = () => {
      window.electronAPI!.setDragActive(true);
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      // dragleave se dispara al moverse entre elementos hijos, validamos si realmente abandonó la ventana
      if (!e.relatedTarget || (e.relatedTarget as HTMLElement).nodeName === "HTML") {
        window.electronAPI!.setDragActive(false);
      }
    };

    const handleWindowDrop = () => {
      window.electronAPI!.setDragActive(false);
    };

    const handleWindowDragEnd = () => {
      window.electronAPI!.setDragActive(false);
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);
    window.addEventListener('dragend', handleWindowDragEnd);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
      window.removeEventListener('dragend', handleWindowDragEnd);
    };
  }, []);

  const cancelPendingUsagePersist = useCallback(() => {
    if (usagePersistTimerRef.current) {
      clearTimeout(usagePersistTimerRef.current);
      usagePersistTimerRef.current = null;
    }
    pendingUsageRef.current = null;
  }, []);

  const scheduleUsagePersist = useCallback((newShortcuts: any[], totalLaunches: number) => {
    pendingUsageRef.current = { shortcuts: newShortcuts, totalLaunches };
    if (usagePersistTimerRef.current) {
      clearTimeout(usagePersistTimerRef.current);
    }
    usagePersistTimerRef.current = setTimeout(async () => {
      const pending = pendingUsageRef.current;
      pendingUsageRef.current = null;
      usagePersistTimerRef.current = null;
      if (!pending || !isElectron) return;
      try {
        await window.electronAPI!.saveConfig(
          {
            ...configRef.current,
            shortcutsList: pending.shortcuts,
            totalLaunches: pending.totalLaunches,
          },
          { broadcastReload: false }
        );
      } catch (err) {
        console.error('Error persisting usage stats:', err);
      }
    }, 2000);
  }, []);

  // Persistencia de Atajos y Categorías
  const saveDataToConfig = async (newShortcuts: any[], newCategories: any[]) => {
    const normalizedCategories = normalizeCategoriesList(newCategories);
    const normalizedShortcuts = normalizeShortcutsList(newShortcuts, normalizedCategories);

    cancelPendingUsagePersist();
    setShortcuts(normalizedShortcuts);
    setCategories(normalizedCategories);

    if (isElectron) {
      await window.electronAPI!.saveConfig({
        ...configRef.current,
        shortcutsList: normalizedShortcuts,
        categoriesList: normalizedCategories,
        folderSchemaVersion: FOLDER_SCHEMA_VERSION,
      });
    }
  };

  // Drag and Drop Handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleShortcutDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData('text/plain', `shortcut:${item.id}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragStart = (e: React.DragEvent, cat: any) => {
    if (cat.id === 'all') {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('text/plain', `category:${cat.id}`);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingCategoryId(cat.id);
  };

  const handleCategoryDragOver = (e: React.DragEvent, cat: any) => {
    if (cat.id === 'all') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategoryId !== cat.id) {
      setDragOverCategoryId(cat.id);
    }
  };

  const handleCategoryDragEnd = () => {
    setDragOverCategoryId(null);
    setDraggingCategoryId(null);
  };

  const handleCategoryDragLeave = (cat: any) => {
    if (dragOverCategoryId === cat.id) {
      setDragOverCategoryId(null);
    }
  };

  // Importa archivos del sistema (uno o varios) a una categoría concreta.
  // Reutilizado por el drop sobre el panel, sobre cualquier pestaña y sobre Favoritos.
  const importDroppedFiles = async (
    fileList: FileList,
    targetCategory: string,
    options?: { markFavorite?: boolean }
  ) => {
    if (!isElectron || !fileList || fileList.length === 0) return;

    // Extraer TODAS las rutas de forma síncrona antes de cualquier 'await' para
    // evitar que Chromium limpie/invalide el objeto dataTransfer por seguridad.
    const filePaths: string[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const filePath = window.electronAPI!.getPathForFile(fileList[i]);
      if (filePath) {
        filePaths.push(filePath);
      }
    }
    if (filePaths.length === 0) return;

    const newShortcuts = [...shortcuts];
    // Clave de identidad: ruta destino + argumentos. Así dos accesos al mismo
    // ejecutable con parámetros distintos (p. ej. mods de Factorio) son distintos.
    const dupKey = (p, a) => JSON.stringify([(p || '').toLowerCase(), (a || '').toLowerCase()]);
    let added = 0;
    let updated = 0;
    let duplicates = 0;
    let resolveFailures = 0;

    for (let i = 0; i < filePaths.length; i++) {
      const resolved = await window.electronAPI!.resolveFilePath(filePaths[i]);
      if (!resolved) { resolveFailures++; continue; }

      let finalPath = resolved.path;
      let finalIconPath = resolved.iconPath || '';
      let finalName = resolved.name;
      const finalArgs = resolved.arguments || '';
      const finalCwd = resolved.cwd || '';

      if (targetCategory === 'vault') {
        const importRes = await window.electronAPI!.importFileToVault(resolved.path);
        if (importRes.success) {
          finalPath = importRes.path;
          finalIconPath = importRes.iconPath;
          finalName = importRes.name;
        }
      }

      const key = dupKey(finalPath, finalArgs);
      const existingIndex = newShortcuts.findIndex(
        s => dupKey(s.path, s.arguments || '') === key
      );

      if (existingIndex !== -1) {
        // Ya existe: solo actuar si algo cambia de verdad (reubicar de categoría
        // o marcar favorito por primera vez). Un duplicado exacto es un no-op.
        const existing = newShortcuts[existingIndex];
        const willChangeCategory = existing.category !== targetCategory;
        const willMarkFavorite = !!options?.markFavorite && !existing.isFavorite;
        if (willChangeCategory || willMarkFavorite) {
          newShortcuts[existingIndex] = {
            ...existing,
            category: targetCategory,
            ...(options?.markFavorite ? { isFavorite: true } : {}),
          };
          updated++;
        } else {
          duplicates++;
        }
        continue;
      }

      newShortcuts.push({
        id: Date.now() + i,
        name: finalName,
        path: finalPath,
        category: targetCategory,
        iconPath: finalIconPath,
        isAdmin: false,
        delay: 0,
        arguments: finalArgs,
        cwd: finalCwd,
        usageCount: 0,
        addedTimestamp: Date.now(),
        ...(options?.markFavorite ? { isFavorite: true } : {}),
      });
      added++;
    }

    if (added > 0 || updated > 0) {
      await saveDataToConfig(newShortcuts, categories);
      playCyberBeep();
    }

    // Feedback de la acción del sistema vía toast.
    if (added > 0) {
      const addedMsg = added === 1
        ? translate('toast_added_one')
        : translate('toast_added_many', { count: String(added) });
      const extra = updated > 0 ? ` · ${translate('toast_updated_many', { count: String(updated) })}` : '';
      pushToast('success', addedMsg + extra);
    } else if (updated > 0) {
      pushToast('success', updated === 1
        ? translate('toast_updated_one')
        : translate('toast_updated_many', { count: String(updated) }));
    } else if (duplicates > 0) {
      pushToast('info', translate('toast_none_added'));
    } else if (resolveFailures > 0) {
      pushToast('error', translate('toast_resolve_error'));
    }
  };

  const handleFavoriteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategoryId !== 'favorites') {
      setDragOverCategoryId('favorites');
    }
  };

  const handleFavoriteDragLeave = () => {
    if (dragOverCategoryId === 'favorites') {
      setDragOverCategoryId(null);
    }
  };

  const handleFavoriteDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategoryId(null);

    // Archivos del sistema soltados sobre Favoritos: importar a la categoría
    // visible (Favoritos no es una categoría real, sino el flag isFavorite).
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const targetCategory =
        activeCategory === 'all' || activeCategory === 'favorites' ? 'utils' : activeCategory;
      await importDroppedFiles(e.dataTransfer.files, targetCategory, { markFavorite: true });
      return;
    }

    const data = e.dataTransfer.getData('text/plain');
    if (data && data.startsWith('shortcut:')) {
      const shortcutId = parseInt(data.replace('shortcut:', ''), 10);
      if (!isNaN(shortcutId)) {
        const updatedShortcuts = shortcuts.map(s => {
          if (s.id === shortcutId) {
            return { ...s, isFavorite: true };
          }
          return s;
        });
        await saveDataToConfig(updatedShortcuts, categories);
        playCyberBeep();
      }
    }
  };

  const handleCategoryDrop = async (e: React.DragEvent, cat: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategoryId(null);
    setDraggingCategoryId(null);

    // Archivos del sistema soltados directamente sobre una pestaña/categoría:
    // importarlos (uno o varios) asignándolos a esa categoría concreta.
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await importDroppedFiles(e.dataTransfer.files, cat.id === 'all' ? 'utils' : cat.id);
      return;
    }

    const data = e.dataTransfer.getData('text/plain');
    if (data && data.startsWith('category:')) {
      const movingCategoryId = data.replace('category:', '');
      if (!movingCategoryId || movingCategoryId === 'all' || movingCategoryId === cat.id) return;

      const currentCategories = normalizeCategoriesList(categories);
      const movingCategory = currentCategories.find(folder => folder.id === movingCategoryId);
      if (!movingCategory) return;

      const descendants = getDescendantFolderIds(currentCategories, movingCategoryId);
      if (cat.id !== 'all' && descendants.includes(cat.id)) {
        showAlert(
          translate('folder_move_invalid_title'),
          translate('folder_move_invalid_desc')
        );
        return;
      }

      const parentId = cat.id === 'all' ? null : cat.id;
      const siblingOrders = currentCategories
        .filter(folder => folder.id !== movingCategoryId && folder.parentId === parentId)
        .map(folder => folder.order);
      const nextOrder = siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0;
      const movedCategories = currentCategories.map(folder =>
        folder.id === movingCategoryId ? { ...folder, parentId, order: nextOrder } : folder
      );

      await saveDataToConfig(shortcuts, movedCategories);
      if (activeCategory === movingCategoryId) setActiveCategory(movingCategoryId);
      playCyberBeep();
      return;
    }

    if (data && data.startsWith('shortcut:')) {
      const shortcutId = parseInt(data.replace('shortcut:', ''), 10);
      if (!isNaN(shortcutId)) {
        const targetShortcut = shortcuts.find(s => s.id === shortcutId);
        if (targetShortcut) {
          let finalPath = targetShortcut.path;
          let finalIconPath = targetShortcut.iconPath;
          let finalName = targetShortcut.name;

          if (cat.id === 'vault') {
            const importRes = await window.electronAPI!.importFileToVault(targetShortcut.path);
            if (importRes.success) {
              finalPath = importRes.path;
              finalIconPath = importRes.iconPath;
              finalName = importRes.name;
            }
          }

          const updatedShortcuts = shortcuts.map(s => {
            if (s.id === shortcutId) {
              return {
                ...s,
                category: cat.id === 'all' ? 'utils' : cat.id,
                path: finalPath,
                iconPath: finalIconPath,
                name: finalName,
              };
            }
            return s;
          });
          await saveDataToConfig(updatedShortcuts, categories);
          playCyberBeep();
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!isElectron) return;

    if (e.dataTransfer.files.length === 0) return;

    // Soltado sobre el cuerpo del panel: agregar a la categoría activa
    // (o 'utils' por defecto cuando estamos en "Todos"/"Favoritos").
    const targetCategory =
      activeCategory === 'all' || activeCategory === 'favorites' ? 'utils' : activeCategory;
    await importDroppedFiles(e.dataTransfer.files, targetCategory);
  };

  const handleDesktopSweep = () => {
    showConfirm(
      translate('vault_sweep_confirm_title'),
      translate('vault_sweep_confirm_desc'),
      async () => {
        if (isElectron) {
          const res = await window.electronAPI!.runDesktopSweep();
          if (res.success) {
            // Reload configuration to pick up new swept shortcuts
            const loadedConfig = await window.electronAPI!.loadConfig();
            if (loadedConfig) {
              setConfig(loadedConfig);
              if (loadedConfig.shortcutsList) {
                setShortcuts(loadedConfig.shortcutsList);
              }
            }
            if (res.count && res.count > 0) {
              showAlert(
                langCode === 'es' ? 'Barrer completado' : 'Sweep complete',
                translate('vault_sweep_success', { count: String(res.count) })
              );
            } else {
              showAlert(
                langCode === 'es' ? 'Escritorio Limpio' : 'Clean Desktop',
                translate('vault_sweep_empty')
              );
            }
          } else {
            showAlert(
              'Error',
              res.error || 'Failed to perform desktop sweep'
            );
          }
        }
      }
    );
  };

  const handleLockVault = () => {
    setVaultUnlockedSession(false);
    setLastVaultUnlockTime(0);
    setActiveCategory('all');
    playFolderSound();
  };

  // Lanzar Acceso Directo
  const handleLaunch = async (item: any) => {
    if (item.delay && item.delay > 0) {
      // Lanzamiento retardado con temporizador visual
      let delayLeft = item.delay;
      setActiveTasksCount(prev => prev + 1);
      
      const timer = setInterval(() => {
        delayLeft--;
        if (delayLeft <= 0) {
          clearInterval(timer);
          executeLaunch(item);
          setActiveTasksCount(prev => Math.max(0, prev - 1));
        }
      }, 1000);
    } else {
      executeLaunch(item);
    }
  };

  const executeLaunch = async (item: any) => {
    // Incrementar contador de uso
    const updated = shortcuts.map(s => {
      if (s.id === item.id) {
        return { ...s, usageCount: (s.usageCount || 0) + 1 };
      }
      return s;
    });
    setShortcuts(updated);
    shortcutsRef.current = updated;
    
    // Incrementar launches global
    const nextTotalLaunches = (config.totalLaunches || 0) + 1;
    const updatedConfig = { ...configRef.current, totalLaunches: nextTotalLaunches };
    setConfig(updatedConfig);
    configRef.current = updatedConfig;

    scheduleUsagePersist(updated, nextTotalLaunches);

    if (isElectron) {
      // Lanzamiento nativo (con argumentos y directorio de trabajo del acceso).
      const res = await window.electronAPI!.launchApp(item.path, item.isAdmin, item.arguments, item.cwd);
      if (res && res.success === false) {
        pushToast('error', translate('toast_launch_error', { name: item.name }));
      }

      // Auto-ocultar shelf al lanzar si no está anclada
      if (config.hideOnBlur) {
        await window.electronAPI!.windowHideToTray();
      }
    } else {
      alert(`Lanzando mock: ${item.name} (${item.path})`);
    }
    playCyberBeep();
  };

  // Lanzar Todos en la Categoría (Lanzamiento en Grupo)
  const handleLaunchAll = async () => {
    const list = getFilteredShortcuts();
    if (list.length === 0) return;

    const message = langCode === 'es'
      ? `¿Estás seguro de lanzar los ${list.length} accesos directos de esta categoría en lote?`
      : `Are you sure you want to batch launch all ${list.length} shortcuts in this category?`;

    showConfirm(
      langCode === 'es' ? 'Lanzamiento en Grupo' : 'Group Launch',
      message,
      async () => {
        for (const item of list) {
          handleLaunch(item);
          // Pequeño delay de 300ms entre lanzamientos para no saturar
          await new Promise(r => setTimeout(r, 300));
        }
      }
    );
  };

  // Configurar e Inyectar Accesos Directos
  const handleOpenAddModal = () => {
    setFormName('');
    setFormPath('');
    setFormArgs('');
    setFormDelay(0);
    setFormCategory(
      activeCategory === 'all' || activeCategory === 'favorites' || activeCategory === 'vault'
        ? 'utils'
        : activeCategory
    );
    setFormAdmin(false);
    setFormHotkey('');
    setFormIconPath('');
    setShortcutModal({ open: true });
  };

  const handleOpenEditModal = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormName(item.name);
    setFormPath(item.path);
    setFormArgs(item.arguments || '');
    setFormDelay(item.delay || 0);
    setFormCategory(item.category);
    setFormAdmin(!!item.isAdmin);
    setFormHotkey(item.hotkey || '');
    setFormIconPath(item.iconPath || '');
    setShortcutModal({ open: true, item });
  };

  const handleBrowseFile = async () => {
    if (!isElectron) return;
    const resolved = await window.electronAPI!.selectFile();
    if (resolved) {
      setFormName(resolved.name);
      setFormPath(resolved.path);
      if (resolved.iconPath) setFormIconPath(resolved.iconPath);
    }
  };

  const handleSaveShortcut = async () => {
    if (!formName.trim() || !formPath.trim()) return;

    let finalPath = formPath;
    let finalIconPath = formIconPath;
    let finalName = formName;

    if (formCategory === 'vault') {
      const importRes = await window.electronAPI!.importFileToVault(formPath);
      if (importRes.success) {
        finalPath = importRes.path;
        finalIconPath = importRes.iconPath;
        finalName = importRes.name;
      }
    }

    let newShortcuts = [...shortcuts];

    if (shortcutModal.item) {
      // Editar
      newShortcuts = newShortcuts.map(s => {
        if (s.id === shortcutModal.item.id) {
          return {
            ...s,
            name: finalName,
            path: finalPath,
            category: formCategory,
            arguments: formArgs,
            delay: formDelay,
            isAdmin: formAdmin,
            hotkey: formHotkey,
            iconPath: finalIconPath
          };
        }
        return s;
      });
    } else {
      // Agregar
      newShortcuts.push({
        id: Date.now(),
        name: finalName,
        path: finalPath,
        category: formCategory,
        arguments: formArgs,
        delay: formDelay,
        isAdmin: formAdmin,
        hotkey: formHotkey,
        iconPath: finalIconPath,
        usageCount: 0,
        addedTimestamp: Date.now()
      });
    }

    await saveDataToConfig(newShortcuts, categories);
    setShortcutModal({ open: false });
    playCyberBeep();
  };

  const handleDeleteShortcut = async (id: number) => {
    const updated = shortcuts.filter(s => s.id !== id);
    await saveDataToConfig(updated, categories);
    setShortcutModal({ open: false });
    playCyberBeep();
  };

  // ── Selección múltiple / borrado en masa ──
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setLassoRect(null);
    lassoStart.current = null;
    lastSelectedIndex.current = null;
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      exitSelectionMode();
    } else {
      setSelectionMode(true);
    }
    playCyberBeep();
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(getFilteredShortcuts().map((s: any) => s.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    lastSelectedIndex.current = null;
  };

  const handleInvertSelection = () => {
    setSelectedIds(prev => {
      const next = new Set<number>();
      for (const s of getFilteredShortcuts()) {
        if (!prev.has(s.id)) next.add(s.id);
      }
      return next;
    });
  };

  // Clic sobre un ítem en modo selección: toggle / rango (Shift) / aditivo (Ctrl/Cmd)
  const handleItemSelect = (item: any, index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const list = getFilteredShortcuts();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedIndex.current !== null) {
        const a = Math.min(lastSelectedIndex.current, index);
        const b = Math.max(lastSelectedIndex.current, index);
        for (let i = a; i <= b; i++) { if (list[i]) next.add(list[i].id); }
      } else if (e.ctrlKey || e.metaKey) {
        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      } else {
        if (next.has(item.id) && next.size === 1) {
          next.delete(item.id);
        } else {
          next.clear();
          next.add(item.id);
        }
      }
      return next;
    });
    lastSelectedIndex.current = index;
  };

  const handleDeleteSelected = () => {
    const ids = new Set(selectedIds);
    const count = ids.size;
    if (count === 0) return;
    showConfirm(
      translate('delete_selected_confirm_title'),
      translate('delete_selected_confirm_desc', { count: String(count) }),
      async () => {
        const removed = shortcuts.filter(s => ids.has(s.id));
        const remaining = shortcuts.filter(s => !ids.has(s.id));
        await saveDataToConfig(remaining, categories);
        exitSelectionMode();
        playCyberBeep();
        const msg = count === 1
          ? translate('toast_deleted_one')
          : translate('toast_deleted_many', { count: String(count) });
        pushToast('success', msg, {
          actionLabel: translate('toast_undo'),
          onAction: async () => {
            // Restaurar usando el estado MÁS reciente (ref), no el del closure.
            const current = shortcutsRef.current || [];
            const presentIds = new Set(current.map((s: any) => s.id));
            const toRestore = removed.filter(s => !presentIds.has(s.id));
            if (toRestore.length > 0) {
              await saveDataToConfig([...current, ...toRestore], categories);
            }
          },
        });
      },
      true
    );
  };

  // ── Lasso (selección por arrastre) ──
  const handleLassoMouseDown = (e: React.MouseEvent) => {
    if (!selectionMode || e.button !== 0) return;
    // Solo iniciar si el arrastre empieza en el fondo del contenedor, no sobre un ítem.
    if ((e.target as HTMLElement).closest('[data-shortcut-id]')) return;
    const container = gridScrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    lassoStart.current = {
      x: e.clientX - rect.left + container.scrollLeft,
      y: e.clientY - rect.top + container.scrollTop,
    };
    lassoAdditive.current = e.shiftKey || e.ctrlKey || e.metaKey;
    setLassoRect({ x: lassoStart.current.x, y: lassoStart.current.y, w: 0, h: 0 });
  };

  const handleLassoMouseMove = (e: React.MouseEvent) => {
    if (!lassoStart.current) return;
    const container = gridScrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const curX = e.clientX - rect.left + container.scrollLeft;
    const curY = e.clientY - rect.top + container.scrollTop;
    const x = Math.min(lassoStart.current.x, curX);
    const y = Math.min(lassoStart.current.y, curY);
    const w = Math.abs(curX - lassoStart.current.x);
    const h = Math.abs(curY - lassoStart.current.y);
    setLassoRect({ x, y, w, h });

    // Hit-test contra los ítems visibles.
    const hits = new Set<number>();
    const nodes = container.querySelectorAll('[data-shortcut-id]');
    nodes.forEach(node => {
      const nr = (node as HTMLElement).getBoundingClientRect();
      const nx = nr.left - rect.left + container.scrollLeft;
      const ny = nr.top - rect.top + container.scrollTop;
      const intersects = nx < x + w && nx + nr.width > x && ny < y + h && ny + nr.height > y;
      if (intersects) {
        const id = Number((node as HTMLElement).dataset.shortcutId);
        if (!isNaN(id)) hits.add(id);
      }
    });
    setSelectedIds(prev => {
      if (lassoAdditive.current) {
        const next = new Set(prev);
        hits.forEach(id => next.add(id));
        return next;
      }
      return hits;
    });
  };

  const handleLassoMouseUp = () => {
    if (!lassoStart.current) return;
    lassoStart.current = null;
    setLassoRect(null);
  };

  // Gestor de Categorías
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const parentId = newCatParentId && newCatParentId !== 'all' ? newCatParentId : null;
    const folderName = newCatName.trim().toUpperCase();
    const siblingExists = categories.some(
      folder => folder.parentId === parentId && folder.name.trim().toLowerCase() === folderName.toLowerCase()
    );
    if (siblingExists) {
      showAlert(
        langCode === 'es' ? 'Carpeta Existente' : 'Folder Exists',
        langCode === 'es' ? 'Ya existe una carpeta con ese nombre en esta ubicación.' : 'A folder with that name already exists here.'
      );
      return;
    }

    const siblingOrders = categories
      .filter(folder => folder.id !== 'all' && folder.parentId === parentId)
      .map(folder => folder.order);
    const nextOrder = siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0;
    const newId = createFolderId();
    const updated = [
      ...categories,
      { id: newId, name: folderName, color: newCatColor, parentId, order: nextOrder },
    ];
    await saveDataToConfig(shortcuts, updated);
    setNewCatName('');
    setNewCatModal(false);
    setNewCatParentId(null);
    setActiveCategory(newId);
    playCyberBeep();
  };

  const handleDeleteCategory = async (id: string) => {
    if (id === 'all' || id === 'utils') return; // Protegidos
    const targetFolder = categories.find(folder => folder.id === id);
    if (!targetFolder) return;

    const removedIds = new Set([id, ...getDescendantFolderIds(categories, id)]);
    const destination = targetFolder.parentId || 'utils';
    showConfirm(
      translate('folder_delete_confirm_title'),
      translate('folder_delete_confirm_desc'),
      async () => {
        const updatedCats = categories.filter(folder => !removedIds.has(folder.id));
        const updatedShortcuts = shortcuts.map(shortcut =>
          removedIds.has(shortcut.category) ? { ...shortcut, category: destination } : shortcut
        );

        await saveDataToConfig(updatedShortcuts, updatedCats);
        if (removedIds.has(activeCategory)) setActiveCategory(destination);
        playCyberBeep();
      },
      true
    );
  };

  // Rueda del ratón en pestañas
  const handleCategoryWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (categoryTabsRef.current) {
      categoryTabsRef.current.scrollLeft += e.deltaY;
    }
  };

  // Menú contextual de categorías
  const handleCategoryContextMenu = (e: React.MouseEvent, cat: any) => {
    e.preventDefault();
    setCategoryMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      category: cat
    });
  };

  const handleCreateFolder = (parentId: string | null) => {
    setNewCatName('');
    setNewCatColor('#3b82f6');
    setNewCatParentId(parentId);
    setNewCatModal(true);
    playCyberBeep();
  };

  // Renombrar categoría
  const handleRenameCategory = async () => {
    if (!renameCatName.trim() || !renameCatModal.category) return;
    const catId = renameCatModal.category.id;
    const newName = renameCatName.trim().toUpperCase();

    if (categories.some(
      folder => folder.id !== catId
        && folder.parentId === renameCatModal.category.parentId
        && folder.name.trim().toLowerCase() === newName.toLowerCase()
    )) {
      showAlert(
        langCode === 'es' ? 'Carpeta Existente' : 'Folder Exists',
        langCode === 'es' ? 'Ya existe una carpeta con ese nombre aquí.' : 'A folder with that name already exists here.'
      );
      return;
    }

    const updatedCats = categories.map(c => {
      if (c.id === catId) {
        return { ...c, name: newName };
      }
      return c;
    });

    await saveDataToConfig(shortcuts, updatedCats);
    setRenameCatModal({ open: false });
    playCyberBeep();
  };

  // Menú contextual para accesos directos
  const handleShortcutContextMenu = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    setShortcutMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // En modo selección, los clics/lassos en zona vacía son para seleccionar,
    // no deben ocultar el panel.
    if (selectionMode) return;
    if (!config.hideOnDeadZoneClick) return;

    const target = e.target as HTMLElement;

    // Check if the click is on/within any interactive control
    if (target.closest('button, input, select, textarea, [role="button"], a, input[type="range"], .cyber-panel-glow')) {
      return;
    }

    // Check if the click is inside any overlay, modal, context menu or settings panel
    if (target.closest('.fixed, .absolute, [class*="context-menu"], [class*="modal"], [class*="Settings"]')) {
      return;
    }

    // Check if any overlays/menus/settings are currently open
    if (showSettings || shortcutModal.open || newCatModal || renameCatModal.open || categoryMenu?.visible) {
      return;
    }

    // Detect if scrollbar was clicked (prevent hiding when scrolling)
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (target.scrollHeight > target.clientHeight) {
      const scrollbarWidth = target.offsetWidth - target.clientWidth;
      if (scrollbarWidth > 0 && clickX >= target.clientWidth) {
        return; // Click on vertical scrollbar
      }
    }

    if (target.scrollWidth > target.clientWidth) {
      const scrollbarHeight = target.offsetHeight - target.clientHeight;
      if (scrollbarHeight > 0 && clickY >= target.clientHeight) {
        return; // Click on horizontal scrollbar
      }
    }

    // If pinned, flash the pin instead of hiding
    if (isPinned) {
      playPinBlockSound();
      setIsPinFlashing(true);
      setTimeout(() => setIsPinFlashing(false), 1200);
      return;
    }

    // Close the shelf window
    if (isElectron) {
      window.electronAPI!.windowHideToTray();
    }
  };

  // Modificar e interactuar con Config General
  // Siempre leer configRef.current para evitar perder propiedades por closures desactualizados
  const handleUpdateConfigSetting = async (keyOrUpdates: string | Record<string, any>, value?: any) => {
    const current = configRef.current;
    let updated: any;
    if (typeof keyOrUpdates === 'string') {
      updated = { ...current, [keyOrUpdates]: value };
    } else {
      updated = { ...current, ...keyOrUpdates };
    }
    setConfig(updated);

    if (isElectron) {
      await window.electronAPI!.saveConfig(updated);
    }

    // Trigger saved indicator
    setSettingsSaved(true);
    if (settingsSavedTimerRef.current) clearTimeout(settingsSavedTimerRef.current);
    settingsSavedTimerRef.current = setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleAutoUpdateChange = (enabled: boolean) => {
    handleUpdateConfigSetting('autoUpdate', enabled);
    if (isElectron) {
      window.electronAPI?.setAutoUpdate?.(enabled);
    }
  };

  const handleBrowseBgImage = async () => {
    if (!isElectron) return;
    const path = await window.electronAPI!.selectImage();
    if (path) {
      setTempBgPath(path);
      handleUpdateConfigSetting({
        bgCustomPath: path,
        bgImage: 'custom',
        bgType: 'image'
      });
      playCyberBeep();
    }
  };

  const handleApplyCustomBg = () => {
    handleUpdateConfigSetting({
      bgCustomPath: tempBgPath,
      bgImage: 'custom',
      bgType: 'image'
    });
    playCyberBeep();
  };

  const handleTogglePin = async () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    handleUpdateConfigSetting('alwaysOnTop', nextPin);
    if (isElectron) {
      await window.electronAPI!.setAlwaysOnTop(nextPin);
    }
    playCyberBeep();
  };

  const handleChangeLanguage = (lang: 'en' | 'es') => {
    setLangCode(lang);
    setLocale(lang);
    document.documentElement.lang = lang;
    handleUpdateConfigSetting('language', lang);
    playCyberBeep();
  };

  // Backup y Diagnóstico
  const handleExportBackup = async () => {
    if (!isElectron) return;
    const backupData = JSON.stringify({
      schemaVersion: FOLDER_SCHEMA_VERSION,
      shortcutsList: shortcuts,
      categoriesList: categories,
      config: { ...config, folderSchemaVersion: FOLDER_SCHEMA_VERSION },
    }, null, 2);
    const path = await window.electronAPI!.exportConfig(backupData);
    if (path) {
      showAlert(
        langCode === 'es' ? 'Respaldo Exportado' : 'Backup Exported',
        translate('notif_backup_exported')
      );
    }
  };

  const handleImportBackup = async () => {
    if (!isElectron) return;
    const raw = await window.electronAPI!.importConfig();
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const rawShortcuts = data.shortcutsList || data.shortcuts;
        const rawCategories = data.categoriesList || data.categories;
        if (Array.isArray(rawShortcuts) && Array.isArray(rawCategories)) {
          const importedCategories = normalizeCategoriesList(rawCategories);
          const importedShortcuts = normalizeShortcutsList(rawShortcuts, importedCategories);
          const importedConfig = {
            ...config,
            ...(data.config || {}),
            folderSchemaVersion: FOLDER_SCHEMA_VERSION,
          };

          setConfig(importedConfig);
          await saveDataToConfig(importedShortcuts, importedCategories);
          await window.electronAPI!.saveConfig({
            ...importedConfig,
            shortcutsList: importedShortcuts,
            categoriesList: importedCategories,
          });
          
          showAlert(
            langCode === 'es' ? 'Respaldo Importado' : 'Backup Imported',
            translate('notif_backup_imported'),
            () => {
              window.location.reload();
            }
          );
        } else {
          throw new Error('Invalid backup structure');
        }
      } catch {
        showAlert(
          langCode === 'es' ? 'Error de Importación' : 'Import Error',
          langCode === 'es' ? 'Error al procesar el archivo de respaldo.' : 'Error parsing backup file.'
        );
      }
    }
  };

  // Sonido Cyberpunk Beep
  const playCyberBeep = () => {
    try {
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, globalAudioCtx.currentTime);
      osc.frequency.setValueAtTime(1920, globalAudioCtx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.04, globalAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + 0.22);
      
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);
      
      osc.start();
      osc.stop(globalAudioCtx.currentTime + 0.22);
    } catch {}
  };

  // Sonido de cambio de pestaña (Folders)
  const playFolderSound = () => {
    if (folderAudioRef.current) {
      try {
        folderAudioRef.current.currentTime = 0;
        folderAudioRef.current.play().catch(() => {});
      } catch {}
    }
  };

  // Sonido sutil de bloqueo para PIN (low-pitch thud, no annoying)
  const playPinBlockSound = () => {
    try {
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, globalAudioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, globalAudioCtx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.12, globalAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);

      osc.start();
      osc.stop(globalAudioCtx.currentTime + 0.15);
    } catch {}
  };

  const filteredShortcutsList = useMemo(() => {
    const vaultLocked = (() => {
      if (config.vaultPinEnabled !== true) return false;
      if (config.vaultLockTimeout === -1) return !vaultUnlockedSession;
      if (config.vaultLockTimeout === 0) return lastVaultUnlockTime === 0;
      const elapsedMs = Date.now() - lastVaultUnlockTime;
      const timeoutMs = (config.vaultLockTimeout || 5) * 60 * 1000;
      return elapsedMs > timeoutMs;
    })();

    let list = shortcuts.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.path.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (activeCategory === 'favorites') return s.isFavorite === true;
      if (activeCategory === 'all') {
        if (s.category === 'vault') return !vaultLocked;
        return true;
      }
      return s.category === activeCategory;
    });

    if (iconSortOrder === 'alpha') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (iconSortOrder === 'recent') {
      list = [...list].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    } else if (iconSortOrder === 'added') {
      list = [...list].sort((a, b) => (b.addedTimestamp || 0) - (a.addedTimestamp || 0));
    }
    return list;
  }, [shortcuts, searchQuery, activeCategory, iconSortOrder, config.vaultPinEnabled, config.vaultLockTimeout, vaultUnlockedSession, lastVaultUnlockTime]);

  const getFilteredShortcuts = () => filteredShortcutsList;

  // Variables defensivas contra configuraciones anteriores (fallback defaults)
  const bgType = config.bgType || 'solid';
  const bgSolidColor = config.bgSolidColor || '#070b13';
  const bgGradient = config.bgGradient || 'preset-1';
  const bgImage = config.bgImage || 'preset-1';
  const bgCustomPath = config.bgCustomPath || '';
  const opacityVal = config.opacity !== undefined ? config.opacity : 85;
  const blurLevel = config.blurLevel !== undefined ? config.blurLevel : 20;
  const activeFolderPath = getFolderPath(categories, activeCategory);
  const visibleChildFolders = activeCategory === 'all'
    ? getChildFolders(categories, null)
    : getChildFolders(categories, activeCategory);

  if (!isShelfVisible) {
    return <div className={`theme-${config.theme} w-full h-screen bg-transparent`} />;
  }

  return (
    <div 
      className={`theme-${config.theme} ${isShelfVisible && bgType !== 'image' ? 'cyber-scanlines' : ''} w-full h-screen bg-[#070b13] border-[var(--neon-glow-border)] flex flex-col justify-between overflow-hidden shadow-2xl relative select-none ${
        config.dockPosition === 'bottom' ? 'rounded-t-2xl' : 'rounded-b-2xl'
      }`}
      style={{
        borderTopWidth: config.dockPosition === 'bottom' ? '1.5px' : '0px',
        borderBottomWidth: config.dockPosition === 'top' ? '1.5px' : '0px',
        borderLeftWidth: '1.5px',
        borderRightWidth: '1.5px',
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleBackgroundClick}
    >
      <ToastStack toasts={toasts} dockPosition={config.dockPosition} dismissToast={dismissToast} />

      {/* ── CAPA DE FONDO PERSONALIZADO (Solid / Gradient / Image) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {bgType === 'solid' && (
          <div 
            className="w-full h-full transition-colors duration-300" 
            style={{ backgroundColor: bgSolidColor }}
          />
        )}
        {bgType === 'gradient' && (
          <div className={`w-full h-full transition-all duration-300 ${
            bgGradient === 'preset-2' ? 'bg-gradient-to-br from-[#12072b] via-[#070b13] to-[#24083b]' :
            bgGradient === 'preset-3' ? 'bg-gradient-to-br from-[#1c0d02] via-[#070b13] to-[#3a1a03]' :
            bgGradient === 'preset-4' ? 'bg-gradient-to-br from-[#1c0202] via-[#070b13] to-[#3d0303]' :
            'bg-gradient-to-br from-[#061826] via-[#070b13] to-[#042f40]'
          }`} />
        )}
        {bgType === 'image' && (
          <div 
            className="w-full h-full relative transition-all duration-300"
            style={{
              filter: `blur(${blurLevel}px)`,
            }}
          >
            <img 
              src={
                bgImage === 'custom'
                  ? (bgCustomPath.startsWith('http') || bgCustomPath.startsWith('data:')
                    ? bgCustomPath
                    : `local-resource:///${bgCustomPath.replace(/\\/g, '/')}`)
                  : `/backgrounds/cyber_bg_${bgImage.replace('preset-', '')}.png`
              } 
              alt="Cyber Background" 
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{
                opacity: opacityVal / 100
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/backgrounds/cyber_bg_1.png';
              }}
            />
          </div>
        )}
      </div>

      {/* ── BARRA SUPERIOR DE DOS NIVELES ── */}
      <header className="border-b border-[var(--neon-glow-border)] flex flex-col bg-slate-950/75 backdrop-blur-md z-10">
        {/* Nivel 1: Brand | Category Tabs | Window Controls */}
        <div className="h-16 flex items-center px-8">

          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0 w-36">
            <CyberTrayLogo className="w-7 h-7" animated={activeTasksCount > 0} />
            <span className="font-cyber font-extrabold text-[13px] text-white tracking-widest bg-gradient-to-r from-white to-[var(--neon-glow-color)] bg-clip-text text-transparent hidden sm:inline">
              CyberTray
            </span>
          </div>

          {/* Category Tabs Scroll Container (Centered Navigation) */}
          <div className="hidden">
            <div
              ref={categoryTabsRef}
              onWheel={handleCategoryWheel}
              className="flex items-center gap-2 overflow-x-auto overflow-y-visible custom-scrollbar flex-1 px-3 py-2 h-full"
            >
              {/* Favorites Tab — fixed at start */}
              <button
                onClick={() => handleTabClick('favorites')}
                onDragOver={handleFavoriteDragOver}
                onDragLeave={handleFavoriteDragLeave}
                onDrop={handleFavoriteDrop}
                onMouseEnter={(e) => showTooltip(e, langCode === 'es' ? 'FAVORITOS' : 'FAVORITES', translate('tooltip_fav'), 'rgba(245,158,11,0.5)')}
                onMouseLeave={hideTooltip}
                className={`px-4 h-9.5 text-[11px] font-cyber font-bold tracking-widest rounded-lg border transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${
                  dragOverCategoryId === 'favorites'
                    ? 'scale-105 bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : activeCategory === 'favorites'
                      ? 'bg-slate-900 border-amber-500/50 text-amber-400 scale-105 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-transparent border-slate-800 text-slate-500 hover:text-amber-400 hover:border-amber-500/40'
                }`}
                aria-label={langCode === 'es' ? 'Favoritos' : 'Favorites'}
              >
                <Star className="w-3.5 h-3.5" fill={(activeCategory === 'favorites' || dragOverCategoryId === 'favorites') ? 'currentColor' : 'none'} />
                <span>{langCode === 'es' ? 'FAV' : 'FAV'}</span>
                <span className={`px-1 py-0.2 text-[9px] rounded border font-digits tabular-nums transition-colors ${
                  activeCategory === 'favorites'
                    ? 'bg-slate-950/80 border-amber-500/40 text-amber-400'
                    : 'bg-slate-950/40 border-slate-900 text-slate-500'
                }`}>
                  {shortcuts.filter(s => s.isFavorite).length}
                </span>
              </button>

            {/* Vault Tab — fixed at start */}
            <button
              onClick={() => handleTabClick('vault')}
              onMouseEnter={(e) => showTooltip(e, translate('tab_vault'), translate('tooltip_vault'), 'rgba(168,85,247,0.5)')}
              onMouseLeave={hideTooltip}
              className={`px-4 h-9.5 text-[11px] font-cyber font-bold tracking-widest rounded-lg border transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${
                activeCategory === 'vault'
                  ? 'bg-slate-900 border-purple-500/50 text-purple-400 scale-105 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                  : 'bg-transparent border-slate-800 text-slate-500 hover:text-purple-400 hover:border-purple-500/40'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{translate('tab_vault')}</span>
              <span className={`px-1 py-0.2 text-[9px] rounded border font-digits tabular-nums transition-colors ${
                activeCategory === 'vault'
                  ? 'bg-slate-950/80 border-purple-500/40 text-purple-400'
                  : 'bg-slate-950/40 border-slate-900 text-slate-500'
              }`}>
                {shortcuts.filter(s => s.category === 'vault').length}
              </span>
            </button>

            {/* ALL Tab — fixed at start */}
            <button
              onClick={() => handleTabClick('all')}
              onMouseEnter={(e) => showTooltip(e, translate('cat_all'), translate('tooltip_all'))}
              onMouseLeave={hideTooltip}
              className={`px-4 h-9.5 text-[11px] font-cyber font-bold tracking-widest rounded-lg border transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 ${
                activeCategory === 'all'
                  ? `bg-slate-900 text-white scale-105 ${isShelfVisible ? 'category-all-active-btn' : ''} border-[var(--neon-glow-border)] shadow-[0_0_8px_var(--neon-glow-color-raw)]`
                  : 'bg-transparent border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className={activeCategory === 'all' && isShelfVisible ? 'category-all-text-active' : ''}>
                {translate('cat_all')}
              </span>
              <span
                className={`px-1 py-0.2 text-[9px] rounded border font-digits tabular-nums transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                    : 'bg-slate-950/40 border-slate-900 text-slate-500'
                }`}
              >
                {shortcuts.length}
              </span>
            </button>

            {/* Elegant Divider between system tabs and custom categories */}
            <div className="h-5 w-[1.5px] bg-slate-800/80 mx-1 flex-shrink-0 rounded-full" />

            {categories.filter(cat => cat && cat.id && cat.id.trim() !== '' && cat.name && cat.name.trim() !== '' && cat.id !== 'all').map((cat) => {
              const isActive = activeCategory === cat.id;
              const isDragOver = dragOverCategoryId === cat.id;
              const isAll = cat.id === 'all';
              const count = isAll ? shortcuts.length : shortcuts.filter(s => s.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleTabClick(cat.id)}
                  onContextMenu={(e) => handleCategoryContextMenu(e, cat)}
                  draggable={cat.id !== 'all'}
                  onDragStart={(e) => handleCategoryDragStart(e, cat)}
                  onDragOver={(e) => handleCategoryDragOver(e, cat)}
                  onDragLeave={() => handleCategoryDragLeave(cat)}
                  onDragEnd={handleCategoryDragEnd}
                  onDrop={(e) => handleCategoryDrop(e, cat)}
                  className={`px-4 h-9.5 text-[11px] font-cyber font-bold tracking-widest rounded-lg border transition-all flex items-center gap-2 ${
                    isDragOver
                      ? 'scale-105 bg-[var(--neon-glow-color-raw)]/10 text-white'
                      : isActive
                        ? isAll
                          ? `bg-slate-900 text-white scale-105 ${isShelfVisible ? 'category-all-active-btn' : ''}`
                          : 'bg-slate-900 scale-105'
                        : 'bg-transparent border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  } ${
                    draggingCategoryId === cat.id ? 'opacity-60' : ''
                  } ${
                    cat.id !== 'all' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                  }`}
                  style={{
                    color: isDragOver
                      ? cat.color || 'var(--neon-glow-color)'
                      : isActive ? (isAll ? undefined : cat.color || 'var(--neon-glow-color)') : undefined,
                    borderColor: isDragOver
                      ? cat.color || 'var(--neon-glow-color)'
                      : isActive ? (isAll ? undefined : cat.color || 'var(--neon-glow-color)') : undefined,
                    boxShadow: isDragOver
                      ? `0 0 10px ${cat.color || 'var(--neon-glow-color)'}`
                      : isActive ? (isAll ? undefined : `0 0 5px ${cat.color || 'var(--neon-glow-color)'}`) : undefined
                  }}
                >
                  <span className={isAll && isActive && isShelfVisible ? 'category-all-text-active' : ''}>
                    {cat.id === 'all' ? translate('cat_all') : cat.name}
                  </span>
                  <span
                    className={`px-1 py-0.2 text-[9px] rounded border font-digits tabular-nums transition-colors ${
                      isActive
                        ? isAll
                          ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                          : 'bg-slate-950/80'
                        : 'bg-slate-950/40 border-slate-900 text-slate-500'
                    }`}
                    style={{
                      borderColor: isActive && !isAll ? cat.color || 'var(--neon-glow-border)' : undefined,
                      color: isActive && !isAll ? cat.color || 'var(--neon-glow-color)' : undefined
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => { setNewCatModal(true); playCyberBeep(); }}
              onMouseEnter={(e) => showTooltip(e, langCode === 'es' ? 'NUEVA CATEGORÍA' : 'NEW CATEGORY', translate('tooltip_add_category'))}
              onMouseLeave={hideTooltip}
              className="h-9.5 w-9.5 rounded-lg border border-dashed border-slate-700 hover:border-[var(--neon-glow-color)] text-slate-500 hover:text-[var(--neon-glow-color)] flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
              aria-label={translate('tooltip_add_category')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Fade Gradients */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10" />
        </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0 min-w-44 justify-end">
            {/* Pin Toggle */}
            <button
              onClick={handleTogglePin}
              className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                isPinFlashing
                  ? 'bg-red-500/30 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-bounce'
                  : isPinned
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                    : 'border-slate-800 text-slate-500 hover:text-white hover:bg-white/5'
              }`}
              title={isPinned ? translate('tooltip_pin_on') : translate('tooltip_pin_off')}
            >
              <Pin className={`w-3.5 h-3.5 transition-transform duration-300 ${
                isPinFlashing
                  ? 'scale-125 text-red-400'
                  : isPinned
                    ? 'fill-cyan-400'
                    : 'rotate-45'
              }`} />
            </button>

            {/* Update badge */}
            {config.autoUpdate !== false && (updateStatus.state === 'available' || updateStatus.state === 'downloaded' || updateStatus.state === 'downloading') && (
              <button
                type="button"
                onClick={() => { setShowAboutModal(true); playCyberBeep(); }}
                className="h-8 w-8 rounded-full border border-[var(--neon-glow-border)] bg-[#1D2636] text-[var(--neon-glow-color)] shadow-[0_0_12px_var(--neon-glow-color-raw)] hover:shadow-[0_0_16px_var(--neon-glow-color)] flex items-center justify-center transition-all cursor-pointer"
                title={
                  updateStatus.state === 'downloaded'
                    ? translate('about_status_downloaded', { version: updateStatus.version || '' })
                    : updateStatus.state === 'downloading'
                    ? translate('about_status_downloading', { percent: String(updateStatus.percent || 0) })
                    : translate('about_status_available', { version: (updateStatus as { version?: string }).version || '' })
                }
              >
                <ArrowDown className={`w-4 h-4 ${updateStatus.state === 'downloading' ? 'animate-bounce' : ''}`} />
              </button>
            )}

            {/* About Toggle */}
            <button
              onClick={() => { setShowAboutModal(true); playCyberBeep(); }}
              className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                showAboutModal
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-slate-800 text-slate-500 hover:text-white'
              }`}
              title={translate('tooltip_about')}
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* Config Toggle */}
            <button
              onClick={() => { setShowSettings(!showSettings); playCyberBeep(); }}
              className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                showSettings
                  ? 'border-purple-500 text-purple-400 bg-slate-900'
                  : 'border-slate-800 text-slate-500 hover:text-white'
              }`}
              title={translate('tooltip_settings')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Minimize / Hide */}
            <button
              onClick={() => isElectron && window.electronAPI!.windowHideToTray()}
              className="h-8 w-8 rounded-lg border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer"
              title={translate('tooltip_minimize')}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Nivel 2: Operations & Layout Toolbar */}
        <div className="h-12 flex items-center px-8 border-t border-slate-800/40 justify-between bg-slate-950/20">
          
          {/* Search Bar - Left aligned */}
          <div className="flex-shrink-0 w-64">
            <div className="relative w-full flex items-center overflow-hidden">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-500 z-10 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-slate-950/70 border border-[var(--neon-glow-border)] hover:border-[var(--neon-glow-color)] rounded-lg py-1.5 pl-8.5 pr-7 text-[11px] font-sans tracking-wide focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] focus:shadow-[0_0_8px_var(--neon-glow-color-raw)] transition-all z-[1]"
                style={{ color: searchFocused || searchQuery ? 'white' : 'transparent' }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    playCyberBeep();
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute right-2 text-slate-500 hover:text-white z-20 cursor-pointer"
                  title={translate('clear_search')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Marquee del Placeholder */}
              {!searchQuery && (
                <div className="absolute left-8.5 right-6 overflow-hidden pointer-events-none text-[11px] text-slate-500 font-sans flex items-center select-none z-0">
                  <div className="cyber-marquee-track">
                    <span>{translate('search_placeholder')}</span>
                    <span className="mx-4 text-slate-800 font-cyber">///</span>
                    <span>{translate('search_placeholder')}</span>
                    <span className="mx-4 text-slate-800 font-cyber">///</span>
                  </div>
                </div>
              )}

              {/* Marquee del texto buscado */}
              {!searchFocused && searchQuery && (
                <div className="absolute left-8.5 right-6 overflow-hidden pointer-events-none text-[11px] text-[var(--neon-glow-color)] font-mono flex items-center select-none z-10">
                  <div className={searchQuery.length > 8 ? "cyber-marquee-track" : ""}>
                    <span>{searchQuery}</span>
                    {searchQuery.length > 8 && (
                      <>
                        <span className="mx-4 text-slate-700 font-cyber">///</span>
                        <span>{searchQuery}</span>
                        <span className="mx-4 text-slate-700 font-cyber">///</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Operational Controls & Layout (Right-aligned panels) */}
          <div className="flex-1 flex items-center justify-end gap-3 ml-4">
            
            {/* Layout Configuration Card (Visual Group) */}
            <div className="flex items-center gap-2 bg-slate-900/30 border border-slate-800/80 px-2 py-0.5 rounded-lg">
              {/* Slider de tamaño de icono */}
              <div 
                className="h-7 flex items-center gap-2 bg-slate-950/40 border border-slate-800/60 rounded-md px-2 cursor-help"
                onMouseEnter={(e) => showTooltip(e, langCode === 'es' ? 'TAMAÑO DE ICONOS' : 'ICON SIZING', translate('tooltip_size_slider'))}
                onMouseLeave={hideTooltip}
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="range"
                  min="40"
                  max="90"
                  value={config.iconSize}
                  onChange={(e) => handleUpdateConfigSetting('iconSize', parseInt(e.target.value))}
                  className="w-16 accent-[var(--neon-glow-color)] h-1 rounded-lg cursor-pointer bg-slate-950"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-950/40 border border-slate-800/60 rounded-md p-0.5">
                <button 
                  onClick={() => { setViewMode('grid'); playCyberBeep(); }}
                  onMouseEnter={(e) => showTooltip(e, translate('view_mode_grid'), translate('tooltip_view_mode_grid'))}
                  onMouseLeave={hideTooltip}
                  className={`p-1 rounded transition-all cursor-pointer border ${viewMode === 'grid' ? 'bg-[var(--neon-glow-color-raw)]/10 text-[var(--neon-glow-color)] border-[var(--neon-glow-border)]/30 shadow-[0_0_8px_var(--neon-glow-color-raw)]' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => { setViewMode('list'); playCyberBeep(); }}
                  onMouseEnter={(e) => showTooltip(e, translate('view_mode_list'), translate('tooltip_view_mode_list'))}
                  onMouseLeave={hideTooltip}
                  className={`p-1 rounded transition-all cursor-pointer border ${viewMode === 'list' ? 'bg-[var(--neon-glow-color-raw)]/10 text-[var(--neon-glow-color)] border-[var(--neon-glow-border)]/30 shadow-[0_0_8px_var(--neon-glow-color-raw)]' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
                >
                  <ListIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Ordenamiento */}
              <div className="relative group">
                <button className="h-7 px-2 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-white rounded-md border border-slate-800/60 hover:border-slate-700/60 flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute right-0 top-8 w-44 hidden group-hover:block bg-slate-950 border border-[var(--neon-glow-border)] rounded-lg shadow-2xl p-1 z-50 text-left font-mono">
                  <button
                    onClick={() => { setIconSortOrder('alpha'); playCyberBeep(); }}
                    className={`w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white ${iconSortOrder === 'alpha' ? 'text-[var(--neon-glow-color)]' : 'text-slate-400'}`}
                  >
                    {translate('sort_alpha')}
                  </button>
                  <button
                    onClick={() => { setIconSortOrder('recent'); playCyberBeep(); }}
                    className={`w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white ${iconSortOrder === 'recent' ? 'text-[var(--neon-glow-color)]' : 'text-slate-400'}`}
                  >
                    {translate('sort_recent')}
                  </button>
                  <button
                    onClick={() => { setIconSortOrder('added'); playCyberBeep(); }}
                    className={`w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white ${iconSortOrder === 'added' ? 'text-[var(--neon-glow-color)]' : 'text-slate-400'}`}
                  >
                    {translate('sort_added')}
                  </button>
                </div>
              </div>
            </div>

            {/* Operations Panel (Visual Group) */}
            <div className="flex items-center gap-2">
              {/* Cluster de selección (visible solo en modo selección) */}
              {selectionMode && (
                <div className="flex items-center gap-1 mr-1 pr-2 border-r border-slate-700/50 animate-fade-in">
                  <span className="text-[10px] font-cyber font-bold tracking-wider text-[var(--neon-glow-color)] px-1 whitespace-nowrap">
                    {translate('selected_count', { count: String(selectedIds.size) })}
                  </span>
                  <button
                    onClick={handleSelectAll}
                    onMouseEnter={(e) => showTooltip(e, translate('select_all').toUpperCase(), '', 'rgba(56,189,248,0.5)')}
                    onMouseLeave={hideTooltip}
                    className="h-8 w-8 bg-slate-800/40 border border-slate-700/50 hover:border-[var(--neon-glow-border)] text-slate-300 hover:text-[var(--neon-glow-color)] rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleInvertSelection}
                    onMouseEnter={(e) => showTooltip(e, translate('invert_selection').toUpperCase(), '', 'rgba(56,189,248,0.5)')}
                    onMouseLeave={hideTooltip}
                    className="h-8 w-8 bg-slate-800/40 border border-slate-700/50 hover:border-[var(--neon-glow-border)] text-slate-300 hover:text-[var(--neon-glow-color)] rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  >
                    <FlipHorizontal2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearSelection}
                    onMouseEnter={(e) => showTooltip(e, translate('unselect_all').toUpperCase(), '', 'rgba(148,163,184,0.5)')}
                    onMouseLeave={hideTooltip}
                    className="h-8 w-8 bg-slate-800/40 border border-slate-700/50 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0}
                    onMouseEnter={(e) => showTooltip(e, translate('delete_selected').toUpperCase(), '', 'rgba(244,63,94,0.5)')}
                    onMouseLeave={hideTooltip}
                    className="h-8 px-3 bg-rose-500/15 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-rose-300 hover:text-rose-200 font-cyber font-bold tracking-widest text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {translate('delete_selected')} ({selectedIds.size})
                  </button>
                </div>
              )}

              {/* Toggle modo selección */}
              <button
                onClick={toggleSelectionMode}
                onMouseEnter={(e) => showTooltip(e, translate('selection_mode').toUpperCase(), selectionMode ? translate('selection_exit') : translate('selection_mode'), 'rgba(56,189,248,0.5)')}
                onMouseLeave={hideTooltip}
                className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                  selectionMode
                    ? 'bg-[var(--neon-glow-color-raw)]/15 border-[var(--neon-glow-border)] text-[var(--neon-glow-color)] shadow-[0_0_8px_var(--neon-glow-color-raw)]'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
              </button>

              {/* Launch All */}
              <button
                onClick={handleLaunchAll}
                onMouseEnter={(e) => showTooltip(e, langCode === 'es' ? 'EJECUTAR GRUPO' : 'GROUP LAUNCH', translate('tooltip_launch_all'), 'rgba(16,185,129,0.5)')}
                onMouseLeave={hideTooltip}
                disabled={filteredShortcutsList.length === 0}
                className="h-8 w-8 bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-400 hover:text-emerald-300 rounded-lg flex items-center justify-center transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" />
              </button>

              {/* Process Matrix */}
              <button
                onClick={() => { setShowProcessMatrixModal(true); playCyberBeep(); }}
                onMouseEnter={(e) => showTooltip(e, langCode === 'es' ? 'MATRIZ DE PROCESOS' : 'PROCESS MATRIX', translate('tooltip_process_matrix'), 'rgba(239,68,68,0.5)')}
                onMouseLeave={hideTooltip}
                className="h-8 w-8 bg-red-500/10 border border-red-500/30 hover:border-red-400 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                aria-label={translate('tab_process_matrix')}
              >
                <Activity className="w-4 h-4" />
              </button>

              {/* Sweep Desktop button (visible only in Vault tab) */}
              {isElectron && activeCategory === 'vault' && (
                <button
                  onClick={handleDesktopSweep}
                  onMouseEnter={(e) => showTooltip(e, langCode === 'es' ? 'BARRER ESCRITORIO' : 'SWEEP DESKTOP', translate('tooltip_sweep_desktop'), 'rgba(168,85,247,0.5)')}
                  onMouseLeave={hideTooltip}
                  className="h-8 px-3 bg-purple-500/15 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/25 text-purple-400 hover:text-purple-300 font-cyber font-bold tracking-widest text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {translate('vault_sweep_btn')}
                </button>
              )}

              {/* Lock Vault button (visible only in Vault tab when PIN is enabled) */}
              {activeCategory === 'vault' && config.vaultPinEnabled === true && (
                <button
                  onClick={handleLockVault}
                  onMouseEnter={(e) => showTooltip(e, translate('vault_lock_btn'), translate('tooltip_lock_vault'), 'rgba(239,68,68,0.5)')}
                  onMouseLeave={hideTooltip}
                  className="h-8 px-3 bg-red-500/15 border border-red-500/30 hover:border-red-400 hover:bg-red-500/25 text-red-400 hover:text-red-300 font-cyber font-bold tracking-widest text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {translate('vault_lock_btn')}
                </button>
              )}

              {/* Add Shortcut */}
              <button
                onClick={handleOpenAddModal}
                onMouseEnter={(e) => showTooltip(e, langCode === 'es' ? 'REGISTRAR ACCESO' : 'ADD SHORTCUT', translate('tooltip_add_shortcut'))}
                onMouseLeave={hideTooltip}
                className="h-8 px-3 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[10px] rounded-lg border border-[var(--neon-glow-border)] hover:shadow-[0_0_10px_var(--neon-glow-color)] transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                ADD
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <FolderTree
          folders={categories}
          activeFolderId={activeCategory}
          onSelect={handleTabClick}
          onContextMenu={handleCategoryContextMenu}
          onCreateFolder={handleCreateFolder}
          onDragStart={handleCategoryDragStart}
          onFolderDrop={handleCategoryDrop}
          onDragEnd={handleCategoryDragEnd}
          draggingFolderId={draggingCategoryId}
          dropFolderId={dragOverCategoryId}
          onDropFolderChange={setDragOverCategoryId}
        />

        <main className="min-w-0 flex-1 min-h-0 flex flex-col">
          <div className="h-10 shrink-0 flex items-center gap-1.5 px-5 border-b border-slate-900/80 bg-slate-950/25 overflow-x-auto">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wider shrink-0">
              {translate('explorer_folder_contents')}:
            </span>
            {(activeFolderPath.length > 0
              ? activeFolderPath
              : [{ id: activeCategory, name: activeCategory === 'favorites' ? translate('explorer_favorites') : translate('explorer_vault'), color: '', parentId: null, order: 0 }]
            ).map((folder, index, path) => (
              <React.Fragment key={folder.id}>
                {index > 0 && <span className="text-slate-700 text-[10px]">/</span>}
                <button
                  type="button"
                  onClick={() => handleTabClick(folder.id)}
                  className={`text-[10px] font-ui tracking-wide uppercase truncate max-w-44 cursor-pointer ${
                    index === path.length - 1 ? 'text-[var(--neon-glow-color)]' : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {folder.id === 'all' ? translate('explorer_all') : folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {visibleChildFolders.length > 0 && activeCategory !== 'favorites' && activeCategory !== 'vault' && (
            <div className="shrink-0 flex items-center gap-2 px-5 py-2 border-b border-slate-900/60 overflow-x-auto">
              {visibleChildFolders.map(folder => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => handleTabClick(folder.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-800 bg-slate-950/40 hover:border-[var(--neon-glow-border)] hover:bg-slate-900/80 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" style={{ color: folder.color }} />
                  <span className="font-ui text-[10px] tracking-wide truncate max-w-36">{folder.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0">
            <ShortcutGrid
              gridScrollRef={gridScrollRef}
              selectionMode={selectionMode}
              lassoRect={lassoRect}
              filteredShortcutsList={filteredShortcutsList}
              searchQuery={searchQuery}
              viewMode={viewMode}
              iconSortOrder={iconSortOrder}
              config={config}
              categories={categories}
              activeCategory={activeCategory}
              selectedIds={selectedIds}
              langCode={langCode}
              showVaultHelp={showVaultHelp}
              setShowVaultHelp={setShowVaultHelp}
              handleLassoMouseDown={handleLassoMouseDown}
              handleLassoMouseMove={handleLassoMouseMove}
              handleLassoMouseUp={handleLassoMouseUp}
              handleItemSelect={handleItemSelect}
              handleLaunch={handleLaunch}
              handleShortcutContextMenu={handleShortcutContextMenu}
              handleShortcutDragStart={handleShortcutDragStart}
              handleOpenEditModal={handleOpenEditModal}
              handleUpdateConfigSetting={handleUpdateConfigSetting}
              playFolderSound={playFolderSound}
              playCyberBeep={playCyberBeep}
            />
          </div>
        </main>
      </div>

      <TelemetryBar
        categoriesCount={categories.length - 1}
        shortcutsCount={shortcuts.length}
        totalLaunches={config.totalLaunches || 0}
        systemInfo={systemInfo}
        disks={disks}
        langCode={langCode}
        showTooltip={showTooltip}
        hideTooltip={hideTooltip}
      />

      <SettingsPanel
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        settingsSaved={settingsSaved}
        langCode={langCode}
        config={config}
        monitors={monitors}
        shortcuts={shortcuts}
        tempBgPath={tempBgPath}
        setTempBgPath={setTempBgPath}
        handleChangeLanguage={handleChangeLanguage}
        handleUpdateConfigSetting={handleUpdateConfigSetting}
        handleBrowseBgImage={handleBrowseBgImage}
        handleApplyCustomBg={handleApplyCustomBg}
        handleExportBackup={handleExportBackup}
        handleImportBackup={handleImportBackup}
        playFolderSound={playFolderSound}
        playCyberBeep={playCyberBeep}
        playPinBlockSound={playPinBlockSound}
        showAlert={showAlert}
        showConfirm={showConfirm}
        saveDataToConfig={saveDataToConfig}
        showChangePinForm={showChangePinForm}
        setShowChangePinForm={setShowChangePinForm}
        currentPinInput={currentPinInput}
        setCurrentPinInput={setCurrentPinInput}
        newPinInput={newPinInput}
        setNewPinInput={setNewPinInput}
        confirmPinInput={confirmPinInput}
        setConfirmPinInput={setConfirmPinInput}
        changePinError={changePinError}
        setChangePinError={setChangePinError}
        changePinSuccess={changePinSuccess}
        setChangePinSuccess={setChangePinSuccess}
        showDisablePinPrompt={showDisablePinPrompt}
        setShowDisablePinPrompt={setShowDisablePinPrompt}
        disablePinInput={disablePinInput}
        setDisablePinInput={setDisablePinInput}
        disablePinError={disablePinError}
        setDisablePinError={setDisablePinError}
        showEnablePinPrompt={showEnablePinPrompt}
        setShowEnablePinPrompt={setShowEnablePinPrompt}
        enablePinInput={enablePinInput}
        setEnablePinInput={setEnablePinInput}
        enableConfirmPinInput={enableConfirmPinInput}
        setEnableConfirmPinInput={setEnableConfirmPinInput}
        enablePinError={enablePinError}
        setEnablePinError={setEnablePinError}
      />

      <ProcessMatrixModal
        showProcessMatrixModal={showProcessMatrixModal}
        setShowProcessMatrixModal={setShowProcessMatrixModal}
        langCode={langCode}
        runningProcesses={runningProcesses}
        setRunningProcesses={setRunningProcesses}
        processSearchQuery={processSearchQuery}
        setProcessSearchQuery={setProcessSearchQuery}
        processSortOrder={processSortOrder}
        setProcessSortOrder={setProcessSortOrder}
        isScanningProcesses={isScanningProcesses}
        handleScanProcesses={handleScanProcesses}
        showConfirm={showConfirm}
        playCyberBeep={playCyberBeep}
        systemInfo={systemInfo}
      />

      <ShortcutFormModal
        shortcutModal={shortcutModal}
        setShortcutModal={setShortcutModal}
        categories={categories}
        formName={formName}
        setFormName={setFormName}
        formPath={formPath}
        setFormPath={setFormPath}
        formArgs={formArgs}
        setFormArgs={setFormArgs}
        formDelay={formDelay}
        setFormDelay={setFormDelay}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        formAdmin={formAdmin}
        setFormAdmin={setFormAdmin}
        handleSaveShortcut={handleSaveShortcut}
        handleBrowseFile={handleBrowseFile}
        handleDeleteShortcut={handleDeleteShortcut}
      />

      <PinPadModal
        showPinModal={showPinModal}
        setShowPinModal={setShowPinModal}
        pinInput={pinInput}
        setPinInput={setPinInput}
        pinError={pinError}
        setPinError={setPinError}
        handlePinSubmit={handlePinSubmit}
        playCyberBeep={playCyberBeep}
      />

      <ShelfOverlays
        langCode={langCode}
        shortcuts={shortcuts}
        categories={categories}
        playCyberBeep={playCyberBeep}
        showConfirm={showConfirm}
        saveDataToConfig={saveDataToConfig}
        newCatModal={newCatModal}
        setNewCatModal={setNewCatModal}
        newCatName={newCatName}
        setNewCatName={setNewCatName}
        newCatColor={newCatColor}
        setNewCatColor={setNewCatColor}
        handleAddCategory={handleAddCategory}
        categoryMenu={categoryMenu}
        setCategoryMenu={setCategoryMenu}
        renameCatModal={renameCatModal}
        setRenameCatModal={setRenameCatModal}
        renameCatName={renameCatName}
        setRenameCatName={setRenameCatName}
        handleRenameCategory={handleRenameCategory}
        handleDeleteCategory={handleDeleteCategory}
        handleDeleteShortcut={handleDeleteShortcut}
        getShortcutProcess={getShortcutProcess}
        shortcutMenu={shortcutMenu}
        setShortcutMenu={setShortcutMenu}
        handleLaunch={handleLaunch}
        executeLaunch={executeLaunch}
        handleOpenEditModal={handleOpenEditModal}
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
      />

      <AboutModal
        showAboutModal={showAboutModal}
        setShowAboutModal={setShowAboutModal}
        autoUpdate={config.autoUpdate !== false}
        onAutoUpdateChange={handleAutoUpdateChange}
        playCyberBeep={playCyberBeep}
        autoCheckSeq={aboutAutoCheckSeq}
      />

      {/* Root-Level Global Tooltip */}
      {globalTooltip.visible && (
        <div
          className="fixed bg-slate-950 text-slate-300 text-[10px] font-mono rounded-lg p-2 shadow-2xl z-[999999] pointer-events-none transition-opacity duration-150 flex flex-col gap-0.5 border"
          style={{
            borderColor: globalTooltip.borderColor,
            left: `${globalTooltip.x}px`,
            top: `${globalTooltip.y}px`,
            transform: globalTooltip.placement === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          }}
        >
          <div className="font-bold text-white uppercase tracking-wider">{globalTooltip.text}</div>
          {globalTooltip.subText && (
            <div className="text-slate-400 text-[9px] leading-relaxed max-w-[320px] whitespace-pre-line">
              {globalTooltip.subText}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
