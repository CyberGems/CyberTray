import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { translate, setLocale } from './locales';
import { motion, AnimatePresence } from 'motion/react';
import ProcessMatrixModal from './components/ProcessMatrixModal';
import ShortcutFormModal, { ShortcutDraft } from './components/ShortcutFormModal';
import CyberTrayLogo, { CyberTrayWordmark } from './components/CyberTrayLogo';
import ShortcutGrid from './components/ShortcutGrid';
import TelemetryBar from './components/TelemetryBar';
import ToastStack from './components/ToastStack';
import SettingsPanel, { type SettingsTab } from './components/SettingsPanel';
import PinPadModal from './components/PinPadModal';
import AboutModal, { UpdateStatus, peekReleaseNotes } from './components/AboutModal';
import ShelfOverlays from './components/ShelfOverlays';
import ImportSyncModal from './components/ImportSyncModal';
import OnboardingModal from './components/OnboardingModal';
import BootLoader from './components/BootLoader';
import FolderTree from './components/FolderTree';
import NotificationCenter from './components/NotificationCenter';
import { emptyNotificationState, type NotificationState } from './lib/notificationCenter';
import {
  isElectron,
  getDefaultCategories,
  FOLDER_SCHEMA_VERSION,
  normalizeCategoriesList,
  normalizeShortcutsList,
  createFolderId,
  getChildFolders,
  getDescendantFolderIds,
  getFolderPath,
  densityFromIconSize,
  isVaultLockedState,
  UNCATEGORIZED_ID,
  ICON_SIZE_MIN,
  ICON_SIZE_MAX,
} from './lib/appUtils';
import { hashPin, verifyPin } from './lib/pin';
import { createDefaultConfig, applyLegacyDefaults } from './lib/configDefaults';
import { localResourceUrl, shortcutIconSrc } from './lib/iconSrc';
import ShortcutGlyph from './components/ShortcutGlyph';
import { useBundledAssetUrl } from './lib/useBundledAsset';
import {
  Search, Plus, Settings, X, Trash2, Info,
  Pin, Play, ArrowDown, Shrink, MoreHorizontal,
  RefreshCw, Check, Activity, Lock, FolderOpen,
  CheckSquare, Heart, BookOpen, HelpCircle, Tag, Globe, Sliders, History
} from 'lucide-react';

let globalAudioCtx: AudioContext | null = null;
const DEFAULT_LAUNCH_SOUND = '/sounds/launch-thud.wav';
// PIN que usaba CyberTray antes de hashearlo. Solo se usa para derivar el
// hash de instalaciones antiguas que nunca tocaron el PIN.
const LEGACY_DEFAULT_PIN = '1234';
// Tiempo mínimo que se muestra la pantalla de arranque, para que la carga
// instantánea no se perciba como un parpadeo.
const BOOT_MIN_DURATION_MS = 550;
// Ajustes que se guardan con retardo (controles deslizantes).
const DEBOUNCED_CONFIG_KEYS = new Set(['iconSize', 'opacity', 'blurLevel', 'hotspotDelay']);

