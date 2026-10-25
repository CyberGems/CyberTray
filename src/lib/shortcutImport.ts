import type { CyberFolder } from './appUtils';

export type ImportSourceKind = 'desktop' | 'start-menu' | 'folder' | 'store';

export interface ImportSourceConfig {
  id: string;
  kind: ImportSourceKind;
  path?: string;
  scope?: 'user' | 'common';
  label?: string;
  targetCategory: string;
  preserveFolders: boolean;
  skipUninstallers: boolean;
  includeFiles: boolean;
}

export interface ShortcutRecord {
  id: number;
  name: string;
  path: string;
  category: string;
  iconPath?: string;
  arguments?: string;
  cwd?: string;
  sourceId?: string;
  sourcePath?: string;
  sourceName?: string;
  sourceIconPath?: string;
  managed?: boolean;
  lastSeenAt?: number;
  syncState?: 'active' | 'missing';
  [key: string]: unknown;
}

export interface ScannedShortcut {
  key: string;
  sourceId: string;
  sourcePath: string;
  name: string;
  path: string;
  arguments?: string;
  cwd?: string;
  iconPath?: string;
  relativeFolder?: string;
  targetCategory: string;
  preserveFolders?: boolean;
  exists: boolean;
  error?: string;
  skippedReason?: string;
}

export type ImportAction = 'create' | 'update' | 'duplicate' | 'unchanged' | 'missing' | 'error' | 'skipped';

export interface ImportPlanItem extends ScannedShortcut {
  action: ImportAction;
  selected: boolean;
  existingId?: number;
  changedFields?: string[];
}

export interface ImportPlan {
  items: ImportPlanItem[];
  scannedSourceIds: string[];
}

export interface ImportApplyResult {
  shortcuts: ShortcutRecord[];
  categories: CyberFolder[];
  created: number;
  updated: number;
  removed: number;
  missing: number;
}

