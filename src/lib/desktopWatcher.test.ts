import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WATCHER_PROMPT_SECONDS,
  WATCHER_MAX_PROMPT_SECONDS,
  WATCHER_MIN_PROMPT_SECONDS,
  dedupeWatcherItems,
  diffNewItems,
  hasActiveWatcherSource,
  limitWatcherItems,
  readWatcherSettings,
  snapshotKeys,
  watcherIgnoreReason,
  watcherSourceConfigs,
  watcherSourceFromId,
} from './desktopWatcher';
import type { ScannedShortcut } from './shortcutImport';

function shortcut(overrides: Partial<ScannedShortcut> = {}): ScannedShortcut {
  return {
    key: 'watch:desktop:user:c:\\users\\me\\desktop\\app.lnk',
    sourceId: 'watch:desktop:user',
    sourcePath: 'C:\\Users\\Me\\Desktop\\App.lnk',
    name: 'App',
    path: 'C:\\Program Files\\App\\app.exe',
    targetCategory: 'uncategorized',
    exists: true,
    ...overrides,
  };
}

describe('readWatcherSettings', () => {
  it('nace desactivado y sin avisos hasta que se enciende', () => {
    const settings = readWatcherSettings({});
    expect(settings.enabled).toBe(false);
    expect(hasActiveWatcherSource(settings)).toBe(false);
  });

  it('vigila todas las fuentes mientras el usuario no diga lo contrario', () => {
    const settings = readWatcherSettings({ watcherEnabled: true });
    expect(settings.watchDesktop).toBe(true);
    expect(settings.watchStartMenu).toBe(true);
    expect(settings.watchStore).toBe(true);
  });

  it('acota la duración del aviso a un rango legible', () => {
    expect(readWatcherSettings({ watcherPromptSeconds: 1 }).promptSeconds).toBe(WATCHER_MIN_PROMPT_SECONDS);
    expect(readWatcherSettings({ watcherPromptSeconds: 999 }).promptSeconds).toBe(WATCHER_MAX_PROMPT_SECONDS);
    expect(readWatcherSettings({}).promptSeconds).toBe(DEFAULT_WATCHER_PROMPT_SECONDS);
    expect(readWatcherSettings({ watcherPromptSeconds: Number.NaN }).promptSeconds).toBe(DEFAULT_WATCHER_PROMPT_SECONDS);
  });

  it('no considera activo el vigilante si todas las fuentes están apagadas', () => {
    const settings = readWatcherSettings({
      watcherEnabled: true,
      watcherWatchDesktop: false,
      watcherWatchStartMenu: false,
      watcherWatchStore: false,
    });
    expect(hasActiveWatcherSource(settings)).toBe(false);
  });
});

describe('watcherSourceConfigs', () => {
  it('cubre escritorio y menú Inicio en los dos ámbitos', () => {
    const ids = watcherSourceConfigs(readWatcherSettings({ watcherEnabled: true })).map(source => source.id);
    expect(ids).toEqual([
      'watch:desktop:user',
      'watch:desktop:common',
      'watch:start-menu:user',
      'watch:start-menu:common',
      'watch:store',
    ]);
  });

  it('respeta las fuentes apagadas', () => {
    const ids = watcherSourceConfigs(readWatcherSettings({
      watcherEnabled: true,
      watcherWatchDesktop: false,
      watcherWatchStore: false,
    })).map(source => source.id);
    expect(ids).toEqual(['watch:start-menu:user', 'watch:start-menu:common']);
  });

  it('manda lo detectado al cajón sin carpeta', () => {
    const sources = watcherSourceConfigs(readWatcherSettings({ watcherEnabled: true }));
    expect(sources.every(source => source.targetCategory === 'uncategorized')).toBe(true);
    expect(sources.every(source => source.includeFiles === false)).toBe(true);
  });
});

describe('watcherIgnoreReason', () => {
  it('ignora los restos del sistema y las descargas a medias', () => {
    expect(watcherIgnoreReason('desktop.ini', 'C:\\x\\desktop.ini')).toBe('system-file');
    expect(watcherIgnoreReason('Manual.pdf.crdownload', 'C:\\x\\a')).toBe('incomplete-download');
    expect(watcherIgnoreReason('~$Informe.docx', 'C:\\x\\b')).toBe('temporary');
  });

  it('acepta accesos directos normales', () => {
    expect(watcherIgnoreReason('Steam.lnk', 'C:\\x\\Steam.lnk')).toBeNull();
    expect(watcherIgnoreReason('CyberGems.url', 'C:\\x\\CyberGems.url')).toBeNull();
  });
});

