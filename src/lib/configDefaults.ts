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

/**
 * Segundos que el aviso del vigilante permanece en pantalla. Diez alcanza
 * para leer la lista y elegir carpeta sin que se cierre a media decisión.
 */
export const DEFAULT_WATCHER_PROMPT_SECONDS = 10;
export const WATCHER_MIN_PROMPT_SECONDS = 4;
export const WATCHER_MAX_PROMPT_SECONDS = 30;

/**
 * Valor de fábrica anterior (6 s). Un config ya guardado nunca vuelve a leer
 * los defaults, así que las instalaciones existentes se quedan con el valor
 * viejo para siempre salvo que se migren explícitamente.
 */
export const LEGACY_WATCHER_PROMPT_SECONDS = 6;

/**
 * Migra valores por defecto que cambiaron de versión. Solo toca un ajuste
 * cuando sigue exactamente en el valor de fábrica antiguo: si el usuario lo
 * eligió a mano (aunque coincida con el viejo default) se respeta tal cual.
 */
export function applyLegacyDefaults<T extends object>(
  config: T,
): { config: T; changed: boolean } {
  let changed = false;
  const next = { ...config } as Record<string, unknown>;
  if (next.watcherPromptSeconds === LEGACY_WATCHER_PROMPT_SECONDS) {
    next.watcherPromptSeconds = DEFAULT_WATCHER_PROMPT_SECONDS;
    changed = true;
  }
  return { config: next as T, changed };
}

export interface CyberTrayConfig {
  monitorId: string;
  shortcut: string;
  hideOnBlur: boolean;
  hotspotCorners: string[];
  hotspotDelay: number;
  alwaysOnTop: boolean;
  iconSize: number;
  /** Barra lateral reducida a una franja de iconos. */
  sidebarCollapsed?: boolean;
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
  /**
   * Vigilante de escritorio: avisa cuando aparece algo nuevo en el escritorio
   * o en el menú Inicio y ofrece añadirlo a la librería. Apagado de fábrica.
   */
  watcherEnabled?: boolean;
  watcherWatchDesktop?: boolean;
  watcherWatchStartMenu?: boolean;
  watcherWatchStore?: boolean;
  /** Segundos antes de que el aviso se cierre solo. */
  watcherPromptSeconds?: number;
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
  'sidebarCollapsed',
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
  'watcherEnabled',
  'watcherWatchDesktop',
  'watcherWatchStartMenu',
  'watcherWatchStore',
  'watcherPromptSeconds',
]);

/** Devuelve la configuración sin las claves desconocidas. */
export function sanitizeConfig<T extends Record<string, unknown>>(config: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config || {})) {
    if (KNOWN_CONFIG_KEYS.has(key as keyof CyberTrayConfig)) {
      result[key] = value;
    }
  }
  return normalizeConfigValues(result) as T;
}

// La config cruza el sandbox (saveConfig) y alimenta todo el estilo y las
// rutas que el main procesa: los escalares se acotan a su rango y las rutas
// a su longitud, de modo que un renderer comprometido no pueda persistir
// valores disparatados que luego se lean como si fueran de la casa.

const MAX_CONFIG_PATH_LENGTH = 4096;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : Number.NaN;
  return Number.isNaN(num) ? fallback : Math.min(max, Math.max(min, num));
}

function keepBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function keepString(value: unknown, max: number, fallback: string): string {
  return typeof value === 'string' && value.length <= max ? value : fallback;
}

function keepPath(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length <= MAX_CONFIG_PATH_LENGTH ? value : fallback;
}

