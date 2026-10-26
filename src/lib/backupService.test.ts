import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBackupService, listBackupsIn } from '../../electron/backups';
import { BACKUP_FILE_PREFIX, type BackupSettings } from './backup';

let root = '';
let configFile = '';
let defaultFolder = '';

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'CyberTray-backup-test-'));
  configFile = path.join(root, 'config', 'cyber-tray-config.json');
  defaultFolder = path.join(root, 'backups');
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify({ language: 'es', totalLaunches: 7 }, null, 2), 'utf-8');
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function makeService(overrides: Partial<BackupSettings> = {}, extra: { onRestored?: () => void } = {}) {
  const settings: BackupSettings = {
    enabled: true,
    hours: 24,
    keep: 3,
    last: null,
    folder: '',
    ...overrides,
  };
  const patches: Array<Record<string, unknown>> = [];
  const service = createBackupService({
    configFile,
    defaultFolder,
    readSettings: () => ({ ...settings }),
    patchConfig: (patch) => {
      patches.push(patch);
      if (typeof patch.autoBackupLast === 'string') settings.last = patch.autoBackupLast;
    },
    onRestored: extra.onRestored,
    log: () => undefined,
  });
  return { service, settings, patches };
}

describe('backup service · crear copias', () => {
  it('copia la configuración en la carpeta por defecto', () => {
    const { service, settings, patches } = makeService();
    const result = service.run('manual');

    expect(result.ok).toBe(true);
    expect(result.folder).toBe(defaultFolder);
    const file = path.join(defaultFolder, result.file!);
    expect(fs.existsSync(file)).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual({ language: 'es', totalLaunches: 7 });
    expect(typeof patches.at(-1)?.autoBackupLast).toBe('string');
    expect(settings.last).toBe(patches.at(-1)?.autoBackupLast);
  });

  it('no deja archivos temporales detrás', () => {
    const { service } = makeService();
    service.run('manual');
    const leftovers = fs.readdirSync(defaultFolder).filter((name) => name.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('falla sin tocar nada si no existe la configuración', () => {
    fs.rmSync(configFile);
    const { service } = makeService();
    const result = service.run('manual');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('config-missing');
  });

  it('no guarda una copia ilegible si el archivo está a medio escribir', () => {
    fs.writeFileSync(configFile, '{"language":"es",', 'utf-8');
    const { service } = makeService();
    const result = service.run('manual');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('config-unreadable');
    expect(fs.existsSync(defaultFolder) ? fs.readdirSync(defaultFolder).length : 0).toBe(0);
  });

  it('conserva exactamente el número de copias configurado', () => {
    const { service } = makeService({ keep: 3 });
    for (let i = 0; i < 6; i += 1) {
      service.run('manual');
    }
    const files = fs.readdirSync(defaultFolder).filter((name) => name.startsWith(BACKUP_FILE_PREFIX));
    expect(files.length).toBe(3);
  });

  it('no sobrescribe una copia si se respalda dos veces en el mismo milisegundo', () => {
    const { service } = makeService({ keep: 7 });
    const first = service.run('manual');
    const second = service.run('manual');
    expect(first.file).not.toBe(second.file);
    expect(fs.existsSync(path.join(defaultFolder, first.file!))).toBe(true);
    expect(fs.existsSync(path.join(defaultFolder, second.file!))).toBe(true);
  });

  it('respeta una sola copia', () => {
    const { service } = makeService({ keep: 1 });
    service.run('manual');
    service.run('manual');
    const files = fs.readdirSync(defaultFolder).filter((name) => name.startsWith(BACKUP_FILE_PREFIX));
    expect(files.length).toBe(1);
  });

  it('no poda archivos ajenos que estén en la carpeta', () => {
    fs.mkdirSync(defaultFolder, { recursive: true });
    fs.writeFileSync(path.join(defaultFolder, 'notas.txt'), 'mío', 'utf-8');
    const { service } = makeService({ keep: 1 });
    service.run('manual');
    service.run('manual');
    expect(fs.existsSync(path.join(defaultFolder, 'notas.txt'))).toBe(true);
  });

  it('no respalda sola cuando está desactivado', () => {
    const { service } = makeService({ enabled: false });
    expect(service.run('schedule')).toEqual({ ok: false, error: 'backup-disabled' });
    expect(service.run('startup')).toEqual({ ok: false, error: 'backup-disabled' });
    // Pero el botón manual siempre funciona.
    expect(service.run('manual').ok).toBe(true);
  });
});

describe('backup service · carpeta personalizada', () => {
  it('escribe en la carpeta elegida cuando está disponible', () => {
    const custom = path.join(root, 'mis-respaldos');
    const { service } = makeService({ folder: custom });
    const result = service.run('manual');
    expect(result.ok).toBe(true);
    expect(result.folder).toBe(custom);
    expect(fs.existsSync(path.join(custom, result.file!))).toBe(true);
    expect(fs.existsSync(defaultFolder)).toBe(false);
  });

  it('cae a la carpeta por defecto con aviso si la elegida no se puede usar', () => {
    // Un archivo normal no puede convertirse en carpeta: mkdir falla.
    const blocked = path.join(root, 'archivo.txt');
    fs.writeFileSync(blocked, 'x', 'utf-8');
    const { service } = makeService({ folder: path.join(blocked, 'sub') });

    const result = service.run('manual');
    expect(result.ok).toBe(true);
    expect(result.folder).toBe(defaultFolder);
    expect(result.warning).toBeTruthy();
    expect(fs.existsSync(path.join(defaultFolder, result.file!))).toBe(true);
  });

  it('informa del estado de la carpeta personalizada', () => {
    const custom = path.join(root, 'elegida');
    const { service } = makeService({ folder: custom });
    const status = service.status();
    expect(status.usingCustomFolder).toBe(true);
    expect(status.customFolderAvailable).toBe(true);
    expect(status.folder).toBe(custom);
    expect(status.defaultFolder).toBe(defaultFolder);
  });
});

describe('backup service · restaurar', () => {
  it('devuelve la configuración al estado de la copia', () => {
    const { service } = makeService();
    const created = service.run('manual');
    fs.writeFileSync(configFile, JSON.stringify({ language: 'en', totalLaunches: 99 }), 'utf-8');

    const restored = service.restore(created.file!);
    expect(restored.ok).toBe(true);
    expect(JSON.parse(fs.readFileSync(configFile, 'utf-8'))).toEqual({ language: 'es', totalLaunches: 7 });
  });

  it('guarda una copia del estado actual antes de restaurar', () => {
    const { service } = makeService({ keep: 7 });
    const created = service.run('manual');
    fs.writeFileSync(configFile, JSON.stringify({ language: 'en' }), 'utf-8');

    service.restore(created.file!);
    const files = fs.readdirSync(defaultFolder).filter((name) => name.startsWith(BACKUP_FILE_PREFIX));
    const contents = files.map((name) => fs.readFileSync(path.join(defaultFolder, name), 'utf-8'));
    // La copia de seguridad previa conserva el estado que se va a descartar.
    expect(contents.some((raw) => raw.includes('"en"'))).toBe(true);
    // Y la copia original sigue ahí.
    expect(contents.some((raw) => raw.includes('"es"'))).toBe(true);
  });

  it('avisa al proceso main para que recargue la configuración', () => {
    let restoredCalls = 0;
    const { service } = makeService({}, { onRestored: () => { restoredCalls += 1; } });
    const created = service.run('manual');
    service.restore(created.file!);
    expect(restoredCalls).toBe(1);
  });

  it('rechaza nombres que no son copias o intentan salir de la carpeta', () => {
    const { service } = makeService();
    expect(service.restore('../cyber-tray-config.json').ok).toBe(false);
    expect(service.restore('otra-cosa.json').ok).toBe(false);
  });

  it('rechaza una copia con contenido que no es un objeto', () => {
    fs.mkdirSync(defaultFolder, { recursive: true });
    const name = `${BACKUP_FILE_PREFIX}2026-10-26T00-00-00-000.json`;
    fs.writeFileSync(path.join(defaultFolder, name), '[1,2,3]', 'utf-8');
    const { service } = makeService();
    const result = service.restore(name);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid-backup-content');
    // La configuración original queda intacta.
    expect(JSON.parse(fs.readFileSync(configFile, 'utf-8'))).toEqual({ language: 'es', totalLaunches: 7 });
  });

  it('no restaura si la copia ya no existe', () => {
    const { service } = makeService();
    const result = service.restore(`${BACKUP_FILE_PREFIX}2020-01-01T00-00-00-000.json`);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('backup-not-found');
  });
});

describe('backup service · eliminar y listar', () => {
  it('elimina solo la copia indicada', () => {
    const { service } = makeService({ keep: 7 });
    const first = service.run('manual');
    const second = service.run('manual');
    expect(service.remove(first.file!).ok).toBe(true);
    const files = fs.readdirSync(defaultFolder);
    expect(files).toContain(second.file);
    expect(files).not.toContain(first.file);
  });

  it('no permite borrar archivos que no son copias', () => {
    const { service } = makeService();
    expect(service.remove('cyber-tray-config.json').ok).toBe(false);
    expect(service.remove('../../algo.json').ok).toBe(false);
  });

  it('lista las copias de la más reciente a la más antigua', () => {
    const { service } = makeService({ keep: 7 });
    service.run('manual');
    service.run('manual');
    const items = service.list();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].file >= items[items.length - 1].file).toBe(true);
    expect(items[0].size).toBeGreaterThan(0);
  });

  it('devuelve una lista vacía si la carpeta todavía no existe', () => {
    expect(listBackupsIn(path.join(root, 'no-existe'))).toEqual([]);
  });
});

describe('backup service · programación', () => {
  it('respalda al arrancar si nunca se hizo una copia', () => {
    const { service } = makeService({ last: null });
    expect(service.runIfDue('startup')?.ok).toBe(true);
  });

  it('no duplica si todavía no toca', () => {
    const { service } = makeService({ last: new Date().toISOString() });
    expect(service.runIfDue('schedule')).toBeNull();
  });

  it('vuelve a respaldar cuando pasó el intervalo', () => {
    const longAgo = new Date(Date.now() - 25 * 3_600_000).toISOString();
    const { service } = makeService({ last: longAgo, hours: 24 });
    expect(service.runIfDue('schedule')?.ok).toBe(true);
  });

  it('no hace nada si está desactivado', () => {
    const { service } = makeService({ enabled: false, last: null });
    expect(service.runIfDue('startup')).toBeNull();
  });
});