describe('diffNewItems', () => {
  it('devuelve solo lo que no estaba en la foto anterior', () => {
    const known = snapshotKeys([shortcut()]);
    const fresh = diffNewItems(known, [
      shortcut(),
      shortcut({ key: 'watch:desktop:user:c:\\users\\me\\desktop\\nuevo.lnk', name: 'Nuevo' }),
    ]);
    expect(fresh.map(item => item.name)).toEqual(['Nuevo']);
  });

  it('descarta lo que el escáner ya marcó como ignorable o roto', () => {
    const fresh = diffNewItems(new Set(), [
      shortcut({ key: 'a', skippedReason: 'uninstaller' }),
      shortcut({ key: 'b', error: 'no se pudo resolver' }),
      shortcut({ key: 'c', exists: false }),
      shortcut({ key: 'd', path: '' }),
      shortcut({ key: 'e', name: 'Válido' }),
    ]);
    expect(fresh.map(item => item.key)).toEqual(['e']);
  });

  it('no repite el mismo elemento dos veces', () => {
    const fresh = diffNewItems(new Set(), [shortcut({ key: 'a' }), shortcut({ key: 'a' })]);
    expect(fresh).toHaveLength(1);
  });
});

describe('limitWatcherItems', () => {
  it('recorta la lista para que el aviso siga siendo legible', () => {
    const items = Array.from({ length: 9 }, (_, index) => shortcut({ key: `k${index}` }));
    expect(limitWatcherItems(items)).toHaveLength(5);
  });
});

describe('dedupeWatcherItems', () => {
  it('quita el acceso repetido del mismo ejecutable (escritorio + menú Inicio)', () => {
    const desktop = shortcut({ key: 'watch:desktop:user:c:\\...\\cyberfeeds.lnk', sourceId: 'watch:desktop:user', name: 'CyberFeeds', path: 'C:\\Apps\\CyberFeeds\\CyberFeeds.exe' });
    const startMenu = shortcut({ key: 'watch:start-menu:user:c:\\...\\cyberfeeds.lnk', sourceId: 'watch:start-menu:user', name: 'CyberFeeds', path: 'C:\\Apps\\CyberFeeds\\CyberFeeds.exe' });
    const announced = dedupeWatcherItems([desktop, startMenu]);
    expect(announced).toHaveLength(1);
    expect(announced[0].sourceId).toBe('watch:desktop:user');
  });

  it('conserva accesos distintos aunque el nombre coincida', () => {
    const a = shortcut({ key: 'a', name: 'CyberFeeds', path: 'C:\\Apps\\CyberFeeds\\CyberFeeds.exe' });
    const b = shortcut({ key: 'b', name: 'CyberFeeds', path: 'C:\\Portables\\CyberFeeds\\CyberFeeds.exe' });
    expect(dedupeWatcherItems([a, b])).toHaveLength(2);
  });

  it('conserva los accesos con argumentos distintos (perfiles, banderas)', () => {
    const normal = shortcut({ key: 'a', path: 'C:\\Apps\\App.exe' });
    const flag = shortcut({ key: 'b', path: 'C:\\Apps\\App.exe', arguments: '--profile work' });
    expect(dedupeWatcherItems([normal, flag])).toHaveLength(2);
  });

  it('compara rutas sin distinguir mayúsculas y deja pasar lo sin ruta', () => {
    const upper = shortcut({ key: 'a', path: 'C:\\Apps\\App.EXE' });
    const lower = shortcut({ key: 'b', path: 'c:\\apps\\app.exe' });
    expect(dedupeWatcherItems([upper, lower])).toHaveLength(1);
    expect(dedupeWatcherItems([shortcut({ key: 'c', path: '' })])).toHaveLength(0);
  });
});

describe('watcherSourceFromId', () => {
  it('distingue escritorio, menú Inicio y Store', () => {
    expect(watcherSourceFromId('watch:desktop:user')).toBe('desktop');
    expect(watcherSourceFromId('watch:desktop:common')).toBe('desktop');
    expect(watcherSourceFromId('watch:start-menu:user')).toBe('start-menu');
    expect(watcherSourceFromId('watch:start-menu:common')).toBe('start-menu');
    expect(watcherSourceFromId('watch:store')).toBe('store');
  });

  it('un origen ausente cae en escritorio', () => {
    expect(watcherSourceFromId(undefined)).toBe('desktop');
    expect(watcherSourceFromId('')).toBe('desktop');
  });
});
