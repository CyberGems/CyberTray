import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Home,
  Shield,
  Star,
} from 'lucide-react';
import { translate } from '../locales';
import {
  CyberFolder,
  getChildFolders,
  getFolderPath,
  ROOT_FOLDER_ID,
} from '../lib/appUtils';

interface FolderTreeProps {
  folders: CyberFolder[];
  activeFolderId: string;
  onSelect: (folderId: string) => void;
  onContextMenu: (event: React.MouseEvent, folder: CyberFolder) => void;
  onCreateFolder: (parentId: string | null) => void;
  onDragStart: (event: React.DragEvent, folder: CyberFolder) => void;
  onFolderDrop: (event: React.DragEvent, folder: CyberFolder) => void;
  onDragEnd: () => void;
  draggingFolderId: string | null;
  dropFolderId: string | null;
  onDropFolderChange: (folderId: string | null) => void;
}

export default function FolderTree({
  folders,
  activeFolderId,
  onSelect,
  onContextMenu,
  onCreateFolder,
  onDragStart,
  onFolderDrop,
  onDragEnd,
  draggingFolderId,
  dropFolderId,
  onDropFolderChange,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, CyberFolder[]>();
    folders.forEach(folder => {
      if (folder.id === ROOT_FOLDER_ID) return;
      const children = map.get(folder.parentId) || [];
      children.push(folder);
      map.set(folder.parentId, children);
    });
    map.forEach(children => children.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
    return map;
  }, [folders]);

  useEffect(() => {
    const path = getFolderPath(folders, activeFolderId);
    if (path.length < 2) return;
    setExpandedIds(prev => {
      const next = new Set(prev);
      path.forEach(folder => next.add(folder.id));
      return next;
    });
  }, [activeFolderId, folders]);

  const toggleExpanded = (folderId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleDragOver = (event: React.DragEvent, folderId: string) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    onDropFolderChange(folderId);
  };

  const renderFolder = (folder: CyberFolder, depth: number): React.ReactNode => {
    const children = childrenByParent.get(folder.id) || [];
    const hasChildren = children.length > 0;
    const expanded = expandedIds.has(folder.id);
    const selected = activeFolderId === folder.id;

    return (
      <React.Fragment key={folder.id}>
        <div
          draggable
          onDragStart={(event) => onDragStart(event, folder)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => handleDragOver(event, folder.id)}
          onDragLeave={() => onDropFolderChange(null)}
          onDrop={(event) => {
            onFolderDrop(event, folder);
            onDropFolderChange(null);
          }}
          onContextMenu={(event) => onContextMenu(event, folder)}
          className={`group flex items-center gap-1.5 rounded-md border transition-all cursor-pointer ${
            selected
              ? 'bg-[var(--neon-glow-color-raw)]/15 border-[var(--neon-glow-border)] text-white'
              : 'border-transparent text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
          } ${dropFolderId === folder.id ? 'ring-1 ring-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/20' : ''} ${
            draggingFolderId === folder.id ? 'opacity-50' : ''
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px`, paddingRight: 5 }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) toggleExpanded(folder.id);
            }}
            className={`w-4 h-5 flex items-center justify-center text-slate-600 ${hasChildren ? 'cursor-pointer hover:text-slate-300' : 'cursor-default'}`}
            aria-label={hasChildren ? translate(expanded ? 'explorer_collapse' : 'explorer_expand') : undefined}
          >
            {hasChildren && (
              <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            )}
          </button>
          {selected || expanded ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: folder.color }} />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: folder.color }} />
          )}
          <button
            type="button"
            onClick={() => onSelect(folder.id)}
            className="min-w-0 flex-1 text-left truncate font-ui text-[11px] tracking-wide cursor-pointer"
          >
            {folder.name}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCreateFolder(folder.id);
            }}
            className="hidden group-hover:flex w-5 h-5 items-center justify-center text-slate-600 hover:text-[var(--neon-glow-color)] cursor-pointer"
            title={translate('explorer_new_subfolder')}
            aria-label={translate('explorer_new_subfolder')}
          >
            <FolderPlus className="w-3 h-3" />
          </button>
        </div>
        {expanded && children.map(child => renderFolder(child, depth + 1))}
      </React.Fragment>
    );
  };

  const rootFolder = folders.find(folder => folder.id === ROOT_FOLDER_ID) || {
    id: ROOT_FOLDER_ID,
    name: translate('explorer_all'),
    color: '#a1a1a1',
    parentId: null,
    order: -1,
  };

  return (
    <aside className="w-52 shrink-0 border-r border-slate-900/80 bg-slate-950/45 p-2.5 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-900/80">
        <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {translate('explorer_folders')}
        </span>
        <button
          type="button"
          onClick={() => onCreateFolder(null)}
          className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-800 text-slate-500 hover:text-[var(--neon-glow-color)] hover:border-[var(--neon-glow-border)] cursor-pointer"
          title={translate('explorer_new_folder')}
          aria-label={translate('explorer_new_folder')}
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        onDragOver={(event) => handleDragOver(event, ROOT_FOLDER_ID)}
        onDragLeave={() => onDropFolderChange(null)}
        onDrop={(event) => {
          onFolderDrop(event, rootFolder);
          onDropFolderChange(null);
        }}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-all ${
          activeFolderId === ROOT_FOLDER_ID
            ? 'bg-[var(--neon-glow-color-raw)]/15 border-[var(--neon-glow-border)] text-white'
            : 'border-transparent text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
        } ${dropFolderId === ROOT_FOLDER_ID ? 'ring-1 ring-[var(--neon-glow-color)]' : ''}`}
        onClick={() => onSelect(ROOT_FOLDER_ID)}
      >
        <Home className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-ui text-[11px] tracking-wide truncate">{translate('explorer_all')}</span>
      </div>

      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-all ${
          activeFolderId === 'favorites'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'border-transparent text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
        }`}
        onClick={() => onSelect('favorites')}
      >
        <Star className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-ui text-[11px] tracking-wide truncate">{translate('explorer_favorites')}</span>
      </div>

      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-all ${
          activeFolderId === 'vault'
            ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
            : 'border-transparent text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
        }`}
        onClick={() => onSelect('vault')}
      >
        <Shield className="w-3.5 h-3.5 text-purple-400" />
        <span className="font-ui text-[11px] tracking-wide truncate">{translate('explorer_vault')}</span>
      </div>

      <div className="border-t border-slate-900/80 my-1" />
      {(childrenByParent.get(null) || []).map(folder => renderFolder(folder, 0))}
      {(childrenByParent.get(null) || []).length === 0 && (
        <p className="px-2 py-3 text-[10px] text-slate-600 font-mono">{translate('explorer_no_folders')}</p>
      )}
    </aside>
  );
}
