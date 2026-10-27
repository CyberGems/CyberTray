/**
 * Servicio de respaldo automático de la configuración.
 *
 * No importa `electron`: recibe todo lo que necesita del proceso main a través
 * de un contexto, de forma que se pueda probar contra carpetas temporales.
 *
 * Reglas de seguridad que se aplican aquí:
 * - La copia se escribe en un `.tmp` y se renombra: nunca queda un archivo a
 *   medio escribir si el proceso muere durante la copia.
 * - Solo se podan archivos con el prefijo propio; el resto de la carpeta del
 *   usuario se respeta intacto.
 * - Antes de restaurar se guarda una copia de la configuración actual, así que
 *   una restauración equivocada se puede deshacer.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  backupFileName,
  isBackupDue,
  isBackupFile,
  normalizeBackupFolder,
  selectBackupsToPrune,
  type BackupItem,
  type BackupReason,
  type BackupResult,
  type BackupSettings,
  type BackupStatus,
} from '../src/lib/backup';

export interface BackupServiceContext {
  /** Ruta del JSON de configuración que se respalda. */
  configFile: string;
  /** Carpeta por defecto (dentro de userData). */
  defaultFolder: string;
  /** Ajustes actuales, ya normalizados por quien llama. */
  readSettings: () => BackupSettings;
  /** Persiste cambios sin reemitir la config al renderer. */
  patchConfig: (patch: Record<string, unknown>) => void;
  /** Se llama tras escribir una copia correcta. */
  onCompleted?: (payload: { at: string; file: string; folder: string; reason: BackupReason; warning?: string }) => void;
  /** Se llama cuando el intento falla de verdad (no cuando está desactivado). */
  onFailed?: (payload: { at: string; reason: BackupReason; error: string }) => void;
  /** Se llama tras restaurar, para que main recargue y reemita la config. */
  onRestored?: () => void;
  /** Log interno. */
  log?: (message: string, error?: unknown) => void;
}

const TMP_SUFFIX = '.tmp';

function ensureFolder(folder: string): void {
  fs.mkdirSync(folder, { recursive: true });
}

