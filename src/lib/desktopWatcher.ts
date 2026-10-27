import {
  DEFAULT_WATCHER_PROMPT_SECONDS,
  WATCHER_MAX_PROMPT_SECONDS,
  WATCHER_MIN_PROMPT_SECONDS,
  type CyberTrayConfig,
} from './configDefaults';
import type { ImportSourceConfig, ScannedShortcut } from './shortcutImport';
import { UNCATEGORIZED_ID } from './appUtils';

/**
 * Lógica compartida del vigilante de escritorio.
 *
 * El vigilante observa el escritorio y el menú Inicio y avisa cuando aparece
 * algo nuevo, para ofrecer añadirlo a la librería. Este módulo no toca el
 * sistema de archivos ni Electron: solo decide *qué* se vigila y *qué* es
 * nuevo. Así el comportamiento se puede probar sin abrir ventanas.
 */

export {
  DEFAULT_WATCHER_PROMPT_SECONDS,
  WATCHER_MAX_PROMPT_SECONDS,
  WATCHER_MIN_PROMPT_SECONDS,
};

export interface WatcherSettings {
  enabled: boolean;
  watchDesktop: boolean;
  watchStartMenu: boolean;
  watchStore: boolean;
  promptSeconds: number;
}

/**
 * Restos que Windows y los navegadores dejan mientras escriben un archivo.
 * Se descartan para no avisar de descargas a medias.
 */
const IGNORED_EXTENSIONS = new Set([
  '.tmp',
  '.temp',
  '.part',
  '.partial',
  '.crdownload',
  '.download',
  '.opdownload',
]);

const IGNORED_NAMES = new Set([
  'desktop.ini',
  'thumbs.db',
  '.ds_store',
]);

/**
 * Normaliza la configuración del vigilante. Todo lo que falte se resuelve con
 * los valores de fábrica, así un config viejo no deja campos en `undefined`.
 */
export function readWatcherSettings(config: Partial<CyberTrayConfig> | null | undefined): WatcherSettings {
  const raw = config || {};
  const seconds = Number(raw.watcherPromptSeconds);
  return {
    enabled: raw.watcherEnabled === true,
    watchDesktop: raw.watcherWatchDesktop !== false,
    watchStartMenu: raw.watcherWatchStartMenu !== false,
    watchStore: raw.watcherWatchStore !== false,
    promptSeconds: Number.isFinite(seconds)
      ? Math.min(WATCHER_MAX_PROMPT_SECONDS, Math.max(WATCHER_MIN_PROMPT_SECONDS, Math.round(seconds)))
      : DEFAULT_WATCHER_PROMPT_SECONDS,
  };
}

/** `true` si hay al menos una fuente activa que justifique el vigilante. */
export function hasActiveWatcherSource(settings: WatcherSettings): boolean {
  return settings.enabled && (settings.watchDesktop || settings.watchStartMenu || settings.watchStore);
}

/**
 * Fuentes que el vigilante debe observar. Se reutiliza `ImportSourceConfig`
 * para que el escaneo pase por el mismo resolvedor de accesos y las mismas
 * reglas de descarte que la importación manual.
 */
export function watcherSourceConfigs(settings: WatcherSettings): ImportSourceConfig[] {
  const base = {
    targetCategory: UNCATEGORIZED_ID,
    preserveFolders: false,
    skipUninstallers: true,
    includeFiles: false,
  };
  const sources: ImportSourceConfig[] = [];

  if (settings.watchDesktop) {
    sources.push({ ...base, id: 'watch:desktop:user', kind: 'desktop', scope: 'user' });
    sources.push({ ...base, id: 'watch:desktop:common', kind: 'desktop', scope: 'common' });
  }
  if (settings.watchStartMenu) {
    sources.push({ ...base, id: 'watch:start-menu:user', kind: 'start-menu', scope: 'user' });
    sources.push({ ...base, id: 'watch:start-menu:common', kind: 'start-menu', scope: 'common' });
  }
  if (settings.watchStore) {
    sources.push({ ...base, id: 'watch:store', kind: 'store', preserveFolders: false });
  }
  return sources;
}

/**
 * Motivo por el que un archivo del escritorio no merece un aviso, o `null` si
 * sí es candidato. Se aplica antes de resolver el acceso, porque un `.tmp`
 * que desaparece no debe llegar a lanzar PowerShell.
 */
export function watcherIgnoreReason(fileName: string, filePath: string): string | null {
  const name = (fileName || '').trim();
  if (!name) return 'empty-name';
  if (IGNORED_NAMES.has(name.toLowerCase())) return 'system-file';
  // Los temporales de Office empiezan por "~$".
  if (name.startsWith('~$')) return 'temporary';
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 ? name.slice(dot).toLowerCase() : '';
  if (IGNORED_EXTENSIONS.has(extension)) return 'incomplete-download';
  if (!filePath) return 'empty-path';
  return null;
}

/** Claves estables de un conjunto de elementos ya vistos. */
export function snapshotKeys(items: ScannedShortcut[]): Set<string> {
  const keys = new Set<string>();
  for (const item of items) {
    if (item?.key) keys.add(item.key);
  }
  return keys;
}

/**
 * Elementos que no estaban en la foto anterior.
 *
 * Se descartan los que el escáner ya marcó como ignorables (desinstaladores,
 * errores de resolución) y los que no existen, para no ofrecer añadir algo
 * roto a la librería.
 */
export function diffNewItems(known: Set<string>, items: ScannedShortcut[]): ScannedShortcut[] {
  const fresh: ScannedShortcut[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item?.key || seen.has(item.key)) continue;
    seen.add(item.key);
    if (known.has(item.key)) continue;
    if (item.skippedReason || item.error) continue;
    if (!item.exists || !item.path) continue;
    fresh.push(item);
  }
  return fresh;
}

/**
 * Recorta la lista de avisos a lo que cabe en el popup. El resto se descarta
 * a propósito: un aviso con veinte entradas no se lee, se cierra.
 */
export const MAX_WATCHER_ITEMS = 5;

export function limitWatcherItems(items: ScannedShortcut[]): ScannedShortcut[] {
  return items.slice(0, MAX_WATCHER_ITEMS);
}
