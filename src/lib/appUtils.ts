export const isElectron = !!window.electronAPI;

export const FOLDER_SCHEMA_VERSION = 2;
export const ROOT_FOLDER_ID = 'all';

export interface CyberFolder {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  order: number;
}

export const INITIAL_CATEGORIES = [
  { id: 'all', name: 'ALL MODULES', color: '#a1a1a1', parentId: null, order: -1 },
  { id: 'ai', name: 'AI CORES', color: '#34d399', parentId: null, order: 0 },
  { id: 'browsers', name: 'BROWSERS', color: '#f97316', parentId: null, order: 1 },
  { id: 'comm', name: 'NET CHATS', color: '#6366f1', parentId: null, order: 2 },
  { id: 'design', name: 'CYBER ART', color: '#ef4444', parentId: null, order: 3 },
  { id: 'dev', name: 'GRID CODING', color: '#38bdf8', parentId: null, order: 4 },
  { id: 'gaming', name: 'HOLODECKS', color: '#ec4899', parentId: null, order: 5 },
  { id: 'utils', name: 'DOCK TOOLS', color: '#60a5fa', parentId: null, order: 6 },
];

const normalizeParentId = (value: unknown, id: string, ids: Set<string>) => {
  if (typeof value !== 'string' || !value || value === id || !ids.has(value)) return null;
  return value;
};

export const normalizeCategoriesList = (list: any[] = []): CyberFolder[] => {
  const validCategories = Array.isArray(list)
    ? list.filter((c: any) => c && typeof c.id === 'string' && c.id.trim() !== '' && typeof c.name === 'string' && c.name.trim() !== '')
    : [];

  if (validCategories.length === 0) {
    return INITIAL_CATEGORIES.map(folder => ({ ...folder }));
  }

  const seenIds = new Set<string>();
  const uniqueCategories = validCategories.filter((category: any) => {
    if (seenIds.has(category.id)) return false;
    seenIds.add(category.id);
    return true;
  });

  if (!seenIds.has(ROOT_FOLDER_ID)) {
    uniqueCategories.unshift({ ...INITIAL_CATEGORIES[0] });
    seenIds.add(ROOT_FOLDER_ID);
  }

  const ids = new Set(uniqueCategories.map(category => category.id));
  const allCategory = uniqueCategories.find((category: any) => category.id === ROOT_FOLDER_ID);
  const restCategories = uniqueCategories.filter((category: any) => category.id !== ROOT_FOLDER_ID);

  const normalizedFolders: CyberFolder[] = [
    {
      ...INITIAL_CATEGORIES[0],
      ...allCategory,
      parentId: null,
      order: -1,
    },
    ...restCategories.map((category: any, index: number) => ({
      id: category.id,
      name: category.name.trim(),
      color: category.color || '#60a5fa',
      parentId: normalizeParentId(category.parentId, category.id, ids),
      order: Number.isFinite(category.order) ? category.order : index,
    })),
  ];

  const byId = new Map(normalizedFolders.map(folder => [folder.id, folder]));
  normalizedFolders.forEach(folder => {
    if (!folder.parentId) return;
    const visited = new Set<string>([folder.id]);
    let parentId: string | null = folder.parentId;
    while (parentId) {
      if (visited.has(parentId)) {
        folder.parentId = null;
        break;
      }
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentId || null;
    }
  });

  return normalizedFolders;
};

export const normalizeShortcutsList = (list: any[] = [], folders: CyberFolder[]) => {
  const validFolderIds = new Set(folders.map(folder => folder.id));
  const fallbackFolderId = folders.some(folder => folder.id === 'utils') ? 'utils' : folders.find(folder => folder.id !== ROOT_FOLDER_ID)?.id || 'utils';

  return (Array.isArray(list) ? list : [])
    .filter(shortcut => shortcut && shortcut.id !== undefined && typeof shortcut.name === 'string' && typeof shortcut.path === 'string')
    .map(shortcut => ({
      ...shortcut,
      category: shortcut.category === 'vault'
        ? 'vault'
        : validFolderIds.has(shortcut.category) && shortcut.category !== ROOT_FOLDER_ID
          ? shortcut.category
          : fallbackFolderId,
    }));
};

export const createFolderId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `folder_${globalThis.crypto.randomUUID()}`;
  }
  return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getChildFolders = (folders: CyberFolder[], parentId: string | null) =>
  folders
    .filter(folder => folder.id !== ROOT_FOLDER_ID && folder.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

export const getDescendantFolderIds = (folders: CyberFolder[], folderId: string): string[] => {
  const descendants: string[] = [];
  const queue = [folderId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    folders.forEach(folder => {
      if (folder.parentId === parentId && !descendants.includes(folder.id)) {
        descendants.push(folder.id);
        queue.push(folder.id);
      }
    });
  }
  return descendants;
};

export const getFolderPath = (folders: CyberFolder[], folderId: string): CyberFolder[] => {
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const path: CyberFolder[] = [];
  const visited = new Set<string>();
  let current = byId.get(folderId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId
      ? byId.get(current.parentId)
      : current.id === ROOT_FOLDER_ID
        ? undefined
        : byId.get(ROOT_FOLDER_ID);
  }

  return path;
};

export const getFolderDepth = (folders: CyberFolder[], folderId: string) =>
  Math.max(0, getFolderPath(folders, folderId).length - 1);

/** Compare semver strings (supports optional leading v). Returns >0 if a>b. */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v.replace(/^v/i, '').split(/[.+-]/).map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
