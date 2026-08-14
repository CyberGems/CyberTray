export const isElectron = !!window.electronAPI;

export const INITIAL_CATEGORIES = [
  { id: 'all', name: 'ALL MODULES', color: '#a1a1aa' },
  { id: 'ai', name: 'AI CORES', color: '#34d399' },
  { id: 'browsers', name: 'BROWSERS', color: '#f97316' },
  { id: 'comm', name: 'NET CHATS', color: '#6366f1' },
  { id: 'design', name: 'CYBER ART', color: '#ef4444' },
  { id: 'dev', name: 'GRID CODING', color: '#38bdf8' },
  { id: 'gaming', name: 'HOLODECKS', color: '#ec4899' },
  { id: 'utils', name: 'DOCK TOOLS', color: '#60a5fa' },
];

export const normalizeCategoriesList = (list: any[] = []) => {
  const validCategories = list.filter((c: any) => c && c.id && c.id.trim() !== '' && c.name && c.name.trim() !== '');

  if (validCategories.length === 0) {
    return [...INITIAL_CATEGORIES];
  }

  const allCategory = validCategories.find((c: any) => c.id === 'all');
  const restCategories = validCategories.filter((c: any) => c.id !== 'all');

  return [allCategory || { ...INITIAL_CATEGORIES[0] }, ...restCategories];
};

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