export default function App() {
  // Configuración de la App (defaults compartidos con el proceso main)
  const [config, setConfig] = useState<any>(createDefaultConfig());


  // Base de datos de Accesos Directos y Categorías
  const [categories, setCategories] = useState<any[]>(getDefaultCategories());
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // UI States
  const [isPinned, setIsPinned] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showImportSync, setShowImportSync] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);
  const [booting, setBooting] = useState<boolean>(true);
  const bootStartedAtRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const onboardingCheckedRef = useRef<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  const [iconSortOrder, setIconSortOrder] = useState<'alpha' | 'recent' | 'added'>(
    () => (localStorage.getItem('cybertray_icon_sort') as 'alpha' | 'recent' | 'added') || 'alpha'
  );
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationState>(emptyNotificationState);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cybertray_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('cybertray_icon_sort', iconSortOrder);
  }, [iconSortOrder]);
  
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
    shiftX: number;
  }>({ text: '', x: 0, y: 0, placement: 'top', visible: false, shiftX: 0 });
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipNodeRef = useRef<HTMLDivElement | null>(null);

  const showTooltip = useCallback((e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const extraLines = subText ? subText.split('\n').length : 0;
    const estimatedHeight = 36 + extraLines * 16;
    let y = rect.bottom + 8;
    let placement: 'top' | 'bottom' = 'bottom';
    if (y + estimatedHeight > window.innerHeight - 8) {
      y = Math.max(8, rect.top - 8);
      placement = 'top';
    }
    y = Math.max(8, Math.min(y, window.innerHeight - 8));

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => {
      tooltipTimerRef.current = null;
      setGlobalTooltip({
        text,
        subText,
        borderColor: borderColor || 'var(--neon-glow-border)',
        x,
        y,
        placement,
        visible: true,
        shiftX: 0,
      });
    }, 450);
  }, []);

  const hideTooltip = useCallback(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    setGlobalTooltip(prev => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  useLayoutEffect(() => {
    if (!globalTooltip.visible) return;
    const node = tooltipNodeRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const pad = 8;
    let dx = 0;
    if (r.right > window.innerWidth - pad) dx = (window.innerWidth - pad) - r.right;
    if (r.left + dx < pad) dx = pad - r.left;
    if (Math.abs(dx) > 0.5) {
      setGlobalTooltip(prev => ({ ...prev, shiftX: prev.shiftX + dx }));
    }
  }, [globalTooltip.visible, globalTooltip.x, globalTooltip.y, globalTooltip.text, globalTooltip.subText, globalTooltip.shiftX]);

  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
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

  const isVaultLocked = () => isVaultLockedState({
    pinEnabled: configRef.current?.vaultPinEnabled,
    pinConfigured: !!configRef.current?.vaultPinHash,
    lockTimeout: configRef.current?.vaultLockTimeout,
    unlockedSession: vaultUnlockedSession,
    lastUnlockTime: lastVaultUnlockTime,
  });

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

  const handlePinSubmit = async (enteredPin: string) => {
    const current = configRef.current || {};
    const isValid = await verifyPin(enteredPin, current.vaultPinHash, current.vaultPinSalt);
    if (isValid) {
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
  const [shortcutModal, setShortcutModal] = useState<{ open: boolean; item?: any; batchItems?: ShortcutDraft[] }>({ open: false });
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

  const closeImportSync = useCallback(() => setShowImportSync(false), []);
  const openImportSync = useCallback(() => {
    setShowSettings(false);
    setShowImportSync(true);
  }, []);
  const handleImportApplied = useCallback((result: { created?: number; updated?: number; removed?: number; undone?: boolean }) => {
    if (result.undone) {
      pushToast('success', translate('import_undone'));
      return;
    }
    pushToast('success', translate('import_applied', {
      created: String(result.created || 0),
      updated: String(result.updated || 0),
      removed: String(result.removed || 0),
    }));
  }, []);

  // ── Selección múltiple / borrado en masa ──
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const lassoStart = useRef<{ x: number; y: number } | null>(null);
  const lassoAdditive = useRef<boolean>(false);
  const lastSelectedIndex = useRef<number | null>(null);
  const gridScrollRef = useRef<HTMLElement | null>(null);

  const [shortcutMenu, setShortcutMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: any;
  } | null>(null);

  // Refs
  const configRef = useRef<any>(config);
  const usagePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Última revisión de configuración aplicada. Permite descartar recargas
  // obsoletas que habrían revertido un cambio más reciente.
  const appliedConfigRevRef = useRef(0);
  const pendingUsageRef = useRef<{ shortcuts: any[]; totalLaunches: number } | null>(null);
  const shortcutsRef = useRef<any[]>(shortcuts);
  const pendingLaunchTimersRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const handleTogglePinRef = useRef<(() => void | Promise<void>) | null>(null);
  const launchAudioRef = useRef<HTMLAudioElement | null>(null);
  const folderAudioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isMoreMenuOpen]);

  // Centro de notificaciones: estado inicial y cambios empujados desde el main.
  useEffect(() => {
    if (!isElectron) return;
    let cancelled = false;
    void window.electronAPI!.notifications.list().then((next) => {
      if (!cancelled) setNotifications(next);
    });
    const offChanged = window.electronAPI!.notifications.onChanged((next) => setNotifications(next));
    const offOpen = window.electronAPI!.notifications.onOpenCenter(() => {
      setIsNotificationCenterOpen(true);
      setIsMoreMenuOpen(false);
      setShowSettings(false);
    });
    return () => {
      cancelled = true;
      offChanged();
      offOpen();
    };
  }, []);

  const handleMarkNotificationsSeen = (ids: string[]) => {
    if (!isElectron || ids.length === 0) return;
    void window.electronAPI!.notifications.markSeen(ids).then(setNotifications);
  };

  const handleRemoveNotifications = (ids: string[]) => {
    if (!isElectron || ids.length === 0) return;
    void window.electronAPI!.notifications.remove(ids).then(setNotifications);
  };

  const handleClearNotifications = () => {
    if (!isElectron) return;
    showConfirm(
      translate('notifications_clear_confirm_title'),
      translate('notifications_clear_confirm_desc'),
      () => {
        void window.electronAPI!.notifications.clear().then(setNotifications);
      },
      true,
    );
  };

  const handleAddNotificationItems = async (keys: string[], folderId: string) => {
    if (!isElectron) return { success: false, added: 0 };
    const result = await window.electronAPI!.notifications.addItems({ keys, categoryId: folderId });
    if (result.added > 0) {
      pushToast('success', translate('notifications_added', { count: String(result.added) }));
    } else {
      pushToast('error', translate('notifications_add_failed'));
    }
    return { success: result.success, added: result.added };
  };

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Temporizadores de los lanzamientos retardados: se limpian al desmontar
  // para que un acceso no se lance cuando la app ya no lo muestra.
  useEffect(() => {
    const timers = pendingLaunchTimersRef.current;
    return () => {
      timers.forEach((timer) => clearInterval(timer));
      timers.clear();
    };
  }, []);

  // Atajos del modo selección: Esc sale, Ctrl/Cmd+A selecciona todo, Delete borra.
  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === 'Escape') {
        exitSelectionMode();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectionMode, selectedIds]);

  // Preload and initialize audio objects to eliminate playback delay
  useEffect(() => {
    // Initialize folder tab sound
    let cancelled = false;
    const setup = async () => {
      try {
        const url = isElectron
          ? await window.electronAPI!.getBundledAssetUrl('sounds/cybertrayfolders.mp3')
          : '/sounds/cybertrayfolders.mp3';
        if (cancelled || !url) return;
        const audio = new Audio(url);
        audio.volume = 0.15;
        audio.load();
        folderAudioRef.current = audio;
      } catch (err) {
        console.error('Error preloading folder audio:', err);
      }
    };
    void setup();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const soundEnabled = config.soundEnabled !== false;
    const soundPath = config.soundPath || '';
    if (!soundEnabled) {
      launchAudioRef.current = null;
      return;
    }
    let cancelled = false;
    const setup = async () => {
      try {
        let url: string | null = null;
        if (soundPath) {
          url = soundPath.startsWith('http') || soundPath.startsWith('data:')
            ? soundPath
            : localResourceUrl(soundPath);
        } else if (isElectron) {
          // Chromium no decodifica audio servido por file://: se usa el protocolo propio.
          url = await window.electronAPI!.getBundledAssetUrl('sounds/launch-thud.wav');
        } else {
          url = DEFAULT_LAUNCH_SOUND;
        }
        if (cancelled || !url) return;
        const audio = new Audio(url);
        audio.volume = 0.25;
        audio.load(); // Force preload
        launchAudioRef.current = audio;
      } catch (err) {
        console.error('Error preloading launch audio:', err);
      }
    };
    void setup();
    return () => { cancelled = true; };
  }, [config.soundEnabled, config.soundPath]);
  
  // Form de Accesos Directos
  const [formName, setFormName] = useState<string>('');
  const [formPath, setFormPath] = useState<string>('');
  const [formArgs, setFormArgs] = useState<string>('');
  const [formCwd, setFormCwd] = useState<string>('');
  const [formDelay, setFormDelay] = useState<number>(0);
  const [formCategory, setFormCategory] = useState<string>(UNCATEGORIZED_ID);
  const [formAdmin, setFormAdmin] = useState<boolean>(false);
  const [formHotkey, setFormHotkey] = useState<string>('');
  const [formIconPath, setFormIconPath] = useState<string>('');
  const [formFavorite, setFormFavorite] = useState<boolean>(false);
  const [formPinToTaskbar, setFormPinToTaskbar] = useState<boolean>(false);

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
  const [disks, setDisks] = useState<any[]>([]);
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
    const applyConfig = (loadedConfig: any) => {
      if (!loadedConfig) return;
      const revision = typeof loadedConfig.__rev === 'number' ? loadedConfig.__rev : 0;
      if (revision && revision < appliedConfigRevRef.current) return;
      if (revision) appliedConfigRevRef.current = revision;

      const resolvedAutoUpdate = typeof loadedConfig.autoUpdate === 'boolean'
        ? loadedConfig.autoUpdate
        : loadedConfig.autoCheckUpdates !== false;
      const configWithFolderSchema = {
        ...createDefaultConfig(),
        ...loadedConfig,
        folderSchemaVersion: loadedConfig.folderSchemaVersion || FOLDER_SCHEMA_VERSION,
        autoUpdate: resolvedAutoUpdate,
      };
      // Defaults que cambiaron después de publicarse (p. ej. los 10 s del
      // aviso): el config guardado los conserva viejos y hay que migrarlos.
      const legacy = applyLegacyDefaults(configWithFolderSchema);
      const configWithLegacyDefaults = legacy.config;

      // El PIN de la bóveda solo se guarda hasheado. Si el config viene de
      // una versión antigua (PIN en claro) o no tiene hash pero la bóveda
      // está activa, se deriva ahora y se descarta el valor en claro.
      const legacyPin = typeof configWithFolderSchema.vaultPin === 'string'
        ? configWithFolderSchema.vaultPin
        : '';
      const needsPinDerivation =
        !configWithFolderSchema.vaultPinHash &&
        (legacyPin.length > 0 || configWithFolderSchema.vaultPinEnabled === true);
      const effectiveConfig: any = { ...configWithLegacyDefaults };
      delete effectiveConfig.vaultPin;
      delete effectiveConfig.__rev;

      setConfig(effectiveConfig);
      if (loadedConfig.alwaysOnTop !== undefined) {
        setIsPinned(loadedConfig.alwaysOnTop);
      }
      if (loadedConfig.language) {
        setLangCode(loadedConfig.language);
        setLocale(loadedConfig.language);
      }
      const sanitizedCategories = normalizeCategoriesList(loadedConfig.categoriesList || getDefaultCategories());
      const sanitizedShortcuts = normalizeShortcutsList(loadedConfig.shortcutsList || [], sanitizedCategories);
      setCategories(sanitizedCategories);
      setShortcuts(sanitizedShortcuts);
      shortcutsRef.current = sanitizedShortcuts;
      return {
        effectiveConfig,
        sanitizedCategories,
        sanitizedShortcuts,
        legacyPin,
        needsPinDerivation,
        needsSchemaUpgrade: loadedConfig.folderSchemaVersion !== FOLDER_SCHEMA_VERSION,
        needsLegacyDefaults: legacy.changed,
      };
    };

    // Cargar Configuración Central y Atajos
    const fetchConfig = async (providedConfig?: any) => {
      if (isElectron) {
        // Cargar config general de Electron
        const loadedConfig = providedConfig ?? await window.electronAPI!.loadConfig();
        const applied = applyConfig(loadedConfig);
        if (applied && (applied.needsPinDerivation || applied.needsSchemaUpgrade || applied.needsLegacyDefaults)) {
          if (applied.needsPinDerivation) {
            try {
              const derived = await hashPin(applied.legacyPin || LEGACY_DEFAULT_PIN);
              applied.effectiveConfig.vaultPinHash = derived.hash;
              applied.effectiveConfig.vaultPinSalt = derived.salt;
              setConfig(applied.effectiveConfig);
            } catch (err) {
              console.error('No se pudo derivar el hash del PIN de la bóveda:', err);
            }
          }
          await window.electronAPI!.saveConfig({
            ...applied.effectiveConfig,
            folderSchemaVersion: FOLDER_SCHEMA_VERSION,
            categoriesList: applied.sanitizedCategories,
            shortcutsList: applied.sanitizedShortcuts,
          }, { broadcastReload: false });
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
      setConfigLoaded(true);
    };

    fetchConfig();

    // Listener para recarga de configuración
    if (isElectron) {
      const unsub = window.electronAPI!.onReloadConfig((nextConfig) => {
        // El proceso main envía la config ya normalizada: no hace falta releer el disco.
        if (nextConfig) {
          void fetchConfig(nextConfig);
        } else {
          void fetchConfig();
        }
      });
      return () => unsub();
    }
  }, []);

  // La pantalla de arranque se queda un instante mínimo aunque la config
  // cargue al instante: sin eso se ve un parpadeo en lugar de una transición.
  useEffect(() => {
    if (!configLoaded) {
      // Red de seguridad: si la carga se atasca, no se deja la ventana tapada.
      const failsafe = setTimeout(() => setBooting(false), 8000);
      return () => clearTimeout(failsafe);
    }
    const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - bootStartedAtRef.current;
    const remaining = Math.max(0, BOOT_MIN_DURATION_MS - elapsed);
    const timer = setTimeout(() => setBooting(false), remaining);
    return () => clearTimeout(timer);
  }, [configLoaded]);

  // El asistente de primer inicio solo aparece en instalaciones nuevas: sin
  // accesos guardados y sin haberlo completado antes. Nunca se repite.
  useEffect(() => {
    if (!isElectron || !configLoaded || onboardingCheckedRef.current) return;
    onboardingCheckedRef.current = true;
    if (configRef.current?.onboardingDone !== true && (shortcutsRef.current || []).length === 0) {
      setShowOnboarding(true);
    }
  }, [configLoaded]);

  // Listen to shelf visibility change to suspend/resume process monitoring
  useEffect(() => {
    if (isElectron) {
      const unsub = window.electronAPI!.onShelfStateChange((visible) => {
        setIsShelfVisible(visible);
      });
      return () => unsub();
    }
  }, []);

  // El modal de importación guarda en memoria el plan escaneado. Si el panel se
  // ocultara al perder el foco, React desmontaría el árbol entero (ver el
  // `if (!isShelfVisible)` del render) y ese trabajo se perdería. Mientras el
  // modal está abierto se retiene el panel: solo se cierra de forma manual.
  useEffect(() => {
    if (!isElectron) return;
    const api = window.electronAPI;
    if (!api?.setShelfHold) return;
    // Al ocultarse el panel la retención se libera; si vuelve a mostrarse con
    // el modal todavía abierto se vuelve a pedir.
    if (!showImportSync || !isShelfVisible) return;
    void api.setShelfHold('import-sync', true);
    return () => {
      void api.setShelfHold('import-sync', false);
    };
  }, [showImportSync, isShelfVisible]);

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

  // Al ocultarse el panel se cierran los menús y el tooltip: el árbol ya no se
  // desmonta, así que sin esto reaparecerían abiertos en la siguiente apertura.
  useEffect(() => {
    if (isShelfVisible) return;
    setIsMoreMenuOpen(false);
    setIsNotificationCenterOpen(false);
    hideTooltip();
  }, [isShelfVisible, hideTooltip]);

  // El shelf está anclado: no se oculta al perder el foco. Se avisa (con sonido
  // y destello) y se ofrece desanclarlo, en lugar de dejar al usuario sin
  // explicación de por qué el panel sigue encima.
  useEffect(() => {
    const api = window.electronAPI;
    if (!isElectron || !api?.onAlwaysOnTopBlurAttempt) return;
    const unsub = api.onAlwaysOnTopBlurAttempt(() => {
      playPinBlockSound();
      setIsPinFlashing(true);
      setTimeout(() => setIsPinFlashing(false), 1200);
      pushToast('info', translate('toast_pinned_stays'), {
        actionLabel: translate('toast_pinned_unpin'),
        onAction: () => {
          void handleTogglePinRef.current?.();
        },
      });
    });
    return () => unsub();
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
    const api = window.electronAPI;
    if (isElectron && api?.onOpenSettings) {
      const unsub = api.onOpenSettings(() => {
        setShowSettings(true);
        setSettingsTab('general');
      });
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onOpenAddShortcut) return;
    const unsub = window.electronAPI.onOpenAddShortcut(() => {
      setFormName('');
      setFormPath('');
    setFormArgs('');
    setFormCwd('');
      setFormDelay(0);
      setFormCategory(UNCATEGORIZED_ID);
      setFormAdmin(false);
      setFormHotkey('');
      setFormIconPath('');
      setShortcutModal({ open: true });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onShortcutLaunched) return;
    const unsub = window.electronAPI.onShortcutLaunched((payload) => {
      const now = Date.now();
      const updated = shortcutsRef.current.map(s =>
        s.path === payload.path ? { ...s, usageCount: (s.usageCount || 0) + 1, lastLaunchAt: now } : s
      );
      setShortcuts(updated);
      shortcutsRef.current = updated;
      const nextTotal = (configRef.current?.totalLaunches || 0) + 1;
      configRef.current = {
        ...configRef.current,
        totalLaunches: nextTotal,
        shortcutsList: updated,
      };
      setConfig(configRef.current);
      scheduleUsagePersist(updated, nextTotal);
    });
    return () => unsub();
  }, []);

  // Un atajo por acceso directo no se pudo registrar (ya está en uso).
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onHotkeyConflict) return;
    const unsub = window.electronAPI.onHotkeyConflict((payload) => {
      pushToast('error', translate('toast_hotkey_conflict', {
        name: payload.name || translate('toast_hotkey_conflict_generic'),
        hotkey: payload.hotkey,
      }));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.setTrayRecents) return;
    const recents = [...shortcuts]
      .filter(s => s.lastLaunchAt)
      .sort((a, b) => (b.lastLaunchAt || 0) - (a.lastLaunchAt || 0))
      .slice(0, 10)
      .map(s => ({
        name: String(s.name || ''),
        path: String(s.path || ''),
        isAdmin: !!s.isAdmin,
        iconPath: typeof s.iconPath === 'string' ? s.iconPath : '',
        arguments: typeof s.arguments === 'string' ? s.arguments : '',
        cwd: typeof s.cwd === 'string' ? s.cwd : '',
      }));
    void window.electronAPI.setTrayRecents(recents);
  }, [shortcuts]);

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
            totalLaunches: Math.max(pending.totalLaunches, configRef.current?.totalLaunches || 0),
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
    // El ref es la autoridad: se actualiza de forma síncrona para que un
    // mutation concurrente (un lanzamiento, por ejemplo) parta del estado real.
    shortcutsRef.current = normalizedShortcuts;
    setCategories(normalizedCategories);

    const prevTaskbar = Array.isArray(configRef.current.taskbarIds) ? configRef.current.taskbarIds : [];
    const taskbarIds = prevTaskbar.filter((id: number) => normalizedShortcuts.some((s: any) => s.id === id));
    const nextCfg = {
      ...configRef.current,
      shortcutsList: normalizedShortcuts,
      categoriesList: normalizedCategories,
      folderSchemaVersion: FOLDER_SCHEMA_VERSION,
      taskbarIds,
    };
    configRef.current = nextCfg;
    setConfig(nextCfg);

    if (isElectron) {
      await window.electronAPI!.saveConfig(nextCfg);
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

  const handleCategoryDragEnd = () => {
    setDragOverCategoryId(null);
    setDraggingCategoryId(null);
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

    const newShortcuts = [...(shortcutsRef.current || [])];
    // Clave de identidad: ruta destino + argumentos. Así dos accesos al mismo
    // ejecutable con parámetros distintos (p. ej. mods de Factorio) son distintos.
    const dupKey = (p: string, a: string) => JSON.stringify([(p || '').toLowerCase(), (a || '').toLowerCase()]);
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
        activeCategory === 'all' || activeCategory === 'favorites' ? UNCATEGORIZED_ID : activeCategory;
      await importDroppedFiles(e.dataTransfer.files, targetCategory, { markFavorite: true });
      return;
    }

    const data = e.dataTransfer.getData('text/plain');
    if (data && data.startsWith('shortcut:')) {
      const shortcutId = parseInt(data.replace('shortcut:', ''), 10);
      if (!isNaN(shortcutId)) {
        const updatedShortcuts = (shortcutsRef.current || []).map(s => {
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
      await importDroppedFiles(e.dataTransfer.files, cat.id === 'all' ? UNCATEGORIZED_ID : cat.id);
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

      await saveDataToConfig(shortcutsRef.current || [], movedCategories);
      if (activeCategory === movingCategoryId) setActiveCategory(movingCategoryId);
      playCyberBeep();
      return;
    }

    if (data && data.startsWith('shortcut:')) {
      const shortcutId = parseInt(data.replace('shortcut:', ''), 10);
      if (!isNaN(shortcutId)) {
        const targetShortcut = (shortcutsRef.current || []).find(s => s.id === shortcutId);
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

          const updatedShortcuts = (shortcutsRef.current || []).map(s => {
            if (s.id === shortcutId) {
              return {
                ...s,
                category: cat.id === 'all' ? UNCATEGORIZED_ID : cat.id,
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
    // (o la bandeja sin categoría cuando estamos en "Todos"/"Favoritos").
    const targetCategory =
      activeCategory === 'all' || activeCategory === 'favorites' ? UNCATEGORIZED_ID : activeCategory;
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
                translate('sweep_complete_title'),
                translate('vault_sweep_success', { count: String(res.count) })
              );
            } else {
              showAlert(
                translate('sweep_clean_title'),
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
          pendingLaunchTimersRef.current.delete(timer);
          void executeLaunch(item);
          setActiveTasksCount(prev => Math.max(0, prev - 1));
        }
      }, 1000);
      pendingLaunchTimersRef.current.add(timer);
    } else {
      void executeLaunch(item);
    }
  };

  const executeLaunch = async (item: any) => {
    let launched = true;

    if (isElectron) {
      // Lanzamiento nativo (con argumentos y directorio de trabajo del acceso).
      const res = await window.electronAPI!.launchApp(item.path, item.isAdmin, item.arguments, item.cwd);
      if (res && res.success === false) {
        launched = false;
        pushToast('error', translate('toast_launch_error', { name: item.name }));
      }
    } else {
      alert(`Lanzando mock: ${item.name} (${item.path})`);
    }

    // Solo se contabilizan los lanzamientos que realmente salieron.
    if (launched) {
      // Incrementar contador de uso.
      // Se parte de shortcutsRef (no del estado de render) para que varios
      // lanzamientos seguidos —p. ej. el lanzamiento en grupo— no se pisen entre sí.
      const base = shortcutsRef.current || [];
      const updated = base.map(s => {
        if (s.id === item.id) {
          return { ...s, usageCount: (s.usageCount || 0) + 1, lastLaunchAt: Date.now() };
        }
        return s;
      });
      setShortcuts(updated);
      shortcutsRef.current = updated;

      // Incrementar launches global
      const nextTotalLaunches = (configRef.current?.totalLaunches || 0) + 1;
      const updatedConfig = {
        ...configRef.current,
        totalLaunches: nextTotalLaunches,
        // Mantener shortcutsList sincronizado para que un guardado de configuración
        // posterior no sobrescriba los contadores recién incrementados.
        shortcutsList: updated,
      };
      setConfig(updatedConfig);
      configRef.current = updatedConfig;

      scheduleUsagePersist(updated, nextTotalLaunches);
    }

    // Auto-ocultar shelf al lanzar si no está anclada.
    // Anclado (`alwaysOnTop`) significa "mantener visible": ocultarlo al lanzar
    // contradiría el estado del pin.
    const currentConfig = configRef.current || {};
    if (isElectron && currentConfig.hideOnBlur && !currentConfig.alwaysOnTop) {
      await window.electronAPI!.windowHideToTray();
    }
    playCyberBeep();
  };

  // Lanzar Todos en la Categoría (Lanzamiento en Grupo)
  const handleLaunchAll = async () => {
    const list = getFilteredShortcuts();
    if (list.length === 0) return;

    showConfirm(
      translate('group_launch_title'),
      translate('group_launch_desc', { count: String(list.length) }),
      async () => {
        for (const item of list) {
          handleLaunch(item);
          // Pequeño delay de 300ms entre lanzamientos para no saturar
          await new Promise(r => setTimeout(r, 300));
        }
      }
    );
  };

  const taskbarIds: number[] = Array.isArray(config.taskbarIds) ? config.taskbarIds : [];

  const defaultShortcutFolder = () => (
    activeCategory === 'all' || activeCategory === 'favorites' || activeCategory === 'vault'
      ? UNCATEGORIZED_ID
      : activeCategory
  );

  const resetShortcutForm = (opts?: { pinToTaskbar?: boolean; favorite?: boolean }) => {
    setFormName('');
    setFormPath('');
    setFormArgs('');
    setFormCwd('');
    setFormDelay(0);
    setFormCategory(defaultShortcutFolder());
    setFormAdmin(false);
    setFormHotkey('');
    setFormIconPath('');
    setFormFavorite(opts?.favorite ?? (activeCategory === 'favorites'));
    setFormPinToTaskbar(!!opts?.pinToTaskbar);
  };

  const handleOpenAddToTaskbar = () => {
    resetShortcutForm({ pinToTaskbar: true });
    setShortcutModal({ open: true });
  };

  // Ready for drop-opens-drawer; current drop still adds instantly via importDroppedFiles.
  const openAddModalForFiles = (drafts: ShortcutDraft[], opts?: { pinToTaskbar?: boolean; favorite?: boolean }) => {
    if (!drafts.length) return;
    resetShortcutForm(opts);
    if (drafts.length === 1) {
      setFormName(drafts[0].name);
      setFormPath(drafts[0].path);
      setFormIconPath(drafts[0].iconPath || '');
    }
    setShortcutModal({ open: true, batchItems: drafts });
  };
  void openAddModalForFiles;

  const pinShortcutToTaskbar = (id: number) => {
    if (!id || taskbarIds.includes(id)) return;
    handleUpdateConfigSetting('taskbarIds', [...taskbarIds, id]);
    playCyberBeep();
  };

  const toggleTaskbarPin = (id: number) => {
    if (taskbarIds.includes(id)) {
      handleUpdateConfigSetting('taskbarIds', taskbarIds.filter((x) => x !== id));
    } else {
      handleUpdateConfigSetting('taskbarIds', [...taskbarIds, id]);
    }
    playCyberBeep();
  };

  const reorderTaskbar = (fromId: number, toId: number) => {
    if (fromId === toId) return;
    const ids = [...taskbarIds];
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    handleUpdateConfigSetting('taskbarIds', ids);
  };

  const handleOpenAddModal = () => {
    resetShortcutForm();
    setShortcutModal({ open: true });
  };

  const handleOpenEditModal = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormName(item.name);
    setFormPath(item.path);
    setFormArgs(item.arguments || '');
    setFormCwd(item.cwd || '');
    setFormDelay(item.delay || 0);
    setFormCategory(item.category);
    setFormAdmin(!!item.isAdmin);
    setFormHotkey(item.hotkey || '');
    setFormIconPath(item.iconPath || '');
    setFormFavorite(!!item.isFavorite);
    setFormPinToTaskbar(taskbarIds.includes(item.id));
    setShortcutModal({ open: true, item });
  };

  const handleBrowseFile = async () => {
    if (!isElectron) return;
    const resolved = await window.electronAPI!.selectFile();
    if (resolved) {
      setFormName(resolved.name);
      setFormPath(resolved.path);
      setFormArgs(resolved.arguments || '');
      setFormCwd(resolved.cwd || '');
      if (resolved.iconPath) setFormIconPath(resolved.iconPath);
    }
  };

  const handleBrowseIcon = async () => {
    if (!isElectron) return;
    const path = await window.electronAPI!.selectImage();
    if (!path) return;
    const data = await window.electronAPI!.getImageData(path);
    setFormIconPath(data || path);
  };

  const mergeTaskbarIds = (idsToAdd: number[], idsToRemove: number[] = []) => {
    const current: number[] = Array.isArray(configRef.current.taskbarIds) ? configRef.current.taskbarIds : [];
    const removeSet = new Set(idsToRemove);
    const next = current.filter((id) => !removeSet.has(id));
    for (const id of idsToAdd) {
      if (!next.includes(id)) next.push(id);
    }
    configRef.current = { ...configRef.current, taskbarIds: next };
  };

  const resolveVaultEntry = async (name: string, path: string, iconPath?: string) => {
    let finalPath = path;
    let finalIconPath = iconPath || '';
    let finalName = name;
    if (formCategory === 'vault' && isElectron) {
      const importRes = await window.electronAPI!.importFileToVault(path);
      if (importRes.success) {
        finalPath = importRes.path;
        finalIconPath = importRes.iconPath;
        finalName = importRes.name;
      }
    }
    return { finalPath, finalIconPath, finalName };
  };

  const handleSaveShortcut = async () => {
    const batchItems = shortcutModal.batchItems || [];
    const isBatch = !shortcutModal.item && batchItems.length > 1;
    if (!isBatch && (!formName.trim() || !formPath.trim())) return;
    if (isBatch && batchItems.length === 0) return;

    let newShortcuts = [...(shortcutsRef.current || [])];

    if (shortcutModal.item) {
      const { finalPath, finalIconPath, finalName } = await resolveVaultEntry(formName, formPath, formIconPath);
      const id = shortcutModal.item.id;
      newShortcuts = newShortcuts.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          name: finalName,
          path: finalPath,
          category: formCategory,
          arguments: formArgs,
          cwd: formCwd.trim(),
          delay: formDelay,
          isAdmin: formAdmin,
          hotkey: formHotkey,
          iconPath: finalIconPath,
          isFavorite: formFavorite,
        };
      });
      if (formPinToTaskbar) mergeTaskbarIds([id]);
      else mergeTaskbarIds([], [id]);
    } else if (isBatch) {
      const dupKey = (p: string, a: string) => JSON.stringify([(p || '').toLowerCase(), (a || '').toLowerCase()]);
      const newIds: number[] = [];
      for (let i = 0; i < batchItems.length; i++) {
        const draft = batchItems[i];
        const { finalPath, finalIconPath, finalName } = await resolveVaultEntry(draft.name, draft.path, draft.iconPath);
        const key = dupKey(finalPath, '');
        const existingIndex = newShortcuts.findIndex(s => dupKey(s.path, s.arguments || '') === key);
        if (existingIndex !== -1) {
          const existing = newShortcuts[existingIndex];
          const willChangeCategory = existing.category !== formCategory;
          const willMarkFavorite = formFavorite && !existing.isFavorite;
          if (willChangeCategory || willMarkFavorite) {
            newShortcuts[existingIndex] = {
              ...existing,
              category: formCategory,
              ...(formFavorite ? { isFavorite: true } : {}),
            };
          }
          newIds.push(existing.id);
          continue;
        }
        const newId = Date.now() + i;
        newShortcuts.push({
          id: newId,
          name: finalName,
          path: finalPath,
          category: formCategory,
          arguments: '',
          delay: formDelay,
          isAdmin: formAdmin,
          hotkey: '',
          iconPath: finalIconPath,
          isFavorite: formFavorite,
          usageCount: 0,
          addedTimestamp: Date.now(),
        });
        newIds.push(newId);
      }
      if (formPinToTaskbar) mergeTaskbarIds(newIds);
    } else {
      const { finalPath, finalIconPath, finalName } = await resolveVaultEntry(formName, formPath, formIconPath);
      const newId = Date.now();
      newShortcuts.push({
        id: newId,
        name: finalName,
        path: finalPath,
        category: formCategory,
        arguments: formArgs,
        cwd: formCwd.trim(),
        delay: formDelay,
        isAdmin: formAdmin,
        hotkey: formHotkey,
        iconPath: finalIconPath,
        isFavorite: formFavorite,
        usageCount: 0,
        addedTimestamp: Date.now(),
      });
      if (formPinToTaskbar) mergeTaskbarIds([newId]);
    }

    await saveDataToConfig(newShortcuts, categories);
    setShortcutModal({ open: false });
    playCyberBeep();
  };

  const handleDeleteShortcut = async (id: number) => {
    const updated = (shortcutsRef.current || []).filter(s => s.id !== id);
    await saveDataToConfig(updated, categories);
    setShortcutModal({ open: false });
    playCyberBeep();
  };

  // Borrado desde la rejilla (tecla Supr): pide confirmación, no borra en seco.
  const handleRequestDeleteShortcut = (id: number) => {
    const item = (shortcutsRef.current || []).find(s => s.id === id);
    if (!item) return;
    showConfirm(
      translate('delete_one_confirm_title'),
      translate('delete_one_confirm_desc', { name: String(item.name || '') }),
      async () => {
        await handleDeleteShortcut(id);
        pushToast('success', translate('toast_deleted_one'));
      },
      true
    );
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

  // Gallery-style: click toggles, Shift-click fills the range from the last item.
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
      } else if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
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
        const removed = (shortcutsRef.current || []).filter(s => ids.has(s.id));
        const remaining = (shortcutsRef.current || []).filter(s => !ids.has(s.id));
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
    if (w < 8 && h < 8) return;
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
        translate('folder_exists_title'),
        translate('folder_exists_desc')
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
    await saveDataToConfig(shortcutsRef.current || [], updated);
    setNewCatName('');
    setNewCatModal(false);
    setNewCatParentId(null);
    setActiveCategory(newId);
    playCyberBeep();
  };

  const handleDeleteCategory = async (id: string) => {
    if (id === 'all') return; // "Todos" es una vista, no una carpeta
    const targetFolder = categories.find(folder => folder.id === id);
    if (!targetFolder) return;

    const removedIds = new Set([id, ...getDescendantFolderIds(categories, id)]);
    const destination = targetFolder.parentId || UNCATEGORIZED_ID;
    showConfirm(
      translate('folder_delete_confirm_title'),
      translate('folder_delete_confirm_desc'),
      async () => {
        const updatedCats = categories.filter(folder => !removedIds.has(folder.id));
        const updatedShortcuts = (shortcutsRef.current || []).map(shortcut =>
          removedIds.has(shortcut.category) ? { ...shortcut, category: destination } : shortcut
        );

        await saveDataToConfig(updatedShortcuts, updatedCats);
        if (removedIds.has(activeCategory)) setActiveCategory(destination);
        playCyberBeep();
      },
      true
    );
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
        translate('folder_exists_title'),
        translate('folder_exists_desc')
      );
      return;
    }

    const updatedCats = categories.map(c => {
      if (c.id === catId) {
        return { ...c, name: newName };
      }
      return c;
    });

    await saveDataToConfig(shortcutsRef.current || [], updatedCats);
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

    // Sidebar, header, dock, and other chrome are not dead zone.
    if (target.closest('[data-no-dead-zone]')) {
      return;
    }

    // Check if the click is on/within any interactive control
    if (target.closest('button, input, select, textarea, [role="button"], a, input[type="range"], .cyber-panel-glow')) {
      return;
    }

    // Check if the click is inside any overlay, modal, context menu or settings panel
    if (target.closest('.fixed, .absolute, [class*="context-menu"], [class*="modal"], [class*="Settings"]')) {
      return;
    }

    // Check if any overlays/menus/settings are currently open
    if (showSettings || shortcutModal.open || newCatModal || renameCatModal.open || categoryMenu?.visible || isMoreMenuOpen) {
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
    configRef.current = updated;
    setConfig(updated);

    // Los controles deslizantes actualizan la UI al instante, pero se guardan
    // con retardo: arrastrar un slider no debe escribir el disco en cada tick.
    if (typeof keyOrUpdates === 'string' && DEBOUNCED_CONFIG_KEYS.has(keyOrUpdates)) {
      if (configSaveTimerRef.current) clearTimeout(configSaveTimerRef.current);
      configSaveTimerRef.current = setTimeout(() => {
        configSaveTimerRef.current = null;
        if (isElectron) void window.electronAPI!.saveConfig(configRef.current);
      }, 300);
      return;
    }

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

  // Referencia siempre actualizada: los listeners de IPC se registran una sola
  // vez y no deben capturar un estado obsoleto.
  handleTogglePinRef.current = handleTogglePin;

  const handleChangeLanguage = (lang: 'en' | 'es') => {
    setLangCode(lang);
    setLocale(lang);
    document.documentElement.lang = lang;
    handleUpdateConfigSetting('language', lang);
    playCyberBeep();
  };

  // Cerrar u omitir el asistente lo da por completado: no vuelve a aparecer
  // salvo que se abra a propósito desde Ajustes.
  const handleFinishOnboarding = async () => {
    setShowOnboarding(false);
    if (configRef.current?.onboardingDone !== true) {
      await handleUpdateConfigSetting('onboardingDone', true);
    }
  };

  // Backup y Diagnóstico
  const handleExportBackup = async () => {
    if (!isElectron) return;
    const backupConfig: any = { ...configRef.current, folderSchemaVersion: FOLDER_SCHEMA_VERSION };
    // El PIN de la bóveda es un secreto local: nunca sale en un backup.
    delete backupConfig.vaultPin;
    delete backupConfig.vaultPinHash;
    delete backupConfig.vaultPinSalt;
    const backupData = JSON.stringify({
      schemaVersion: FOLDER_SCHEMA_VERSION,
      shortcutsList: shortcutsRef.current || [],
      categoriesList: categories,
      config: backupConfig,
    }, null, 2);
    const path = await window.electronAPI!.exportConfig(backupData);
    if (path) {
      showAlert(
        translate('backup_exported_title'),
        translate('notif_backup_exported')
      );
    }
  };

  // Restablecer a fábrica: destructivo, siempre con confirmación explícita.
  // El proceso main guarda antes una copia del estado actual.
  const handleFactoryReset = () => {
    if (!isElectron) return;
    showConfirm(
      translate('reset_confirm_title'),
      translate('reset_confirm_desc'),
      async () => {
        const result = await window.electronAPI!.resetConfig();
        if (!result?.success) {
          showAlert(translate('reset_failed_title'), result?.error || translate('reset_failed_desc'));
          return;
        }
        // El renderer es el único que conoce el idioma activo: se guardan las
        // carpetas por defecto ya traducidas para que main y UI no diverjan.
        await window.electronAPI!.saveConfig({ categoriesList: getDefaultCategories() }, { broadcastReload: false });
        setActiveCategory('all');
        setSearchQuery('');
        setSelectedIds(new Set());
        setShowSettings(false);
        showAlert(translate('reset_done_title'), translate('reset_done_desc'));
      },
      true
    );
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
          const importedConfig: any = {
            ...configRef.current,
            ...(data.config || {}),
            folderSchemaVersion: FOLDER_SCHEMA_VERSION,
          };

          // Un backup nunca puede cambiar el PIN de la bóveda activa.
          const localHash = configRef.current?.vaultPinHash;
          const localSalt = configRef.current?.vaultPinSalt;
          delete importedConfig.vaultPin;
          delete importedConfig.vaultPinHash;
          delete importedConfig.vaultPinSalt;
          if (localHash && localSalt) {
            importedConfig.vaultPinHash = localHash;
            importedConfig.vaultPinSalt = localSalt;
          } else if (importedConfig.vaultPinEnabled === true) {
            // Sin hash local no hay forma de desbloquear: la bóveda queda abierta
            // y hay que volver a fijar un PIN.
            importedConfig.vaultPinEnabled = false;
          }

          setConfig(importedConfig);
          await saveDataToConfig(importedShortcuts, importedCategories);
          await window.electronAPI!.saveConfig({
            ...importedConfig,
            shortcutsList: importedShortcuts,
            categoriesList: importedCategories,
          });
          
          showAlert(
            translate('backup_imported_title'),
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
          translate('backup_import_error_title'),
          translate('backup_import_error_desc')
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

  const playLaunchSound = () => {
    try {
      if (launchAudioRef.current) {
        launchAudioRef.current.currentTime = 0;
        void launchAudioRef.current.play();
        return;
      }
      const soundPath = String(configRef.current?.soundPath || '');
      let url = DEFAULT_LAUNCH_SOUND;
      if (soundPath) {
        url = soundPath.startsWith('http') || soundPath.startsWith('data:')
          ? soundPath
          : `local-resource:///${soundPath.replace(/\\/g, '/')}`;
      }
      const audio = new Audio(url);
      audio.volume = 0.25;
      void audio.play();
    } catch (err) {
      console.log('Launch audio preview error:', err);
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

  // Accesos usados hace poco, para la tira de "Recientes".
  const recentShortcuts = useMemo(() => {
    return shortcuts
      .filter(s => s && s.lastLaunchAt)
      .sort((a, b) => (b.lastLaunchAt || 0) - (a.lastLaunchAt || 0))
      .slice(0, 8);
  }, [shortcuts]);

  const filteredShortcutsList = useMemo(() => {
    const vaultLocked = isVaultLockedState({
      pinEnabled: config.vaultPinEnabled,
      pinConfigured: !!config.vaultPinHash,
      lockTimeout: config.vaultLockTimeout,
      unlockedSession: vaultUnlockedSession,
      lastUnlockTime: lastVaultUnlockTime,
    });

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

  // La bóveda bloqueada esconde sus accesos, pero el contador sigue ahí: si la
  // vista queda vacía hay que decirlo en lugar de fingir que no hay nada.
  const hiddenVaultCount = useMemo(() => {
    const locked = isVaultLockedState({
      pinEnabled: config.vaultPinEnabled,
      pinConfigured: !!config.vaultPinHash,
      lockTimeout: config.vaultLockTimeout,
      unlockedSession: vaultUnlockedSession,
      lastUnlockTime: lastVaultUnlockTime,
    });
    if (!locked) return 0;
    return (shortcuts || []).filter(item => item.category === 'vault').length;
  }, [shortcuts, config.vaultPinEnabled, config.vaultPinHash, config.vaultLockTimeout, vaultUnlockedSession, lastVaultUnlockTime]);

  // Variables defensivas contra configuraciones anteriores (fallback defaults)
  const bgType = config.bgType || 'solid';
  const bgSolidColor = config.bgSolidColor || '#070b13';
  const bgGradient = config.bgGradient || 'preset-1';
  const bgImage = config.bgImage || 'preset-1';
  const bgCustomPath = config.bgCustomPath || '';
  const opacityVal = config.opacity !== undefined ? config.opacity : 85;
  const blurLevel = config.blurLevel !== undefined ? config.blurLevel : 20;

  // Los fondos empaquetados se resuelven por el protocolo propio: bajo file://
  // una ruta absoluta ("/backgrounds/...") apuntaría a la raíz de la unidad.
  const presetBackgroundPath = bgImage.startsWith('preset-')
    ? `backgrounds/cyber_bg_${bgImage.replace('preset-', '')}.png`
    : '';
  const presetBackgroundUrl = useBundledAssetUrl(presetBackgroundPath);
  const fallbackBackgroundUrl = useBundledAssetUrl('backgrounds/cyber_bg_1.png');
  const activeFolderPath = getFolderPath(categories, activeCategory);
  const visibleChildFolders = activeCategory === 'all'
    ? getChildFolders(categories, null)
    : getChildFolders(categories, activeCategory);
  const density = densityFromIconSize(config.iconSize);

  // El árbol se mantiene montado aunque el panel esté oculto: desmontarlo
  // obligaba a React a reconstruir toda la UI (iconos incluidos) en cada
  // apertura, y el panel se veía vacío durante los primeros fotogramas.
  // `isShelfVisible` sigue gobernando el trabajo en segundo plano (telemetría,
  // procesos) y los efectos que deben correr solo con el panel a la vista.
  return (
    <div 
      className={`theme-${config.theme} ${isShelfVisible && bgType !== 'image' ? 'cyber-scanlines' : ''} w-full h-screen bg-[#070b13] flex flex-col justify-between overflow-hidden shadow-2xl relative select-none`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleBackgroundClick}
    >
      <ToastStack toasts={toasts} dismissToast={dismissToast} />

      <AnimatePresence>{booting && <BootLoader />}</AnimatePresence>

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
                    : localResourceUrl(bgCustomPath))
                  : (presetBackgroundUrl || presetBackgroundPath)
              }
              alt={translate('app_bg_type')}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{
                opacity: opacityVal / 100
              }}
              onError={(e) => {
                const fallback = fallbackBackgroundUrl || 'backgrounds/cyber_bg_1.png';
                const img = e.target as HTMLImageElement;
                if (img.src !== fallback) img.src = fallback;
              }}
            />
          </div>
        )}
      </div>

      {/* ── BARRA SUPERIOR ── */}
      <header data-no-dead-zone className="h-12 shrink-0 border-b border-[var(--neon-glow-border)] flex items-center gap-3 px-4 bg-slate-950/75 backdrop-blur-md z-20">
        <button
          type="button"
          onClick={() => { setShowAboutModal(true); playCyberBeep(); hideTooltip(); }}
          onMouseEnter={(e) => showTooltip(e, translate('tooltip_about'))}
          onMouseLeave={hideTooltip}
          className="flex items-center gap-2 shrink-0 rounded-lg px-1.5 py-0.5 -ml-1.5 hover:bg-white/5 transition-colors cursor-pointer"
          aria-label={translate('tooltip_about')}
        >
          <CyberTrayLogo className="w-6 h-6 shrink-0" animated={activeTasksCount > 0} alt="" />
          <CyberTrayWordmark className="text-[13px]" />
        </button>

        <div className="relative w-52 shrink-0 ml-5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={translate('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              // Esc o la flecha abajo llevan el foco a la rejilla de accesos.
              if (e.key === 'Escape' || e.key === 'ArrowDown') {
                const first = document.querySelector<HTMLElement>('[data-shortcut-id][tabindex="0"]');
                if (first) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
            className="w-full bg-slate-950/70 border border-[var(--neon-glow-border)] hover:border-[var(--neon-glow-color)] rounded-lg py-1.5 pl-8 pr-7 text-[11px] font-sans tracking-wide text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                playCyberBeep();
                hideTooltip();
              }}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={(e) => showTooltip(e, translate('clear_search'))}
              onMouseLeave={hideTooltip}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-slate-800/80 bg-slate-950/50 shrink-0"
          onMouseEnter={(e) => showTooltip(e, translate('tooltip_size_slider'))}
          onMouseLeave={hideTooltip}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="range"
            min={ICON_SIZE_MIN}
            max={ICON_SIZE_MAX}
            value={config.iconSize ?? 60}
            onChange={(e) => handleUpdateConfigSetting('iconSize', parseInt(e.target.value, 10))}
            onMouseDown={hideTooltip}
            className="w-24 accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-full cursor-pointer"
            aria-label={translate('tooltip_size_slider')}
          />
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0 overflow-visible">
          {selectionMode && (
            <>
              <button
                type="button"
                onClick={handleSelectAll}
                onMouseEnter={(e) => showTooltip(e, translate('select_all'), '', 'rgba(56,189,248,0.5)')}
                onMouseLeave={hideTooltip}
                className="h-8 w-8 bg-slate-800/40 border border-slate-700/50 hover:border-[var(--neon-glow-border)] text-slate-300 hover:text-[var(--neon-glow-color)] rounded-lg flex items-center justify-center transition-all cursor-pointer"
                aria-label={translate('select_all')}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                onMouseEnter={(e) => showTooltip(e, translate('unselect_all'), '', 'rgba(148,163,184,0.5)')}
                onMouseLeave={hideTooltip}
                className="h-8 w-8 bg-slate-800/40 border border-slate-700/50 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg flex items-center justify-center transition-all cursor-pointer"
                aria-label={translate('unselect_all')}
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                onMouseEnter={(e) => showTooltip(
                  e,
                  selectedIds.size > 0
                    ? translate('delete_selected_n', { count: String(selectedIds.size) })
                    : translate('delete_selected_none'),
                  '',
                  'rgba(244,63,94,0.5)'
                )}
                onMouseLeave={hideTooltip}
                className="relative h-8 w-8 bg-rose-500/10 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-rose-500/40 disabled:hover:bg-rose-500/10 text-rose-300 hover:text-rose-200 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                aria-label={
                  selectedIds.size > 0
                    ? translate('delete_selected_n', { count: String(selectedIds.size) })
                    : translate('delete_selected')
                }
              >
                <Trash2 className="w-4 h-4" />
                {selectedIds.size > 0 && (
                  <span className="absolute -bottom-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold leading-4 text-center shadow-[0_0_6px_rgba(244,63,94,0.55)]">
                    {selectedIds.size}
                  </span>
                )}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={toggleSelectionMode}
            onMouseEnter={(e) => showTooltip(
              e,
              selectionMode ? translate('selection_exit') : translate('selection_mode'),
              translate('selection_mode_hint'),
              'rgba(56,189,248,0.5)'
            )}
            onMouseLeave={hideTooltip}
            className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
              selectionMode
                ? 'bg-[var(--neon-glow-color-raw)]/15 border-[var(--neon-glow-border)] text-[var(--neon-glow-color)] shadow-[0_0_8px_var(--neon-glow-color-raw)]'
                : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-500'
            }`}
            aria-label={selectionMode ? translate('selection_exit') : translate('selection_mode')}
            aria-pressed={selectionMode}
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <button
            onClick={handleLaunchAll}
            onMouseEnter={(e) => showTooltip(e, translate('toolbar_group_launch'), translate('tooltip_launch_all'), 'rgba(16,185,129,0.5)')}
            onMouseLeave={hideTooltip}
            disabled={filteredShortcutsList.length === 0}
            className="h-8 w-8 bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-400 hover:text-emerald-300 rounded-lg flex items-center justify-center transition-all cursor-pointer"
          >
            <Play className="w-4 h-4" />
          </button>

          <button
            onClick={() => { setShowProcessMatrixModal(true); playCyberBeep(); }}
            onMouseEnter={(e) => showTooltip(e, translate('tab_process_matrix'), translate('tooltip_process_matrix'), 'rgba(239,68,68,0.5)')}
            onMouseLeave={hideTooltip}
            className="h-8 w-8 bg-red-500/10 border border-red-500/30 hover:border-red-400 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg flex items-center justify-center transition-all cursor-pointer"
            aria-label={translate('tab_process_matrix')}
          >
            <Activity className="w-4 h-4" />
          </button>

          {isElectron && activeCategory === 'vault' && (
            <button
              onClick={handleDesktopSweep}
              onMouseEnter={(e) => showTooltip(e, translate('vault_sweep_btn'), translate('tooltip_sweep_desktop'), 'rgba(168,85,247,0.5)')}
              onMouseLeave={hideTooltip}
              className="h-8 px-3 bg-purple-500/15 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/25 text-purple-400 hover:text-purple-300 font-cyber font-bold tracking-widest text-[10px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {translate('vault_sweep_btn')}
            </button>
          )}

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

          <button
            onClick={handleOpenAddModal}
            onMouseEnter={(e) => showTooltip(e, translate('app_add_title'), translate('tooltip_add_shortcut'))}
            onMouseLeave={hideTooltip}
            className="h-8 px-3 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[10px] rounded-lg border border-[var(--neon-glow-border)] hover:shadow-[0_0_10px_var(--neon-glow-color)] transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {translate('add_btn')}
          </button>

          <div className="w-px h-3.5 bg-white/10 mx-1" />

          {config.autoUpdate !== false && (updateStatus.state === 'available' || updateStatus.state === 'downloaded' || updateStatus.state === 'downloading') && (
            <button
              type="button"
              onClick={() => { setShowAboutModal(true); playCyberBeep(); hideTooltip(); }}
              onMouseEnter={(e) => showTooltip(
                e,
                updateStatus.state === 'downloaded'
                  ? translate('about_status_downloaded', { version: updateStatus.version || '' })
                  : updateStatus.state === 'downloading'
                  ? translate('about_status_downloading', { percent: String(updateStatus.percent || 0) })
                  : translate('about_status_available', { version: (updateStatus as { version?: string }).version || '' })
              )}
              onMouseLeave={hideTooltip}
              aria-label={translate('about_status_available', { version: (updateStatus as { version?: string }).version || '' })}
              className="relative flex items-center justify-center w-7 h-7 rounded-full bg-[#1D2636] hover:bg-[#253246] border border-[#2D3A4E] hover:border-[#3B4E6E] text-[#6C9BFF] shadow-[0_0_12px_rgba(108,155,255,0.2)] hover:shadow-[0_0_16px_rgba(108,155,255,0.45)] transition-all cursor-pointer"
            >
              <ArrowDown className={`w-4 h-4 text-[#6C9BFF] ${updateStatus.state === 'downloading' ? 'animate-bounce' : ''}`} />
            </button>
          )}

          <NotificationCenter
            open={isNotificationCenterOpen}
            onToggle={() => {
              setIsNotificationCenterOpen(prev => !prev);
              setIsMoreMenuOpen(false);
              playCyberBeep();
              hideTooltip();
            }}
            onClose={() => setIsNotificationCenterOpen(false)}
            state={notifications}
            folders={categories}
            watcherEnabled={!!config.watcherEnabled}
            onMarkSeen={handleMarkNotificationsSeen}
            onRemove={handleRemoveNotifications}
            onClear={handleClearNotifications}
            onAdd={handleAddNotificationItems}
            onOpenSettings={() => {
              setIsNotificationCenterOpen(false);
              setShowSettings(true);
            }}
          />

          <button
            type="button"
            onClick={handleTogglePin}
            aria-label={isPinned ? translate('tooltip_pin_on') : translate('tooltip_pin_off')}
            aria-pressed={isPinned}
            onMouseEnter={(e) => showTooltip(e, isPinned ? translate('tooltip_pin_on') : translate('tooltip_pin_off'))}
            onMouseLeave={hideTooltip}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-all group cursor-pointer ${
              isPinFlashing
                ? 'bg-red-500/30 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-bounce'
                : isPinned
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                  : 'hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 transition-transform duration-300 ${
              isPinFlashing
                ? 'scale-125 text-red-400'
                : isPinned
                  ? 'fill-cyan-400'
                  : 'rotate-45'
            }`} />
          </button>

          <button
            type="button"
            onClick={() => { setShowSettings(!showSettings); playCyberBeep(); hideTooltip(); }}
            aria-label={translate('tooltip_settings')}
            aria-expanded={showSettings}
            onMouseEnter={(e) => showTooltip(e, translate('tooltip_settings'))}
            onMouseLeave={hideTooltip}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors group cursor-pointer ${
              showSettings ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => { setIsMoreMenuOpen(prev => !prev); playCyberBeep(); hideTooltip(); }}
              onMouseEnter={(e) => showTooltip(e, translate('tooltip_more'))}
              onMouseLeave={hideTooltip}
              aria-label={translate('tooltip_more')}
              aria-haspopup="true"
              aria-expanded={isMoreMenuOpen}
              className={`relative flex items-center justify-center w-7 h-7 rounded-md transition-colors group cursor-pointer ${
                isMoreMenuOpen ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              {(updateStatus.state === 'available' || updateStatus.state === 'downloaded') && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-pulse" />
              )}
            </button>

            <AnimatePresence>
              {isMoreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 z-50 w-[224px] p-1.5 rounded-xl bg-[#0c121e]/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.8),0_0_15px_rgba(34,211,238,0.1)] flex flex-col gap-0.5 select-none"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      if (window.electronAPI?.openExternal) {
                        window.electronAPI.openExternal('https://github.com/CyberGems/CyberTray#%EF%B8%8F-donate');
                      }
                    }}
                    className="group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-cyan-500/10 transition-colors text-left cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-[#00D8F1] fill-[#00D8F1]/20 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_rgba(0,216,241,0.8)] transition-transform shrink-0" />
                    <span className="font-semibold text-[#00D8F1]">{translate('more_menu_donate')}</span>
                  </button>

                  <div className="h-px bg-white/10 my-1 mx-1.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      window.electronAPI?.openExternal?.('https://github.com/CyberGems/CyberTray/wiki');
                    }}
                    className="group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                    <span>{translate('more_menu_docs')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      window.electronAPI?.openExternal?.('https://github.com/CyberGems/CyberTray/issues');
                    }}
                    className="group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                    <span>{translate('more_menu_faq')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      window.electronAPI?.openExternal?.('https://github.com/CyberGems/CyberTray/releases');
                    }}
                    className="group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                    <span>{translate('more_menu_changelog')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      window.electronAPI?.openExternal?.('https://cybergems.org');
                    }}
                    className="group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                    <span>{translate('more_menu_website')}</span>
                  </button>

                  <div className="h-px bg-white/10 my-1 mx-1.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setShowAboutModal(true);
                      playCyberBeep();
                    }}
                    className="group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                    <span className="flex-1">{translate('more_menu_about')}</span>
                    {(updateStatus.state === 'available' || updateStatus.state === 'downloaded') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-3.5 bg-white/10 mx-0.5" />

          <button
            type="button"
            onClick={() => {
              hideTooltip();
              if (isPinned) {
                playPinBlockSound();
                setIsPinFlashing(true);
                setTimeout(() => setIsPinFlashing(false), 1200);
                return;
              }
              if (isElectron) window.electronAPI!.windowHideToTray();
            }}
            onMouseEnter={(e) => showTooltip(e, translate('tooltip_minimize'))}
            onMouseLeave={hideTooltip}
            className="flex items-center justify-center w-7 h-7 hover:bg-white/10 rounded-md transition-colors group cursor-pointer"
          >
            <Shrink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
          </button>
        </div>
      </header>

      {/* `relative z-10` es obligatorio: la capa de fondo es `absolute`, y un
          elemento posicionado se pinta por encima de los hermanos en flujo
          normal. Sin esto la barra lateral y las migas quedan tapadas. */}
      <div className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        <FolderTree
          folders={categories}
          activeFolderId={activeCategory}
          density={density}
          onSelect={handleTabClick}
          onContextMenu={handleCategoryContextMenu}
          onCreateFolder={handleCreateFolder}
          onDragStart={handleCategoryDragStart}
          onFolderDrop={handleCategoryDrop}
          onFavoriteDrop={handleFavoriteDrop}
          onFavoriteDragOver={handleFavoriteDragOver}
          onFavoriteDragLeave={handleFavoriteDragLeave}
          onDragEnd={handleCategoryDragEnd}
          draggingFolderId={draggingCategoryId}
          dropFolderId={dragOverCategoryId}
          onDropFolderChange={setDragOverCategoryId}
          showTooltip={showTooltip}
          hideTooltip={hideTooltip}
        />

        <main className="min-w-0 flex-1 min-h-0 flex flex-col">
          <div data-no-dead-zone className="h-10 shrink-0 flex items-center gap-1.5 px-5 border-b border-slate-900/80 bg-slate-950/25 overflow-x-auto">
            <span
              className="text-slate-600 font-mono uppercase tracking-wider shrink-0"
              style={{ fontSize: `${density.breadcrumbPx}px` }}
            >
              {translate('explorer_folder_contents')}:
            </span>
            {(activeFolderPath.length > 0
              ? activeFolderPath
              : [{ id: activeCategory, name: activeCategory === 'favorites' ? translate('explorer_favorites') : translate('explorer_vault'), color: '', parentId: null, order: 0 }]
            ).map((folder, index, path) => (
              <React.Fragment key={folder.id}>
                {index > 0 && <span className="text-slate-700" style={{ fontSize: `${density.breadcrumbPx}px` }}>/</span>}
                <button
                  type="button"
                  onClick={() => handleTabClick(folder.id)}
                  className={`font-ui tracking-wide uppercase truncate max-w-44 cursor-pointer ${
                    index === path.length - 1 ? 'text-[var(--neon-glow-color)]' : 'text-slate-500 hover:text-slate-200'
                  }`}
                  style={{ fontSize: `${density.breadcrumbPx}px` }}
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
                  <FolderOpen style={{ width: density.folderIconPx, height: density.folderIconPx, color: folder.color }} />
                  <span className="font-ui tracking-wide truncate max-w-36" style={{ fontSize: `${density.childChipPx}px` }}>{folder.name}</span>
                </button>
              ))}
            </div>
          )}

          {recentShortcuts.length > 0 && activeCategory === 'all' && !searchQuery.trim() && (
            <div className="shrink-0 flex items-center gap-2 px-5 py-2 border-b border-slate-900/60 overflow-x-auto">
              <span className="flex items-center gap-1.5 text-slate-500 shrink-0">
                <History className="w-3.5 h-3.5" />
                <span className="font-ui tracking-wide uppercase" style={{ fontSize: `${density.childChipPx}px` }}>
                  {translate('recent_shortcuts')}
                </span>
              </span>
              {recentShortcuts.map((item: any) => (
                <button
                  key={`recent-${item.id}`}
                  type="button"
                  onClick={() => handleLaunch(item)}
                  onContextMenu={(e) => handleShortcutContextMenu(e, item)}
                  onMouseEnter={(e) => showTooltip(e, item.name, item.path)}
                  onMouseLeave={hideTooltip}
                  className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-md border border-slate-800 bg-slate-950/40 hover:border-[var(--neon-glow-border)] hover:bg-slate-900/80 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <span className="w-5 h-5 rounded bg-slate-900/80 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    {item.iconPath ? (
                      <img src={shortcutIconSrc(item.iconPath)} alt="" className="w-3.5 h-3.5 object-contain" draggable={false} />
                    ) : (
                      <ShortcutGlyph className="w-3 h-3 text-[var(--neon-glow-color)]" />
                    )}
                  </span>
                  <span className="font-ui tracking-wide truncate max-w-28" style={{ fontSize: `${density.childChipPx}px` }}>
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ShortcutGrid
              gridScrollRef={gridScrollRef}
              selectionMode={selectionMode}
              lassoRect={lassoRect}
              filteredShortcutsList={filteredShortcutsList}
              hiddenVaultCount={hiddenVaultCount}
              onOpenVault={() => handleTabClick('vault')}
              searchQuery={searchQuery}
              viewMode={viewMode}
              iconSortOrder={iconSortOrder}
              config={config}
              categories={categories}
              activeCategory={activeCategory}
              selectedIds={selectedIds}
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
              handleDeleteShortcut={handleRequestDeleteShortcut}
              handleUpdateConfigSetting={handleUpdateConfigSetting}
              playFolderSound={playFolderSound}
              playCyberBeep={playCyberBeep}
              showTooltip={showTooltip}
              hideTooltip={hideTooltip}
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
        shortcuts={shortcuts}
        taskbarIds={taskbarIds}
        onLaunch={handleLaunch}
        onOpenAdd={handleOpenAddToTaskbar}
        onPinShortcut={pinShortcutToTaskbar}
        onReorderTaskbar={reorderTaskbar}
        onShortcutContextMenu={handleShortcutContextMenu}
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
        onFactoryReset={handleFactoryReset}
        onOpenImportSync={openImportSync}
        playFolderSound={playFolderSound}
        playLaunchSound={playLaunchSound}
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
        viewMode={viewMode}
        setViewMode={setViewMode}
        iconSortOrder={iconSortOrder}
        setIconSortOrder={setIconSortOrder}
        handleTogglePin={handleTogglePin}
        onOpenOnboarding={() => {
          setShowSettings(false);
          setShowOnboarding(true);
        }}
      />

      <ImportSyncModal
        open={showImportSync}
        onClose={closeImportSync}
        categories={categories}
        initialSources={config.importSources || []}
        onApplied={handleImportApplied}
        showTooltip={showTooltip}
        hideTooltip={hideTooltip}
      />

      <OnboardingModal
        open={showOnboarding}
        langCode={langCode}
        shortcut={config.shortcut || ''}
        onSelectLanguage={handleChangeLanguage}
        onShortcutChange={(combo) => handleUpdateConfigSetting('shortcut', combo)}
        onFinish={handleFinishOnboarding}
        playCyberBeep={playCyberBeep}
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
        showTooltip={showTooltip}
        hideTooltip={hideTooltip}
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
        formCwd={formCwd}
        setFormCwd={setFormCwd}
        formDelay={formDelay}
        setFormDelay={setFormDelay}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        formAdmin={formAdmin}
        setFormAdmin={setFormAdmin}
        formHotkey={formHotkey}
        setFormHotkey={setFormHotkey}
        formIconPath={formIconPath}
        setFormIconPath={setFormIconPath}
        formFavorite={formFavorite}
        setFormFavorite={setFormFavorite}
        formPinToTaskbar={formPinToTaskbar}
        setFormPinToTaskbar={setFormPinToTaskbar}
        handleSaveShortcut={handleSaveShortcut}
        handleBrowseFile={handleBrowseFile}
        handleBrowseIcon={handleBrowseIcon}
        handleDeleteShortcut={handleDeleteShortcut}
        showTooltip={showTooltip}
        hideTooltip={hideTooltip}
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
        showToast={(message: string) => pushToast('success', message)}
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
        taskbarIds={taskbarIds}
        onToggleTaskbarPin={toggleTaskbarPin}
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
        showTooltip={showTooltip}
        hideTooltip={hideTooltip}
      />

      {/* Root-Level Global Tooltip */}
      {globalTooltip.visible && (
        <div
          ref={tooltipNodeRef}
          className="fixed bg-slate-950 text-slate-300 text-[10px] font-mono rounded-lg p-2 shadow-2xl z-[999999] pointer-events-none flex flex-col gap-0.5 border max-w-[240px] text-center"
          style={{
            borderColor: globalTooltip.borderColor,
            left: `${globalTooltip.x}px`,
            top: `${globalTooltip.y}px`,
            transform: globalTooltip.placement === 'bottom'
              ? `translate(calc(-50% + ${globalTooltip.shiftX}px), 0)`
              : `translate(calc(-50% + ${globalTooltip.shiftX}px), -100%)`,
          }}
        >
          <div className="font-bold text-white uppercase tracking-wider leading-snug">{globalTooltip.text}</div>
          {globalTooltip.subText && (
            <div className="text-slate-400 text-[9px] leading-relaxed whitespace-pre-line">
              {globalTooltip.subText}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
