import React, { useState, useEffect, useRef, useCallback } from 'react';
import { translate, TranslationKey, setLocale, getLocale } from './locales';
import { motion, AnimatePresence } from 'motion/react';
import ProcessMatrixView from './components/ProcessMatrixView';
import {
  Search, Grid, List as ListIcon, Plus, Clock, ArrowUpDown, Settings,
  Minus, X, LayoutGrid, Palette, Key, Trash2, Shield, Info,
  Cpu, HardDrive, Minimize2, Power, FolderOpen, Pin, Play, Edit,
  Monitor, ExternalLink, Sliders, ChevronDown, RefreshCw, Upload, Check, Trash,
  Activity, MemoryStick, Star, Lock
} from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      launchApp: (path: string, isAdmin?: boolean) => Promise<{ success: boolean; error?: string }>;
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
      resolveFilePath: (filePath: string) => Promise<{ name: string; path: string; ext: string; exists: boolean; iconPath: string } | null>;
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
      saveConfig: (config: any) => Promise<boolean>;
      loadConfig: () => Promise<any | null>;
      getConfigPath: () => Promise<string>;
      openDataFolder: () => Promise<void>;
      onReloadConfig: (callback: () => void) => () => void;
      showTextContextMenu: (x: number, y: number) => Promise<void>;
      showHandleContextMenu: () => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<{ success: boolean }>;
      registerAppShortcuts: (shortcuts: Array<{ id: number; path: string; shortcut: string; isAdmin: boolean }>) => Promise<{ success: boolean }>;
      runShellCommand: (command: string) => Promise<{ success: boolean; cmdId?: string; error?: string }>;
      onShellOutput: (callback: (data: { id: string; type: 'stdout' | 'stderr'; text: string }) => void) => () => void;
      onShellExit: (callback: (data: { id: string; exitCode: number }) => void) => () => void;
      onAlwaysOnTopBlurAttempt: (callback: () => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      toggleShelf: () => Promise<void>;
      setDragActive: (active: boolean) => Promise<void>;
      trackHandleDragStart: () => Promise<void>;
      trackHandleDragStop: () => Promise<void>;
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => Promise<void>;
      onShelfStateChange: (callback: (visible: boolean) => void) => () => void;
      onPlayLaunchSound: (callback: () => void) => () => void;
      runDesktopSweep: () => Promise<{ success: boolean; count?: number; error?: string }>;
      getDefaultVaultPath: () => Promise<string>;
      openVaultFolder: () => Promise<boolean>;
      importFileToVault: (filePath: string) => Promise<{ success: boolean; path: string; iconPath: string; name: string; error?: string }>;
    };
  }
}

const isElectron = !!window.electronAPI;

// Icono CyberTray Logo
const CyberTrayLogo = ({ className = "w-6 h-6", animated = false }: { className?: string, animated?: boolean }) => (
  <div className={`relative ${className} flex items-center justify-center p-0.5`} style={animated ? { animation: 'spin 12s linear infinite' } : undefined}>
    <svg viewBox="0 0 100 100" className="w-full h-full text-[var(--neon-glow-color)]" fill="none" stroke="currentColor" strokeWidth="8">
      <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" className="drop-shadow-[0_0_8px_var(--neon-glow-color)]" />
      <line x1="50" y1="10" x2="50" y2="90" strokeDasharray="4 4" />
      <polyline points="25,40 50,55 75,40" strokeWidth="6" />
      <polyline points="25,60 50,75 75,60" strokeWidth="6" />
    </svg>
  </div>
);

// Categorías Virtuales Iniciales Predeterminadas
const INITIAL_CATEGORIES = [
  { id: 'all', name: 'ALL MODULES', color: '#a1a1aa' },
  { id: 'ai', name: 'AI CORES', color: '#34d399' },
  { id: 'browsers', name: 'BROWSERS', color: '#f97316' },
  { id: 'comm', name: 'NET CHATS', color: '#6366f1' },
  { id: 'design', name: 'CYBER ART', color: '#ef4444' },
  { id: 'dev', name: 'GRID CODING', color: '#38bdf8' },
  { id: 'gaming', name: 'HOLOCUBIERTAS', color: '#ec4899' },
  { id: 'utils', name: 'DOCK TOOLS', color: '#60a5fa' },
];

const normalizeCategoriesList = (list: any[] = []) => {
  const validCategories = list.filter((c: any) => c && c.id && c.id.trim() !== '' && c.name && c.name.trim() !== '');

  if (validCategories.length === 0) {
    return [...INITIAL_CATEGORIES];
  }

  const allCategory = validCategories.find((c: any) => c.id === 'all');
  const restCategories = validCategories.filter((c: any) => c.id !== 'all');

  return [allCategory || { ...INITIAL_CATEGORIES[0] }, ...restCategories];
};

let globalAudioCtx: AudioContext | null = null;