/** Comprueba que la carpeta existe (o se puede crear) y acepta escritura. */
export function isFolderWritable(folder: string): boolean {
  try {
    ensureFolder(folder);
    const probe = path.join(folder, `.cybertray-write-test-${process.pid}`);
    fs.writeFileSync(probe, 'ok', 'utf-8');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/** Copia atómica: escribe a `.tmp` y renombra sobre el destino. */
function writeAtomic(targetPath: string, content: Buffer | string): void {
  const tmpPath = `${targetPath}${TMP_SUFFIX}`;
  fs.writeFileSync(tmpPath, content);
  try {
    fs.renameSync(tmpPath, targetPath);
  } catch (error) {
    // En Windows el renombrado falla si el destino existe y está bloqueado.
    try {
      fs.rmSync(tmpPath, { force: true });
    } catch { /* ignore */ }
    throw error;
  }
}

interface ResolvedFolder {
  folder: string;
  warning?: string;
}

/**
 * Decide dónde escribir. Si el usuario eligió una carpeta pero ya no está
 * disponible (unidad desconectada, permisos), se usa la de la app y se avisa:
 * es preferible una copia en otro sitio que ninguna copia.
 */
export function resolveBackupFolder(settings: BackupSettings, defaultFolder: string): ResolvedFolder {
  const custom = normalizeBackupFolder(settings.folder);
  if (!custom) return { folder: defaultFolder };
  if (isFolderWritable(custom)) return { folder: custom };
  return {
    folder: defaultFolder,
    warning: `backup-folder-unavailable:${custom}`,
  };
}

export function listBackupsIn(folder: string): BackupItem[] {
  try {
    if (!fs.existsSync(folder)) return [];
    return fs
      .readdirSync(folder)
      .filter(isBackupFile)
      .sort()
      .reverse()
      .flatMap((file) => {
        try {
          const stat = fs.statSync(path.join(folder, file));
          if (!stat.isFile()) return [];
          return [{ file, size: stat.size, mtime: stat.mtime.toISOString() }];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

function pruneFolder(folder: string, keep: number): string[] {
  const removed: string[] = [];
  for (const stale of selectBackupsToPrune(fs.readdirSync(folder), keep)) {
    try {
      fs.unlinkSync(path.join(folder, stale));
      removed.push(stale);
    } catch { /* un archivo bloqueado no debe romper el respaldo */ }
  }
  return removed;
}

/**
 * Dos copias en el mismo milisegundo (doble clic en "Respaldar ahora") no
 * deben pisarse: se añade un sufijo incremental antes de la extensión.
 */
function uniqueBackupPath(folder: string, file: string): string {
  const ext = path.extname(file);
  const base = file.slice(0, file.length - ext.length);
  let candidate = path.join(folder, file);
  let suffix = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(folder, `${base}-${suffix}${ext}`);
    suffix += 1;
    if (suffix > 99) break;
  }
  return candidate;
}

export function createBackupService(ctx: BackupServiceContext) {
  let timer: NodeJS.Timeout | null = null;
  let startupTimer: NodeJS.Timeout | null = null;
  let running = false;

  const log = ctx.log ?? ((message: string, error?: unknown) => {
    if (error) console.error(message, error);
    else console.log(message);
  });

  function status(): BackupStatus {
    const settings = ctx.readSettings();
    const custom = normalizeBackupFolder(settings.folder);
    const available = custom ? isFolderWritable(custom) : false;
    const resolved = custom && available ? custom : ctx.defaultFolder;
    return {
      settings: { ...settings, folder: custom },
      folder: resolved,
      defaultFolder: ctx.defaultFolder,
      usingCustomFolder: Boolean(custom) && available,
      customFolderAvailable: available,
      running,
    };
  }

  function run(reason: BackupReason): BackupResult {
    if (running) return { ok: false, error: 'backup-in-progress' };
    running = true;
    try {
      const settings = ctx.readSettings();
      if (reason !== 'manual' && !settings.enabled) return { ok: false, error: 'backup-disabled' };
      if (!fs.existsSync(ctx.configFile)) return { ok: false, error: 'config-missing' };

      const { folder, warning } = resolveBackupFolder(settings, ctx.defaultFolder);
      ensureFolder(folder);

      // Nunca se guarda una copia ilegible: si el archivo se está escribiendo
      // justo ahora, se descarta el intento y el siguiente ciclo lo reintenta.
      const raw = fs.readFileSync(ctx.configFile);
      try {
        JSON.parse(raw.toString('utf-8'));
      } catch {
        return { ok: false, error: 'config-unreadable' };
      }

      const targetPath = uniqueBackupPath(folder, backupFileName(new Date()));
      const file = path.basename(targetPath);
      writeAtomic(targetPath, raw);
      pruneFolder(folder, settings.keep);

      const at = new Date().toISOString();
      ctx.patchConfig({ autoBackupLast: at });

      if (warning) log(`[BACKUP] Custom folder unavailable, used default (${folder})`);
      log(`[BACKUP] (${reason}) saved ${file} in ${folder}`);
      ctx.onCompleted?.({ at, file, folder, reason, ...(warning ? { warning } : {}) });
      return { ok: true, file, folder, ...(warning ? { warning } : {}) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[BACKUP] (${reason}) failed`, error);
      ctx.onFailed?.({ at: new Date().toISOString(), reason, error: message });
      return { ok: false, error: message };
    } finally {
      running = false;
    }
  }

  function list(): BackupItem[] {
    const settings = ctx.readSettings();
    const { folder } = resolveBackupFolder(settings, ctx.defaultFolder);
    return listBackupsIn(folder);
  }

  function remove(fileName: string): BackupResult {
    try {
      const safe = path.basename(String(fileName || ''));
      if (!isBackupFile(safe)) return { ok: false, error: 'invalid-backup-name' };
      const settings = ctx.readSettings();
      const { folder } = resolveBackupFolder(settings, ctx.defaultFolder);
      const target = path.join(folder, safe);
      if (!fs.existsSync(target)) return { ok: false, error: 'backup-not-found' };
      fs.unlinkSync(target);
      return { ok: true, file: safe, folder };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  function restore(fileName: string): BackupResult {
    try {
      const safe = path.basename(String(fileName || ''));
      if (!isBackupFile(safe)) return { ok: false, error: 'invalid-backup-name' };
      const settings = ctx.readSettings();
      const { folder } = resolveBackupFolder(settings, ctx.defaultFolder);
      const source = path.join(folder, safe);
      if (!fs.existsSync(source)) return { ok: false, error: 'backup-not-found' };

      const raw = fs.readFileSync(source, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'invalid-backup-content' };
      }

      // Red de seguridad: la config actual se respalda antes de pisarla.
      // Si falla, se aborta la restauración en lugar de arriesgar los datos.
      if (fs.existsSync(ctx.configFile)) {
        ensureFolder(folder);
        writeAtomic(uniqueBackupPath(folder, backupFileName(new Date())), fs.readFileSync(ctx.configFile));
        pruneFolder(folder, settings.keep);
      }

      writeAtomic(ctx.configFile, raw);
      ctx.onRestored?.();
      log(`[BACKUP] restored ${safe}`);
      return { ok: true, file: safe, folder };
    } catch (error) {
      log('[BACKUP] restore failed', error);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Crea una copia si toca. Devuelve `null` cuando aún no toca. */
  function runIfDue(reason: 'schedule' | 'startup'): BackupResult | null {
    const settings = ctx.readSettings();
    if (!settings.enabled) return null;
    if (!isBackupDue(settings.last, Date.now(), settings.hours)) return null;
    return run(reason);
  }

  function start(): void {
    stop();
    // Primera comprobación diferida: el arranque no debe competir con la UI.
    startupTimer = setTimeout(() => { runIfDue('startup'); }, 20_000);
    timer = setInterval(() => { runIfDue('schedule'); }, 60_000);
  }

  function stop(): void {
    if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
    if (timer) { clearInterval(timer); timer = null; }
  }

  return { status, run, runIfDue, list, remove, restore, start, stop };
}

export type BackupService = ReturnType<typeof createBackupService>;
