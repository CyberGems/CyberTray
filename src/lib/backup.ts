/**
 * Lógica pura del respaldo automático de la configuración.
 *
 * Igual que `configDefaults`, este módulo lo consumen tanto el proceso main de
 * Electron como el renderer, así que no puede importar `node:fs` ni `node:path`
 * ni tocar `window`. Todo lo que depende del sistema de archivos vive en
 * `electron/backups.ts`.
 */

/** Frecuencias permitidas, en horas. */
export const AUTO_BACKUP_FREQUENCIES_HOURS: readonly number[] = [6, 12, 24, 168];
/** Copias que se conservan. El usuario pidió explícitamente esta lista corta. */
export const AUTO_BACKUP_KEEP_OPTIONS: readonly number[] = [1, 3, 5, 7];
export const DEFAULT_AUTO_BACKUP_HOURS = 24;
export const DEFAULT_AUTO_BACKUP_KEEP = 3;
export const BACKUP_FILE_PREFIX = 'cybertray-backup-';
export const BACKUP_FILE_EXTENSION = '.json';

export interface BackupItem {
  file: string;
  size: number;
  mtime: string;
}

export interface BackupSettings {
  enabled: boolean;
  hours: number;
  keep: number;
  /** ISO de la última copia correcta, o `null` si nunca se hizo. */
  last: string | null;
  /** Carpeta personalizada; cadena vacía = carpeta por defecto de la app. */
  folder: string;
}

export interface BackupStatus {
  settings: BackupSettings;
  /** Carpeta donde se escribirán las copias ahora mismo. */
  folder: string;
  defaultFolder: string;
  usingCustomFolder: boolean;
  /** La carpeta personalizada existe y se puede escribir en ella. */
  customFolderAvailable: boolean;
  running: boolean;
}

export type BackupReason = 'schedule' | 'startup' | 'manual' | 'pre-restore';

export interface BackupResult {
  ok: boolean;
  file?: string;
  folder?: string;
  error?: string;
  /** Aviso no fatal: p. ej. la carpeta personalizada falló y se usó la de la app. */
  warning?: string;
}

/** Normaliza la frecuencia en horas. Cualquier valor raro cae al default. */
export function parseBackupHours(value: unknown): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : typeof value === 'number' ? value : Number.NaN;
  return AUTO_BACKUP_FREQUENCIES_HOURS.includes(n) ? n : DEFAULT_AUTO_BACKUP_HOURS;
}

/** Normaliza cuántas copias se conservan. Cualquier valor raro cae al default. */
export function parseBackupKeep(value: unknown): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : typeof value === 'number' ? value : Number.NaN;
  return AUTO_BACKUP_KEEP_OPTIONS.includes(n) ? n : DEFAULT_AUTO_BACKUP_KEEP;
}

/**
 * ¿Toca respaldar? Sin fecha previa, con fecha inválida o cuando ya pasó el
 * intervalo. Se usa `>=` para que un reloj que va justo no retrase la copia.
 */
export function isBackupDue(lastIso: string | null | undefined, nowMs: number, hours: number): boolean {
  if (!lastIso) return true;
  const last = Date.parse(lastIso);
  if (!Number.isFinite(last)) return true;
  return nowMs - last >= parseBackupHours(hours) * 3_600_000;
}

/**
 * Nombre ordenable cronológicamente y único incluso si se pulsan dos veces
 * seguidas "Respaldar ahora" dentro del mismo segundo.
 */
export function backupFileName(at: Date): string {
  const p = (n: number, width = 2): string => String(n).padStart(width, '0');
  const date = `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}`;
  const time = `${p(at.getHours())}-${p(at.getMinutes())}-${p(at.getSeconds())}-${p(at.getMilliseconds(), 3)}`;
  return `${BACKUP_FILE_PREFIX}${date}T${time}${BACKUP_FILE_EXTENSION}`;
}

export function isBackupFile(name: unknown): boolean {
  return (
    typeof name === 'string' &&
    name.startsWith(BACKUP_FILE_PREFIX) &&
    name.endsWith(BACKUP_FILE_EXTENSION) &&
    !name.includes('..')
  );
}

/**
 * Devuelve los archivos más antiguos que sobran. Solo considera copias
 * propias: si el usuario apunta a una carpeta con otros archivos, se respetan.
 */
export function selectBackupsToPrune(files: string[], keep: number): string[] {
  const limit = Math.max(0, Math.trunc(parseBackupKeep(keep)));
  const sorted = files.filter(isBackupFile).sort();
  return sorted.slice(0, Math.max(0, sorted.length - limit));
}

/**
 * Valida una ruta de carpeta absoluta sin depender de `node:path`.
 * Acepta `C:\carpeta`, `C:/carpeta` y rutas UNC `\\servidor\recurso`.
 */
export function normalizeBackupFolder(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/^"(.*)"$/, '$1').trim();
  if (!trimmed) return '';
  const isUnc = /^\\\\[^\\]+\\[^\\]+/.test(trimmed);
  const isDrive = /^[a-zA-Z]:[\\/]/.test(trimmed);
  if (!isUnc && !isDrive) return '';
  // Sin separador final, salvo que sea la raíz de una unidad ("C:\").
  if (/^[a-zA-Z]:[\\/]$/.test(trimmed)) return trimmed.replace('/', '\\');
  return trimmed.replace(/[\\/]+$/, '');
}