export default function App() {
  const currentVer = "1.9.0";
  // Modo de Ventana (Mode Detection)
  const [mode, setMode] = useState<'shelf' | 'handle'>('shelf');
  
  // Configuración de la App
  const [config, setConfig] = useState<any>({
    dockPosition: 'top',
    monitorId: '',
    shortcut: 'Alt+T',
    hideOnBlur: true,
    handlePosition: 'center',
    handleVisible: true,
    hotspotCorners: [],
    hotspotDelay: 300,
    alwaysOnTop: true,
    iconSize: 60, // Tamaño de icono predeterminado
    showTaskbarIcon: false,
    autoLaunch: false,
    theme: 'cyan',
    blurLevel: 20,
    opacity: 85,
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
  const [handleHovered, setHandleHovered] = useState<boolean>(false);
  const [isHandleFadedOut, setIsHandleFadedOut] = useState<boolean>(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);
  const settingsSavedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showProcessMatrixModal, setShowProcessMatrixModal] = useState<boolean>(false);
  const [processSortOrder, setProcessSortOrder] = useState<'memory-desc' | 'memory-asc' | 'name-asc' | 'name-desc' | 'pid-asc' | 'pid-desc'>('memory-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('cybertray_view_mode') as 'grid' | 'list') || 'grid');

  // About & Updates States
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [updateCheckState, setUpdateCheckState] = useState<{
    status: 'idle' | 'scanning' | 'up-to-date' | 'update-available' | 'failed';
    latestVersion?: string;
  }>({ status: 'idle' });

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
  const [isDraggingHandle, setIsDraggingHandle] = useState<boolean>(false);
  const handleDragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleHasDraggedPastThreshold = useRef<boolean>(false);

  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [shortcutMenu, setShortcutMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: any;
  } | null>(null);

  // Refs
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<any>(config);
  const launchAudioRef = useRef<HTMLAudioElement | null>(null);
  const folderAudioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

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

  const checkForUpdates = async (manual = true) => {
    setUpdateCheckState({ status: 'scanning' });
    try {
      const response = await fetch('https://api.github.com/repos/CyberGems/CyberTray/releases/latest');
      if (!response.ok) {
        throw new Error('Server response not OK');
      }
      const data = await response.json();
      const latestTag = data.tag_name;
      if (!latestTag) {
        throw new Error('No tag found');
      }
      const currentVerCompare = 1.90;
      const cleanLatest = latestTag.replace(/^v/, '');
      const latestNum = parseFloat(cleanLatest);
      
      if (!isNaN(latestNum) && latestNum > currentVerCompare) {
        setUpdateCheckState({ status: 'update-available', latestVersion: latestTag });
      } else {
        setUpdateCheckState({ status: 'up-to-date', latestVersion: latestTag });
      }
    } catch (err) {
      console.error('Update check failed:', err);
      setUpdateCheckState({ status: 'failed' });
    }
  };

  // Carga Inicial
  useEffect(() => {
    // Detectar modo
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');
    if (m === 'handle') {
      setMode('handle');
    } else {
      setMode('shelf');
    }

    // Cargar Configuración Central y Atajos
    const fetchConfig = async () => {
      if (isElectron) {
        // Cargar config general de Electron
        const loadedConfig = await window.electronAPI!.loadConfig();
        if (loadedConfig) {
          setConfig(loadedConfig);
          setIsPinned(loadedConfig.alwaysOnTop !== undefined ? loadedConfig.alwaysOnTop : true);
          if (loadedConfig.language) {
            setLangCode(loadedConfig.language);
            setLocale(loadedConfig.language);
          }
          if (loadedConfig.autoCheckUpdates !== false) {
            checkForUpdates(false);
          }
        }

        // Cargar atajos desde su config independiente
        const dataPath = await window.electronAPI!.getConfigPath();
        try {
          const rawConfig = await window.electronAPI!.loadConfig();
          if (rawConfig) {
            if (rawConfig.categoriesList) {
              const sanitizedCats = normalizeCategoriesList(rawConfig.categoriesList);
              if (sanitizedCats.length > 0) {
                setCategories(sanitizedCats);
              } else {
                setCategories(INITIAL_CATEGORIES);
              }
            }
            if (rawConfig.shortcutsList) setShortcuts(rawConfig.shortcutsList);
          }
        } catch {}

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
    if (isElectron && mode === 'shelf') {
      const unsub = window.electronAPI!.onShelfStateChange((visible) => {
        setIsShelfVisible(visible);
      });
      return () => unsub();
    }
  }, [mode]);

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

  // Auto-hide handle timer logic
  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  const startAutoHideTimer = useCallback(() => {
    clearAutoHideTimer();
    if (mode === 'handle' && config.handleAutoHide) {
      const delayMs = (config.handleAutoHideDelay || 5) * 1000;
      autoHideTimerRef.current = setTimeout(() => {
        setIsHandleFadedOut(true);
      }, delayMs);
    }
  }, [mode, config.handleAutoHide, config.handleAutoHideDelay, clearAutoHideTimer]);

  useEffect(() => {
    if (mode === 'handle') {
      if (config.handleAutoHide) {
        startAutoHideTimer();
      } else {
        setIsHandleFadedOut(false);
      }
    }
    return () => clearAutoHideTimer();
  }, [mode, config.handleAutoHide, config.handleAutoHideDelay, startAutoHideTimer, clearAutoHideTimer]);

  // Helper to determine if a shortcut's process is currently running
  const isShortcutRunning = useCallback((item: any) => {
    if (!item.path || item.path.startsWith('http://') || item.path.startsWith('https://')) {
      return false;
    }
    try {
      const normalizedPath = item.path.replace(/\\/g, '/');
      const exeName = normalizedPath.split('/').pop()?.toLowerCase();
      if (!exeName) return false;

      return runningProcesses.some(p => {
        const pName = p.name.toLowerCase();
        if (pName === exeName) return true;
        if (p.path && p.path.replace(/\\/g, '/').toLowerCase() === normalizedPath.toLowerCase()) return true;
        return false;
      });
    } catch {
      return false;
    }
  }, [runningProcesses]);

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
    if (mode === 'handle' || !isShelfVisible) return;

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
  }, [mode, isShelfVisible]);

  // Limpieza del temporizador de hover al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Solución robusta para mouseleave fuera de la pantalla en la manigueta
  useEffect(() => {
    if (mode !== 'handle') return;

    const handleGlobalMouseLeave = (e: MouseEvent) => {
      // Si el cursor sale del documento/ventana
      if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
        if (isElectron) {
          window.electronAPI!.setIgnoreMouseEvents(true, { forward: true });
        }
        setHandleHovered(false);
      }
    };

    document.addEventListener('mouseleave', handleGlobalMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleGlobalMouseLeave);
    };
  }, [mode]);

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

  // Persistencia de Atajos y Categorías
  const saveDataToConfig = async (newShortcuts: any[], newCategories: any[]) => {
    const normalizedCategories = normalizeCategoriesList(newCategories);

    setShortcuts(newShortcuts);
    setCategories(normalizedCategories);

    if (isElectron) {
      // Usar configRef.current para no perder propiedades recientes como monitorId
      await window.electronAPI!.saveConfig({
        ...configRef.current,
        shortcutsList: newShortcuts,
        categoriesList: normalizedCategories
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
    setDragOverCategoryId(null);

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
    if (cat.id === 'all') return;
    e.preventDefault();
    setDragOverCategoryId(null);
    setDraggingCategoryId(null);

    const data = e.dataTransfer.getData('text/plain');
    if (data && data.startsWith('category:')) {
      const movingCategoryId = data.replace('category:', '');
      if (!movingCategoryId || movingCategoryId === 'all' || movingCategoryId === cat.id) return;

      const currentCategories = normalizeCategoriesList(categories);
      const movingIndex = currentCategories.findIndex(c => c.id === movingCategoryId);
      const targetIndex = currentCategories.findIndex(c => c.id === cat.id);
      if (movingIndex === -1 || targetIndex === -1) return;

      const movingCategory = currentCategories[movingIndex];
      const remainingCategories = currentCategories.filter(c => c.id !== movingCategoryId);
      const targetIndexAfterRemoval = remainingCategories.findIndex(c => c.id === cat.id);
      const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const insertAfter = e.clientX > targetRect.left + (targetRect.width / 2);
      const insertIndex = targetIndexAfterRemoval + (insertAfter ? 1 : 0);

      const reorderedCategories = [
        ...remainingCategories.slice(0, insertIndex),
        movingCategory,
        ...remainingCategories.slice(insertIndex),
      ];

      await saveDataToConfig(shortcuts, reorderedCategories);
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
              return { ...s, category: cat.id, path: finalPath, iconPath: finalIconPath, name: finalName };
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

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Extraer todas las rutas de archivo de forma sincrónica antes de cualquier 'await'
    // para evitar que Chromium limpie/invalide el objeto dataTransfer por seguridad.
    const filePaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const filePath = window.electronAPI!.getPathForFile(files[i]);
      if (filePath) {
        filePaths.push(filePath);
      }
    }

    if (filePaths.length === 0) return;

    const newShortcuts = [...shortcuts];
    let addedCount = 0;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const resolved = await window.electronAPI!.resolveFilePath(filePath);
      if (resolved) {
        // Agregar a la categoría activa (o utils por defecto)
        const targetCategory = activeCategory === 'all' ? 'utils' : activeCategory;
        
        let finalPath = resolved.path;
        let finalIconPath = resolved.iconPath || '';
        let finalName = resolved.name;

        if (targetCategory === 'vault') {
          const importRes = await window.electronAPI!.importFileToVault(resolved.path);
          if (importRes.success) {
            finalPath = importRes.path;
            finalIconPath = importRes.iconPath;
            finalName = importRes.name;
          }
        }

        const exists = newShortcuts.some(s => s.path.toLowerCase() === finalPath.toLowerCase());
        
        if (!exists) {
          newShortcuts.push({
            id: Date.now() + i,
            name: finalName,
            path: finalPath,
            category: targetCategory,
            iconPath: finalIconPath,
            isAdmin: false,
            delay: 0,
            arguments: '',
            usageCount: 0,
            addedTimestamp: Date.now()
          });
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      await saveDataToConfig(newShortcuts, categories);
      playCyberBeep();
    }
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
    
    // Incrementar launches global
    const nextTotalLaunches = (config.totalLaunches || 0) + 1;
    const updatedConfig = { ...configRef.current, totalLaunches: nextTotalLaunches };
    setConfig(updatedConfig);
    configRef.current = updatedConfig;

    await saveDataToConfig(updated, categories);

    if (isElectron) {
      // Lanzamiento nativo
      let pathWithArgs = item.path;
      if (item.arguments) {
        pathWithArgs += ` ${item.arguments}`;
      }
      await window.electronAPI!.launchApp(item.path, item.isAdmin);
      
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
    setFormCategory(activeCategory === 'all' ? 'utils' : activeCategory);
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

  // Gestor de Categorías
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const newId = newCatName.toLowerCase().replace(/\s+/g, '_');
    
    // Evitar duplicados
    if (categories.some(c => c.id === newId)) return;

    const updated = [...categories, { id: newId, name: newCatName.toUpperCase(), color: newCatColor }];
    await saveDataToConfig(shortcuts, updated);
    setNewCatName('');
    setNewCatModal(false);
    playCyberBeep();
  };

  const handleDeleteCategory = async (id: string) => {
    if (id === 'all' || id === 'utils') return; // Protegidos
    const updatedCats = categories.filter(c => c.id !== id);
    // Reasignar shortcuts de la categoría borrada a utils
    const updatedShortcuts = shortcuts.map(s => {
      if (s.category === id) {
        return { ...s, category: 'utils' };
      }
      return s;
    });

    await saveDataToConfig(updatedShortcuts, updatedCats);
    setActiveCategory('all');
    playCyberBeep();
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

  // Renombrar categoría
  const handleRenameCategory = async () => {
    if (!renameCatName.trim() || !renameCatModal.category) return;
    const catId = renameCatModal.category.id;
    const newName = renameCatName.trim().toUpperCase();
    const newId = newName.toLowerCase().replace(/\s+/g, '_');

    // Evitar que colisione con otra categoría existente
    if (categories.some(c => c.id === newId && c.id !== catId)) {
      showAlert(
        langCode === 'es' ? 'Categoría Existente' : 'Category Exists',
        langCode === 'es' ? 'Esta categoría ya existe.' : 'This category already exists.'
      );
      return;
    }

    const updatedCats = categories.map(c => {
      if (c.id === catId) {
        return { ...c, name: newName, id: newId };
      }
      return c;
    });

    // Actualizar también la categoría de los atajos que estaban en esta categoría
    const updatedShortcuts = shortcuts.map(s => {
      if (s.category === catId) {
        return { ...s, category: newId };
      }
      return s;
    });

    await saveDataToConfig(updatedShortcuts, updatedCats);
    if (activeCategory === catId) {
      setActiveCategory(newId);
    }
    setRenameCatModal({ open: false });
    playCyberBeep();
  };

  // Hover triggers para la manigueta
  const handleMouseEnter = () => {
    if (config.hoverTriggerEnabled) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        if (isElectron) {
          window.electronAPI!.toggleShelf();
        }
      }, config.hoverTriggerDelay || 300);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Only left-click / main pointer button
    e.currentTarget.setPointerCapture(e.pointerId);
    handleDragStartPos.current = { x: e.screenX, y: e.screenY };
    handleHasDraggedPastThreshold.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    if (!handleHasDraggedPastThreshold.current) {
      const deltaX = e.screenX - handleDragStartPos.current.x;
      const deltaY = e.screenY - handleDragStartPos.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance >= 5) {
        handleHasDraggedPastThreshold.current = true;
        setIsDraggingHandle(true);
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        if (isElectron) {
          window.electronAPI!.trackHandleDragStart();
        }
      }
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (handleHasDraggedPastThreshold.current) {
      if (isElectron) {
        await window.electronAPI!.trackHandleDragStop();
      }
      setIsDraggingHandle(false);
      handleHasDraggedPastThreshold.current = false;
    } else {
      if (isElectron) {
        window.electronAPI!.toggleShelf();
      }
    }
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

  // Filtrado y Ordenación de Accesos Directos
  const getFilteredShortcuts = () => {
    let list = shortcuts.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.path.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (activeCategory === 'favorites') return s.isFavorite === true;
      if (activeCategory === 'all') {
        if (s.category === 'vault') {
          return !isVaultLocked();
        }
        return true;
      }
      return s.category === activeCategory;
    });

    // Ordenar
    if (iconSortOrder === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (iconSortOrder === 'recent') {
      list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    } else if (iconSortOrder === 'added') {
      list.sort((a, b) => (b.addedTimestamp || 0) - (a.addedTimestamp || 0));
    }

    return list;
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
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
    handleUpdateConfigSetting('language', lang);
    playCyberBeep();
  };

  // Backup y Diagnóstico
  const handleExportBackup = async () => {
    if (!isElectron) return;
    const backupData = JSON.stringify({ shortcuts, categories, config }, null, 2);
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
        if (data.shortcutsList || data.shortcuts) {
          const importedShortcuts = data.shortcutsList || data.shortcuts;
          const importedCategories = data.categoriesList || data.categories;
          const importedConfig = data.config || config;
          
          setConfig(importedConfig);
          setShortcuts(importedShortcuts);
          setCategories(importedCategories);
          
          await saveDataToConfig(importedShortcuts, importedCategories);
          await window.electronAPI!.saveConfig(importedConfig);
          
          showAlert(
            langCode === 'es' ? 'Respaldo Importado' : 'Backup Imported',
            translate('notif_backup_imported'),
            () => {
              window.location.reload();
            }
          );
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

  // =====================================
  // ── MODO HANDLE (MANIGUETA CIBERNÉTICA) ──
  // =====================================
  if (mode === 'handle') {
    const isBottom = config.dockPosition === 'bottom';
    return (
      <div 
        className={`theme-${config.theme} w-full h-full flex flex-col items-center p-0 bg-transparent overflow-visible relative transition-opacity duration-1000 ${
          isBottom ? 'justify-end pb-1' : 'justify-start pt-1'
        } ${isHandleFadedOut ? 'opacity-0' : 'opacity-100'}`}
      >
        <AnimatePresence>
          {handleHovered && (
            <motion.div
              initial={{ opacity: 0, y: isBottom ? 8 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: isBottom ? 8 : -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`absolute left-1/2 -translate-x-1/2 ${
                isBottom ? 'bottom-[32px]' : 'top-[32px]'
              } w-max whitespace-nowrap px-2 py-0.5 bg-slate-950/95 border border-[var(--neon-glow-border)] rounded-md shadow-[0_0_8px_var(--neon-glow-color-raw)] z-50 text-[8px] font-cyber text-white tracking-widest uppercase pointer-events-none flex items-center gap-1`}
              style={{
                textShadow: '0 0 4px var(--neon-glow-color)',
              }}
            >
              <span className="w-1 h-1 bg-[var(--neon-glow-color)] rounded-full animate-pulse shadow-[0_0_3px_var(--neon-glow-color)]" />
              {translate('tooltip_handle')}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onMouseEnter={() => {
            if (isElectron) {
              window.electronAPI!.setIgnoreMouseEvents(false);
            }
            clearAutoHideTimer();
            setIsHandleFadedOut(false);
            handleMouseEnter();
            setHandleHovered(true);
          }}
          onMouseLeave={() => {
            if (!config.handleAutoHide && isElectron) {
              window.electronAPI!.setIgnoreMouseEvents(true, { forward: true });
            }
            startAutoHideTimer();
            handleMouseLeave();
            setHandleHovered(false);
          }}
          onDragEnter={async (e) => {
            e.preventDefault();
            if (isElectron) {
              await window.electronAPI!.setDragActive(true);
              await window.electronAPI!.toggleShelf();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          className="cyber-handle-bar w-[150px] h-[20px] rounded-md border flex items-center justify-center relative group"
          style={{ cursor: isDraggingHandle ? 'grabbing' : 'pointer' }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (isElectron) {
              window.electronAPI!.showHandleContextMenu();
            }
          }}
        >
          {/* Decales de Líneas Circuitos neón */}
          <div className="flex gap-2 items-center justify-center transition-all duration-300 group-hover:-translate-x-[34px] group-hover:opacity-50">
            {/* Barra izquierda externa (Pequeña - 60% tamaño, 50% opacidad) */}
            <span className="w-[3.6px] h-[8.4px] opacity-50 bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
            
            {/* Barra izquierda interna (Mediana - 80% tamaño) */}
            <span className="w-[4.8px] h-[11.2px] bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
            
            {/* Barra central (Grande - 100% tamaño, Pulsante) */}
            <span className="w-[6px] h-[14px] bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)] animate-pulse" />
            
            {/* Barra derecha interna (Mediana - 80% tamaño) */}
            <span className="w-[4.8px] h-[11.2px] bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
            
            {/* Barra derecha externa (Pequeña - 60% tamaño, 50% opacidad) */}
            <span className="w-[3.6px] h-[8.4px] opacity-50 bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
          </div>
          
          <div className="absolute right-3.5 flex items-center">
            <span className="text-[9px] font-cyber text-[var(--neon-glow-color)] opacity-0 group-hover:opacity-100 transition-opacity tracking-widest uppercase">
              ACTIVATE
            </span>
          </div>
        </button>
      </div>
    );
  }

  // =====================================
  // ── MODO SHELF (ESTANTE COMPLETO) ──
  // =====================================
  const filteredShortcutsList = getFilteredShortcuts();

  // Variables defensivas contra configuraciones anteriores (fallback defaults)
  const bgType = config.bgType || 'solid';
  const bgSolidColor = config.bgSolidColor || '#070b13';
  const bgGradient = config.bgGradient || 'preset-1';
  const bgImage = config.bgImage || 'preset-1';
  const bgCustomPath = config.bgCustomPath || '';
  const opacityVal = config.opacity !== undefined ? config.opacity : 85;
  const blurLevel = config.blurLevel !== undefined ? config.blurLevel : 20;

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
              CYBERTRAY
            </span>
          </div>

          {/* Category Tabs Scroll Container (Centered Navigation) */}
          <div className="flex-1 flex items-center relative overflow-hidden h-full mx-4">
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
                <span className={`px-1 py-0.2 text-[9px] rounded border font-mono transition-colors ${
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
              <span className={`px-1 py-0.2 text-[9px] rounded border font-mono transition-colors ${
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
                className={`px-1 py-0.2 text-[9px] rounded border font-mono transition-colors ${
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
                    className={`px-1 py-0.2 text-[9px] rounded border font-mono transition-colors ${
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
          <div className="flex items-center gap-1.5 flex-shrink-0 w-44 justify-end">
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

      {/* ── SECCIÓN CENTRAL (GRID DE ACCESOS DIRECTOS VIRTUALIZADOS) ── */}
      <main className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar relative">
        
        {/* Banner Cyberpunk Decorativo si no hay items */}
        {filteredShortcutsList.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-[var(--neon-glow-border)] rounded-xl bg-slate-950/65 backdrop-blur-md py-12 px-6 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            {searchQuery.trim() !== '' ? (
              <>
                <Search className="w-12 h-12 text-slate-500 opacity-60 mb-4" />
                <p className="text-xs font-mono text-slate-400 max-w-md text-center leading-relaxed tracking-wider">
                  {translate('search_no_results', { query: searchQuery })}
                </p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-[var(--neon-glow-color)] opacity-70 animate-pulse mb-4" />
                <p className="text-xs font-mono text-slate-200 max-w-md text-center leading-relaxed tracking-wider">
                  {translate('shortcut_no_items')}
                </p>
              </>
            )}
          </div>
        ) : (
          <div 
            className="grid gap-4 transition-all"
            style={{
              gridTemplateColumns: viewMode === 'list' 
                ? 'repeat(auto-fill, minmax(280px, 1fr))' 
                : `repeat(auto-fill, minmax(${config.iconSize * 2.8}px, 1fr))`
            }}
          >
            {filteredShortcutsList.flatMap((item, index) => {
              const proc = getShortcutProcess(item);
              const elements = [];

              if (viewMode === 'list' && iconSortOrder === 'alpha') {
                const firstLetter = item.name.charAt(0).toUpperCase();
                const pLetter = firstLetter.match(/[A-Z0-9]/i) ? firstLetter : '#';
                const prevApp = index > 0 ? filteredShortcutsList[index - 1] : null;
                let showHeader = false;

                if (prevApp) {
                  const prevFirstLetter = prevApp.name.charAt(0).toUpperCase();
                  const prevPLetter = prevFirstLetter.match(/[A-Z0-9]/i) ? prevFirstLetter : '#';
                  showHeader = pLetter !== prevPLetter;
                } else {
                  showHeader = true;
                }

                if (showHeader) {
                  elements.push(
                    <div 
                      key={`header-list-${pLetter}`}
                      className="col-span-full mt-4 mb-2 flex items-center gap-3 opacity-60 text-left select-none"
                      style={{ gridColumn: '1 / -1' }}
                    >
                      <span className="text-[13px] font-cyber font-bold text-slate-400 w-6 pl-1 tracking-wider">{pLetter}</span>
                      <div className="h-px bg-gradient-to-r from-slate-700/40 via-slate-800/10 to-transparent flex-1" />
                    </div>
                  );
                }
              }

              if (viewMode === 'list') {
                elements.push(
                  <div
                    key={item.id}
                    onClick={() => handleLaunch(item)}
                    onContextMenu={(e) => handleShortcutContextMenu(e, item)}
                    draggable
                    onDragStart={(e) => handleShortcutDragStart(e, item)}
                    className="cyber-panel-glow bg-slate-950/45 rounded-lg p-2 flex items-center justify-between gap-3 transition-all duration-300 hover:scale-102 hover:bg-slate-900/60 cursor-pointer relative group border border-slate-900/30 hover:border-[var(--neon-glow-border)]"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Icono del Acceso Directo */}
                      <div 
                        className="flex-shrink-0 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-[var(--neon-glow-color)] group-hover:shadow-[0_0_6px_var(--neon-glow-color-raw)]"
                        style={{
                          width: '32px',
                          height: '32px',
                        }}
                      >
                        {item.iconPath ? (
                          <img src={item.iconPath} alt={item.name} className="w-[85%] h-[85%] object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950 group-hover:text-[var(--neon-glow-color)]">
                            <span className="font-cyber font-bold text-xs">&gt;_</span>
                          </div>
                        )}
                      </div>

                      {/* Info Text */}
                      <div className="min-w-0 flex-1 text-left">
                        <h4 className="font-montserrat font-bold text-white text-[12px] truncate uppercase tracking-wide group-hover:text-[var(--neon-glow-color)] flex items-center gap-1">
                          <span className="truncate">{item.name}</span>
                        </h4>
                        <p className={`font-mono text-[9px] truncate w-full ${item.category === 'vault' ? 'text-purple-400/80' : 'text-slate-500'}`} title={item.path}>
                          {item.category === 'vault' ? translate('vault_real_path', { path: item.path }) : item.path}
                        </p>
                      </div>
                    </div>

                    {/* Indicators & Edit Button */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 z-10">
                      {activeCategory === 'all' && (() => {
                        const catObj = categories.find(c => c.id === item.category);
                        if (!catObj) return null;
                        return (
                          <span 
                            className="text-[8px] font-cyber font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider select-none mr-1"
                            style={{
                              backgroundColor: `${catObj.color}15`,
                              borderColor: `${catObj.color}40`,
                              color: catObj.color,
                            }}
                          >
                            {catObj.name}
                          </span>
                        );
                      })()}
                      {item.isFavorite && (
                        <span className="text-[10px] text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" title={langCode === 'es' ? 'Favorito' : 'Favorite'}>★</span>
                      )}
                      {item.isAdmin && (
                        <span className="text-[7.5px] font-montserrat font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1 py-0.2 rounded" title={translate('shortcut_run_admin')}>
                          {translate('shortcut_admin_tag')}
                        </span>
                      )}
                      {item.delay > 0 && (
                        <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 px-1 py-0.2 rounded flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {item.delay}s
                        </span>
                      )}
                      
                      <button
                        onClick={(e) => handleOpenEditModal(item, e)}
                        className="opacity-0 group-hover:opacity-100 rounded border border-slate-700 hover:border-[var(--neon-glow-color)] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer h-5 w-5 p-0"
                        title="Edit Launch Configuration"
                      >
                        <Edit className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              } else {
                const isSmallGrid = config.iconSize < 48;
                elements.push(
                  <div
                    key={item.id}
                    onClick={() => handleLaunch(item)}
                    onContextMenu={(e) => handleShortcutContextMenu(e, item)}
                    draggable
                    onDragStart={(e) => handleShortcutDragStart(e, item)}
                    className={`cyber-panel-glow bg-slate-950/45 rounded-xl transition-all duration-300 hover:scale-103 cursor-pointer relative group ${
                      isSmallGrid
                        ? 'p-2 flex flex-col items-center justify-center gap-1.5 text-center'
                        : 'p-3 flex items-center gap-3.5 text-left'
                    }`}
                  >
                    {/* Icono del Acceso Directo */}
                    <div 
                      className="flex-shrink-0 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-[var(--neon-glow-color)] group-hover:shadow-[0_0_6px_var(--neon-glow-color-raw)] relative"
                      style={{
                        width: `${config.iconSize}px`,
                        height: `${config.iconSize}px`,
                      }}
                    >
                      {item.iconPath ? (
                        <img src={item.iconPath} alt={item.name} className="w-[85%] h-[85%] object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950 group-hover:text-[var(--neon-glow-color)]">
                          <span className="font-cyber font-bold text-lg">&gt;_</span>
                        </div>
                      )}

                      {/* Estrella de favorito integrada como badge en el icono en modo pequeño */}
                      {item.isFavorite && isSmallGrid && (
                        <span
                          className="absolute -top-0.5 -right-0.5 text-[8px] text-amber-400 bg-slate-950/90 border border-amber-500/30 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-[0_0_4px_rgba(251,191,36,0.5)] z-10 font-sans"
                          title={langCode === 'es' ? 'Favorito' : 'Favorite'}
                        >
                          ★
                        </span>
                      )}
                    </div>

                    {/* Info Text */}
                    <div className={`min-w-0 ${isSmallGrid ? 'w-full text-center flex flex-col items-center' : 'flex-1 text-left'}`}>
                      <h4 
                        className="font-montserrat font-bold text-white truncate uppercase tracking-wide group-hover:text-[var(--neon-glow-color)] flex items-center gap-1"
                        style={{ 
                          fontSize: `${Math.max(9, Math.min(14, config.iconSize * 0.22))}px`,
                          justifyContent: isSmallGrid ? 'center' : 'flex-start',
                          width: '100%'
                        }}
                      >
                        <span className="truncate">{item.name}</span>
                      </h4>

                      {/* Ocultar ruta en grid pequeño para evitar ruido visual */}
                      {!isSmallGrid && (
                        <p 
                          className={`font-mono truncate w-full ${item.category === 'vault' ? 'text-purple-400/80' : 'text-slate-500'}`}
                          title={item.path}
                          style={{ fontSize: `${Math.max(8, Math.min(11, config.iconSize * 0.17))}px` }}
                        >
                          {item.category === 'vault' ? translate('vault_real_path', { path: item.path }) : item.path}
                        </p>
                      )}
                      
                      {/* Detalles rápidos */}
                      {(!isSmallGrid || (activeCategory === 'all')) && (
                        <div className={`flex items-center gap-1.5 mt-0.5 flex-wrap ${isSmallGrid ? 'justify-center' : 'justify-start'}`}>
                          {activeCategory === 'all' && (() => {
                            const catObj = categories.find(c => c.id === item.category);
                            if (!catObj) return null;
                            return (
                              <span 
                                className="text-[7.5px] font-cyber font-bold px-1.2 py-0.3 rounded border uppercase tracking-wider select-none animate-fade-in"
                                style={{
                                  backgroundColor: `${catObj.color}12`,
                                  borderColor: `${catObj.color}30`,
                                  color: catObj.color,
                                  fontSize: isSmallGrid ? '6.5px' : '7.5px'
                                }}
                              >
                                {catObj.name}
                              </span>
                            );
                          })()}
                          {item.isAdmin && !isSmallGrid && (
                            <span className="text-[7.5px] font-montserrat font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1 py-0.2 rounded" title={translate('shortcut_run_admin')}>
                              {translate('shortcut_admin_tag')}
                            </span>
                          )}
                          {item.delay > 0 && !isSmallGrid && (
                            <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 px-1 py-0.2 rounded flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {item.delay}s
                            </span>
                          )}
                          {item.usageCount > 0 && !isSmallGrid && (
                            <span className="text-[8px] font-mono text-slate-500">
                              {item.usageCount} ex.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Favorite Star — permanente en esquina superior derecha en modo grande */}
                    {item.isFavorite && !isSmallGrid && (
                      <span
                        className="absolute right-2 top-2 text-[10px] text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)] z-10"
                        title={langCode === 'es' ? 'Favorito' : 'Favorite'}
                      >
                        ★
                      </span>
                    )}

                    {/* Edit Button overlay */}
                    <button
                      onClick={(e) => handleOpenEditModal(item, e)}
                      className="absolute opacity-0 group-hover:opacity-100 rounded border border-slate-700 hover:border-[var(--neon-glow-color)] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
                      style={{
                        width: isSmallGrid ? '18px' : '24px',
                        height: isSmallGrid ? '18px' : '24px',
                        right: isSmallGrid ? '4px' : '8px',
                        top: isSmallGrid ? '4px' : '8px',
                        padding: 0
                      }}
                      title="Edit Launch Configuration"
                    >
                      <Edit style={{ width: isSmallGrid ? '10px' : '13px', height: isSmallGrid ? '10px' : '13px' }} />
                    </button>
                  </div>
                );
              }

              return elements;
            })}
          </div>
        )}

        {/* Collapsible Vault Manual Guide (Hidden behind Vault tab lock) */}
        {activeCategory === 'vault' && (
          <div className="mt-8 pt-6 border-t border-purple-900/30 max-w-4xl space-y-3 animate-fade-in">
            <div className="bg-slate-950/40 border border-purple-950/50 rounded-xl overflow-hidden">
              {/* Header Toggle */}
              <button 
                onClick={() => { setShowVaultHelp(!showVaultHelp); playCyberBeep(); }}
                className="w-full flex items-center justify-between px-4 py-3 bg-purple-950/10 hover:bg-purple-950/20 transition-all text-left cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-400" />
                  <span className="font-cyber font-bold text-white text-xs tracking-wider uppercase">
                    {translate('vault_guide_title')}
                  </span>
                </div>
                <span className="text-[10px] font-cyber font-bold text-purple-400/80 hover:text-purple-300">
                  {showVaultHelp ? translate('vault_guide_toggle_hide') : translate('vault_guide_toggle_show')}
                </span>
              </button>

              {/* Collapsible Content */}
              {showVaultHelp && (
                <div className="p-4 border-t border-purple-950/30 space-y-4 font-mono text-[10px] text-slate-400 select-text leading-relaxed">
                  <p className="text-[11px] text-slate-300 font-cyber font-bold tracking-wide uppercase border-b border-purple-950/30 pb-2">
                    {translate('vault_guide_intro')}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 bg-slate-950/30 p-2.5 rounded border border-purple-950/20">
                      <h6 className="font-cyber font-bold text-purple-400 tracking-wide">{translate('vault_guide_p1_title')}</h6>
                      <p>{translate('vault_guide_p1_desc')}</p>
                    </div>

                    <div className="space-y-1 bg-slate-950/30 p-2.5 rounded border border-purple-950/20">
                      <h6 className="font-cyber font-bold text-purple-400 tracking-wide">{translate('vault_guide_p2_title')}</h6>
                      <p>{translate('vault_guide_p2_desc')}</p>
                    </div>

                    <div className="space-y-1 bg-slate-950/30 p-2.5 rounded border border-purple-950/20">
                      <h6 className="font-cyber font-bold text-purple-400 tracking-wide">{translate('vault_guide_p3_title')}</h6>
                      <p>{translate('vault_guide_p3_desc')}</p>
                    </div>

                    <div className="space-y-1 bg-slate-950/30 p-2.5 rounded border border-purple-950/20">
                      <h6 className="font-cyber font-bold text-purple-400 tracking-wide">{translate('vault_guide_p4_title')}</h6>
                      <p>{translate('vault_guide_p4_desc')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Physical Vault Directory Config (Hidden behind Vault tab lock) */}
        {activeCategory === 'vault' && (
          <div className="mt-8 pt-6 border-t border-purple-900/30 max-w-4xl space-y-4 animate-fade-in">
            <div className="bg-slate-950/40 p-4 border border-purple-950/50 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <h5 className="font-cyber font-bold text-purple-400 text-xs tracking-wider uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  {translate('vault_settings_path')}
                </h5>
                <p className="text-[9.5px] text-slate-500 leading-normal">
                  {translate('vault_settings_path_desc')}
                </p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={config.vaultPath || ''}
                    onChange={(e) => handleUpdateConfigSetting('vaultPath', e.target.value)}
                    placeholder={isElectron ? "C:\\Users\\... (Default App Data Vault)" : "Default Web Storage Path"}
                    className="flex-1 bg-slate-950/80 border border-slate-900 text-slate-300 font-mono text-[10px] rounded-lg px-3 py-1.5 focus:outline-none truncate"
                  />
                  {isElectron && (
                    <button
                      onClick={async () => {
                        const defPath = await window.electronAPI!.getDefaultVaultPath();
                        handleUpdateConfigSetting('vaultPath', defPath);
                        playFolderSound();
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                    >
                      DEFAULT
                    </button>
                  )}
                </div>
              </div>
              {isElectron && (
                <div className="flex-shrink-0 flex items-end">
                  <button
                    onClick={() => window.electronAPI!.openVaultFolder()}
                    className="w-full md:w-auto h-10 px-4 bg-purple-950/20 hover:bg-purple-950/30 border border-purple-900/50 hover:border-purple-800/80 text-purple-400 hover:text-purple-300 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    {translate('vault_open_folder')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── BARRA DE ESTADO INFERIOR (STATUS BAR) ── */}
      <footer className="h-10 border-t border-[var(--neon-glow-border)] flex items-center justify-between px-8 bg-slate-950/80 z-10 text-xs font-mono text-slate-400">
        
        {/* Sección Izquierda: Estadísticas de CyberTray */}
        <div className="flex items-center gap-4.5">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">{translate('stat_total_categories')}:</span>
            <span className="text-purple-400 font-bold">{categories.length - 1}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">{translate('stat_total_shortcuts')}:</span>
            <span className="text-[var(--neon-glow-color)] font-bold">{shortcuts.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">{translate('stat_total_launches')}:</span>
            <span className="text-pink-400 font-bold">{config.totalLaunches || 0}</span>
          </div>
        </div>

        {/* Sección Derecha: Telemetría de Recursos del Sistema */}
        <div className="flex items-center gap-5">
          
          {/* Uptime */}
          <div 
            className="flex items-center gap-1 cursor-help"
            onMouseEnter={(e) => showTooltip(e, translate('stat_uptime'), translate('tooltip_uptime'))}
            onMouseLeave={hideTooltip}
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m
            </span>
          </div>

          {/* CPU Load */}
          <div 
            className="flex items-center gap-2 whitespace-nowrap cursor-help"
            onMouseEnter={(e) => showTooltip(e, translate('stat_cpu'), `${translate('tooltip_cpu')}\n\n${systemInfo.cpu.model}`)}
            onMouseLeave={hideTooltip}
          >
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">CPU:</span>
            <span className="text-slate-200 font-bold">
              {systemInfo.cpu.cores} Cores
            </span>
          </div>

          {/* RAM load progress bar */}
          <div 
            className="flex items-center gap-2 cursor-help"
            onMouseEnter={(e) => showTooltip(e, translate('stat_ram'), `${translate('tooltip_ram')}\n\nTotal: ${systemInfo.memory.total.toFixed(1)} GB`)}
            onMouseLeave={hideTooltip}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">RAM:</span>
            <div className="w-14 h-1.5 bg-slate-900 border border-slate-800 rounded overflow-hidden">
              <div 
                className="h-full bg-[var(--neon-glow-color)] transition-all duration-1000"
                style={{ width: `${systemInfo.memory.percent}%` }}
              />
            </div>
            <span className="text-slate-200 font-bold w-9 text-right">
              {Math.round(systemInfo.memory.percent)}%
            </span>
          </div>

          {/* Disk load */}
          <div 
            className="flex items-center gap-2 cursor-help"
            onMouseEnter={(e) => showTooltip(e, langCode === 'es' ? 'DISCOS' : 'DISKS', `${translate('tooltip_disk')}\n\n${disks.map((d: any) => `${d.drive} (Total: ${Math.round(d.total)}GB, Libre: ${Math.round(d.free)}GB)`).join('\n')}`)}
            onMouseLeave={hideTooltip}
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-200 font-bold">
              {disks[0] ? `${disks[0].drive} ${disks[0].percent}%` : '--'}
            </span>
          </div>


        </div>
      </footer>

      {/* ── MODAL: PANEL DE CONFIGURACIÓN NEURAL ── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 180 }}
              className="fixed inset-x-0 bottom-10 h-[80%] z-50 bg-[#070b13]/95 border-t border-[var(--neon-glow-border)] shadow-2xl flex p-0 select-none overflow-hidden font-mono"
            >
              {/* Tab Navigation Menu */}
              <div className="w-56 border-r border-slate-900 bg-slate-950/60 p-6 flex flex-col justify-between text-left">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3.5 mb-4.5">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span className="font-cyber font-bold text-xs text-white tracking-widest">{translate('settings_title')}</span>
                  </div>
                  
                  <button
                    onClick={() => { setSettingsTab('general'); playFolderSound(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer ${
                      settingsTab === 'general'
                        ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10 shadow-[0_0_6px_var(--neon-glow-color-raw)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {translate('tab_general')}
                  </button>

                  <button
                    onClick={() => { setSettingsTab('appearance'); playFolderSound(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer ${
                      settingsTab === 'appearance'
                        ? 'border-purple-500/80 text-purple-400 bg-purple-950/10 shadow-[0_0_6px_rgba(168,85,247,0.25)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {translate('tab_appearance')}
                  </button>

                  <button
                    onClick={() => { setSettingsTab('shortcuts'); playFolderSound(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer ${
                      settingsTab === 'shortcuts'
                        ? 'border-amber-500/80 text-amber-500 bg-amber-950/10 shadow-[0_0_6px_rgba(245,158,11,0.25)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {translate('tab_shortcuts')}
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Auto-save indicator */}
                  <AnimatePresence>
                    {settingsSaved && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-cyber font-bold tracking-widest text-emerald-400"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        {langCode === 'es' ? 'CONFIGURACIÓN GUARDADA' : 'SETTINGS SAVED'}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => { setShowSettings(false); playCyberBeep(); }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    {translate('close_btn')}
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar text-left font-sans">
                
                {/* 1. GENERAL SYSTEM SETTINGS */}
                {settingsTab === 'general' && (
                  <div className="space-y-6 max-w-2xl font-mono text-xs">
                    
                    {/* Idioma */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('general_language')}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 mb-3">{translate('general_language_desc')}</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleChangeLanguage('en')}
                          className={`px-4 py-1.5 border rounded-lg transition-all text-xs font-cyber font-bold cursor-pointer ${langCode === 'en' ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                        >
                          ENGLISH (DEFAULT)
                        </button>
                        <button 
                          onClick={() => handleChangeLanguage('es')}
                          className={`px-4 py-1.5 border rounded-lg transition-all text-xs font-cyber font-bold cursor-pointer ${langCode === 'es' ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                        >
                          ESPAÑOL
                        </button>
                      </div>
                    </div>

                    {/* Dock Position & Handle Position */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl grid grid-cols-2 gap-4">
                      
                      <div>
                        <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('general_dock_position')}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 mb-3">{translate('general_dock_position_desc')}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateConfigSetting({ dockPosition: 'top', handleOffsetPercent: null })}
                            className={`flex-1 py-1.5 border rounded-lg text-xs font-cyber font-bold cursor-pointer ${config.dockPosition === 'top' ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)]' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                          >
                            TOP
                          </button>
                          <button
                            onClick={() => handleUpdateConfigSetting({ dockPosition: 'bottom', handleOffsetPercent: null })}
                            className={`flex-1 py-1.5 border rounded-lg text-xs font-cyber font-bold cursor-pointer ${config.dockPosition === 'bottom' ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)]' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                          >
                            BOTTOM
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('general_handle_position')}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 mb-3">{translate('general_handle_position_desc')}</p>
                        <div className="flex gap-2">
                          {['left', 'center', 'right'].map((pos) => (
                            <button
                              key={pos}
                              onClick={() => handleUpdateConfigSetting({ handlePosition: pos, handleOffsetPercent: null })}
                              className={`flex-1 py-1.5 border rounded-lg text-[10px] font-cyber font-bold uppercase cursor-pointer ${config.handlePosition === pos ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)]' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Monitor de Despliegue */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('general_monitor')}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 mb-3">{translate('general_monitor_desc')}</p>
                      
                      {monitors.length === 0 ? (
                        <span className="text-slate-600 text-xs italic">Loading monitor arrays...</span>
                      ) : (
                        <div className="space-y-1.5">
                          {monitors.map((mon) => (
                            <button
                              key={mon.id}
                              onClick={() => isElectron && window.electronAPI!.setMonitor(mon.id)}
                              className={`w-full py-2 px-4 border rounded-lg text-left text-xs font-mono flex items-center justify-between cursor-pointer ${config.monitorId === mon.id || (mon.isPrimary && !config.monitorId) ? 'border-[var(--neon-glow-color)] text-white bg-slate-900' : 'border-slate-900 text-slate-400 hover:border-slate-800'}`}
                            >
                              <span>{mon.label}</span>
                              {mon.isPrimary && <span className="text-[8.5px] font-cyber bg-cyan-500/10 text-cyan-400 px-1 py-0.2 rounded">PRIMARY</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Atajo de Activación Global */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('general_shortcut')}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 mb-3">{translate('general_shortcut_desc')}</p>
                      
                      <div className="flex gap-3">
                        <input
                          type="text"
                          readOnly
                          value={config.shortcut}
                          className="bg-slate-950 border border-slate-900 text-[var(--neon-glow-color)] font-cyber font-bold text-center tracking-widest rounded-lg px-4 py-1.5 focus:outline-none w-48 text-xs"
                        />
                        <button
                          onClick={() => {
                            const newKey = prompt('Presiona la combinación de teclas (ej. Alt+T, Ctrl+Shift+T):', config.shortcut);
                            if (newKey) {
                              if (isElectron) window.electronAPI!.registerShortcut(newKey);
                              handleUpdateConfigSetting('shortcut', newKey);
                            }
                          }}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          RECORD NEW
                        </button>
                      </div>
                    </div>

                    {/* Toggles Rápidos */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                      
                      {/* Mostrar manigueta */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_handle_visible')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('general_handle_visible_desc')}</p>
                        </div>
                        <button
                          onClick={() => handleUpdateConfigSetting('handleVisible', !config.handleVisible)}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.handleVisible ? 'bg-[var(--neon-glow-color)]' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.handleVisible ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Hover Trigger Setting */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                        <div>
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_hover_trigger')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('general_hover_trigger_desc')}</p>
                        </div>
                        <button
                          onClick={() => handleUpdateConfigSetting('hoverTriggerEnabled', !config.hoverTriggerEnabled)}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.hoverTriggerEnabled ? 'bg-[var(--neon-glow-color)]' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.hoverTriggerEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Hover Trigger Delay Slider */}
                      {config.hoverTriggerEnabled && (
                        <div className="border-t border-slate-900 pt-3">
                          <div className="flex justify-between items-center mb-1">
                            <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_hover_delay')}</h5>
                            <span className="text-[var(--neon-glow-color)] font-bold">{config.hoverTriggerDelay || 300}ms</span>
                          </div>
                          <p className="text-[9.5px] text-slate-500 mb-2">{translate('general_hover_delay_desc')}</p>
                          <input
                            type="range"
                            min="100"
                            max="2000"
                            step="50"
                            value={config.hoverTriggerDelay || 300}
                            onChange={(e) => handleUpdateConfigSetting('hoverTriggerDelay', parseInt(e.target.value))}
                            className="w-full accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Ocultar al perder el foco */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                        <div>
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_hide_on_blur')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('general_hide_on_blur_desc')}</p>
                        </div>
                        <button
                          onClick={() => {
                            const next = !config.hideOnBlur;
                            handleUpdateConfigSetting('hideOnBlur', next);
                            if (isElectron) window.electronAPI!.setHideOnBlur(next);
                          }}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.hideOnBlur ? 'bg-[var(--neon-glow-color)]' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.hideOnBlur ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Ocultar al clickear zona muerta */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                        <div>
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_hide_on_dead_zone')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('general_hide_on_dead_zone_desc')}</p>
                        </div>
                        <button
                          onClick={() => {
                            const next = !config.hideOnDeadZoneClick;
                            handleUpdateConfigSetting('hideOnDeadZoneClick', next);
                          }}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.hideOnDeadZoneClick ? 'bg-[var(--neon-glow-color)]' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.hideOnDeadZoneClick ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Mostrar en barra de tareas */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                        <div>
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_show_taskbar')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('general_show_taskbar_desc')}</p>
                        </div>
                        <button
                          onClick={() => {
                            const next = !config.showTaskbarIcon;
                            handleUpdateConfigSetting('showTaskbarIcon', next);
                            if (isElectron) window.electronAPI!.setShowTaskbarIcon(next);
                          }}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.showTaskbarIcon ? 'bg-[var(--neon-glow-color)]' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.showTaskbarIcon ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Ejecutar al iniciar Windows */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                        <div>
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('sys_startup')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('sys_startup_desc')}</p>
                        </div>
                        <button
                          onClick={() => {
                            const next = !config.autoLaunch;
                            handleUpdateConfigSetting('autoLaunch', next);
                            if (isElectron) window.electronAPI!.setAutoLaunch(next);
                          }}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.autoLaunch ? 'bg-[var(--neon-glow-color)]' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.autoLaunch ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                    </div>

                    {/* Auto-hide Activation Bar */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_handle_auto_hide')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('general_handle_auto_hide_desc')}</p>
                        </div>
                        <button
                          onClick={() => handleUpdateConfigSetting('handleAutoHide', !config.handleAutoHide)}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.handleAutoHide ? 'bg-[var(--neon-glow-color)]' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.handleAutoHide ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {config.handleAutoHide && (
                        <div className="border-t border-slate-900 pt-3">
                          <div className="flex justify-between items-center mb-1">
                            <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_handle_auto_hide_delay')}</h5>
                            <span className="text-[var(--neon-glow-color)] font-bold">{config.handleAutoHideDelay || 5}s</span>
                          </div>
                          <p className="text-[9.5px] text-slate-500 mb-2">{translate('general_handle_auto_hide_delay_desc')}</p>
                          <input
                            type="range"
                            min="1"
                            max="30"
                            step="1"
                            value={config.handleAutoHideDelay || 5}
                            onChange={(e) => handleUpdateConfigSetting('handleAutoHideDelay', parseInt(e.target.value))}
                            className="w-full accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Hotspot Corners */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                      <div>
                        <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('general_hotspots')}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 mb-3">{translate('general_hotspots_desc')}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
                          const isActive = config.hotspotCorners?.includes(corner) || false;
                          const label = corner.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                          return (
                            <button
                              key={corner}
                              onClick={() => {
                                const current = config.hotspotCorners || [];
                                const next = isActive
                                  ? current.filter((c: string) => c !== corner)
                                  : [...current, corner];
                                handleUpdateConfigSetting('hotspotCorners', next);
                                if (isElectron) window.electronAPI!.setHotspots(next, config.hotspotDelay || 300);
                              }}
                              className={`px-3 py-2 border rounded-lg text-[10px] font-cyber font-bold tracking-wider transition-all cursor-pointer ${
                                isActive
                                  ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10'
                                  : 'border-slate-800 text-slate-500 hover:border-slate-700'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="border-t border-slate-900 pt-3">
                        <div className="flex justify-between items-center mb-1">
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('general_hotspot_delay')}</h5>
                          <span className="text-[var(--neon-glow-color)] font-bold">{config.hotspotDelay || 300}ms</span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 mb-2">{translate('general_hotspot_delay_desc')}</p>
                        <input
                          type="range"
                          min="0"
                          max="2000"
                          step="50"
                          value={config.hotspotDelay || 300}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            handleUpdateConfigSetting('hotspotDelay', val);
                            if (isElectron) window.electronAPI!.setHotspots(config.hotspotCorners || [], val);
                          }}
                          className="w-full accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Sonidos del Sistema */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('settings_sounds_title')}</h4>
                          <h5 className="font-cyber font-bold text-slate-300 text-xs tracking-wider mt-2.5">{translate('settings_sound_launch_enable')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('settings_sound_launch_enable_desc')}</p>
                        </div>
                        <button
                          onClick={() => handleUpdateConfigSetting('soundEnabled', config.soundEnabled !== false ? false : true)}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.soundEnabled !== false ? 'bg-[var(--neon-glow-color)]' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.soundEnabled !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {config.soundEnabled !== false && (
                        <div className="border-t border-slate-900 pt-3.5 space-y-2">
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('settings_sound_launch_path')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('settings_sound_launch_path_desc')}</p>
                          
                          <div className="flex flex-col sm:flex-row gap-2 mt-2">
                            <input
                              type="text"
                              readOnly
                              value={config.soundPath ? config.soundPath : translate('settings_sound_default_label')}
                              className="flex-1 bg-slate-950 border border-slate-900 text-slate-300 font-mono text-[10px] rounded-lg px-3 py-1.5 focus:outline-none truncate"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (isElectron) {
                                    const path = await window.electronAPI!.selectAudio();
                                    if (path) {
                                      handleUpdateConfigSetting('soundPath', path);
                                      playFolderSound(); // Play chime feedback
                                    }
                                  }
                                }}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase font-cyber"
                              >
                                {translate('settings_sound_launch_browse')}
                              </button>
                              {config.soundPath && (
                                <button
                                  onClick={() => {
                                    handleUpdateConfigSetting('soundPath', '');
                                    playFolderSound(); // Play chime feedback
                                  }}
                                  className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 hover:border-red-800/80 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase font-cyber"
                                >
                                  {translate('settings_sound_launch_reset')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cyber-Vault Security Options */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                      <div>
                        <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('vault_settings_title')}</h4>
                      </div>

                      {/* Enable PIN lock */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                        <div>
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('vault_settings_pin_enable')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('vault_settings_pin_enable_desc')}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (config.vaultPinEnabled) {
                              // Requerir verificación del PIN antes de desactivarlo
                              setShowDisablePinPrompt(true);
                              setDisablePinInput('');
                              setDisablePinError('');
                              playCyberBeep();
                            } else {
                              // Requerir configurar un PIN nuevo al activarlo
                              setShowEnablePinPrompt(true);
                              setEnablePinInput('');
                              setEnableConfirmPinInput('');
                              setEnablePinError('');
                              playCyberBeep();
                            }
                          }}
                          className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${config.vaultPinEnabled ? 'bg-purple-500' : 'bg-slate-800'}`}
                        >
                          <div className={`w-5 h-5 bg-slate-950 rounded-full transition-transform ${config.vaultPinEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Confirmación para desactivar PIN */}
                      {showDisablePinPrompt && (
                        <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 space-y-3 max-w-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-red-400 font-cyber font-bold">{translate('vault_current_pin')}:</span>
                            <input
                              type="password"
                              maxLength={4}
                              pattern="\d*"
                              value={disablePinInput}
                              onChange={async (e) => {
                                const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                setDisablePinInput(val);
                                if (val.length === 4) {
                                  const storedPin = config.vaultPin || '1234';
                                  if (val === storedPin) {
                                    await handleUpdateConfigSetting('vaultPinEnabled', false);
                                    setShowDisablePinPrompt(false);
                                    playFolderSound();
                                  } else {
                                    setDisablePinError(translate('vault_pin_wrong_current'));
                                    playPinBlockSound();
                                    setDisablePinInput('');
                                  }
                                }
                              }}
                              placeholder="••••"
                              className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                              autoFocus
                            />
                          </div>
                          {disablePinError && (
                            <div className="text-[9.5px] text-red-500 font-mono text-center font-bold tracking-wide uppercase">
                              {disablePinError}
                            </div>
                          )}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowDisablePinPrompt(false);
                                playCyberBeep();
                              }}
                              className="py-1 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer"
                            >
                              {translate('vault_btn_cancel')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Configuración de PIN al activar */}
                      {showEnablePinPrompt && (
                        <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 space-y-3 max-w-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_new_pin')}:</span>
                            <input
                              type="password"
                              maxLength={4}
                              pattern="\d*"
                              value={enablePinInput}
                              onChange={(e) => setEnablePinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                              placeholder="••••"
                              className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_confirm_pin')}:</span>
                            <input
                              type="password"
                              maxLength={4}
                              pattern="\d*"
                              value={enableConfirmPinInput}
                              onChange={(e) => setEnableConfirmPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                              placeholder="••••"
                              className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                            />
                          </div>

                          {enablePinError && (
                            <div className="text-[9.5px] text-red-500 font-mono text-center font-bold tracking-wide uppercase">
                              {enablePinError}
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowEnablePinPrompt(false);
                                playCyberBeep();
                              }}
                              className="py-1 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer"
                            >
                              {translate('vault_btn_cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (enablePinInput.length !== 4) {
                                  setEnablePinError(langCode === 'es' ? 'EL PIN DEBE TENER 4 DÍGITOS' : 'PIN MUST BE 4 DIGITS');
                                  playPinBlockSound();
                                  return;
                                }
                                if (enablePinInput !== enableConfirmPinInput) {
                                  setEnablePinError(translate('vault_pin_mismatch'));
                                  playPinBlockSound();
                                  return;
                                }
                                await handleUpdateConfigSetting('vaultPin', enablePinInput);
                                await handleUpdateConfigSetting('vaultPinEnabled', true);
                                setEnablePinError('');
                                setShowEnablePinPrompt(false);
                                playFolderSound();
                              }}
                              className="py-1 px-3 bg-purple-600 border border-purple-500 hover:bg-purple-500 text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                            >
                              {translate('vault_btn_save')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Set PIN Code */}
                      {config.vaultPinEnabled && (
                        <div className="border-t border-slate-900 pt-3 space-y-2">
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('vault_settings_pin_code')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('vault_settings_pin_code_desc')}</p>
                          
                          {!showChangePinForm ? (
                            <button
                              onClick={() => {
                                setShowChangePinForm(true);
                                setCurrentPinInput('');
                                setNewPinInput('');
                                setConfirmPinInput('');
                                setChangePinError('');
                                setChangePinSuccess(false);
                                playCyberBeep();
                              }}
                              className="py-1.5 px-4 bg-purple-950/20 border border-purple-500/30 hover:border-purple-500/60 text-purple-400 hover:text-purple-300 text-xs font-cyber font-bold tracking-wider rounded-lg transition-all cursor-pointer"
                            >
                              {translate('vault_change_pin_btn')}
                            </button>
                          ) : (
                            <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 space-y-3 max-w-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_current_pin')}:</span>
                                <input
                                  type="password"
                                  maxLength={4}
                                  pattern="\d*"
                                  value={currentPinInput}
                                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                  placeholder="••••"
                                  className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_new_pin')}:</span>
                                <input
                                  type="password"
                                  maxLength={4}
                                  pattern="\d*"
                                  value={newPinInput}
                                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                  placeholder="••••"
                                  className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_confirm_pin')}:</span>
                                <input
                                  type="password"
                                  maxLength={4}
                                  pattern="\d*"
                                  value={confirmPinInput}
                                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                  placeholder="••••"
                                  className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                                />
                              </div>

                              {changePinError && (
                                <div className="text-[9.5px] text-red-500 font-mono text-center font-bold tracking-wide uppercase">
                                  {changePinError}
                                </div>
                              )}

                              {changePinSuccess && (
                                <div className="text-[9.5px] text-emerald-400 font-mono text-center font-bold tracking-wide uppercase animate-pulse">
                                  {translate('vault_pin_changed_success')}
                                </div>
                              )}

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowChangePinForm(false);
                                    playCyberBeep();
                                  }}
                                  className="py-1 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer"
                                >
                                  {translate('vault_btn_cancel')}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const storedPin = config.vaultPin || '1234';
                                    if (currentPinInput !== storedPin) {
                                      setChangePinError(translate('vault_pin_wrong_current'));
                                      playPinBlockSound();
                                      return;
                                    }
                                    if (newPinInput.length !== 4) {
                                      setChangePinError(langCode === 'es' ? 'EL PIN DEBE TENER 4 DÍGITOS' : 'PIN MUST BE 4 DIGITS');
                                      playPinBlockSound();
                                      return;
                                    }
                                    if (newPinInput !== confirmPinInput) {
                                      setChangePinError(translate('vault_pin_mismatch'));
                                      playPinBlockSound();
                                      return;
                                    }
                                    await handleUpdateConfigSetting('vaultPin', newPinInput);
                                    setChangePinError('');
                                    setChangePinSuccess(true);
                                    playFolderSound();
                                    setTimeout(() => {
                                      setShowChangePinForm(false);
                                      setChangePinSuccess(false);
                                    }, 1500);
                                  }}
                                  className="py-1 px-3 bg-purple-600 border border-purple-500 hover:bg-purple-500 text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                                >
                                  {translate('vault_btn_save')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Vault Lock Timeout */}
                      {config.vaultPinEnabled && (
                        <div className="border-t border-slate-900 pt-3 space-y-2">
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('vault_settings_timeout')}</h5>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">{translate('vault_settings_timeout_desc')}</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { val: 0, label: translate('vault_timeout_immediate') },
                              { val: 1, label: translate('vault_timeout_1m') },
                              { val: 5, label: translate('vault_timeout_5m') },
                              { val: 15, label: translate('vault_timeout_15m') },
                              { val: -1, label: translate('vault_timeout_session') }
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                onClick={() => handleUpdateConfigSetting('vaultLockTimeout', opt.val)}
                                className={`px-3 py-1.5 border rounded-lg text-[10px] font-cyber font-bold transition-all cursor-pointer ${
                                  config.vaultLockTimeout === opt.val
                                    ? 'border-purple-500 text-purple-400 bg-purple-950/10'
                                    : 'border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* 2. INTERFACE CORE (APPEARANCE) SETTINGS */}
                {settingsTab === 'appearance' && (
                  <div className="space-y-6 max-w-2xl font-mono text-xs">
                    
                    {/* Presets de Color */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('app_theme_presets')}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 mb-3">{translate('app_theme_presets_desc')}</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'cyan', name: translate('preset_cyan'), color: 'text-cyan-400 bg-cyan-950/15' },
                          { id: 'purple', name: translate('preset_purple'), color: 'text-purple-400 bg-purple-950/15' },
                          { id: 'amber', name: translate('preset_amber'), color: 'text-amber-500 bg-amber-950/15' },
                          { id: 'crimson', name: translate('preset_crimson'), color: 'text-red-500 bg-red-950/15' },
                          { id: 'emerald', name: translate('preset_emerald'), color: 'text-emerald-400 bg-emerald-950/15' },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => handleUpdateConfigSetting('theme', preset.id)}
                            className={`py-2 px-3 border rounded-lg text-left text-xs font-cyber font-bold flex items-center justify-between cursor-pointer ${config.theme === preset.id ? 'border-[var(--neon-glow-color)] text-white bg-slate-900 shadow-[0_0_8px_var(--neon-glow-color-raw)]' : 'border-slate-900 text-slate-500 hover:border-slate-800'}`}
                          >
                            <span>{preset.name}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${preset.id === 'cyan' ? 'bg-cyan-400' : preset.id === 'purple' ? 'bg-purple-400' : preset.id === 'amber' ? 'bg-amber-500' : preset.id === 'crimson' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selector de Tipo de Fondo */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('app_bg_type')}</h4>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          { id: 'solid', name: translate('app_bg_type_solid') },
                          { id: 'gradient', name: translate('app_bg_type_gradient') },
                          { id: 'image', name: translate('app_bg_type_image') }
                        ].map((type) => (
                          <button
                            key={type.id}
                            onClick={() => { handleUpdateConfigSetting('bgType', type.id); playCyberBeep(); }}
                            className={`py-2 px-3 border rounded-lg text-center text-xs font-cyber font-bold transition-all cursor-pointer ${
                              config.bgType === type.id 
                                ? 'border-[var(--neon-glow-color)] text-white bg-slate-900 shadow-[0_0_8px_var(--neon-glow-color-raw)]' 
                                : 'border-slate-900 text-slate-500 hover:border-slate-800'
                            }`}
                          >
                            {type.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Controles Dinámicos Según Tipo de Fondo */}
                    {config.bgType === 'solid' && (
                      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-3">
                        <div>
                          <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('app_bg_solid_color')}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 mb-2.5">{translate('app_bg_solid_color_desc')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={config.bgSolidColor || '#070b13'}
                            onChange={(e) => handleUpdateConfigSetting('bgSolidColor', e.target.value)}
                            className="w-10 h-10 rounded border border-slate-800 bg-transparent cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={config.bgSolidColor || '#070b13'}
                            onChange={(e) => handleUpdateConfigSetting('bgSolidColor', e.target.value)}
                            placeholder="#070b13"
                            className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs font-mono w-28 uppercase"
                          />
                          <button
                            onClick={() => handleUpdateConfigSetting('bgSolidColor', '#070b13')}
                            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            RESET (#070B13)
                          </button>
                        </div>
                      </div>
                    )}

                    {config.bgType === 'gradient' && (
                      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-3">
                        <div>
                          <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('app_bg_gradients')}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 mb-2.5">{translate('app_bg_gradients_desc')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'preset-1', name: 'CYAN GRID', css: 'bg-gradient-to-br from-[#061826] via-[#070b13] to-[#042f40] border-cyan-800' },
                            { id: 'preset-2', name: 'PURPLE NEON', css: 'bg-gradient-to-br from-[#12072b] via-[#070b13] to-[#24083b] border-purple-800' },
                            { id: 'preset-3', name: 'AMBER DUSK', css: 'bg-gradient-to-br from-[#1c0d02] via-[#070b13] to-[#3a1a03] border-amber-800' },
                            { id: 'preset-4', name: 'CRIMSON FIRE', css: 'bg-gradient-to-br from-[#1c0202] via-[#070b13] to-[#3d0303] border-red-950' }
                          ].map((gradient) => (
                            <button
                              key={gradient.id}
                              onClick={() => { handleUpdateConfigSetting('bgGradient', gradient.id); playCyberBeep(); }}
                              className={`h-16 rounded-xl border flex flex-col justify-end p-2.5 text-left transition-all relative overflow-hidden cursor-pointer group ${gradient.css} ${
                                config.bgGradient === gradient.id 
                                  ? 'ring-2 ring-[var(--neon-glow-color)] border-white scale-[1.02] shadow-[0_0_10px_var(--neon-glow-color-raw)]' 
                                  : 'hover:scale-[1.01]'
                              }`}
                            >
                              <span className="text-[9px] font-cyber font-extrabold text-white tracking-widest group-hover:text-[var(--neon-glow-color)] transition-colors">{gradient.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {config.bgType === 'image' && (
                      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                        <div>
                          <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('app_bg_preset_images')}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 mb-2.5">{translate('app_bg_preset_images_desc')}</p>
                        </div>
                        
                        {/* Presets Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'preset-1', name: translate('preset_cyan'), path: '/backgrounds/cyber_bg_1.png' },
                            { id: 'preset-2', name: translate('preset_purple'), path: '/backgrounds/cyber_bg_2.png' },
                            { id: 'preset-3', name: translate('preset_amber'), path: '/backgrounds/cyber_bg_3.png' },
                            { id: 'preset-4', name: translate('preset_emerald'), path: '/backgrounds/cyber_bg_4.png' }
                          ].map((img) => (
                            <button
                              key={img.id}
                              onClick={() => { handleUpdateConfigSetting('bgImage', img.id); playCyberBeep(); }}
                              className={`h-20 rounded-xl border relative overflow-hidden transition-all text-left flex flex-col justify-end p-2 cursor-pointer group ${
                                config.bgImage === img.id 
                                  ? 'border-[var(--neon-glow-color)] ring-1 ring-[var(--neon-glow-color)] scale-[1.02] shadow-[0_0_10px_var(--neon-glow-color-raw)]' 
                                  : 'border-slate-950 hover:border-slate-900'
                              }`}
                            >
                              <img src={img.path} alt={img.name} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent z-1" />
                              <span className="text-[9px] font-cyber font-extrabold text-white tracking-widest relative z-2 uppercase">{img.name}</span>
                            </button>
                          ))}
                        </div>

                        {/* Custom Background Image selection */}
                        <div className="border-t border-slate-900 pt-3">
                          <h5 className="font-cyber font-bold text-white text-[10px] tracking-wider uppercase mb-1">{translate('app_bg_custom')}</h5>
                          <p className="text-[9.5px] text-slate-500 mb-2">{translate('app_bg_custom_desc')}</p>
                          
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={tempBgPath}
                              onChange={(e) => setTempBgPath(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustomBg(); }}
                              placeholder="C:\Users\...\background.png o https://..."
                              className="flex-1 bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs font-mono"
                            />
                            <button
                              onClick={handleBrowseBgImage}
                              className="px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {translate('app_bg_browse')}
                            </button>
                            <button
                              onClick={handleApplyCustomBg}
                              className="px-4.5 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[9.5px] rounded-lg border border-[var(--neon-glow-border)] transition-all cursor-pointer"
                            >
                              {translate('app_bg_apply')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sliders de Transparencia y/o Desenfoque (visibles en modos de degradado/imagen) */}
                    {(config.bgType === 'image' || config.bgType === 'gradient') && (
                      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                        
                        {config.bgType === 'image' && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('app_opacity')}</h5>
                              <span className="text-[var(--neon-glow-color)] font-bold">{config.opacity}%</span>
                            </div>
                            <p className="text-[9.5px] text-slate-500 mb-2">{translate('app_opacity_desc')}</p>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={config.opacity}
                              onChange={(e) => handleUpdateConfigSetting('opacity', parseInt(e.target.value))}
                              className="w-full accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-lg cursor-pointer"
                            />
                          </div>
                        )}

                        <div className={config.bgType === 'image' ? "border-t border-slate-900 pt-3" : ""}>
                          <div className="flex justify-between items-center mb-1">
                            <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('app_blur')}</h5>
                            <span className="text-[var(--neon-glow-color)] font-bold">{config.blurLevel}px</span>
                          </div>
                          <p className="text-[9.5px] text-slate-500 mb-2">{translate('app_blur_desc')}</p>
                          <input
                            type="range"
                            min="0"
                            max="40"
                            value={config.blurLevel}
                            onChange={(e) => handleUpdateConfigSetting('blurLevel', parseInt(e.target.value))}
                            className="w-full accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>

                      </div>
                    )}

                  </div>
                )}

                {/* 3. SYSTEM LAUNCH & SPEC SETTINGS */}
                {settingsTab === 'shortcuts' && (
                  <div className="space-y-6 max-w-2xl font-mono text-xs">
                    
                    {/* Persistencia y backups */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('sys_backup')}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 mb-3">{translate('sys_backup_desc')}</p>
                      
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={handleExportBackup}
                          className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {translate('sys_export_btn')}
                        </button>
                        <button
                          onClick={handleImportBackup}
                          className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {translate('sys_import_btn')}
                        </button>
                        <button
                          onClick={() => isElectron && window.electronAPI!.openDataFolder()}
                          className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {translate('sys_data_dir_btn')}
                        </button>
                        <button
                          onClick={() => isElectron && window.electronAPI!.openDevTools()}
                          className="py-1.5 px-4 bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          {translate('sys_diag_btn')}
                        </button>
                      </div>
                    </div>

                    {/* Administrador de carpetas físicas indexadas */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <h4 className="font-cyber font-bold text-red-400 text-xs tracking-widest">DANGER ZONE / NÚCLEO FÍSICO</h4>
                      <p className="text-[10px] text-slate-500 mt-1 mb-3">Vaciar completamente la memoria de accesos inyectados de CyberTray.</p>
                      
                      <button
                        onClick={() => {
                          showConfirm(
                            langCode === 'es' ? 'Depurar Memoria' : 'Purge Memory',
                            langCode === 'es' 
                              ? '¿Vaciar memoria indexada por completo? Esta acción es irreversible.' 
                              : 'Purge indexed memory completely? This action is irreversible.',
                            async () => {
                              await saveDataToConfig([], INITIAL_CATEGORIES);
                              showAlert(
                                langCode === 'es' ? 'Memoria Depurada' : 'Memory Purged',
                                langCode === 'es' ? 'Base de datos depurada.' : 'Database cleared successfully.'
                              );
                            },
                            true
                          );
                        }}
                        className="py-1.5 px-4 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        PURGE ALL MEMORY
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL: PROCESS MATRIX (Standalone) ── */}
      <AnimatePresence>
        {showProcessMatrixModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProcessMatrixModal(false)}
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: 'spring', damping: 24, stiffness: 200 }}
              className="fixed inset-x-4 top-16 bottom-10 z-[80] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl flex flex-col pt-5 px-5 max-w-3xl mx-auto rounded-xl select-none overflow-hidden font-mono"
            >
              {/* Modal Header with title, sort, counter and close button */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3 shrink-0">
                <div>
                  <h3 className="font-cyber font-bold text-white text-sm tracking-widest">{translate('tab_process_matrix')}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {langCode === 'es'
                      ? 'Monitoreo de telemetría activa de la red y terminación de subprocesos.'
                      : 'Active network telemetry monitoring and subprocess termination.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-[10px] text-slate-400 mr-1">
                    {langCode === 'es' ? 'PROCESOS: ' : 'PROCESSES: '}
                    <span className="text-emerald-400 font-bold">
                      {runningProcesses.filter(p =>
                        p.name.toLowerCase().includes(processSearchQuery.toLowerCase()) ||
                        p.pid.toString().includes(processSearchQuery) ||
                        (p.path && p.path.toLowerCase().includes(processSearchQuery.toLowerCase()))
                      ).length}
                    </span>
                  </div>
                  {isElectron && (
                    <button
                      onClick={handleScanProcesses}
                      disabled={isScanningProcesses}
                      className="px-2 py-1 text-[9px] rounded border border-slate-800 hover:border-[var(--neon-glow-border)] bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer font-cyber disabled:opacity-50"
                      title={langCode === 'es' ? 'Escanear procesos activos' : 'Scan active processes'}
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isScanningProcesses ? 'animate-spin' : ''}`} />
                      {isScanningProcesses 
                        ? (langCode === 'es' ? 'ESCANEANDO' : 'SCANNING') 
                        : (langCode === 'es' ? 'ESCANEAR' : 'SCAN')}
                    </button>
                  )}
                  <button
                    onClick={() => setShowProcessMatrixModal(false)}
                    className="w-7 h-7 rounded-lg border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                    title={langCode === 'es' ? 'Cerrar' : 'Close'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden min-h-0">
                <ProcessMatrixView
                  runningProcesses={runningProcesses}
                  processSearchQuery={processSearchQuery}
                  setProcessSearchQuery={setProcessSearchQuery}
                  processSortOrder={processSortOrder}
                  setProcessSortOrder={setProcessSortOrder}
                  langCode={langCode}
                  showConfirm={showConfirm}
                  playCyberBeep={playCyberBeep}
                  setRunningProcesses={setRunningProcesses}
                  showToolbar={false}
                  onScan={handleScanProcesses}
                  isScanning={isScanningProcesses}
                />
              </div>

              {/* ── HUD STATUS BAR ── */}
              <div className="border-t border-slate-800/50 shrink-0 pt-3 pb-3 flex items-center gap-3 px-1">
                {/* VRAM */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">VRAM</span>
                  <span className="text-[10px] font-mono font-bold text-white tracking-wider">
                    {systemInfo.vram ? `${systemInfo.vram.total.toFixed(2)} GB` : '--'}
                  </span>
                </div>

                {/* Separador */}
                <div className="w-px h-5 bg-slate-800 flex-shrink-0" />

                {/* RAM */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MemoryStick className="w-4 h-4 text-[var(--neon-glow-color)]" />
                  <span className="text-[9px] font-mono text-[var(--neon-glow-color)] tracking-widest uppercase font-bold flex-shrink-0">RAM</span>
                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-[var(--neon-glow-color)] rounded-full transition-all duration-500 shadow-[0_0_8px_var(--neon-glow-color)]"
                      style={{ width: `${Math.min(100, systemInfo.memory.percent)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--neon-glow-color)] tracking-wider whitespace-nowrap flex-shrink-0">
                    {systemInfo.memory.used.toFixed(2)} / {systemInfo.memory.total.toFixed(2)} GB
                  </span>
                  <div className="px-1.5 py-0.5 rounded border border-slate-700 text-[10px] font-mono text-white tracking-wider flex-shrink-0">
                    {Math.round(systemInfo.memory.percent)}%
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL: AÑADIR / EDITAR ACCESO DIRECTO ── */}
      <AnimatePresence>
        {shortcutModal.open && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShortcutModal({ open: false })}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] z-[60] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl rounded-2xl p-6 font-mono text-xs text-left"
            >
              <h3 className="font-cyber font-bold text-white text-sm tracking-widest border-b border-slate-900 pb-3 mb-4.5">
                {shortcutModal.item ? translate('modal_title_edit') : translate('modal_title_add')}
              </h3>

              <div className="space-y-4">
                
                {/* Nombre */}
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_name')}</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShortcut(); }}
                    placeholder="Ej. Terminal Hacker"
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs"
                  />
                </div>

                {/* Ruta Física */}
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_path')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formPath}
                      onChange={(e) => setFormPath(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShortcut(); }}
                      placeholder="C:\Program Files\..."
                      className="flex-1 bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs font-mono"
                    />
                    <button
                      onClick={handleBrowseFile}
                      className="px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-bold text-xs transition-all cursor-pointer"
                    >
                      {translate('modal_btn_select_file')}
                    </button>
                  </div>
                </div>

                {/* Categoría y Retraso */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_category')}</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs"
                    >
                      {categories.filter(c => c && c.id && c.id.trim() !== '' && c.id !== 'all').map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-slate-950">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_delay')}</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formDelay}
                      onChange={(e) => setFormDelay(Math.max(0, parseInt(e.target.value) || 0))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShortcut(); }}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs"
                    />
                  </div>
                </div>

                {/* Argumentos opcionales */}
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_args')}</label>
                  <input
                    type="text"
                    value={formArgs}
                    onChange={(e) => setFormArgs(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShortcut(); }}
                    placeholder="Ej. --no-sandbox --window-size=800,600"
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs font-mono"
                  />
                </div>

                {/* Ejecutar como Administrador Toggle */}
                <div className="flex items-center justify-between bg-slate-950/40 p-3 border border-slate-900 rounded-xl">
                  <div>
                    <h5 className="font-cyber font-bold text-white text-[11px] tracking-wider uppercase">{translate('modal_label_admin')}</h5>
                    <p className="text-[9px] text-slate-500 mt-0.5">Requiere aprobación UAC de Windows al iniciar.</p>
                  </div>
                  <button
                    onClick={() => setFormAdmin(!formAdmin)}
                    className={`w-11 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${formAdmin ? 'bg-amber-500' : 'bg-slate-800'}`}
                  >
                    <div className={`w-4.5 h-4.5 bg-slate-950 rounded-full transition-transform ${formAdmin ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

              </div>

              {/* Botonera de Control */}
              <div className="flex justify-between items-center mt-6 pt-4.5 border-t border-slate-900">
                {shortcutModal.item ? (
                  <button
                    onClick={() => handleDeleteShortcut(shortcutModal.item.id)}
                    className="py-2 px-3 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-red-300 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {translate('modal_btn_delete')}
                  </button>
                ) : <div />}

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShortcutModal({ open: false })}
                    className="py-2 px-3.5 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                  >
                    {translate('modal_btn_cancel')}
                  </button>
                  <button
                    onClick={handleSaveShortcut}
                    className="py-2 px-4.5 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[10px] rounded-lg border border-[var(--neon-glow-border)] transition-all cursor-pointer"
                  >
                    {translate('modal_btn_save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL: PIN PAD PARA DESBLOQUEAR BÓVEDA ── */}
      <AnimatePresence>
        {showPinModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPinModal(false)}
              className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] z-[1001] bg-[#070b13]/95 border border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.3)] rounded-2xl p-6 font-mono text-center flex flex-col gap-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-1">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              
              <div>
                <h3 className="font-cyber font-bold text-white text-xs tracking-widest">
                  {translate('vault_locked_title')}
                </h3>
                <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">
                  {translate('vault_locked_desc')}
                </p>
              </div>

              {/* Dots display for digits entered */}
              <div className="flex justify-center gap-3 my-2.5">
                {[0, 1, 2, 3].map(idx => (
                  <div 
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                      pinInput.length > idx 
                        ? 'bg-purple-500 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] scale-110' 
                        : pinError 
                          ? 'border-red-500 bg-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                          : 'border-slate-800 bg-slate-950'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider animate-pulse">
                  {translate('vault_pin_error')}
                </div>
              )}

              {/* Numeric Keyboard Grid */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      if (pinInput.length < 4) {
                        const val = pinInput + num;
                        setPinInput(val);
                        setPinError(false);
                        playCyberBeep();
                        if (val.length === 4) {
                          // Auto check PIN code
                          setTimeout(() => handlePinSubmit(val), 250);
                        }
                      }
                    }}
                    disabled={pinInput.length >= 4}
                    className="py-2.5 bg-slate-950/60 border border-slate-900 hover:border-purple-500/40 text-slate-200 hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Clear Button */}
                <button
                  onClick={() => { setPinInput(''); setPinError(false); playCyberBeep(); }}
                  className="py-2.5 bg-slate-950/40 border border-slate-900 hover:border-red-500/40 text-red-500 hover:text-red-400 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
                >
                  CLEAR
                </button>
                
                {/* 0 Button */}
                <button
                  onClick={() => {
                    if (pinInput.length < 4) {
                      const val = pinInput + '0';
                      setPinInput(val);
                      setPinError(false);
                      playCyberBeep();
                      if (val.length === 4) {
                        setTimeout(() => handlePinSubmit(val), 250);
                      }
                    }
                  }}
                  disabled={pinInput.length >= 4}
                  className="py-2.5 bg-slate-950/60 border border-slate-900 hover:border-purple-500/40 text-slate-200 hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50"
                >
                  0
                </button>
                
                {/* Cancel Button */}
                <button
                  onClick={() => { setShowPinModal(false); playCyberBeep(); }}
                  className="py-2.5 bg-slate-950/40 border border-slate-900 hover:border-slate-800 text-slate-500 hover:text-slate-400 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
                >
                  ABORT
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL: AÑADIR NUEVA CATEGORÍA VIRTUAL ── */}
      <AnimatePresence>
        {newCatModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewCatModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 z-[60] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl rounded-2xl p-5 font-mono text-xs text-left"
            >
              <h3 className="font-cyber font-bold text-white text-xs tracking-widest border-b border-slate-900 pb-3 mb-4">
                CREATE NEW CATEGORY
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">CATEGORY ALIAS NAME</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                    placeholder="Ej. CYBER SECURITY"
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">THEME PRESET COLOR</label>
                  <div className="flex gap-2.5">
                    {['#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#10b981', '#ec4899'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewCatColor(color)}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${newCatColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-5 pt-3.5 border-t border-slate-900">
                <button
                  onClick={() => setNewCatModal(false)}
                  className="py-1.5 px-3 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAddCategory}
                  className="py-1.5 px-4 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[9.5px] rounded-lg border border-[var(--neon-glow-border)] transition-all cursor-pointer"
                >
                  CREATE
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MENÚ CONTEXTUAL DE CATEGORÍAS ── */}
      {categoryMenu && categoryMenu.visible && (
        <>
          <div 
            className="fixed inset-0 z-50 cursor-default" 
            onClick={() => setCategoryMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCategoryMenu(null); }}
          />
          <div 
            className="fixed bg-slate-950 border border-[var(--neon-glow-border)] rounded-lg shadow-2xl p-1 z-50 text-left font-mono w-40"
            style={{ 
              left: Math.min(window.innerWidth - 170, categoryMenu.x), 
              top: Math.min(window.innerHeight - 100, categoryMenu.y) 
            }}
          >
            <button 
              onClick={() => {
                const cat = categoryMenu.category;
                setCategoryMenu(null);
                if (cat.id === 'all') return;
                setRenameCatName(cat.name);
                setRenameCatModal({ open: true, category: cat });
                playCyberBeep();
              }}
              disabled={categoryMenu.category.id === 'all'}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              Rename
            </button>
            <button 
              onClick={() => {
                const cat = categoryMenu.category;
                setCategoryMenu(null);
                handleDeleteCategory(cat.id);
              }}
              disabled={categoryMenu.category.id === 'all' || categoryMenu.category.id === 'utils'}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-red-950 hover:text-red-400 disabled:opacity-40 disabled:hover:bg-transparent text-red-500 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* ── MODAL: RENOMBRAR CATEGORÍA VIRTUAL ── */}
      <AnimatePresence>
        {renameCatModal.open && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRenameCatModal({ open: false })}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 z-[60] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl rounded-2xl p-5 font-mono text-xs text-left"
            >
              <h3 className="font-cyber font-bold text-white text-xs tracking-widest border-b border-slate-900 pb-3 mb-4">
                RENAME CATEGORY
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">NEW CATEGORY ALIAS NAME</label>
                  <input
                    type="text"
                    value={renameCatName}
                    onChange={(e) => setRenameCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(); }}
                    placeholder="Ej. NEW CATEGORY NAME"
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-5 pt-3.5 border-t border-slate-900">
                <button
                  onClick={() => setRenameCatModal({ open: false })}
                  className="py-1.5 px-3 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleRenameCategory}
                  className="py-1.5 px-4 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[9.5px] rounded-lg border border-[var(--neon-glow-border)] transition-all cursor-pointer"
                >
                  SAVE
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MENÚ CONTEXTUAL DE ACCESOS DIRECTOS ── */}
      {shortcutMenu && shortcutMenu.visible && (
        <>
          <div 
            className="fixed inset-0 z-50 cursor-default" 
            onClick={() => setShortcutMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setShortcutMenu(null); }}
          />
          <div 
            className="fixed bg-slate-950 border border-[var(--neon-glow-border)] rounded-lg shadow-2xl p-1 z-50 text-left font-mono w-48"
            style={{ 
              left: Math.min(window.innerWidth - 200, shortcutMenu.x), 
              top: Math.min(window.innerHeight - 180, shortcutMenu.y) 
            }}
          >
            <button 
              onClick={() => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                handleLaunch(item);
              }}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Play className="w-3.5 h-3.5 text-slate-500" />
              {translate('menu_launch')}
            </button>
            
            <button 
              onClick={() => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                executeLaunch({ ...item, isAdmin: true });
              }}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              {translate('shortcut_run_admin')}
            </button>

            {isElectron && shortcutMenu.item.path && !/^(https?:\/\/)/i.test(shortcutMenu.item.path) && (
              <button 
                onClick={async () => {
                  const item = shortcutMenu.item;
                  setShortcutMenu(null);
                  await window.electronAPI!.openFileLocation(item.path);
                }}
                className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                {translate('menu_open_location')}
              </button>
            )}

            <button
              onClick={(e) => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                handleOpenEditModal(item, e);
              }}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              {translate('menu_edit_config')}
            </button>

            <button
              onClick={async () => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                const updated = shortcuts.map(s => {
                  if (s.id === item.id) {
                    return { ...s, isFavorite: !s.isFavorite };
                  }
                  return s;
                });
                await saveDataToConfig(updated, categories);
                playCyberBeep();
              }}
              className={`w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 flex items-center gap-2 cursor-pointer border-0 bg-transparent ${
                shortcutMenu.item.isFavorite ? 'text-amber-400 hover:text-amber-300' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-[12px]">{shortcutMenu.item.isFavorite ? '★' : '☆'}</span>
              {shortcutMenu.item.isFavorite
                ? translate('remove_from_favorites')
                : translate('add_to_favorites')
              }
            </button>

            {/* Submenú de Mover a Categoría */}
            <div className="relative group">
              <button 
                className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center justify-between cursor-pointer border-0 bg-transparent"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  {translate('menu_move_to')}
                </span>
                <span className="text-[9px] text-slate-500 font-sans">▶</span>
              </button>
              
              <div 
                className={`absolute top-0 hidden group-hover:block bg-slate-950 border border-[var(--neon-glow-border)] rounded-lg shadow-2xl p-1 w-44 z-50 ${
                  shortcutMenu.x > window.innerWidth - 380 ? 'right-full mr-0.5' : 'left-full ml-0.5'
                }`}
              >
                {categories
                  .filter(cat => cat.id !== 'all' && cat.id !== shortcutMenu.item.category && cat.id.trim() !== '')
                  .map(cat => (
                    <button
                      key={cat.id}
                      onClick={async () => {
                        const item = shortcutMenu.item;
                        setShortcutMenu(null);
                        const updatedShortcuts = shortcuts.map(s => {
                          if (s.id === item.id) {
                            return { ...s, category: cat.id };
                          }
                          return s;
                        });
                        await saveDataToConfig(updatedShortcuts, categories);
                        playCyberBeep();
                      }}
                      className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                      style={{ color: cat.color || undefined }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color || 'var(--neon-glow-color)' }} />
                      {cat.id === 'utils' ? translate('cat_utils') : cat.name}
                    </button>
                  ))}
              </div>
            </div>

            <div className="border-t border-slate-900 my-1" />

            <button
              onClick={() => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                handleDeleteShortcut(item.id);
              }}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-red-950 hover:text-red-400 text-red-500 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              {translate('menu_delete_shortcut')}
            </button>

            <div className="border-t border-slate-900 my-1" />

            {(() => {
              const proc = getShortcutProcess(shortcutMenu.item);
              if (isElectron && proc) {
                return (
                  <button
                    onClick={() => {
                      setShortcutMenu(null);
                      showConfirm(
                        langCode === 'es' ? 'Terminar Proceso' : 'Terminate Process',
                        translate('process_kill_confirm'),
                        async () => {
                          await window.electronAPI!.killProcess(proc.pid);
                          playCyberBeep();
                        },
                        true
                      );
                    }}
                    className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-red-950/40 hover:text-red-400 text-red-500 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                  >
                    <Power className="w-3.5 h-3.5 text-red-500" />
                    {translate('menu_kill_process')} ({Math.round(proc.memory / (1024 * 1024))} MB)
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </>
      )}
      <AnimatePresence>
        {confirmModal.open && (
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[100000] animate-fade-in"
            onClick={() => setConfirmModal({ ...confirmModal, open: false })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 26, stiffness: 330 }}
              className={`w-[380px] bg-slate-950/95 border ${
                confirmModal.danger ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-[var(--neon-glow-border)] shadow-[0_0_20px_var(--neon-glow-color-raw)]'
              } rounded-xl p-6 flex flex-col gap-5`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex gap-4 items-start">
                <div 
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                    confirmModal.danger 
                      ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                      : 'bg-[var(--neon-glow-color-raw)]/10 border-[var(--neon-glow-border)] text-[var(--neon-glow-color)] shadow-[0_0_10px_var(--neon-glow-color-raw)]'
                  }`}
                >
                  {confirmModal.danger ? (
                    <Trash2 className="w-6 h-6 animate-pulse" />
                  ) : (
                    <Shield className="w-6 h-6 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-cyber font-bold text-[13px] text-white tracking-widest uppercase truncate">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                {!confirmModal.isAlert && (
                  <button
                    onClick={() => {
                      setConfirmModal({ ...confirmModal, open: false });
                      playCyberBeep();
                    }}
                    className="py-1.5 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-cyber font-bold tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    {langCode === 'es' ? 'ABORTAR' : 'ABORT'}
                  </button>
                )}
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal({ ...confirmModal, open: false });
                    playCyberBeep();
                  }}
                  className={`py-1.5 px-4 text-xs font-cyber font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                    confirmModal.danger
                      ? 'bg-red-600 border border-red-500 hover:bg-red-500 text-white hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                      : 'bg-[var(--neon-glow-color-raw)] border border-[var(--neon-glow-border)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 hover:shadow-[0_0_10px_var(--neon-glow-color)]'
                  }`}
                >
                  {confirmModal.isAlert 
                    ? (langCode === 'es' ? 'ENTENDIDO' : 'ACKNOWLEDGE') 
                    : (langCode === 'es' ? 'CONFIRMAR' : 'CONFIRM')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: ABOUT CYBERTRAY ── */}
      <AnimatePresence>
        {showAboutModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAboutModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] z-[60] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl rounded-2xl p-6 font-mono text-xs text-left"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4.5">
                <h3 className="font-cyber font-bold text-white text-sm tracking-widest uppercase">
                  {translate('about_title')}
                </h3>
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="w-7 h-7 rounded-lg border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 py-2">
                <CyberTrayLogo className="w-16 h-16 animate-pulse" animated={false} />
                
                <div>
                  <h4 className="font-cyber font-bold text-lg text-white tracking-widest uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    CyberTray
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 tracking-wider font-semibold">
                    NEURAL DOCK STATION
                  </p>
                </div>

                <div className="w-full bg-slate-950/50 border border-slate-900 rounded-xl p-3.5 space-y-2.5 text-left text-[11px]">
                  <div className="flex justify-between items-center border-b border-slate-900/60 pb-1.5">
                    <span className="text-slate-400 font-cyber text-[10px] tracking-wider uppercase">{translate('about_version')}</span>
                    <span className="text-white font-bold font-mono">v{currentVer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-cyber text-[10px] tracking-wider uppercase">{translate('about_developer')}</span>
                    <span className="text-[var(--neon-glow-color)] font-bold font-cyber tracking-widest uppercase">CyberGems</span>
                  </div>
                </div>

                {/* Auto Update Check Toggle */}
                <div className="w-full flex items-center justify-between bg-slate-950/40 p-3 border border-slate-900 rounded-xl text-left">
                  <div>
                    <h5 className="font-cyber font-bold text-white text-[11px] tracking-wider uppercase">{translate('about_auto_check')}</h5>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">{translate('about_auto_check_desc')}</p>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = config.autoCheckUpdates === false;
                      handleUpdateConfigSetting('autoCheckUpdates', nextVal);
                      playCyberBeep();
                    }}
                    className={`w-11 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer flex-shrink-0 ${config.autoCheckUpdates !== false ? 'bg-[var(--neon-glow-color-raw)]' : 'bg-slate-800'}`}
                  >
                    <div className={`w-4.5 h-4.5 bg-slate-950 rounded-full transition-transform ${config.autoCheckUpdates !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Update Checker Panel */}
                <div className="w-full pt-2">
                  {updateCheckState.status === 'idle' && (
                    <button
                      onClick={() => { checkForUpdates(true); playCyberBeep(); }}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white font-cyber font-bold tracking-widest text-[10px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {translate('about_check_updates_btn')}
                    </button>
                  )}

                  {updateCheckState.status === 'scanning' && (
                    <div className="w-full py-2.5 bg-slate-950/50 border border-slate-900 rounded-xl text-slate-400 flex items-center justify-center gap-2.5 font-bold tracking-widest text-[9.5px]">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--neon-glow-color)]" />
                      {translate('update_scanning')}
                    </div>
                  )}

                  {updateCheckState.status === 'up-to-date' && (
                    <div className="space-y-2.5 w-full">
                      <div className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center justify-center gap-2 font-bold tracking-widest text-[9.5px]">
                        <Check className="w-4 h-4 text-emerald-400" />
                        {translate('update_up_to_date', { ver: `v${currentVer}` })}
                      </div>
                      <button
                        onClick={() => { checkForUpdates(true); playCyberBeep(); }}
                        className="w-full py-1.5 bg-transparent hover:bg-slate-900/40 border border-slate-900 text-slate-500 hover:text-slate-300 text-[9px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        {translate('about_check_updates_btn')}
                      </button>
                    </div>
                  )}

                  {updateCheckState.status === 'update-available' && (
                    <div className="space-y-2.5 w-full">
                      <div className="w-full py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 flex items-center justify-center gap-2 font-bold tracking-widest text-[9.5px] uppercase">
                        <Info className="w-4 h-4 text-blue-400 animate-pulse" />
                        {translate('update_available', { ver: updateCheckState.latestVersion || '' })}
                      </div>
                      <button
                        onClick={() => {
                          if (isElectron) {
                            window.electronAPI!.launchApp('https://github.com/CyberGems/CyberTray/releases/latest');
                          } else {
                            window.open('https://github.com/CyberGems/CyberTray/releases/latest', '_blank');
                          }
                          playCyberBeep();
                        }}
                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-cyber font-bold tracking-widest text-[10px] rounded-xl border border-blue-400 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {translate('update_download_btn')}
                      </button>
                    </div>
                  )}

                  {updateCheckState.status === 'failed' && (
                    <div className="space-y-2.5 w-full">
                      <div className="w-full py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-center gap-2 font-bold tracking-widest text-[9.5px]">
                        <X className="w-4 h-4 text-red-400" />
                        {translate('update_failed')}
                      </div>
                      <button
                        onClick={() => { checkForUpdates(true); playCyberBeep(); }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white font-cyber font-bold tracking-widest text-[10px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {translate('about_check_updates_btn')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
