import fs from 'node:fs';
import path from 'node:path';
import {
  clearNotifications,
  emptyNotificationState,
  markNotificationsSeen,
  mergeNotificationEntry,
  normalizeNotificationState,
  removeNotificationItems,
  removeNotifications,
  type NotificationEntry,
  type NotificationItem,
  type NotificationState,
} from '../src/lib/notificationCenter';

/**
 * Persistencia de la bandeja de notificaciones.
 *
 * Vive en su propio archivo y no dentro de `cyber-tray-config.json` por dos
 * motivos: la configuración se guarda entera cada vez que cambia cualquier
 * ajuste, y la bandeja crece sola. Separarlas evita reescribir una por la otra
 * y que un archivo corrupto se lleve por delante los ajustes.
 */

let state: NotificationState = emptyNotificationState();
let storePath = '';
let listener: ((next: NotificationState) => void) | null = null;
let sequence = 0;

export function initNotificationStore(options: {
  filePath: string;
  onChange?: (next: NotificationState) => void;
}): void {
  storePath = options.filePath;
  listener = options.onChange || null;
  try {
    state = normalizeNotificationState(JSON.parse(fs.readFileSync(storePath, 'utf8')));
  } catch {
    // Sin archivo todavía, o ilegible: se empieza vacío y se reescribe al
    // primer cambio. Perder avisos viejos es mejor que no arrancar.
    state = emptyNotificationState();
  }
}

function persist(): void {
  if (!storePath) return;
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Un disco lleno o un archivo bloqueado no deben tumbar el proceso main.
  }
}

function commit(next: NotificationState): NotificationState {
  if (next === state) return state;
  state = next;
  persist();
  listener?.(state);
  return state;
}

export function getNotificationState(): NotificationState {
  return state;
}

/**
 * Guarda un lote recién detectado. Devuelve `null` si todos sus elementos ya
 * estaban en la bandeja: en ese caso no tiene sentido volver a avisar.
 */
export function pushNotificationItems(items: NotificationItem[], now = Date.now()): NotificationEntry | null {
  if (items.length === 0) return null;
  const entry: NotificationEntry = {
    id: `n${now.toString(36)}${(sequence++).toString(36)}`,
    createdAt: now,
    seen: false,
    items,
  };
  const result = mergeNotificationEntry(state, entry);
  if (!result.entry) return null;
  commit(result.state);
  return result.entry;
}

export function markNotificationsRead(ids: string[]): NotificationState {
  return commit(markNotificationsSeen(state, ids));
}

export function deleteNotifications(ids: string[]): NotificationState {
  return commit(removeNotifications(state, ids));
}

export function deleteNotificationItems(keys: string[]): NotificationState {
  return commit(removeNotificationItems(state, keys));
}

export function clearNotificationState(): NotificationState {
  return commit(clearNotifications());
}

/** Elementos de la bandeja con las claves indicadas, para añadirlos. */
export function findNotificationItems(keys: string[]): NotificationItem[] {
  const wanted = new Set(keys);
  const found: NotificationItem[] = [];
  for (const entry of state.entries) {
    for (const item of entry.items) {
      if (wanted.has(item.key)) found.push(item);
    }
  }
  return found;
}
