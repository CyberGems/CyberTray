import { describe, expect, it } from 'vitest';
import { createDefaultConfig, sanitizeConfig, FOLDER_SCHEMA_VERSION } from './configDefaults';

describe('createDefaultConfig', () => {
  it('devuelve una copia nueva en cada llamada', () => {
    const first = createDefaultConfig();
    const second = createDefaultConfig();
    expect(first).not.toBe(second);
    expect(first.hotspotCorners).not.toBe(second.hotspotCorners);
  });

  it('no muta los valores por defecto al modificar la copia', () => {
    const config = createDefaultConfig();
    config.hotspotCorners.push('top-left');
    config.shortcutsList = [{ id: 1 }];
    expect(createDefaultConfig().hotspotCorners).toHaveLength(0);
    expect(createDefaultConfig().shortcutsList).toBeUndefined();
  });

  it('incluye los valores que el renderer necesita', () => {
    const config = createDefaultConfig();
    expect(config.theme).toBe('cyan');
    expect(config.opacity).toBe(85);
    expect(config.blurLevel).toBe(20);
    expect(config.iconSize).toBe(60);
    expect(config.folderSchemaVersion).toBe(FOLDER_SCHEMA_VERSION);
  });

  it('no incluye el PIN de la bóveda en claro', () => {
    const config = createDefaultConfig() as unknown as Record<string, unknown>;
    expect('vaultPin' in config).toBe(false);
  });
});

describe('sanitizeConfig', () => {
  it('descarta las claves que la app ya no entiende', () => {
    const result = sanitizeConfig({
      theme: 'cyan',
      handleAutoHide: true,
      hoverTriggerDelay: 500,
    });
    expect(result.theme).toBe('cyan');
    expect('handleAutoHide' in result).toBe(false);
    expect('hoverTriggerDelay' in result).toBe(false);
  });

  it('conserva las claves conocidas', () => {
    const result = sanitizeConfig({ iconSize: 60, totalLaunches: 3 });
    expect(result).toEqual({ iconSize: 60, totalLaunches: 3 });
  });

  it('conserva los orígenes y la sincronización al iniciar', () => {
    const importSources = [{
      id: 'desktop:user',
      kind: 'desktop' as const,
      scope: 'user' as const,
      targetCategory: 'utils',
      preserveFolders: false,
      skipUninstallers: true,
      includeFiles: false,
    }];
    const result = sanitizeConfig({ importSources, autoSyncOnStartup: true });
    expect(result).toEqual({ importSources, autoSyncOnStartup: true });
  });
});
