import fs from 'node:fs';
import path from 'node:path';
import { resolveSourceRoot, type ResolvedImportFile } from './importScanner';
import { listStartAppIds, scanStoreApps } from './store-apps';
import { ignorableShortcutReason, type ImportSourceConfig, type ScannedShortcut } from '../src/lib/shortcutImport';
import {
  diffNewItems,
  hasActiveWatcherSource,
  limitWatcherItems,
  readWatcherSettings,
  watcherIgnoreReason,
  watcherSourceConfigs,
  type WatcherSettings,
} from '../src/lib/desktopWatcher';
import { UNCATEGORIZED_ID } from '../src/lib/appUtils';

/**
 * Vigilante de escritorio y menú Inicio.
 *
 * Regla de oro: la foto inicial se toma **sin resolver** nada, solo listando
 * nombres. Resolver cada acceso cuesta una consulta por archivo (y a veces
 * PowerShell), así que un escaneo completo puede tardar segundos; si la foto
 * se construyera con ese escaneo, cualquier cosa creada mientras tanto se
 * colaría como "ya existente" y nunca se preguntaría por ella.
 *
 * Cuando el sistema de archivos avisa de un cambio se vuelve a listar (barato),
 * se comparan las claves y solo se resuelven los recién llegados. El resolvedor
 * es el mismo que usa la importación manual, así que iconos, argumentos y
 * reglas de descarte son idénticos.
 */

const DEBOUNCE_MS = 1500;
/** Tras encender el vigilante se espera antes de dar nada por nuevo. */
const STARTUP_GRACE_MS = 4000;
/** Las apps de Store no generan archivos: se sondean con una lista barata. */
const STORE_POLL_MS = 180_000;
/** Tope defensivo: un escritorio o menú Inicio enorme no debe colgar el main. */
const MAX_ENTRIES = 4000;
const MAX_DEPTH = 6;

export interface DesktopWatcherDeps {
  /** Resuelve un acceso a destino, icono y argumentos (el del proceso main). */
  resolveFile: (filePath: string) => Promise<ResolvedImportFile | null>;
  /** Devuelve la configuración actual; se consulta en cada ciclo. */
  getConfig: () => Record<string, unknown>;
  /** Se llama con los elementos nuevos, ya recortados. */
  onDetected: (items: ScannedShortcut[]) => void;
  /** Se llama cuando un ciclo falla por un motivo que merece un log. */
  onError?: (message: string) => void;
}

interface Candidate {
  key: string;
  sourceId: string;
  sourcePath: string;
  name: string;
}

interface ActiveWatcher {
  watchers: fs.FSWatcher[];
  debounce: NodeJS.Timeout | null;
  storePoll: NodeJS.Timeout | null;
  settings: WatcherSettings;
  sources: ImportSourceConfig[];
  known: Set<string>;
  knownStoreAumids: Set<string>;
  scanning: boolean;
  rescanQueued: boolean;
  startedAt: number;
  deps: DesktopWatcherDeps;
}

let active: ActiveWatcher | null = null;

function isShortcutFile(fileName: string): boolean {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return false;
  const extension = fileName.slice(dot).toLowerCase();
  return extension === '.lnk' || extension === '.url';
}

/** Lista los accesos de una raíz sin resolverlos. */
function listCandidatesInRoot(root: string, source: ImportSourceConfig, out: Candidate[]): void {
  const walk = (directory: string, depth: number): void => {
    if (depth > MAX_DEPTH || out.length > MAX_ENTRIES) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length > MAX_ENTRIES) return;
      const fullPath = path.normalize(path.join(directory, entry.name));
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
        continue;
      }
      if (!entry.isFile() || !isShortcutFile(entry.name)) continue;
      if (watcherIgnoreReason(entry.name, fullPath) !== null) continue;
      out.push({
        key: `${source.id}:${fullPath.toLowerCase()}`,
        sourceId: source.id,
        sourcePath: fullPath,
        name: path.basename(entry.name, path.extname(entry.name)),
      });
    }
  };
  walk(root, 0);
}

function listCandidates(sources: ImportSourceConfig[]): Candidate[] {
  const out: Candidate[] = [];
  for (const source of sources) {
    if (source.kind === 'store') continue;
    let root = '';
    try {
      root = resolveSourceRoot(source);
    } catch {
      continue;
    }
    if (!root || !fs.existsSync(root)) continue;
    listCandidatesInRoot(root, source, out);
  }
  return out;
}

