/**
 * Configuración por defecto de CyberTray.
 *
 * Este módulo es la única fuente de verdad y lo consumen tanto el proceso
 * main de Electron como el renderer. No debe tocar `window` ni nada del
 * entorno de navegador: se importa desde el main.
 */

export const FOLDER_SCHEMA_VERSION = 2;

export interface CyberTrayConfig {
  monitorId: string;
  shortcut: string;
  hideOnBlur: boolean;
  hotspotCorners: string[];
  hotspotDelay: number;
  alwaysOnTop: boolean;
  iconSize: number;
  showTaskbarIcon: boolean;
  autoLaunch: boolean;
  hideOnDeadZoneClick: boolean;
  theme: string;
  blurLevel: number;
  opacity: number;
  bgType: 'solid' | 'gradient' | 'image';
  bgSolidColor: string;
  bgGradient: string;
  bgImage: string;
  bgCustomPath: string;
  language?: 'en' | 'es';
  soundEnabled?: boolean;
  soundPath?: string;
  monitorBounds?: { x: number; y: number; width: number; height: number };
  vaultPath?: string;
  vaultPinEnabled?: boolean;
  vaultPinHash?: string;
  vaultPinSalt?: string;
  vaultLockTimeout?: number;
  shortcutsList?: any[];
  categoriesList?: any[];
  folderSchemaVersion?: number;
  totalLaunches?: number;
  autoUpdate?: boolean;
  autoCheckUpdates?: boolean;
  taskbarIds?: number[];
}

/**
 * Devuelve una copia nueva de los valores por defecto.
 * Se usa una factory (y no una constante) para que los arrays y objetos
 * anidados nunca se compartan entre la config en memoria y el default.
 */
export function createDefaultConfig(): CyberTrayConfig {
  return {
    monitorId: '',
    shortcut: 'Alt+Shift+T',
    hideOnBlur: true,
    hotspotCorners: [],
    hotspotDelay: 300,
    alwaysOnTop: true,
    iconSize: 60,
    showTaskbarIcon: false,
    autoLaunch: false,
    hideOnDeadZoneClick: false,
    theme: 'cyan',
    blurLevel: 20,
    opacity: 85,
    bgType: 'solid',
    bgSolidColor: '#070b13',
    bgGradient: 'preset-1',
    bgImage: 'preset-1',
    bgCustomPath: '',
    language: 'en',
    soundEnabled: true,
    soundPath: '',
    vaultPath: '',
    vaultPinEnabled: false,
    vaultLockTimeout: 0,
    folderSchemaVersion: FOLDER_SCHEMA_VERSION,
    totalLaunches: 0,
    autoUpdate: true,
    taskbarIds: [],
  };
}
