import type { ImportSourceConfig } from './shortcutImport';
import { DEFAULT_AUTO_BACKUP_HOURS, DEFAULT_AUTO_BACKUP_KEEP } from './backup';

/**
 * Configuración por defecto de CyberTray.
 *
 * Este módulo es la única fuente de verdad y lo consumen tanto el proceso
 * main de Electron como el renderer. No debe tocar `window` ni nada del
 * entorno de navegador: se importa desde el main.
 */

export const FOLDER_SCHEMA_VERSION = 2;

/** Atajo global de fábrica, compartido con el botón "Restablecer". */
export const DEFAULT_GLOBAL_SHORTCUT = 'Alt+Shift+T';

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
  importSources?: ImportSourceConfig[];
  autoSyncOnStartup?: boolean;
  onboardingDone?: boolean;
  /** Respaldo automático de la configuración. */
  autoBackupEnabled?: boolean;
  autoBackupHours?: number;
  autoBackupKeep?: number;
  /** ISO de la última copia correcta. */
  autoBackupLast?: string | null;
  /** Carpeta de destino personalizada; vacía = carpeta por defecto. */
  autoBackupPath?: string;
}

/**
 * Claves que la app entiende. Cualquier otra cosa que quedara en el archivo
 * de configuración (restos de versiones anteriores) se descarta al guardar,
 * para que el archivo no se llene de campos muertos.
 */
const KNOWN_CONFIG_KEYS = new Set<keyof CyberTrayConfig>([
  'monitorId',
  'shortcut',
  'hideOnBlur',
  'hotspotCorners',
  'hotspotDelay',
  'alwaysOnTop',
  'iconSize',
  'showTaskbarIcon',
  'autoLaunch',
  'hideOnDeadZoneClick',
  'theme',
  'blurLevel',
  'opacity',
  'bgType',
  'bgSolidColor',
  'bgGradient',
  'bgImage',
  'bgCustomPath',
  'language',
  'soundEnabled',
  'soundPath',
  'monitorBounds',
  'vaultPath',
  'vaultPinEnabled',
  'vaultPinHash',
  'vaultPinSalt',
  'vaultLockTimeout',
  'shortcutsList',
  'categoriesList',
  'folderSchemaVersion',
  'totalLaunches',
  'autoUpdate',
  'autoCheckUpdates',
  'taskbarIds',
  'importSources',
  'autoSyncOnStartup',
  'onboardingDone',
  'autoBackupEnabled',
  'autoBackupHours',
  'autoBackupKeep',
  'autoBackupLast',
  'autoBackupPath',
]);

/** Devuelve la configuración sin las claves desconocidas. */
export function sanitizeConfig<T extends Record<string, unknown>>(config: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config || {})) {
    if (KNOWN_CONFIG_KEYS.has(key as keyof CyberTrayConfig)) {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Devuelve una copia nueva de los valores por defecto.
 * Se usa una factory (y no una constante) para que los arrays y objetos
 * anidados nunca se compartan entre la config en memoria y el default.
 */
export function createDefaultConfig(): CyberTrayConfig {
  return {
    monitorId: '',
    shortcut: DEFAULT_GLOBAL_SHORTCUT,
    hideOnBlur: true,
    hotspotCorners: [],
    hotspotDelay: 300,
    // El anclado (pin) no es el comportamiento por defecto: la bandeja debe
    // ocultarse al perder el foco. Se activa a mano desde la barra superior.
    alwaysOnTop: false,
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
    importSources: [],
    autoSyncOnStartup: false,
    onboardingDone: false,
    autoBackupEnabled: true,
    autoBackupHours: DEFAULT_AUTO_BACKUP_HOURS,
    autoBackupKeep: DEFAULT_AUTO_BACKUP_KEEP,
    autoBackupLast: null,
    autoBackupPath: '',
  };
}
