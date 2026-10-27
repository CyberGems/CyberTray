import { describe, expect, it } from 'vitest';
import {
  MAX_NOTIFICATION_ENTRIES,
  clearNotifications,
  countUnseenEntries,
  countUnseenItems,
  emptyNotificationState,
  entrySources,
  markNotificationsSeen,
  mergeNotificationEntry,
  normalizeNotificationState,
  notificationKeys,
  removeNotificationItems,
  removeNotifications,
  trimToLimits,
  type NotificationEntry,
  type NotificationItem,
} from './notificationCenter';

function item(key: string, source: NotificationItem['source'] = 'desktop'): NotificationItem {
  return { key, name: key, path: `C:\\Users\\Carlos\\Desktop\\${key}.lnk`, iconPath: '', source };
}

function entry(id: string, keys: string[], createdAt = 1_700_000_000_000): NotificationEntry {
  return { id, createdAt, seen: false, kind: 'items', items: keys.map(key => item(key)) };
}

function message(id: string, title: string, detail = '', dedupeKey = ''): NotificationEntry {
  return { id, createdAt: 1_700_000_000_000, seen: false, kind: 'message', items: [], title, detail, level: 'error', dedupeKey };
}

describe('normalizeNotificationState', () => {
  it('devuelve un estado vacío con basura', () => {
    expect(normalizeNotificationState(null).entries).toEqual([]);
    expect(normalizeNotificationState('x').entries).toEqual([]);
    expect(normalizeNotificationState({ entries: 'nope' }).entries).toEqual([]);
  });

  it('rescata lo válido y descarta lo roto', () => {
    const state = normalizeNotificationState({
      version: 99,
      entries: [
        { id: 'a', createdAt: 5, seen: true, items: [{ key: 'k1', name: 'Uno', path: 'p', iconPath: '', source: 'store' }] },
        { id: 'b', items: [] },
        { id: 'c', items: [{ key: 'k1', name: 'Repetido', path: 'p' }] },
      ],
    });
    expect(state.version).toBe(1);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]).toMatchObject({ id: 'a', createdAt: 5, seen: true });
    expect(state.entries[0].items[0].source).toBe('store');
  });

  it('una fuente desconocida cae en escritorio', () => {
    const state = normalizeNotificationState({
      entries: [{ id: 'a', createdAt: 1, items: [{ key: 'k', name: 'n', path: 'p', source: 'raro' }] }],
    });
    expect(state.entries[0].items[0].source).toBe('desktop');
  });
});

describe('mergeNotificationEntry', () => {
  it('añade el lote delante y conserva el orden', () => {
    const first = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1']));
    const second = mergeNotificationEntry(first.state, entry('b', ['k2']));
    expect(second.state.entries.map(e => e.id)).toEqual(['b', 'a']);
  });

  it('no duplica elementos que ya estaban en la bandeja', () => {
    const first = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1', 'k2']));
    const again = mergeNotificationEntry(first.state, entry('b', ['k2']));
    expect(again.entry).toBeNull();
    expect(again.state).toBe(first.state);
  });

  it('conserva los elementos nuevos de un lote parcialmente repetido', () => {
    const first = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1']));
    const again = mergeNotificationEntry(first.state, entry('b', ['k1', 'k2']));
    expect(again.entry?.items.map(i => i.key)).toEqual(['k2']);
    expect(again.state.entries[0].items).toHaveLength(1);
  });

  it('recorta cuando se pasa del tope de lotes', () => {
    let state = emptyNotificationState();
    for (let index = 0; index < MAX_NOTIFICATION_ENTRIES + 5; index += 1) {
      state = mergeNotificationEntry(state, entry(`e${index}`, [`k${index}`])).state;
    }
    expect(state.entries).toHaveLength(MAX_NOTIFICATION_ENTRIES);
    expect(state.entries[0].id).toBe(`e${MAX_NOTIFICATION_ENTRIES + 4}`);
  });
});

describe('leído / no leído', () => {
  it('nada nace leído', () => {
    const state = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1'])).state;
    expect(countUnseenEntries(state)).toBe(1);
    expect(countUnseenItems(state)).toBe(1);
  });

  it('marcar como visto baja el contador sin borrar nada', () => {
    const state = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1', 'k2'])).state;
    const seen = markNotificationsSeen(state, ['a']);
    expect(countUnseenEntries(seen)).toBe(0);
    expect(countUnseenItems(seen)).toBe(0);
    expect(seen.entries).toHaveLength(1);
    expect(seen.entries[0].items).toHaveLength(2);
  });

  it('marcar un id inexistente no cambia el estado', () => {
    const state = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1'])).state;
    expect(markNotificationsSeen(state, ['zzz'])).toBe(state);
    expect(markNotificationsSeen(state, [])).toBe(state);
  });
});

