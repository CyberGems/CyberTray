import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WATCHER_PROMPT_SECONDS,
  WATCHER_MAX_PROMPT_SECONDS,
  WATCHER_MIN_PROMPT_SECONDS,
  diffNewItems,
  hasActiveWatcherSource,
  limitWatcherItems,
  readWatcherSettings,
  snapshotKeys,
  watcherIgnoreReason,
  watcherSourceConfigs,
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
