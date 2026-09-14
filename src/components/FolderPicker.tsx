import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Search, Shield } from 'lucide-react';
import { translate } from '../locales';
import {
  CyberFolder,
  getChildFolders,
  getFolderPath,
  ROOT_FOLDER_ID,
} from '../lib/appUtils';

const VAULT_ID = 'vault';

function displayPath(folders: CyberFolder[], folderId: string): string {
  if (folderId === VAULT_ID) return translate('explorer_vault');
  const path = getFolderPath(folders, folderId).filter(folder => folder.id !== ROOT_FOLDER_ID);
  if (path.length === 0) return translate('app_folder_placeholder');
  return path.map(folder => folder.name).join(' / ');
}

export default function FolderPicker({
  categories,
  value,
  onChange,
}: {
  categories: CyberFolder[];
  value: string;
  onChange: (folderId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const folders = useMemo(
    () => categories.filter(folder => folder && folder.id && folder.id !== ROOT_FOLDER_ID),
    [categories]
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const path = getFolderPath(categories, value);
    setExpandedIds(prev => {
      const next = new Set(prev);
      path.forEach(folder => {
        if (folder.id !== ROOT_FOLDER_ID) next.add(folder.id);
      });
      return next;
    });
    const id = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open, categories, value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const selectFolder = (folderId: string) => {
    onChange(folderId);
    setOpen(false);
  };

  const toggleExpanded = (folderId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const q = query.trim().toLowerCase();
  const vaultLabel = translate('explorer_vault');
  const vaultMatches = !q || vaultLabel.toLowerCase().includes(q);

  const filtered = useMemo(() => {
    if (!q) return [];
    return folders.filter(folder => {
      if (folder.name.toLowerCase().includes(q)) return true;
      return displayPath(categories, folder.id).toLowerCase().includes(q);
    });
  }, [folders, q, categories]);

  const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const children = getChildFolders(categories, parentId);
    return children.map(folder => {
      const nested = getChildFolders(categories, folder.id);
      const hasChildren = nested.length > 0;
      const expanded = expandedIds.has(folder.id);
      const selected = value === folder.id;
      return (
        <div key={folder.id}>
          <div
            className={`group flex items-center gap-1 rounded-lg border transition-colors ${
              selected
                ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                : 'border-transparent text-slate-300 hover:bg-white/5'
            }`}
            style={{ paddingLeft: 6 + depth * 14 }}
          >
            <button
              type="button"
              tabIndex={-1}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (hasChildren) toggleExpanded(folder.id);
              }}
              className={`w-5 h-8 flex items-center justify-center shrink-0 ${hasChildren ? 'cursor-pointer text-slate-500 hover:text-slate-300' : 'cursor-default text-transparent'}`}
              aria-hidden={!hasChildren}
            >
              {hasChildren && (
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              )}
            </button>
            <button
              type="button"
              onClick={() => selectFolder(folder.id)}
              className="flex-1 min-w-0 flex items-center gap-2 py-1.5 pr-2 text-left cursor-pointer"
            >
              {selected || expanded ? (
                <FolderOpen className="w-4 h-4 shrink-0" style={{ color: folder.color }} />
              ) : (
                <Folder className="w-4 h-4 shrink-0" style={{ color: folder.color }} />
              )}
              <span className="truncate text-[13px]">{folder.name}</span>
            </button>
          </div>
          {expanded && hasChildren && renderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  const firstMatch = filtered[0]?.id || (vaultMatches ? VAULT_ID : '');

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-black/30 border rounded-lg px-4 py-2 text-sm text-left transition-colors cursor-pointer outline-none focus:outline-none ${
          open ? 'border-cyan-500/50' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <span className={`truncate ${value ? 'text-white' : 'text-slate-500'}`}>
          {displayPath(categories, value)}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-white/10 bg-[#0b1220] shadow-[0_12px_32px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (q) {
                  if (firstMatch) selectFolder(firstMatch);
                } else if (value) {
                  setOpen(false);
                }
              }}
              placeholder={translate('app_folder_search')}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar p-1.5">
            {q ? (
              <>
                {vaultMatches && (
                  <button
                    type="button"
                    onClick={() => selectFolder(VAULT_ID)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer ${
                      value === VAULT_ID ? 'bg-purple-500/15 text-purple-200' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="truncate text-[13px]">{vaultLabel}</span>
                  </button>
                )}
                {filtered.map(folder => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => selectFolder(folder.id)}
                    className={`w-full flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg text-left cursor-pointer ${
                      value === folder.id ? 'bg-cyan-500/10 text-white' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 w-full">
                      <Folder className="w-4 h-4 shrink-0" style={{ color: folder.color }} />
                      <span className="truncate text-[13px]">{folder.name}</span>
                    </span>
                    <span className="pl-6 text-[11px] text-slate-500 truncate w-full">{displayPath(categories, folder.id)}</span>
                  </button>
                ))}
                {!vaultMatches && filtered.length === 0 && (
                  <p className="px-2.5 py-3 text-[12px] text-slate-500">{translate('app_folder_empty')}</p>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => selectFolder(VAULT_ID)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer mb-0.5 ${
                    value === VAULT_ID ? 'bg-purple-500/15 text-purple-200' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate text-[13px]">{vaultLabel}</span>
                </button>
                <div className="border-t border-white/5 my-1" />
                {renderTree(null, 0)}
                {getChildFolders(categories, null).length === 0 && (
                  <p className="px-2.5 py-3 text-[12px] text-slate-500">{translate('explorer_no_folders')}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
