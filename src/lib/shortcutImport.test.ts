import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CyberFolder } from './appUtils';
import {
  applyImportPlan,
  buildLaunchKey,
  ignorableShortcutReason,
  makeSourceId,
  reconcileImport,
  type ImportPlan,
  type ScannedShortcut,
  type ShortcutRecord,
} from './shortcutImport';

const SOURCE_ID = makeSourceId('folder', 'C:/Import');
const OTHER_SOURCE_ID = makeSourceId('folder', 'D:/Other Import');
const NOW = new Date('2026-10-25T12:00:00.000Z');

function categories(): CyberFolder[] {
  return [
    { id: 'all', name: 'All', color: '#a1a1a1', parentId: null, order: -1 },
    { id: 'dev', name: 'Development', color: '#38bdf8', parentId: null, order: 0 },
  ];
}

function scanned(overrides: Partial<ScannedShortcut> = {}): ScannedShortcut {
  const sourcePath = overrides.sourcePath ?? 'C:/Import/App.lnk';
  return {
    key: `scan:${sourcePath}`,
    sourceId: SOURCE_ID,
    sourcePath,
    name: 'App',
    path: 'C:/Apps/App.exe',
    arguments: '',
    cwd: 'C:/Apps',
    iconPath: 'C:/Apps/App.ico',
    targetCategory: 'dev',
    preserveFolders: false,
    exists: true,
    ...overrides,
  };
}

function existing(overrides: Partial<ShortcutRecord> = {}): ShortcutRecord {
  return {
    id: 7,
    name: 'App',
    path: 'C:/Apps/App.exe',
    category: 'dev',
    iconPath: 'C:/Apps/App.ico',
    arguments: '',
    cwd: 'C:/Apps',
    sourceId: SOURCE_ID,
    sourcePath: 'C:/Import/App.lnk',
    sourceName: 'App',
    sourceIconPath: 'C:/Apps/App.ico',
    managed: true,
    lastSeenAt: 1,
    syncState: 'active',
    ...overrides,
  };
}