/** Resuelve un candidato concreto y descarta lo que no merece un aviso. */
async function resolveCandidate(candidate: Candidate, deps: DesktopWatcherDeps): Promise<ScannedShortcut | null> {
  try {
    const resolved = await deps.resolveFile(candidate.sourcePath);
    if (!resolved || !resolved.exists || !resolved.path) return null;
    // Nunca se ofrece el propio CyberTray: cada actualización recrea su acceso.
    if (resolved.path.toLowerCase() === process.execPath.toLowerCase()) return null;
    if (ignorableShortcutReason(candidate.name, resolved.path, candidate.sourcePath)) return null;
    return {
      key: candidate.key,
      sourceId: candidate.sourceId,
      sourcePath: candidate.sourcePath,
      name: candidate.name,
      path: resolved.path,
      arguments: resolved.arguments || '',
      cwd: resolved.cwd || '',
      iconPath: resolved.iconPath || '',
      targetCategory: UNCATEGORIZED_ID,
      preserveFolders: false,
      exists: true,
    };
  } catch {
    return null;
  }
}

async function runScan(watcher: ActiveWatcher, silent: boolean): Promise<void> {
  if (watcher.scanning) {
    watcher.rescanQueued = true;
    return;
  }
  watcher.scanning = true;
  try {
    const candidates = listCandidates(watcher.sources);
    const currentKeys = new Set(candidates.map(candidate => candidate.key));
    const fresh = candidates.filter(candidate => !watcher.known.has(candidate.key));

    if (silent) {
      // Foto inicial: se da todo por conocido sin resolver ni un solo acceso.
      watcher.known = currentKeys;
      return;
    }

    // Lo que desapareció se olvida; así un acceso borrado y vuelto a crear
    // sí se pregunta de nuevo.
    for (const key of [...watcher.known]) {
      if (!currentKeys.has(key)) watcher.known.delete(key);
    }
    if (fresh.length === 0) return;
    if (Date.now() - watcher.startedAt < STARTUP_GRACE_MS) {
      // Dentro del periodo de gracia no se avisa, pero sí se recuerda.
      for (const candidate of fresh) watcher.known.add(candidate.key);
      return;
    }

    const resolved: ScannedShortcut[] = [];
    for (const candidate of fresh) {
      const item = await resolveCandidate(candidate, watcher.deps);
      if (!item) {
        // No se marca como conocido: si fue un fallo pasajero, el próximo
        // cambio del escritorio volverá a intentarlo.
        continue;
      }
      watcher.known.add(candidate.key);
      resolved.push(item);
    }

    const announced = diffNewItems(new Set<string>(), resolved);
    if (announced.length > 0) watcher.deps.onDetected(limitWatcherItems(announced));
  } catch (error) {
    watcher.deps.onError?.(error instanceof Error ? error.message : String(error));
  } finally {
    watcher.scanning = false;
    if (watcher.rescanQueued) {
      watcher.rescanQueued = false;
      scheduleRescan(watcher);
    }
  }
}

function scheduleRescan(watcher: ActiveWatcher): void {
  if (watcher.debounce) clearTimeout(watcher.debounce);
  watcher.debounce = setTimeout(() => {
    watcher.debounce = null;
    void runScan(watcher, false);
  }, DEBOUNCE_MS);
}

/**
 * Sondeo de apps de Store: primero la lista barata de AUMIDs y, solo si
 * aparece algo nuevo, el escaneo completo para resolver nombre e icono.
 */
async function pollStoreApps(watcher: ActiveWatcher): Promise<void> {
  if (!watcher.settings.watchStore || watcher.scanning) return;
  const listing = await listStartAppIds();
  if (listing.length === 0) return;

  const fresh = listing.filter(entry => !watcher.knownStoreAumids.has(entry.aumid.toLowerCase()));
  watcher.knownStoreAumids = new Set(listing.map(entry => entry.aumid.toLowerCase()));
  if (fresh.length === 0) return;
  if (Date.now() - watcher.startedAt < STARTUP_GRACE_MS) return;

  const freshIds = new Set(fresh.map(entry => entry.aumid.toLowerCase()));
  const resolved = await scanStoreApps();
  const items: ScannedShortcut[] = resolved
    .filter(entry => freshIds.has(entry.path.toLowerCase()))
    .map(entry => ({
      key: `watch:store:${entry.path.toLowerCase()}`,
      sourceId: 'watch:store',
      sourcePath: entry.path,
      name: entry.name,
      path: entry.path,
      iconPath: entry.iconPath,
      targetCategory: UNCATEGORIZED_ID,
      preserveFolders: false,
      exists: true,
    }));

  if (items.length > 0) watcher.deps.onDetected(limitWatcherItems(items));
}

