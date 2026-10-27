import { describe, expect, it, beforeEach } from 'vitest';
import {
  ROOT_FOLDER_ID,
  getChildFolders,
  getDefaultCategories,
  getDescendantFolderIds,
  getFolderPath,
  isVaultLockedState,
  normalizeCategoriesList,
  normalizeShortcutsList,
  UNCATEGORIZED_ID,
  type CyberFolder,
} from './appUtils';
import { setLocale } from '../locales';

const folder = (id: string, parentId: string | null = null, order = 0): CyberFolder => ({
  id,
  name: id,
  color: '#ffffff',
  parentId,
  order,
});

describe('normalizeCategoriesList', () => {
  beforeEach(() => setLocale('en'));

  it('devuelve las carpetas por defecto cuando la lista está vacía', () => {
    const result = normalizeCategoriesList([]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe(ROOT_FOLDER_ID);
  });

  it('garantiza que la carpeta raíz existe y es la primera', () => {
    const result = normalizeCategoriesList([folder('dev')]);
    expect(result[0].id).toBe(ROOT_FOLDER_ID);
    expect(result[0].parentId).toBeNull();
  });

  it('elimina los identificadores duplicados', () => {
    const result = normalizeCategoriesList([folder('dev'), folder('dev', null, 1)]);
    expect(result.filter((f) => f.id === 'dev')).toHaveLength(1);
  });

  it('rompe los ciclos de carpetas', () => {
    const result = normalizeCategoriesList([
      folder('a', 'b'),
      folder('b', 'a'),
    ]);
    // Ninguna carpeta puede quedar apuntando a sí misma en un ciclo.
    const byId = new Map(result.map((f) => [f.id, f]));
    for (const f of result) {
      expect(f.parentId === f.id).toBe(false);
      if (f.parentId) {
        expect(byId.get(f.parentId)?.parentId === f.id).toBe(false);
      }
    }
  });

  it('deja en la raíz las carpetas cuyo padre no existe', () => {
    const result = normalizeCategoriesList([folder('huerfana', 'no-existe')]);
    const huerfana = result.find((f) => f.id === 'huerfana');
    expect(huerfana?.parentId).toBeNull();
  });
});

describe('normalizeShortcutsList', () => {
  const folders = normalizeCategoriesList([]);

  it('descarta los accesos sin nombre o sin ruta', () => {
    const result = normalizeShortcutsList(
      [
        { id: 1, name: 'ok', path: 'C:/a.exe' },
        { id: 2, name: 'sin ruta' },
        { id: 3, path: 'C:/b.exe' },
        null,
      ],
      folders
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('mueve a la bandeja sin categoría los accesos con categoría inexistente', () => {
    const result = normalizeShortcutsList(
      [{ id: 1, name: 'ok', path: 'C:/a.exe', category: 'inexistente' }],
      folders
    );
    expect(result[0].category).toBe(UNCATEGORIZED_ID);
  });

  it('no deja accesos colgando de la vista raíz', () => {
    const result = normalizeShortcutsList(
      [{ id: 1, name: 'ok', path: 'C:/a.exe', category: ROOT_FOLDER_ID }],
      folders
    );
    expect(result[0].category).toBe(UNCATEGORIZED_ID);
  });

  it('conserva la carpeta cuando existe', () => {
    const result = normalizeShortcutsList(
      [{ id: 1, name: 'ok', path: 'C:/a.exe', category: 'dev' }],
      folders
    );
    expect(result[0].category).toBe('dev');
  });

  it('respeta la categoría de la bóveda', () => {
    const result = normalizeShortcutsList(
      [{ id: 1, name: 'secreto', path: 'C:/a.exe', category: 'vault' }],
      folders
    );
    expect(result[0].category).toBe('vault');
  });

  it('nunca deja un acceso en la carpeta raíz', () => {
    const result = normalizeShortcutsList(
      [{ id: 1, name: 'ok', path: 'C:/a.exe', category: ROOT_FOLDER_ID }],
      folders
    );
    expect(result[0].category).not.toBe(ROOT_FOLDER_ID);
  });
});

describe('jerarquía de carpetas', () => {
  const folders = normalizeCategoriesList([
    folder('root', null, 0),
    folder('a', 'root', 0),
    folder('b', 'a', 0),
    folder('c', 'b', 0),
    folder('otro', 'root', 1),
  ]);

  it('getFolderPath devuelve la ruta desde la raíz', () => {
    const path = getFolderPath(folders, 'c');
    // La raíz "Todos" encabeza siempre el recorrido.
    expect(path.map((f) => f.id)).toEqual(['all', 'root', 'a', 'b', 'c']);
  });

  it('getDescendantFolderIds incluye todos los descendientes', () => {
    expect(getDescendantFolderIds(folders, 'a').sort()).toEqual(['b', 'c']);
  });

  it('getChildFolders ordena por order y luego por nombre', () => {
    const children = getChildFolders(folders, 'root');
    expect(children.map((f) => f.id)).toEqual(['a', 'otro']);
  });
});

describe('isVaultLockedState', () => {
  const base = {
    pinEnabled: true,
    pinConfigured: true,
    lockTimeout: 5,
    unlockedSession: false,
    lastUnlockTime: Date.now(),
  };

  it('no bloquea si el PIN está desactivado', () => {
    expect(isVaultLockedState({ ...base, pinEnabled: false })).toBe(false);
  });

  it('no bloquea si no hay hash configurado (evita dejar al usuario fuera)', () => {
    expect(isVaultLockedState({ ...base, pinConfigured: false })).toBe(false);
  });

  it('con timeout -1 solo se desbloquea en la sesión', () => {
    expect(isVaultLockedState({ ...base, lockTimeout: -1, unlockedSession: false })).toBe(true);
    expect(isVaultLockedState({ ...base, lockTimeout: -1, unlockedSession: true })).toBe(false);
  });

  it('con timeout 0 se bloquea hasta que se desbloquee', () => {
    expect(isVaultLockedState({ ...base, lockTimeout: 0, lastUnlockTime: 0 })).toBe(true);
    expect(isVaultLockedState({ ...base, lockTimeout: 0, lastUnlockTime: Date.now() })).toBe(false);
  });

  it('con timeout en minutos bloquea pasado el tiempo', () => {
    const haceSeisMinutos = Date.now() - 6 * 60 * 1000;
    expect(isVaultLockedState({ ...base, lastUnlockTime: haceSeisMinutos })).toBe(true);
    expect(isVaultLockedState({ ...base, lastUnlockTime: Date.now() })).toBe(false);
  });
});

describe('getDefaultCategories', () => {
  it('usa los nombres del idioma activo', () => {
    setLocale('es');
    const spanish = getDefaultCategories();
    setLocale('en');
    const english = getDefaultCategories();

    expect(spanish.find((f) => f.id === 'browsers')?.name).toBe('Navegadores');
    expect(english.find((f) => f.id === 'browsers')?.name).toBe('Browsers');
  });

  it('no incluye una carpeta contenedora de lo que no tiene categoría', () => {
    setLocale('en');
    const ids = getDefaultCategories().map((f) => f.id);
    expect(ids).not.toContain(UNCATEGORIZED_ID);
    expect(ids).not.toContain('utils');
  });
});