function normalizeConfigValues(config: Record<string, unknown>): Record<string, unknown> {
  // Solo se normalizan las claves presentes: sanitizeConfig conserva la
  // forma del objeto y nunca añade claves. Un valor que no pasa su control
  // vuelve a su valor por defecto, nunca se inventa uno nuevo.
  const out: Record<string, unknown> = { ...config };

  const setIfPresent = (key: string, normalize: (value: unknown) => unknown): void => {
    if (key in out) out[key] = normalize(out[key]);
  };

  setIfPresent('shortcut', (v) => keepString(v, 100, DEFAULT_GLOBAL_SHORTCUT));
  setIfPresent('hotspotCorners', (v) => Array.isArray(v)
    ? (v as unknown[]).filter((corner): corner is string => typeof corner === 'string').slice(0, 4)
    : []);
  setIfPresent('hotspotDelay', (v) => clampNumber(v, 0, 5000, 300));
  setIfPresent('iconSize', (v) => clampNumber(v, 24, 120, 60));
  setIfPresent('blurLevel', (v) => clampNumber(v, 0, 100, 20));
  setIfPresent('opacity', (v) => clampNumber(v, 10, 100, 85));
  setIfPresent('theme', (v) => keepString(v, 32, 'cyan'));
  setIfPresent('bgType', (v) => (v === 'solid' || v === 'gradient' || v === 'image' ? v : 'solid'));
  setIfPresent('bgSolidColor', (v) => keepString(v, 32, '#070b13'));
  setIfPresent('bgGradient', (v) => keepString(v, 4096, 'preset-1'));
  setIfPresent('bgImage', (v) => keepString(v, 2_000_000, 'preset-1'));
  setIfPresent('bgCustomPath', (v) => keepPath(v, ''));
  setIfPresent('language', (v) => (v === 'en' || v === 'es' ? v : 'en'));
  setIfPresent('soundEnabled', (v) => keepBoolean(v, true));
  setIfPresent('soundPath', (v) => keepPath(v, ''));
  setIfPresent('sidebarCollapsed', (v) => keepBoolean(v, false));
  setIfPresent('showTaskbarIcon', (v) => keepBoolean(v, false));
  setIfPresent('autoLaunch', (v) => keepBoolean(v, false));
  setIfPresent('hideOnDeadZoneClick', (v) => keepBoolean(v, false));
  setIfPresent('alwaysOnTop', (v) => keepBoolean(v, false));
  setIfPresent('hideOnBlur', (v) => keepBoolean(v, true));
  setIfPresent('autoUpdate', (v) => keepBoolean(v, true));
  setIfPresent('monitorBounds', (v) => {
    if (
      v && typeof v === 'object'
      && ['x', 'y', 'width', 'height'].every((key) => typeof (v as Record<string, unknown>)[key] === 'number')
    ) return v;
    return undefined;
  });
  setIfPresent('vaultPath', (v) => keepPath(v, ''));
  setIfPresent('vaultPinEnabled', (v) => keepBoolean(v, false));
  setIfPresent('vaultPinHash', (v) => keepString(v, 512, ''));
  setIfPresent('vaultPinSalt', (v) => keepString(v, 512, ''));
  setIfPresent('vaultLockTimeout', (v) => clampNumber(v, 0, 10080, 0));
  setIfPresent('folderSchemaVersion', (v) => clampNumber(v, 0, 1000, FOLDER_SCHEMA_VERSION));
  setIfPresent('totalLaunches', (v) => clampNumber(v, 0, Number.MAX_SAFE_INTEGER, 0));
  setIfPresent('autoCheckUpdates', (v) => keepBoolean(v, true));
  setIfPresent('autoSyncOnStartup', (v) => keepBoolean(v, false));
  setIfPresent('onboardingDone', (v) => keepBoolean(v, false));
  setIfPresent('taskbarIds', (v) => Array.isArray(v)
    ? (v as unknown[]).filter((id): id is number => typeof id === 'number' && Number.isFinite(id)).slice(0, 64)
    : []);
  setIfPresent('shortcutsList', (v) => Array.isArray(v)
    ? (v as unknown[]).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : []);
  setIfPresent('categoriesList', (v) => Array.isArray(v)
    ? (v as unknown[]).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : []);
  setIfPresent('importSources', (v) => Array.isArray(v)
    ? (v as unknown[]).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : []);
  setIfPresent('autoBackupEnabled', (v) => keepBoolean(v, true));
  setIfPresent('autoBackupHours', (v) => clampNumber(v, 1, 168, DEFAULT_AUTO_BACKUP_HOURS));
  setIfPresent('autoBackupKeep', (v) => clampNumber(v, 1, 60, DEFAULT_AUTO_BACKUP_KEEP));
  setIfPresent('autoBackupLast', (v) => (typeof v === 'string' ? v.slice(0, 64) : null));
  setIfPresent('autoBackupPath', (v) => keepPath(v, ''));
  setIfPresent('watcherEnabled', (v) => keepBoolean(v, false));
  setIfPresent('watcherWatchDesktop', (v) => keepBoolean(v, true));
  setIfPresent('watcherWatchStartMenu', (v) => keepBoolean(v, true));
  setIfPresent('watcherWatchStore', (v) => keepBoolean(v, true));
  setIfPresent('watcherPromptSeconds', (v) => clampNumber(v, 3, 120, DEFAULT_WATCHER_PROMPT_SECONDS));

  for (const [key, value] of Object.entries(out)) {
    if (value === undefined) delete out[key];
  }
  return out;
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
    sidebarCollapsed: false,
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
    // El vigilante nunca avisa sin permiso: se enciende desde Ajustes.
    watcherEnabled: false,
    watcherWatchDesktop: true,
    watcherWatchStartMenu: true,
    watcherWatchStore: true,
    watcherPromptSeconds: DEFAULT_WATCHER_PROMPT_SECONDS,
  };
}
