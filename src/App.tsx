import React, { useState, useEffect, useRef, useCallback } from 'react';
import { translate, TranslationKey, setLocale, getLocale } from './locales';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Grid, List as ListIcon, Plus, Clock, Settings,
  Minus, X, LayoutGrid, Palette, Key, Trash2, Shield, Info,
  Cpu, HardDrive, Minimize2, Power, FolderOpen, Pin, Play, Edit,
  Monitor, ExternalLink, Sliders, ChevronDown, RefreshCw, Upload, Check, Trash
} from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      launchApp: (path: string, isAdmin?: boolean) => Promise<{ success: boolean; error?: string }>;
      getUwpApps: () => Promise<Array<{ name: string; aumid: string; icon: string }>>;
      selectFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ name: string; path: string; iconPath?: string } | null>;
      selectImage: () => Promise<string | null>;
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
      getSystemInfo: () => Promise<{ memory: { total: number; used: number; percent: number }; cpu: { model: string; cores: number }; uptime: number }>;
      getDiskInfo: () => Promise<Array<{ drive: string; total: number; free: number; used: number; percent: number }>>;
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
      setAlwaysOnTop: (enabled: boolean) => Promise<{ success: boolean }>;
      registerAppShortcuts: (shortcuts: Array<{ id: number; path: string; shortcut: string; isAdmin: boolean }>) => Promise<{ success: boolean }>;
      runShellCommand: (command: string) => Promise<{ success: boolean; cmdId?: string; error?: string }>;
      onShellOutput: (callback: (data: { id: string; type: 'stdout' | 'stderr'; text: string }) => void) => () => void;
      onShellExit: (callback: (data: { id: string; exitCode: number }) => void) => () => void;
      onAlwaysOnTopBlurAttempt: (callback: () => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      toggleShelf: () => Promise<void>;
      setDragActive: (active: boolean) => Promise<void>;
      onShelfStateChange: (callback: (visible: boolean) => void) => () => void;
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

let globalAudioCtx: AudioContext | null = null;

export default function App() {
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
    bgType: 'solid',
    bgSolidColor: '#070b13',
    bgGradient: 'preset-1',
    bgImage: 'preset-1',
    bgCustomPath: '',
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
    uptime: 3600,
  });
  const [disks, setDisks] = useState<any[]>([{ drive: 'C:', total: 500, free: 250, used: 250, percent: 50 }]);
  const [activeTasksCount, setActiveTasksCount] = useState<number>(0);

  // Monitor e Idioma lists
  const [monitors, setMonitors] = useState<any[]>([]);
  const [langCode, setLangCode] = useState<'en' | 'es'>('en');

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
        }

        // Cargar atajos desde su config independiente
        const dataPath = await window.electronAPI!.getConfigPath();
        try {
          const rawConfig = await window.electronAPI!.loadConfig();
          if (rawConfig) {
            if (rawConfig.categoriesList) {
              let sanitizedCats = rawConfig.categoriesList.filter((c: any) => c && c.id && c.id.trim() !== '' && c.name && c.name.trim() !== '');
              if (sanitizedCats.length > 0) {
                const hasAll = sanitizedCats.some((c: any) => c.id === 'all');
                if (!hasAll) {
                  sanitizedCats = [{ id: 'all', name: 'ALL MODULES', color: '#a1a1aa' }, ...sanitizedCats];
                }
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

  // Telemetría del Sistema
  useEffect(() => {
    if (mode === 'handle') return;

    const fetchTelemetry = async () => {
      if (isElectron) {
        const info = await window.electronAPI!.getSystemInfo();
        setSystemInfo(info);
        const diskInfo = await window.electronAPI!.getDiskInfo();
        setDisks(diskInfo);
      } else {
        // Web fallback telemetry
        setSystemInfo({
          memory: { total: 16, used: 7.5 + Math.random(), percent: 45 + Math.random() * 5 },
          cpu: { model: 'Intel i9-14900K', cores: 24 },
          uptime: osUptimeMock += 5,
        });
      }
    };

    let osUptimeMock = 7200;
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  // Limpieza del temporizador de hover al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

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
    setShortcuts(newShortcuts);
    setCategories(newCategories);
    
    if (isElectron) {
      await window.electronAPI!.saveConfig({
        ...config,
        shortcutsList: newShortcuts,
        categoriesList: newCategories
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

  const handleCategoryDragOver = (e: React.DragEvent, cat: any) => {
    if (cat.id === 'all') return;
    e.preventDefault();
    if (dragOverCategoryId !== cat.id) {
      setDragOverCategoryId(cat.id);
    }
  };

  const handleCategoryDragLeave = () => {
    setDragOverCategoryId(null);
  };

  const handleCategoryDrop = async (e: React.DragEvent, cat: any) => {
    if (cat.id === 'all') return;
    e.preventDefault();
    setDragOverCategoryId(null);

    const data = e.dataTransfer.getData('text/plain');
    if (data && data.startsWith('shortcut:')) {
      const shortcutId = parseInt(data.replace('shortcut:', ''), 10);
      if (!isNaN(shortcutId)) {
        const updatedShortcuts = shortcuts.map(s => {
          if (s.id === shortcutId) {
            return { ...s, category: cat.id };
          }
          return s;
        });
        await saveDataToConfig(updatedShortcuts, categories);
        playCyberBeep();
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!isElectron) return;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const newShortcuts = [...shortcuts];
    let addedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = window.electronAPI!.getPathForFile(file);
      if (!filePath) continue;

      const resolved = await window.electronAPI!.resolveFilePath(filePath);
      if (resolved) {
        // Agregar a la categoría activa (o utils por defecto)
        const targetCategory = activeCategory === 'all' ? 'utils' : activeCategory;
        const exists = newShortcuts.some(s => s.path.toLowerCase() === resolved.path.toLowerCase());
        
        if (!exists) {
          newShortcuts.push({
            id: Date.now() + i,
            name: resolved.name,
            path: resolved.path,
            category: targetCategory,
            iconPath: resolved.iconPath || '',
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

    if (!confirm(message)) return;

    for (const item of list) {
      handleLaunch(item);
      // Pequeño delay de 300ms entre lanzamientos para no saturar
      await new Promise(r => setTimeout(r, 300));
    }
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

    let newShortcuts = [...shortcuts];

    if (shortcutModal.item) {
      // Editar
      newShortcuts = newShortcuts.map(s => {
        if (s.id === shortcutModal.item.id) {
          return {
            ...s,
            name: formName,
            path: formPath,
            category: formCategory,
            arguments: formArgs,
            delay: formDelay,
            isAdmin: formAdmin,
            hotkey: formHotkey,
            iconPath: formIconPath
          };
        }
        return s;
      });
    } else {
      // Agregar
      newShortcuts.push({
        id: Date.now(),
        name: formName,
        path: formPath,
        category: formCategory,
        arguments: formArgs,
        delay: formDelay,
        isAdmin: formAdmin,
        hotkey: formHotkey,
        iconPath: formIconPath,
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
      alert(langCode === 'es' ? 'Esta categoría ya existe.' : 'This category already exists.');
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
      const matchCat = activeCategory === 'all' || s.category === activeCategory;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.path.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
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

    // Close the shelf window
    if (isElectron) {
      window.electronAPI!.windowHideToTray();
    }
  };

  // Modificar e interactuar con Config General
  const handleUpdateConfigSetting = async (keyOrUpdates: string | Record<string, any>, value?: any) => {
    let updated: any;
    if (typeof keyOrUpdates === 'string') {
      updated = { ...config, [keyOrUpdates]: value };
    } else {
      updated = { ...config, ...keyOrUpdates };
    }
    setConfig(updated);

    if (isElectron) {
      await window.electronAPI!.saveConfig(updated);
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
    handleUpdateConfigSetting('language', lang);
    playCyberBeep();
  };

  // Backup y Diagnóstico
  const handleExportBackup = async () => {
    if (!isElectron) return;
    const backupData = JSON.stringify({ shortcuts, categories, config }, null, 2);
    const path = await window.electronAPI!.exportConfig(backupData);
    if (path) {
      alert(translate('notif_backup_exported'));
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
          
          alert(translate('notif_backup_imported'));
          window.location.reload();
        }
      } catch {
        alert('Error parsing backup file');
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

  // =====================================
  // ── MODO HANDLE (MANIGUETA CIBERNÉTICA) ──
  // =====================================
  if (mode === 'handle') {
    return (
      <div className={`theme-${config.theme} w-full h-full flex items-center justify-center p-0`}>
        <button
          onClick={() => isElectron && window.electronAPI!.toggleShelf()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
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
          className="cyber-handle-bar w-full h-full rounded-md border flex items-center justify-center relative group cursor-pointer"
          title={translate('tooltip_handle')}
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
      className={`theme-${config.theme} ${bgType !== 'image' ? 'cyber-scanlines' : ''} w-full h-screen bg-[#070b13] border-t border-b border-[var(--neon-glow-border)] flex flex-col justify-between overflow-hidden shadow-2xl relative select-none`}
      style={{
        borderTopWidth: config.dockPosition === 'bottom' ? '1px' : '0px',
        borderBottomWidth: config.dockPosition === 'top' ? '1px' : '0px',
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

      {/* ── BARRA SUPERIOR (TOOLBAR) ── */}
      <header className="h-14 border-b border-[var(--neon-glow-border)] flex items-center justify-between px-6 bg-slate-950/65 z-10">
        
        {/* Sección de Logo, Título y Buscador */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CyberTrayLogo className="w-7 h-7" animated={activeTasksCount > 0} />
            <span className="font-cyber font-extrabold text-[13px] text-white tracking-widest bg-gradient-to-r from-white to-[var(--neon-glow-color)] bg-clip-text text-transparent hidden sm:inline">
              CYBERTRAY
            </span>
          </div>
          
          <div className="relative w-36 flex items-center overflow-hidden">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-500 z-10 pointer-events-none" />
            <input
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-slate-950/70 border border-[var(--neon-glow-border)] hover:border-[var(--neon-glow-color)] rounded-lg py-1 pl-8.5 pr-7 text-[11px] font-sans tracking-wide focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] focus:shadow-[0_0_8px_var(--neon-glow-color-raw)] transition-all z-0"
              style={{ color: searchFocused || searchQuery ? 'white' : 'transparent' }}
            />
            {searchQuery && searchFocused && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-500 hover:text-white z-20"
                title={translate('clear_search')}
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Marquee del Placeholder cuando está vacío y sin foco */}
            {!searchFocused && !searchQuery && (
              <div className="absolute left-8.5 right-6 overflow-hidden pointer-events-none text-[11px] text-slate-500 font-sans flex items-center select-none z-10">
                <div className="cyber-marquee-track">
                  <span>{translate('search_placeholder')}</span>
                  <span className="mx-4 text-slate-800 font-cyber">///</span>
                  <span>{translate('search_placeholder')}</span>
                  <span className="mx-4 text-slate-800 font-cyber">///</span>
                </div>
              </div>
            )}

            {/* Marquee del texto buscado cuando tiene texto y sin foco */}
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

        {/* Categorías Virtuales */}
        <div 
          ref={categoryTabsRef}
          onWheel={handleCategoryWheel}
          className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden custom-scrollbar px-4 flex-1 justify-start mx-2"
        >
          {categories.filter(cat => cat && cat.id && cat.id.trim() !== '' && cat.name && cat.name.trim() !== '').map((cat) => {
            const isActive = activeCategory === cat.id;
            const isDragOver = dragOverCategoryId === cat.id;
            const isAll = cat.id === 'all';
            const count = isAll ? shortcuts.length : shortcuts.filter(s => s.category === cat.id).length;
            
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); playCyberBeep(); }}
                onContextMenu={(e) => handleCategoryContextMenu(e, cat)}
                onDragOver={(e) => handleCategoryDragOver(e, cat)}
                onDragLeave={handleCategoryDragLeave}
                onDrop={(e) => handleCategoryDrop(e, cat)}
                className={`px-3 py-1 text-[10px] font-cyber font-bold tracking-widest rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDragOver
                    ? 'scale-105 bg-[var(--neon-glow-color-raw)]/10 text-white'
                    : isActive
                      ? isAll
                        ? 'bg-slate-900 text-white scale-105 category-all-active-btn'
                        : 'bg-slate-900 scale-105'
                      : 'bg-transparent border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
                <span className={isAll && isActive ? 'category-all-text-active' : ''}>
                  {cat.id === 'all' ? translate('cat_all') : cat.name}
                </span>
                <span 
                  className={`px-1 py-0.2 text-[8.5px] rounded border font-mono transition-colors ${
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
            className="w-6 h-6 rounded-md border border-dashed border-slate-700 hover:border-[var(--neon-glow-color)] text-slate-500 hover:text-[var(--neon-glow-color)] flex items-center justify-center transition-all cursor-pointer"
            title={translate('tooltip_add_shortcut')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Controles de Lista y Acciones Rápidas */}
        <div className="flex items-center gap-3">
          
          {/* Slider de tamaño de icono */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-1" title={translate('tooltip_size_slider')}>
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

          {/* Ordenamiento */}
          <div className="relative group">
            <button className="h-8 px-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer">
              <Clock className="w-3.5 h-3.5" />
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-9 w-44 hidden group-hover:block bg-slate-950 border border-[var(--neon-glow-border)] rounded-lg shadow-2xl p-1 z-50 text-left font-mono">
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

          {/* Iniciar Todo el Grupo */}
          <button
            onClick={handleLaunchAll}
            disabled={filteredShortcutsList.length === 0}
            className="h-8 w-8 bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-400 hover:text-emerald-300 rounded-lg flex items-center justify-center transition-all cursor-pointer"
            title={translate('tooltip_launch_all')}
          >
            <Play className="w-4 h-4" />
          </button>

          {/* Agregar Acceso Manual */}
          <button
            onClick={handleOpenAddModal}
            className="h-8 px-3 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[10px] rounded-lg border border-[var(--neon-glow-border)] hover:shadow-[0_0_10px_var(--neon-glow-color)] transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            ADD
          </button>
        </div>
      </header>

      {/* ── SECCIÓN CENTRAL (GRID DE ACCESOS DIRECTOS VIRTUALIZADOS) ── */}
      <main className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar relative">
        
        {/* Banner Cyberpunk Decorativo si no hay items */}
        {filteredShortcutsList.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 py-12 px-6">
            <Upload className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
            <p className="text-xs font-mono text-slate-500 max-w-md text-center leading-relaxed">
              {translate('shortcut_no_items')}
            </p>
          </div>
        ) : (
          <div 
            className="grid gap-4 transition-all"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${config.iconSize * 2.8}px, 1fr))`
            }}
          >
            {filteredShortcutsList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleLaunch(item)}
                onContextMenu={(e) => handleShortcutContextMenu(e, item)}
                draggable
                onDragStart={(e) => handleShortcutDragStart(e, item)}
                className="cyber-panel-glow bg-slate-950/45 rounded-xl p-3 flex items-center gap-3.5 cursor-pointer relative group transition-all duration-300 hover:scale-103"
              >
                {/* Icono del Acceso Directo */}
                <div 
                  className="flex-shrink-0 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-[var(--neon-glow-color)] group-hover:shadow-[0_0_6px_var(--neon-glow-color-raw)]"
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
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="text-xs font-cyber font-bold text-white truncate uppercase tracking-wider group-hover:text-[var(--neon-glow-color)]">
                    {item.name}
                  </h4>
                  <p className="text-[9px] font-mono text-slate-500 truncate" title={item.path}>
                    {item.path}
                  </p>
                  
                  {/* Detalles rápidos */}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {item.isAdmin && (
                      <span className="text-[7.5px] font-cyber font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1 py-0.2 rounded" title={translate('shortcut_run_admin')}>
                        {translate('shortcut_admin_tag')}
                      </span>
                    )}
                    {item.delay > 0 && (
                      <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 px-1 py-0.2 rounded flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {item.delay}s
                      </span>
                    )}
                    {item.usageCount > 0 && (
                      <span className="text-[8px] font-mono text-slate-500">
                        {item.usageCount} executions
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit Button overlay */}
                <button
                  onClick={(e) => handleOpenEditModal(item, e)}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded border border-slate-700 hover:border-[var(--neon-glow-color)] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
                  title="Edit Launch Configuration"
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── BARRA DE ESTADO INFERIOR (STATUS BAR) ── */}
      <footer className="h-10 border-t border-[var(--neon-glow-border)] flex items-center justify-between px-6 bg-slate-950/80 z-10 text-xs font-mono text-slate-400">
        
        {/* Sección Izquierda: Estadísticas de CyberTray */}
        <div className="flex items-center gap-4.5">
          <span className="text-slate-600 font-cyber font-bold tracking-widest text-[9.5px]">
            CYBER_TRAY v1.0
          </span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">{translate('stat_total_shortcuts')}:</span>
            <span className="text-[var(--neon-glow-color)] font-bold">{shortcuts.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">{translate('stat_total_categories')}:</span>
            <span className="text-purple-400 font-bold">{categories.length - 1}</span>
          </div>
        </div>

        {/* Sección Derecha: Telemetría de Recursos del Sistema */}
        <div className="flex items-center gap-5">
          
          {/* Uptime */}
          <div className="flex items-center gap-1" title={translate('stat_uptime')}>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m
            </span>
          </div>

          {/* CPU Load */}
          <div className="flex items-center gap-2" title={systemInfo.cpu.model}>
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">CPU:</span>
            <span className="text-slate-200 font-bold w-12 text-right">
              {systemInfo.cpu.cores} Cores
            </span>
          </div>

          {/* RAM load progress bar */}
          <div className="flex items-center gap-2" title={`RAM total: ${systemInfo.memory.total.toFixed(1)} GB`}>
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
          <div className="flex items-center gap-2" title={translate('stat_disks')}>
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-200 font-bold">
              {disks[0] ? `${disks[0].drive} ${disks[0].percent}%` : '--'}
            </span>
          </div>

          {/* Window Control Buttons */}
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-4">
            
            {/* Idiomas */}
            <button 
              onClick={() => handleChangeLanguage(langCode === 'en' ? 'es' : 'en')}
              className="px-1.5 py-0.5 rounded border border-slate-800 hover:border-slate-700 bg-slate-900 text-[9px] font-bold text-slate-400 hover:text-white uppercase transition-all cursor-pointer"
            >
              {langCode}
            </button>

            {/* Pin Toggle */}
            <button
              onClick={handleTogglePin}
              className={`w-6 h-6 rounded border flex items-center justify-center transition-all cursor-pointer ${
                isPinned 
                  ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-slate-900' 
                  : 'border-slate-800 text-slate-500 hover:text-white'
              }`}
              title={isPinned ? translate('tooltip_pin_on') : translate('tooltip_pin_off')}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            {/* Config Toggle */}
            <button
              onClick={() => { setShowSettings(!showSettings); playCyberBeep(); }}
              className={`w-6 h-6 rounded border flex items-center justify-center transition-all cursor-pointer ${
                showSettings 
                  ? 'border-purple-500 text-purple-400 bg-slate-900' 
                  : 'border-slate-800 text-slate-500 hover:text-white'
              }`}
              title={translate('tooltip_settings')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              onClick={() => isElectron && window.electronAPI!.windowHideToTray()}
              className="w-6 h-6 rounded border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer"
              title={translate('tooltip_minimize')}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
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
                    onClick={() => { setSettingsTab('general'); playCyberBeep(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer ${
                      settingsTab === 'general'
                        ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10 shadow-[0_0_6px_var(--neon-glow-color-raw)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {translate('tab_general')}
                  </button>

                  <button
                    onClick={() => { setSettingsTab('appearance'); playCyberBeep(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer ${
                      settingsTab === 'appearance'
                        ? 'border-purple-500/80 text-purple-400 bg-purple-950/10 shadow-[0_0_6px_rgba(168,85,247,0.25)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {translate('tab_appearance')}
                  </button>

                  <button
                    onClick={() => { setSettingsTab('shortcuts'); playCyberBeep(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer ${
                      settingsTab === 'shortcuts'
                        ? 'border-amber-500/80 text-amber-500 bg-amber-950/10 shadow-[0_0_6px_rgba(245,158,11,0.25)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {translate('tab_shortcuts')}
                  </button>
                </div>

                <button 
                  onClick={() => { setShowSettings(false); playCyberBeep(); }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  SAVE & ABORT
                </button>
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
                            onClick={() => handleUpdateConfigSetting('dockPosition', 'top')}
                            className={`flex-1 py-1.5 border rounded-lg text-xs font-cyber font-bold cursor-pointer ${config.dockPosition === 'top' ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)]' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                          >
                            TOP
                          </button>
                          <button
                            onClick={() => handleUpdateConfigSetting('dockPosition', 'bottom')}
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
                              onClick={() => handleUpdateConfigSetting('handlePosition', pos)}
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
                        onClick={async () => {
                          if (confirm('¿Vaciar memoria indexada por completo? Esta acción es irreversible.')) {
                            await saveDataToConfig([], INITIAL_CATEGORIES);
                            alert('Base de datos depurada.');
                            playCyberBeep();
                          }
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
              <Shield className="w-3.5 h-3.5 text-amber-500" />
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
          </div>
        </>
      )}

    </div>
  );
}
