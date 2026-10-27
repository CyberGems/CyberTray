/**
 * Centro de notificaciones del vigilante.
 *
 * El aviso flotante es efímero: si se cierra solo, el elemento detectado no
 * puede desaparecer sin más. Aquí vive la bandeja que los acumula, con la
 * regla de que nada se da por leído hasta que el usuario lo ve de verdad.
 *
 * Este módulo es puro: no toca disco ni Electron, así el comportamiento se
 * puede probar sin abrir ventanas.
 */

export const NOTIFICATION_STORE_VERSION = 1;

/** Tope de lotes guardados. Más allá de esto la bandeja deja de ser útil. */
export const MAX_NOTIFICATION_ENTRIES = 40;
/** Tope total de elementos, para que el archivo no crezca sin freno. */
export const MAX_NOTIFICATION_ITEMS = 200;

export type NotificationSource = 'desktop' | 'start-menu' | 'store';

export interface NotificationItem {
  /** Clave estable del vigilante (`watch:desktop:...`). */
  key: string;
  name: string;
  path: string;
  iconPath: string;
  source: NotificationSource;
  /** Argumentos y directorio del acceso, para añadirlo igual desde el centro. */
  args?: string;
  cwd?: string;
}

export interface NotificationEntry {
  id: string;
  createdAt: number;
  /** `false` hasta que el usuario ve el lote en el centro. */
  seen: boolean;
  items: NotificationItem[];
}

export interface NotificationState {
  version: number;
  entries: NotificationEntry[];
}

export function emptyNotificationState(): NotificationState {
  return { version: NOTIFICATION_STORE_VERSION, entries: [] };
}

function readSource(value: unknown): NotificationSource {
  return value === 'start-menu' || value === 'store' ? value : 'desktop';
}

function readItems(value: unknown): NotificationItem[] {
  if (!Array.isArray(value)) return [];
  const items: NotificationItem[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const key = typeof item.key === 'string' ? item.key : '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push({
      key,
      name: typeof item.name === 'string' && item.name ? item.name : key,
      path: typeof item.path === 'string' ? item.path : '',
      iconPath: typeof item.iconPath === 'string' ? item.iconPath : '',
      source: readSource(item.source),
      args: typeof item.args === 'string' ? item.args : '',
      cwd: typeof item.cwd === 'string' ? item.cwd : '',
    });
  }
  return items;
}

/**
 * Normaliza lo leído del disco. Un archivo corrupto o de una versión futura
 * debe dejar la app en marcha con lo que se pueda rescatar, no romperla.
 */
export function normalizeNotificationState(raw: unknown): NotificationState {
  if (!raw || typeof raw !== 'object') return emptyNotificationState();
  const entriesRaw = (raw as Record<string, unknown>).entries;
  if (!Array.isArray(entriesRaw)) return emptyNotificationState();

  const entries: NotificationEntry[] = [];
  const usedKeys = new Set<string>();

  for (let index = 0; index < entriesRaw.length; index += 1) {
    const rawEntry = entriesRaw[index];
    if (!rawEntry || typeof rawEntry !== 'object') continue;
    const entry = rawEntry as Record<string, unknown>;
    const items = readItems(entry.items).filter(item => {
      if (usedKeys.has(item.key)) return false;
      usedKeys.add(item.key);
      return true;
    });
    if (items.length === 0) continue;
    const createdAt = Number(entry.createdAt);
    entries.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : `restored-${index}`,
      createdAt: Number.isFinite(createdAt) ? createdAt : 0,
      seen: entry.seen === true,
      items,
    });
  }

  return trimToLimits({ version: NOTIFICATION_STORE_VERSION, entries });
}

/** Recorta por número de lotes y por número total de elementos. */
export function trimToLimits(state: NotificationState): NotificationState {
  const entries: NotificationEntry[] = [];
  let itemBudget = MAX_NOTIFICATION_ITEMS;
  for (const entry of state.entries) {
    if (entries.length >= MAX_NOTIFICATION_ENTRIES) break;
    if (entry.items.length > itemBudget) break;
    itemBudget -= entry.items.length;
    entries.push(entry);
  }
  if (entries.length === state.entries.length) return state;
  return { version: NOTIFICATION_STORE_VERSION, entries };
}

/** Claves de todos los elementos que ya están en la bandeja. */
export function notificationKeys(state: NotificationState): Set<string> {
  const keys = new Set<string>();
  for (const entry of state.entries) {
    for (const item of entry.items) keys.add(item.key);
  }
  return keys;
}

/**
 * Añade un lote delante de los demás, descartando los elementos que ya
 * estuvieran en la bandeja. Devuelve `entry: null` cuando no aporta nada
 * nuevo, para que quien llama no muestre un aviso repetido.
 */
export function mergeNotificationEntry(
  state: NotificationState,
  entry: NotificationEntry,
): { state: NotificationState; entry: NotificationEntry | null } {
  const known = notificationKeys(state);
  const fresh = entry.items.filter(item => !known.has(item.key));
  if (fresh.length === 0) return { state, entry: null };

  const merged: NotificationEntry = { ...entry, items: fresh };
  return {
    state: trimToLimits({ version: NOTIFICATION_STORE_VERSION, entries: [merged, ...state.entries] }),
    entry: merged,
  };
}

export function markNotificationsSeen(state: NotificationState, ids: string[]): NotificationState {
  if (ids.length === 0) return state;
  const target = new Set(ids);
  let changed = false;
  const entries = state.entries.map(entry => {
    if (!target.has(entry.id) || entry.seen) return entry;
    changed = true;
    return { ...entry, seen: true };
  });
  return changed ? { ...state, entries } : state;
}

export function removeNotifications(state: NotificationState, ids: string[]): NotificationState {
  if (ids.length === 0) return state;
  const target = new Set(ids);
  const entries = state.entries.filter(entry => !target.has(entry.id));
  return entries.length === state.entries.length ? state : { ...state, entries };
}

/** Quita elementos concretos; un lote que se queda sin elementos desaparece. */
export function removeNotificationItems(state: NotificationState, keys: string[]): NotificationState {
  if (keys.length === 0) return state;
  const target = new Set(keys);
  let changed = false;
  const entries: NotificationEntry[] = [];
  for (const entry of state.entries) {
    const items = entry.items.filter(item => !target.has(item.key));
    if (items.length === entry.items.length) {
      entries.push(entry);
      continue;
    }
    changed = true;
    if (items.length > 0) entries.push({ ...entry, items });
  }
  return changed ? { ...state, entries } : state;
}

export function clearNotifications(): NotificationState {
  return emptyNotificationState();
}

/** Lotes sin ver. Es lo que muestra el contador de la campana. */
export function countUnseenEntries(state: NotificationState): number {
  return state.entries.reduce((total, entry) => total + (entry.seen ? 0 : 1), 0);
}

/** Elementos sin ver, para el texto de ayuda del contador. */
export function countUnseenItems(state: NotificationState): number {
  return state.entries.reduce((total, entry) => total + (entry.seen ? 0 : entry.items.length), 0);
}

/** Fuentes distintas presentes en un lote, en orden de aparición. */
export function entrySources(entry: NotificationEntry): NotificationSource[] {
  const sources: NotificationSource[] = [];
  for (const item of entry.items) {
    if (!sources.includes(item.source)) sources.push(item.source);
  }
  return sources;
}
