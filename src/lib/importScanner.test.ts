import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { scanImportSources } from '../../electron/importScanner';
import { scanStoreApps } from '../../electron/store-apps';
import type { ImportSourceConfig } from './shortcutImport';

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => path.join(os.tmpdir(), `CyberTray-${name}`),
  },
}));

vi.mock('../../electron/store-apps', () => ({
  scanStoreApps: vi.fn(),
}));

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'CyberTray-import-scanner-test-'));
afterAll(() => fs.rmSync(temporary, { recursive: true, force: true }));

function source(overrides: Partial<ImportSourceConfig> = {}): ImportSourceConfig {
  return {
    id: 'folder:test',
    kind: 'folder',
    path: temporary,
    targetCategory: 'utils',
    preserveFolders: true,
    skipUninstallers: true,
    includeFiles: false,
    ...overrides,
  };
}

const resolveFile = async (filePath: string) => ({
  name: path.basename(filePath, path.extname(filePath)),
  path: filePath.endsWith('.url')
    ? 'https://example.com'
    : filePath.endsWith('unins000.lnk') ? 'C:/Apps/Uninstall App.exe' : 'C:/Apps/App.exe',
  iconPath: 'local-resource:///icons/app.png',
  arguments: filePath.endsWith('.url') ? '' : '--profile work',
  cwd: filePath.endsWith('.url') ? '' : 'C:/Apps',
  exists: true,
});

describe('scanImportSources', () => {
  it('resolves shortcuts, URLs and auxiliary links without following folders as files', async () => {
    const nested = path.join(temporary, 'Games');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(temporary, 'App.lnk'), '');
    fs.writeFileSync(path.join(temporary, 'unins000.lnk'), '');
    fs.writeFileSync(path.join(temporary, 'Readme.lnk'), '');
    fs.writeFileSync(path.join(nested, 'Portal.lnk'), '');
    fs.writeFileSync(path.join(temporary, 'Website.url'), '[InternetShortcut]\r\nURL=https://example.com\r\n');
    fs.writeFileSync(path.join(temporary, 'notes.txt'), 'not imported');

    const progress: number[] = [];
    const result = await scanImportSources([source()], resolveFile, {
      onProgress: value => progress.push(value.completed),
    });

    expect(result.errors).toEqual([]);
    expect(result.scannedSourceIds).toEqual(['folder:test']);
    expect(result.items).toHaveLength(5);
    expect(result.items.find(item => item.name === 'Website')).toMatchObject({
      path: 'https://example.com',
      iconPath: 'local-resource:///icons/app.png',
      relativeFolder: '',
      exists: true,
    });
    expect(result.items.find(item => item.name === 'Portal')).toMatchObject({
      relativeFolder: 'Games',
      arguments: '--profile work',
      cwd: 'C:/Apps',
    });
    expect(result.items.find(item => item.name === 'unins000')).toMatchObject({
      path: 'C:/Apps/Uninstall App.exe',
      skippedReason: 'maintenance',
    });
    expect(result.items.find(item => item.name === 'Readme')).toMatchObject({ skippedReason: 'documentation' });
    expect(result.items.some(item => item.name === 'notes')).toBe(false);
    expect(progress.at(-1)).toBe(5);
  });

  it('reports unavailable sources without losing successful results', async () => {
    const result = await scanImportSources([
      source({ id: 'folder:missing', path: path.join(temporary, 'missing') }),
      source({ id: 'folder:ok' }),
    ], resolveFile);

    expect(result.scannedSourceIds).toEqual(['folder:ok']);
    expect(result.errors).toEqual([{ sourceId: 'folder:missing', message: 'Source folder is unavailable.' }]);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('returns Store apps through the shared source contract', async () => {
    vi.mocked(scanStoreApps).mockResolvedValueOnce([{
      name: 'WhatsApp',
      path: '5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App',
      iconPath: 'local-resource:///icons/store.png',
    }]);

    const result = await scanImportSources([
      source({ id: 'store:apps', kind: 'store', path: undefined, preserveFolders: false }),
    ], resolveFile);

    expect(result.items).toEqual([expect.objectContaining({
      sourceId: 'store:apps',
      name: 'WhatsApp',
      path: '5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App',
      iconPath: 'local-resource:///icons/store.png',
      exists: true,
    })]);
  });

  it('stops an in-flight scan when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(scanImportSources([source()], resolveFile, { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });
});
