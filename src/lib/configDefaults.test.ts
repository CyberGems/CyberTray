import { describe, expect, it } from 'vitest';
import {
  createDefaultConfig,
  sanitizeConfig,
  applyLegacyDefaults,
  FOLDER_SCHEMA_VERSION,
  DEFAULT_GLOBAL_SHORTCUT,
  DEFAULT_WATCHER_PROMPT_SECONDS,
  LEGACY_WATCHER_PROMPT_SECONDS,
} from './configDefaults';

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

  it('usa el mismo atajo por defecto que el botón de restablecer', () => {
    expect(createDefaultConfig().shortcut).toBe(DEFAULT_GLOBAL_SHORTCUT);
  });

  it('empieza sin onboarding completado', () => {
    expect(createDefaultConfig().onboardingDone).toBe(false);
  });

  // El anclado se refleja en el botón Pin de la barra superior: si naciera
  // activo, la bandeja parecería "fijada" desde el primer arranque.
  it('no fija la ventana por defecto', () => {
    const config = createDefaultConfig();
    expect(config.alwaysOnTop).toBe(false);
    expect(config.hideOnBlur).toBe(true);
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

  it('conserva el estado del onboarding', () => {
    expect(sanitizeConfig({ onboardingDone: true })).toEqual({ onboardingDone: true });
  });
});

describe('applyLegacyDefaults', () => {
  // El valor se guarda en disco: cambiar la constante de fábrica no basta,
  // las instalaciones existentes seguirían con 6 s para siempre.
  it('sube el aviso de 6 a 10 segundos', () => {
    const result = applyLegacyDefaults({ watcherPromptSeconds: LEGACY_WATCHER_PROMPT_SECONDS });
    expect(result.changed).toBe(true);
    expect(result.config.watcherPromptSeconds).toBe(DEFAULT_WATCHER_PROMPT_SECONDS);
  });

  it('respeta un valor elegido a mano', () => {
    const result = applyLegacyDefaults({ watcherPromptSeconds: 18 });
    expect(result.changed).toBe(false);
    expect(result.config.watcherPromptSeconds).toBe(18);
  });

  it('no toca otras claves ni muta la entrada', () => {
    const original = { watcherPromptSeconds: LEGACY_WATCHER_PROMPT_SECONDS, theme: 'cyan' };
    const result = applyLegacyDefaults(original);
    expect(result.config.theme).toBe('cyan');
    expect(original.watcherPromptSeconds).toBe(LEGACY_WATCHER_PROMPT_SECONDS);
  });

  it('no marca cambios cuando el config ya está al día', () => {
    expect(applyLegacyDefaults(createDefaultConfig()).changed).toBe(false);
  });
});