function selected(plan: ImportPlan, index = 0): ImportPlan {
  return {
    ...plan,
    items: plan.items.map((item, itemIndex) => itemIndex === index ? { ...item, selected: true } : item),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('buildLaunchKey', () => {
  it('normalizes path and cwd case, slash direction, whitespace, and argument case', () => {
    expect(buildLaunchKey(' C:/Apps/My App.exe ', ' /RUN ', ' C:/Work ')).toBe(
      buildLaunchKey('c:\\apps\\my app.exe', '/run', 'c:\\work'),
    );
  });

  it('distinguishes arguments and working directories', () => {
    const base = buildLaunchKey('C:/Apps/App.exe', '--mode=a', 'C:/Work');
    expect(buildLaunchKey('C:/Apps/App.exe', '--mode=b', 'C:/Work')).not.toBe(base);
    expect(buildLaunchKey('C:/Apps/App.exe', '--mode=a', 'C:/Other')).not.toBe(base);
    expect(buildLaunchKey('C:/Apps/App.exe')).toBe(buildLaunchKey('C:/Apps/App.exe', '', ''));
  });
});

describe('makeSourceId', () => {
  it('normalizes paths and scopes while retaining the source kind', () => {
    expect(makeSourceId('desktop', ' C:/Users/Ada/Desktop ')).toBe('desktop:c:\\users\\ada\\desktop');
    expect(makeSourceId('start-menu', 'COMMON')).toBe('start-menu:common');
    expect(makeSourceId('store', ' Store ')).toBe('store:store');
  });
});

describe('reconcileImport deduplication', () => {
  it('deduplicates an existing launch case-insensitively', () => {
    const current = existing({
      managed: false,
      sourceId: undefined,
      sourcePath: undefined,
      path: 'C:\\Apps\\App.EXE',
      arguments: '--RUN',
      cwd: 'C:\\WORK',
    });
    const scan = scanned({
      sourcePath: 'C:/Import/New App.lnk',
      path: 'c:/apps/app.exe',
      arguments: '--run',
      cwd: 'c:/work',
    });

    const plan = reconcileImport([current], categories(), [scan], [SOURCE_ID]);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({ action: 'duplicate', selected: false, existingId: current.id });
  });

  it('deduplicates a scan batch without conflating different args or cwd', () => {
    const scans = [
      scanned({ sourcePath: 'C:/Import/A.lnk', path: 'C:\\Tools\\App.exe', arguments: '--MODE=A', cwd: 'C:\\Work' }),
      scanned({ sourcePath: 'C:/Import/A copy.lnk', path: 'c:/tools/app.exe', arguments: '--mode=a', cwd: 'c:/work' }),
      scanned({ sourcePath: 'C:/Import/B.lnk', path: 'c:/tools/app.exe', arguments: '--mode=b', cwd: 'c:/work' }),
      scanned({ sourcePath: 'C:/Import/C.lnk', path: 'c:/tools/app.exe', arguments: '--mode=a', cwd: 'c:/other' }),
    ];

    const plan = reconcileImport([], categories(), scans, [SOURCE_ID]);

    expect(plan.items.map(item => item.action)).toEqual(['create', 'duplicate', 'create', 'create']);
    expect(plan.items.map(item => item.selected)).toEqual([true, false, true, true]);
  });
});

describe('import application and reconciliation', () => {
  it('is idempotent across repeated imports', () => {
    const scan = scanned();
    const initialShortcuts: ShortcutRecord[] = [];
    const initialCategories = categories();
    const firstPlan = reconcileImport(initialShortcuts, initialCategories, [scan], [SOURCE_ID]);
    const first = applyImportPlan(initialShortcuts, initialCategories, firstPlan);
    const importedId = first.shortcuts[0].id;

    const secondPlan = reconcileImport(first.shortcuts, first.categories, [scan], [SOURCE_ID]);
    const second = applyImportPlan(first.shortcuts, first.categories, secondPlan);

    expect(first.created).toBe(1);
    expect(secondPlan.items[0]).toMatchObject({ action: 'unchanged', selected: false, existingId: importedId });
    expect(second).toMatchObject({ created: 0, updated: 0, removed: 0, missing: 0 });
    expect(second.shortcuts).toEqual(first.shortcuts);
    expect(second.categories).toEqual(first.categories);
    expect(second.shortcuts[0].id).toBe(importedId);
    expect(initialShortcuts).toEqual([]);
    expect(initialCategories).toEqual(categories());
  });

  it('preserves user fields and custom name/icon while applying source updates', () => {
    const current = existing({
      name: 'My custom launch name',
      iconPath: 'D:/Icons/Custom.png',
      category: 'custom-category',
      favorite: true,
      hotkey: 'Ctrl+Alt+K',
      usageCount: 91,
      isAdmin: true,
      delay: 1250,
    });
    const scan = scanned({
      name: 'Vendor rename',
      path: 'D:/Vendor/New App.exe',
      arguments: '--new',
      cwd: 'D:/Vendor',
      iconPath: 'D:/Vendor/New App.ico',
    });
    const plan = reconcileImport([current], categories(), [scan], [SOURCE_ID]);

    expect(plan.items[0]).toMatchObject({
      action: 'update',
      selected: true,
      changedFields: ['path', 'arguments', 'cwd'],
    });

    const result = applyImportPlan([current], categories(), plan);
    expect(result.updated).toBe(1);
    expect(result.shortcuts[0]).toMatchObject({
      id: current.id,
      name: 'My custom launch name',
      iconPath: 'D:/Icons/Custom.png',
      category: 'custom-category',
      favorite: true,
      hotkey: 'Ctrl+Alt+K',
      usageCount: 91,
      isAdmin: true,
      delay: 1250,
      path: 'D:/Vendor/New App.exe',
      arguments: '--new',
      cwd: 'D:/Vendor',
      sourceName: 'Vendor rename',
      sourceIconPath: 'D:/Vendor/New App.ico',
      syncState: 'active',
    });
  });

  it('updates source-managed names and icons', () => {
    const current = existing();
    const scan = scanned({ name: 'App 2.0', iconPath: 'C:/Apps/App 2.0.ico' });
    const plan = reconcileImport([current], categories(), [scan], [SOURCE_ID]);

    expect(plan.items[0]).toMatchObject({
      action: 'update',
      selected: true,
      changedFields: ['name', 'iconPath'],
    });

    const result = applyImportPlan([current], categories(), plan);
    expect(result.shortcuts[0]).toMatchObject({
      name: 'App 2.0',
      iconPath: 'C:/Apps/App 2.0.ico',
      sourceName: 'App 2.0',
      sourceIconPath: 'C:/Apps/App 2.0.ico',
    });
  });

  it('creates nested categories, resolves shortcuts into them, and keeps stable IDs', () => {
    const scans = [
      scanned({
        sourcePath: 'C:/Import/Games/Puzzle/A.lnk',
        path: 'C:/Games/A.exe',
        relativeFolder: 'Games/Puzzle',
        preserveFolders: true,
      }),
      scanned({
        sourcePath: 'C:/Import/Games/Puzzle/Advanced/B.lnk',
        path: 'C:/Games/B.exe',
        relativeFolder: 'games/Puzzle/Advanced',
        preserveFolders: true,
      }),
    ];
    const firstPlan = reconcileImport([], categories(), scans, [SOURCE_ID]);
    const first = applyImportPlan([], categories(), firstPlan);
    const games = first.categories.find(folder => folder.name.toLowerCase() === 'games');
    const puzzle = first.categories.find(folder => folder.name.toLowerCase() === 'puzzle');
    const advanced = first.categories.find(folder => folder.name.toLowerCase() === 'advanced');

    expect(games).toMatchObject({ parentId: 'dev' });
    expect(puzzle).toMatchObject({ parentId: games?.id });
    expect(advanced).toMatchObject({ parentId: puzzle?.id });
    expect(first.shortcuts.map(item => item.category)).toEqual([puzzle?.id, advanced?.id]);
    expect(first.created).toBe(2);

    const repeatedPlan = reconcileImport(first.shortcuts, first.categories, scans, [SOURCE_ID]);
    const repeated = applyImportPlan(first.shortcuts, first.categories, repeatedPlan);
    const fresh = applyImportPlan([], categories(), firstPlan);

    expect(repeated.categories).toEqual(first.categories);
    expect(repeated.shortcuts).toEqual(first.shortcuts);
    expect(fresh.categories).toEqual(first.categories);
    expect(fresh.categories.filter(folder => folder.name.toLowerCase() === 'puzzle')).toHaveLength(1);
  });

  it('allows a selected skipped item to be recovered and remains idempotent', () => {
    const scan = scanned({ name: 'Readme', path: 'C:/Apps/README.txt', skippedReason: 'documentation' });
    const plan = reconcileImport([], categories(), [scan], [SOURCE_ID]);
    expect(plan.items[0]).toMatchObject({ action: 'skipped', selected: false });

    const first = applyImportPlan([], categories(), selected(plan));
    expect(first).toMatchObject({ created: 1, updated: 0, removed: 0, missing: 0 });
    expect(first.shortcuts[0]).toMatchObject({ name: 'Readme', managed: true, syncState: 'active' });

    const secondPlan = reconcileImport(first.shortcuts, first.categories, [scan], [SOURCE_ID]);
    const second = applyImportPlan(first.shortcuts, first.categories, secondPlan);
    expect(secondPlan.items[0]).toMatchObject({ action: 'skipped', selected: false });
    expect(second.shortcuts).toEqual(first.shortcuts);
    expect(second.created).toBe(0);
  });

  it('reactivates a selected skipped item that was previously missing', () => {
    const current = existing({ syncState: 'missing', usageCount: 12 });
    const scan = scanned({ skippedReason: 'maintenance' });
    const plan = reconcileImport([current], categories(), [scan], [SOURCE_ID]);
    expect(plan.items[0]).toMatchObject({ action: 'skipped', selected: false, existingId: current.id });

    const result = applyImportPlan([current], categories(), selected(plan));
    expect(result.shortcuts).toHaveLength(1);
    expect(result.shortcuts[0]).toMatchObject({
      id: current.id,
      syncState: 'active',
      usageCount: 12,
      lastSeenAt: NOW.getTime(),
    });
    expect(result).toMatchObject({ created: 0, updated: 0, removed: 0, missing: 0 });
  });

  it('round-trips Unicode paths, arguments, categories, and source identities', () => {
    const scan = scanned({
      sourcePath: 'D:/Atajos/Café/Ápp.lnk',
      name: 'Café 東京',
      path: 'C:\\Juegos\\Café\\Niño.exe',
      arguments: '--nombre=José',
      cwd: 'C:\\Trabajo\\東京',
      iconPath: 'C:\\Iconos\\Café.ico',
      relativeFolder: 'Juegos/Café',
      preserveFolders: true,
    });
    const plan = reconcileImport([], categories(), [scan], [SOURCE_ID]);
    const first = applyImportPlan([], categories(), plan);

    expect(first.shortcuts[0]).toMatchObject({
      name: 'Café 東京',
      path: 'C:\\Juegos\\Café\\Niño.exe',
      arguments: '--nombre=José',
      cwd: 'C:\\Trabajo\\東京',
      iconPath: 'C:\\Iconos\\Café.ico',
      sourcePath: 'D:/Atajos/Café/Ápp.lnk',
    });
    expect(first.categories.some(folder => folder.name === 'Café')).toBe(true);
    expect(buildLaunchKey(scan.path, scan.arguments, scan.cwd)).toBe(
      buildLaunchKey('c:/juegos/café/niño.exe', '--NOMBRE=JOSÉ', 'c:/trabajo/東京'),
    );

    const repeated = reconcileImport(first.shortcuts, first.categories, [scan], [SOURCE_ID]);
    expect(repeated.items[0]).toMatchObject({ action: 'unchanged', selected: false });
  });
});

describe('missing shortcut reconciliation', () => {
  it('marks records missing only for sources explicitly reported as successfully scanned', () => {
    const fromScannedSource = existing();
    const fromOtherSource = existing({
      id: 8,
      sourceId: OTHER_SOURCE_ID,
      sourcePath: 'D:/Other Import/Other.lnk',
      path: 'D:/Other/Other.exe',
    });
    const unmanaged = existing({ id: 9, managed: false, sourceId: undefined, sourcePath: undefined });

    const plan = reconcileImport(
      [fromScannedSource, fromOtherSource, unmanaged],
      categories(),
      [],
      [SOURCE_ID],
    );

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({
      action: 'missing',
      selected: false,
      existingId: fromScannedSource.id,
      exists: false,
    });
    expect(plan.scannedSourceIds).toEqual([SOURCE_ID]);
  });

  it('does not mark records missing for failed sources', () => {
    const current = existing({ sourceId: 'folder:broken', sourcePath: 'E:/Broken/App.lnk' });
    const failedItem = scanned({
      sourceId: 'folder:broken',
      sourcePath: 'E:/Broken/App.lnk',
      path: '',
      error: 'Access denied',
    });

    const emptyFailedScan = reconcileImport([current], categories(), [], []);
    const failedItemScan = reconcileImport([current], categories(), [failedItem], []);

    expect(emptyFailedScan.items).toEqual([]);
    expect(failedItemScan.items).toHaveLength(1);
    expect(failedItemScan.items[0]).toMatchObject({ action: 'error', selected: false });
    expect(failedItemScan.items.some(item => item.action === 'missing')).toBe(false);
  });

  it('deletes selected missing records and only marks unselected records missing', () => {
    const remove = existing();
    const mark = existing({ id: 8, sourcePath: 'C:/Import/Other.lnk', path: 'C:/Apps/Other.exe' });
    const plan = reconcileImport([remove, mark], categories(), [], [SOURCE_ID]);
    const removalPlan = selected(plan, 0);

    const result = applyImportPlan([remove, mark], categories(), removalPlan);

    expect(result).toMatchObject({ created: 0, updated: 0, removed: 1, missing: 1 });
    expect(result.shortcuts).toHaveLength(1);
    expect(result.shortcuts[0]).toMatchObject({ id: mark.id, syncState: 'missing' });
  });
});

describe('ignorableShortcutReason', () => {
  it.each([
    'Uninstall App',
    'uninstaller',
    'Desinstalar',
    'Remove App',
    'Eliminar App',
    'Repair',
    'Reparar Tool',
  ])('classifies %s as maintenance', name => {
    expect(ignorableShortcutReason(name)).toBe('maintenance');
  });

  it.each([
    ['C:/Tools/unins000.exe', ''],
    ['C:/Tools/UNINSTALLER.EXE', ''],
    ['', 'C:/Shortcuts/unins123.lnk'],
    ['', 'C:/Shortcuts/desinstalar.exe'],
  ])('classifies maintenance filenames from target %s or source %s', (targetPath, sourcePath) => {
    expect(ignorableShortcutReason('Application', targetPath, sourcePath)).toBe('maintenance');
  });

  it('checks the source filename even when the target has an ordinary filename', () => {
    expect(ignorableShortcutReason('Application', 'C:/Tools/App.exe', 'C:/Shortcuts/uninstall.lnk')).toBe('maintenance');
  });

  it.each([
    'Readme',
    'Read Me.txt',
    'LEEME',
    'Léeme.pdf',
    'Help',
    'Ayuda',
    'Manual.user',
    'Documentation',
    'Documentación',
    'License.txt',
    'Licencia',
  ])('classifies %s as documentation', name => {
    expect(ignorableShortcutReason(name)).toBe('documentation');
  });

  it.each([
    'Uninstall Tool',
    'Revo Uninstaller',
    'IObit Uninstaller',
    'Geek Uninstaller',
  ])('keeps the dedicated uninstall utility %s', name => {
    expect(ignorableShortcutReason(name, `C:/Tools/${name}.exe`, `C:/Shortcuts/${name}.lnk`)).toBeNull();
  });

  it.each([
    'UninstallHelper',
    'UninstallerPro',
    'Removalist',
    'RepairBot',
    'Desinstalador',
    'ReadmeEditor',
    'Helpful Tools',
    'ManualOverride',
    'DocumentationHub',
    'LicenseManager',
  ])('does not falsely classify ordinary name %s', name => {
    expect(ignorableShortcutReason(name, `C:/Tools/${name}.exe`, `C:/Shortcuts/${name}.lnk`)).toBeNull();
  });
});