describe('borrado', () => {
  it('quita lotes completos', () => {
    let state = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1'])).state;
    state = mergeNotificationEntry(state, entry('b', ['k2'])).state;
    expect(removeNotifications(state, ['b']).entries.map(e => e.id)).toEqual(['a']);
  });

  it('al añadir a la librería desaparece el elemento y el lote vacío', () => {
    let state = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1'])).state;
    state = mergeNotificationEntry(state, entry('b', ['k2', 'k3'])).state;
    const next = removeNotificationItems(state, ['k2']);
    expect(next.entries).toHaveLength(2);
    expect(next.entries[0].items.map(i => i.key)).toEqual(['k3']);
    const emptied = removeNotificationItems(next, ['k3']);
    expect(emptied.entries.map(e => e.id)).toEqual(['a']);
  });

  it('limpiar deja la bandeja vacía', () => {
    const state = mergeNotificationEntry(emptyNotificationState(), entry('a', ['k1'])).state;
    expect(clearNotifications().entries).toEqual([]);
    expect(notificationKeys(state).has('k1')).toBe(true);
  });
});

describe('trimToLimits', () => {
  it('respeta el presupuesto total de elementos', () => {
    const entries: NotificationEntry[] = [];
    for (let index = 0; index < 60; index += 1) {
      entries.push(entry(`e${index}`, Array.from({ length: 10 }, (_, k) => `k${index}-${k}`)));
    }
    const trimmed = trimToLimits({ version: 1, entries });
    const total = trimmed.entries.reduce((sum, e) => sum + e.items.length, 0);
    expect(total).toBeLessThanOrEqual(200);
  });

  it('si nada sobra devuelve el mismo objeto', () => {
    const state = { version: 1, entries: [entry('a', ['k1'])] };
    expect(trimToLimits(state)).toBe(state);
  });
});

describe('entrySources', () => {
  it('lista las fuentes sin repetir', () => {
    const mixed: NotificationEntry = {
      id: 'a',
      createdAt: 1,
      seen: false,
      kind: 'items',
      items: [item('k1', 'desktop'), item('k2', 'store'), item('k3', 'desktop')],
    };
    expect(entrySources(mixed)).toEqual(['desktop', 'store']);
  });
});

describe('avisos sueltos', () => {
  it('entra un mensaje sin elementos y cuenta como no visto', () => {
    const state = mergeNotificationEntry(emptyNotificationState(), message('m1', 'Falló el respaldo')).state;
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]).toMatchObject({ kind: 'message', title: 'Falló el respaldo', items: [] });
    expect(countUnseenEntries(state)).toBe(1);
  });

  it('el mismo problema repetido actualiza la entrada en vez de acumularla', () => {
    let state = mergeNotificationEntry(emptyNotificationState(), message('m1', 'Falló el respaldo', 'Disco lleno', 'backup')).state;
    const again = mergeNotificationEntry(state, message('m2', 'Falló el respaldo', 'Disco lleno', 'backup'));
    expect(again.state.entries).toHaveLength(1);
    expect(again.state.entries[0].id).toBe('m1');
  });

  it('no vuelve a marcar sin ver si el texto no cambió', () => {
    let state = mergeNotificationEntry(emptyNotificationState(), message('m1', 'Falló', 'Disco lleno', 'backup')).state;
    state = markNotificationsSeen(state, ['m1']);
    const again = mergeNotificationEntry(state, message('m2', 'Falló', 'Disco lleno', 'backup')).state;
    expect(again.entries[0].seen).toBe(true);
  });

  it('si el motivo cambia, vuelve a quedar sin ver', () => {
    let state = mergeNotificationEntry(emptyNotificationState(), message('m1', 'Falló', 'Disco lleno', 'backup')).state;
    state = markNotificationsSeen(state, ['m1']);
    const again = mergeNotificationEntry(state, message('m2', 'Falló', 'Carpeta inaccesible', 'backup')).state;
    expect(again.entries[0].seen).toBe(false);
    expect(again.entries[0].detail).toBe('Carpeta inaccesible');
  });

  it('un mensaje sin título se descarta', () => {
    const result = mergeNotificationEntry(emptyNotificationState(), message('m1', '   '));
    expect(result.entry).toBeNull();
    expect(result.state.entries).toHaveLength(0);
  });
});