export function isDesktopWatcherRunning(): boolean {
  return active !== null;
}

/** Arranca el vigilante con la configuración actual. Idempotente. */
export function startDesktopWatcher(deps: DesktopWatcherDeps): void {
  stopDesktopWatcher();

  const settings = readWatcherSettings(deps.getConfig());
  if (!hasActiveWatcherSource(settings)) return;

  const sources = watcherSourceConfigs(settings);
  const watcher: ActiveWatcher = {
    watchers: [],
    debounce: null,
    storePoll: null,
    settings,
    sources,
    known: new Set<string>(),
    knownStoreAumids: new Set<string>(),
    scanning: false,
    rescanQueued: false,
    startedAt: Date.now(),
    deps,
  };

  for (const source of sources) {
    if (source.kind === 'store') continue;
    let root = '';
    try {
      root = resolveSourceRoot(source);
    } catch {
      continue;
    }
    if (!root || !fs.existsSync(root)) continue;
    try {
      const handle = fs.watch(root, { recursive: true, persistent: false }, () => scheduleRescan(watcher));
      handle.on('error', () => {
        // Un directorio que desaparece (unidad de red, usuario desmontado) no
        // debe tumbar el proceso: se deja de observar y listo.
        try { handle.close(); } catch { /* ya cerrado */ }
        watcher.watchers = watcher.watchers.filter(item => item !== handle);
      });
      watcher.watchers.push(handle);
    } catch {
      // Sin permisos sobre esa raíz: se ignora y se sigue con las demás.
    }
  }

  if (settings.watchStore) {
    watcher.storePoll = setInterval(() => { void pollStoreApps(watcher); }, STORE_POLL_MS);
    // Primera lectura solo para fijar la referencia, sin avisar de nada.
    void listStartAppIds().then(listing => {
      if (watcher.knownStoreAumids.size === 0) {
        watcher.knownStoreAumids = new Set(listing.map(entry => entry.aumid.toLowerCase()));
      }
    });
  }

  active = watcher;
  // Foto inicial silenciosa: lo que ya estaba no se ofrece.
  void runScan(watcher, true);
}

export function stopDesktopWatcher(): void {
  if (!active) return;
  if (active.debounce) clearTimeout(active.debounce);
  if (active.storePoll) clearInterval(active.storePoll);
  for (const handle of active.watchers) {
    try { handle.close(); } catch { /* ya cerrado */ }
  }
  active = null;
}

/**
 * Vuelve a arrancar el vigilante si la configuración cambió. Mantiene la foto
 * conocida cuando la única diferencia es la duración del aviso, para no
 * reofrecer lo que el usuario ya vio.
 */
export function refreshDesktopWatcher(deps: DesktopWatcherDeps): void {
  const settings = readWatcherSettings(deps.getConfig());
  const sameSources = active
    && active.settings.watchDesktop === settings.watchDesktop
    && active.settings.watchStartMenu === settings.watchStartMenu
    && active.settings.watchStore === settings.watchStore;

  if (active && sameSources && hasActiveWatcherSource(settings)) {
    active.settings = settings;
    active.deps = deps;
    return;
  }
  startDesktopWatcher(deps);
}

/** Marca elementos como ya vistos para que no vuelvan a avisar. */
export function markWatcherItemsHandled(keys: string[]): void {
  if (!active) return;
  for (const key of keys) active.known.add(key);
}

/** Vuelve a leer el escritorio desde cero (por ejemplo tras importar). */
export function resetDesktopWatcherBaseline(): void {
  if (!active) return;
  active.startedAt = Date.now();
  void runScan(active, true);
}

/** Solo para pruebas: fuerza un ciclo de escaneo. */
export function triggerDesktopWatcherScan(): void {
  if (active) scheduleRescan(active);
}