const normalize = (value: unknown) => String(value ?? '').trim().replace(/\//g, '\\').toLowerCase();
const sourceIdentity = (sourceId: unknown, sourcePath: unknown) => `${normalize(sourceId)}::${normalize(sourcePath)}`;

export function buildLaunchKey(path: unknown, args?: unknown, cwd?: unknown): string {
  return JSON.stringify([normalize(path), String(args ?? '').trim().toLowerCase(), normalize(cwd)]);
}

export function makeSourceId(kind: ImportSourceKind, pathOrScope: string): string {
  return `${kind}:${normalize(pathOrScope)}`;
}

export function ignorableShortcutReason(name: string, targetPath = '', sourcePath = ''): string | null {
  const baseName = name.trim().toLowerCase();
  const fileName = targetPath.split(/[\\/]/).pop()?.toLowerCase() || '';
  const sourceName = sourcePath.split(/[\\/]/).pop()?.toLowerCase() || '';
  // Dedicated uninstall utilities are real launchers, not auxiliary entries.
  if (/^(?:uninstall tool|revo uninstaller(?: pro)?|iobit uninstaller|geek uninstaller|bulk crap uninstaller|hibit uninstaller|wise program uninstaller)$/i.test(baseName)) return null;
  if (/^(?:uninstall(?:er)?|desinstalar|remove|eliminar|repair|reparar)(?:\s+|$)/i.test(baseName)) return 'maintenance';
  if (/^(?:unins(?:tall)?\d*|uninstall(?:er)?|desinstalar)\.(?:exe|lnk)$/i.test(fileName)) return 'maintenance';
  if (/^(?:unins(?:tall)?\d*|uninstall(?:er)?|desinstalar)\.(?:exe|lnk)$/i.test(sourceName)) return 'maintenance';
  if (/^(?:unins\d{3,}|uninstall(?:er)?)\.(?:exe|lnk)$/i.test(fileName)) return 'maintenance';
  if (/^(?:readme|read me|leeme|léeme|help|ayuda|manual|documentation|documentación|license|licencia)(?:\s+|$|\.)/i.test(baseName)) return 'documentation';
  return null;
}

function categoryPath(relativeFolder?: string): string[] {
  if (!relativeFolder) return [];
  return relativeFolder.split(/[\\/]+/)
    .map(part => part.trim())
    .filter(part => part && part !== '.' && part !== '..')
    .slice(0, 8)
    .map(part => part.slice(0, 80));
}

function stableFolderId(sourceId: string, parentId: string, name: string): string {
  const input = `${sourceId}|${parentId}|${normalize(name)}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `import_${(hash >>> 0).toString(36)}`;
}

function changedFieldsFor(existing: ShortcutRecord, scanned: ScannedShortcut): string[] {
  const changed: string[] = [];
  const nameManaged = !existing.sourceName || existing.name === existing.sourceName;
  const iconManaged = !existing.sourceIconPath || (existing.iconPath || '') === existing.sourceIconPath;
  if (nameManaged && existing.name !== scanned.name) changed.push('name');
  if (existing.path !== scanned.path) changed.push('path');
  if ((existing.arguments || '') !== (scanned.arguments || '')) changed.push('arguments');
  if ((existing.cwd || '') !== (scanned.cwd || '')) changed.push('cwd');
  if (iconManaged && (existing.iconPath || '') !== (scanned.iconPath || '')) changed.push('iconPath');
  if (existing.syncState === 'missing') changed.push('syncState');
  return changed;
}

function toPlanItem(scanned: ScannedShortcut, action: ImportAction, selected: boolean, existingId?: number, changedFields?: string[]): ImportPlanItem {
  return { ...scanned, action, selected, ...(existingId !== undefined ? { existingId } : {}), ...(changedFields ? { changedFields } : {}) };
}

export function reconcileImport(
  existingShortcuts: ShortcutRecord[],
  _categories: CyberFolder[],
  scannedItems: ScannedShortcut[],
  scannedSourceIds?: string[],
): ImportPlan {
  const existing = Array.isArray(existingShortcuts) ? existingShortcuts : [];
  const bySource = new Map<string, ShortcutRecord>();
  const byLaunch = new Map<string, ShortcutRecord>();
  for (const item of existing) {
    if (item.managed && item.sourceId && item.sourcePath) {
      bySource.set(sourceIdentity(item.sourceId, item.sourcePath), item);
    }
    const key = buildLaunchKey(item.path, item.arguments, item.cwd);
    if (!byLaunch.has(key)) byLaunch.set(key, item);
  }

  const items: ImportPlanItem[] = [];
  const seenSources = new Set<string>();
  const seenLaunchKeys = new Set<string>();
  const successfulSources = new Set(scannedSourceIds || scannedItems.map(item => item.sourceId));

  for (const scanned of scannedItems) {
    const identity = sourceIdentity(scanned.sourceId, scanned.sourcePath);
    seenSources.add(identity);
    const launchKey = buildLaunchKey(scanned.path, scanned.arguments, scanned.cwd);
    const managedExisting = bySource.get(identity);

    if (scanned.error || !scanned.path) {
      items.push(toPlanItem(scanned, 'error', false, managedExisting?.id));
      continue;
    }
    if (scanned.skippedReason) {
      items.push(toPlanItem(scanned, 'skipped', false, managedExisting?.id));
      continue;
    }
    if (managedExisting) {
      seenLaunchKeys.add(launchKey);
      const changedFields = changedFieldsFor(managedExisting, scanned);
      items.push(toPlanItem(scanned, changedFields.length ? 'update' : 'unchanged', changedFields.length > 0, managedExisting.id, changedFields));
      continue;
    }

    const duplicate = byLaunch.get(launchKey);
    if (duplicate || seenLaunchKeys.has(launchKey)) {
      items.push(toPlanItem(scanned, 'duplicate', false, duplicate?.id));
      continue;
    }
    seenLaunchKeys.add(launchKey);
    items.push(toPlanItem(scanned, 'create', true));
  }

  for (const shortcut of existing) {
    if (!shortcut.managed || !shortcut.sourceId || !shortcut.sourcePath || !successfulSources.has(shortcut.sourceId)) continue;
    const identity = sourceIdentity(shortcut.sourceId, shortcut.sourcePath);
    if (seenSources.has(identity)) continue;
    items.push({
      key: `missing:${identity}`,
      sourceId: shortcut.sourceId,
      sourcePath: shortcut.sourcePath,
      name: shortcut.name,
      path: shortcut.path,
      arguments: shortcut.arguments,
      cwd: shortcut.cwd,
      iconPath: shortcut.iconPath,
      targetCategory: shortcut.category,
      exists: false,
      action: 'missing',
      selected: false,
      existingId: shortcut.id,
    });
  }

  return { items, scannedSourceIds: [...successfulSources] };
}

function ensureImportedCategory(
  categories: CyberFolder[],
  item: ImportPlanItem,
): CyberFolder[] {
  if (!item.preserveFolders) return categories;
  const parts = categoryPath(item.relativeFolder);
  if (!parts.length) return categories;
  let next = categories;
  let parentId: string | null = item.targetCategory && item.targetCategory !== 'all' ? item.targetCategory : null;
  for (const name of parts) {
    const existing = next.find(folder => folder.parentId === parentId && folder.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      parentId = existing.id;
      continue;
    }
    const id = stableFolderId(item.sourceId, parentId || 'root', name);
    const order = next.filter(folder => folder.parentId === parentId).length;
    next = [...next, { id, name, color: '#60a5fa', parentId, order }];
    parentId = id;
  }
  return next;
}

function resolveCategory(categories: CyberFolder[], item: ImportPlanItem): string {
  if (!item.preserveFolders) return item.targetCategory || 'utils';
  let parentId: string | null = item.targetCategory && item.targetCategory !== 'all' ? item.targetCategory : null;
  for (const name of categoryPath(item.relativeFolder)) {
    const folder = categories.find(candidate => candidate.parentId === parentId && candidate.name.toLowerCase() === name.toLowerCase());
    if (!folder) return item.targetCategory || 'utils';
    parentId = folder.id;
  }
  return parentId || item.targetCategory || 'utils';
}

export function applyImportPlan(
  currentShortcuts: ShortcutRecord[],
  currentCategories: CyberFolder[],
  plan: ImportPlan,
): ImportApplyResult {
  let shortcuts = [...currentShortcuts];
  let categories = [...currentCategories];
  let created = 0;
  let updated = 0;
  let removed = 0;
  let missing = 0;
  const now = Date.now();
  let nextId = Math.max(now, 0, ...shortcuts.map(item => Number(item.id) + 1).filter(Number.isFinite));

  for (const item of plan.items) {
    if (item.action === 'missing') {
      const index = shortcuts.findIndex(shortcut => shortcut.id === item.existingId);
      if (index < 0) continue;
      if (item.selected) {
        shortcuts.splice(index, 1);
        removed++;
      } else if (shortcuts[index].syncState !== 'missing') {
        shortcuts[index] = { ...shortcuts[index], syncState: 'missing' };
        missing++;
      }
      continue;
    }

    const existingIndex = item.existingId === undefined ? -1 : shortcuts.findIndex(shortcut => shortcut.id === item.existingId);
    if ((item.action === 'update' || item.action === 'unchanged' || item.action === 'error' || item.action === 'skipped') && existingIndex >= 0) {
      const existing = shortcuts[existingIndex];
      const seen = { ...existing, lastSeenAt: now, syncState: 'active' as const };
      if (item.action === 'update' && item.selected) {
        const nameManaged = !existing.sourceName || existing.name === existing.sourceName;
        const iconManaged = !existing.sourceIconPath || (existing.iconPath || '') === existing.sourceIconPath;
        shortcuts[existingIndex] = {
          ...seen,
          name: nameManaged ? item.name : existing.name,
          path: item.path,
          arguments: item.arguments || '',
          cwd: item.cwd || '',
          iconPath: iconManaged ? (item.iconPath || '') : existing.iconPath,
          sourceName: item.name,
          sourceIconPath: item.iconPath || '',
          sourcePath: item.sourcePath,
          sourceId: item.sourceId,
          managed: true,
        };
        updated++;
      } else {
        shortcuts[existingIndex] = seen;
      }
      continue;
    }

    if ((item.action !== 'create' && item.action !== 'skipped') || !item.selected || !item.path) continue;
    const launchKey = buildLaunchKey(item.path, item.arguments, item.cwd);
    if (shortcuts.some(shortcut => buildLaunchKey(shortcut.path, shortcut.arguments, shortcut.cwd) === launchKey)) continue;
    categories = ensureImportedCategory(categories, item);
    const category = resolveCategory(categories, item);
    shortcuts.push({
      id: nextId++,
      name: item.name,
      path: item.path,
      category,
      iconPath: item.iconPath || '',
      arguments: item.arguments || '',
      cwd: item.cwd || '',
      isAdmin: false,
      delay: 0,
      usageCount: 0,
      addedTimestamp: now,
      sourceId: item.sourceId,
      sourcePath: item.sourcePath,
      sourceName: item.name,
      sourceIconPath: item.iconPath || '',
      managed: true,
      lastSeenAt: now,
      syncState: 'active',
    });
    created++;
  }

  return { shortcuts, categories, created, updated, removed, missing };
}
