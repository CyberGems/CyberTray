import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Star,
} from 'lucide-react';
import { translate } from '../locales';
import {
  CyberFolder,
  getFolderPath,
  ROOT_FOLDER_ID,
  densityFromIconSize,
} from '../lib/appUtils';

type ShowTooltipFn = (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;

interface FolderTreeProps {
  folders: CyberFolder[];
  activeFolderId: string;
  density: ReturnType<typeof densityFromIconSize>;
  onSelect: (folderId: string) => void;
  onContextMenu: (event: React.MouseEvent, folder: CyberFolder) => void;
  onCreateFolder: (parentId: string | null) => void;
  onDragStart: (event: React.DragEvent, folder: CyberFolder) => void;
  onFolderDrop: (event: React.DragEvent, folder: CyberFolder) => void;
  onFavoriteDrop: (event: React.DragEvent) => void;
  onFavoriteDragOver: (event: React.DragEvent) => void;
  onFavoriteDragLeave: () => void;
  onDragEnd: () => void;
  draggingFolderId: string | null;
  dropFolderId: string | null;
  onDropFolderChange: (folderId: string | null) => void;
  showTooltip: ShowTooltipFn;
  hideTooltip: () => void;
  /** Barra reducida a una franja de iconos. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Ancho de la franja cuando la barra está plegada. */
const COLLAPSED_WIDTH = 56;

export default function FolderTree({
  folders,
  activeFolderId,
  density,
  onSelect,
  onContextMenu,
  onCreateFolder,
  onDragStart,
  onFolderDrop,
  onFavoriteDrop,
  onFavoriteDragOver,
  onFavoriteDragLeave,
  onDragEnd,
  draggingFolderId,
  dropFolderId,
  onDropFolderChange,
  showTooltip,
  hideTooltip,
  collapsed,
  onToggleCollapsed,
}: FolderTreeProps) {
  // En la franja plegada el icono es lo único que queda: se agranda un punto
  // para que la columna no se vea rala.
  const iconPx = collapsed ? density.folderIconPx + 2.5 : density.folderIconPx;

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
    // Plegada, la franja solo muestra el primer nivel: los hijos no caben sin
    // perder la jerarquía y ensucian la columna de iconos.
    if (collapsed && depth > 0) return null;
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
          onClick={() => onSelect(folder.id)}
          onMouseEnter={(event) => {
            if (!collapsed) return;
            const path = getFolderPath(folders, folder.id).map(step => step.name).join(' / ');
            showTooltip(event, folder.name, path);
          }}
          onMouseLeave={collapsed ? hideTooltip : undefined}
          className={`group flex items-center gap-1.5 rounded-md border transition-all cursor-pointer ${
            collapsed ? 'justify-center' : ''
          } ${
            selected
              ? 'bg-[var(--neon-glow-color-raw)]/15 border-[var(--neon-glow-border)] text-white'
              : 'border-transparent text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
          } ${dropFolderId === folder.id ? 'ring-1 ring-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/20' : ''} ${
            draggingFolderId === folder.id ? 'opacity-50' : ''
          }`}
          style={{
            paddingLeft: collapsed ? 0 : `${8 + depth * 14}px`,
            paddingRight: collapsed ? 0 : 5,
            paddingTop: density.folderRowPy,
            paddingBottom: density.folderRowPy,
          }}
        >
          {!collapsed && (
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
                <ChevronRight
                  className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
                  style={{ width: density.folderIconPx - 2, height: density.folderIconPx - 2 }}
                />
              )}
            </button>
          )}
          {selected || expanded ? (
            <FolderOpen className="shrink-0" style={{ width: iconPx, height: iconPx, color: folder.color }} />
          ) : (
            <Folder className="shrink-0" style={{ width: iconPx, height: iconPx, color: folder.color }} />
          )}
          {!collapsed && (
            <>
              <span
                className="min-w-0 flex-1 text-left truncate font-sidebar tracking-wide"
                style={{ fontSize: `${density.folderLabelPx}px` }}
              >
                {folder.name}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  hideTooltip();
                  onCreateFolder(folder.id);
                }}
                onMouseEnter={(e) => showTooltip(e, translate('explorer_new_subfolder'))}
                onMouseLeave={hideTooltip}
                className="hidden group-hover:flex w-5 h-5 items-center justify-center text-slate-600 hover:text-[var(--neon-glow-color)] cursor-pointer"
                aria-label={translate('explorer_new_subfolder')}
              >
                <FolderPlus style={{ width: density.folderIconPx - 2, height: density.folderIconPx - 2 }} />
              </button>
            </>
          )}
        </div>
        {!collapsed && expanded && children.map(child => renderFolder(child, depth + 1))}
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

  const railItem = (active: boolean, activeClasses = 'bg-[var(--neon-glow-color-raw)]/15 border-[var(--neon-glow-border)] text-white') =>
    `flex items-center w-full rounded-md border cursor-pointer transition-all bg-transparent ${
      collapsed ? 'justify-center px-0' : 'gap-2 px-2 text-left'
    } ${
      active
        ? activeClasses
        : 'border-transparent text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
    }`;

  return (
    <aside
      data-no-dead-zone
      className={`shrink-0 border-r border-slate-900/80 bg-slate-950/45 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar transition-[width] duration-200 ease-out ${
        collapsed ? 'p-1.5' : 'p-2.5'
      }`}
      style={{ width: collapsed ? COLLAPSED_WIDTH : density.folderWidth }}
    >
      <div className={`flex items-center pb-2 border-b border-slate-900/80 ${collapsed ? 'justify-center' : 'justify-between px-2'}`}>
        {!collapsed && (
          <span
            className="font-sidebar font-bold uppercase tracking-widest text-slate-500"
            style={{ fontSize: `${density.folderHeaderPx}px` }}
          >
            {translate('explorer_folders')}
          </span>
        )}
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              type="button"
              onClick={() => { hideTooltip(); onCreateFolder(null); }}
              onMouseEnter={(e) => showTooltip(e, translate('explorer_new_folder'))}
              onMouseLeave={hideTooltip}
              className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-800 text-slate-500 hover:text-[var(--neon-glow-color)] hover:border-[var(--neon-glow-border)] cursor-pointer"
              aria-label={translate('explorer_new_folder')}
            >
              <FolderPlus style={{ width: density.folderIconPx, height: density.folderIconPx }} />
            </button>
          )}
          <button
            type="button"
            onClick={() => { hideTooltip(); onToggleCollapsed(); }}
            onMouseEnter={(e) => showTooltip(e, translate(collapsed ? 'explorer_expand_sidebar' : 'explorer_collapse_sidebar'))}
            onMouseLeave={hideTooltip}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-800 text-slate-500 hover:text-[var(--neon-glow-color)] hover:border-[var(--neon-glow-border)] cursor-pointer"
            aria-label={translate(collapsed ? 'explorer_expand_sidebar' : 'explorer_collapse_sidebar')}
            aria-expanded={!collapsed}
          >
            {collapsed
              ? <PanelLeftOpen style={{ width: density.folderIconPx, height: density.folderIconPx }} />
              : <PanelLeftClose style={{ width: density.folderIconPx, height: density.folderIconPx }} />}
          </button>
        </div>
      </div>

      <button
        type="button"
        onDragOver={(event) => handleDragOver(event, ROOT_FOLDER_ID)}
        onDragLeave={() => onDropFolderChange(null)}
        onDrop={(event) => {
          onFolderDrop(event, rootFolder);
          onDropFolderChange(null);
        }}
        onMouseEnter={(e) => collapsed && showTooltip(e, translate('explorer_all'))}
        onMouseLeave={collapsed ? hideTooltip : undefined}
        className={`${railItem(activeFolderId === ROOT_FOLDER_ID)} ${
          dropFolderId === ROOT_FOLDER_ID ? 'ring-1 ring-[var(--neon-glow-color)]' : ''
        }`}
        style={{ paddingTop: density.folderRowPy + 2, paddingBottom: density.folderRowPy + 2 }}
        onClick={() => onSelect(ROOT_FOLDER_ID)}
      >
        <Home className="text-slate-500" style={{ width: iconPx, height: iconPx }} />
        {!collapsed && <span className="font-sidebar tracking-wide truncate" style={{ fontSize: `${density.folderLabelPx}px` }}>{translate('explorer_all')}</span>}
      </button>

      <button
        type="button"
        onDragOver={onFavoriteDragOver}
        onDragLeave={onFavoriteDragLeave}
        onDrop={onFavoriteDrop}
        onMouseEnter={(e) => collapsed && showTooltip(e, translate('explorer_favorites'))}
        onMouseLeave={collapsed ? hideTooltip : undefined}
        className={`${railItem(activeFolderId === 'favorites', 'bg-amber-500/10 border-amber-500/30 text-amber-300')} ${
          dropFolderId === 'favorites' ? 'ring-1 ring-amber-400 bg-amber-500/10' : ''
        }`}
        style={{ paddingTop: density.folderRowPy + 2, paddingBottom: density.folderRowPy + 2 }}
        onClick={() => onSelect('favorites')}
      >
        <Star className="text-amber-400" style={{ width: iconPx, height: iconPx }} />
        {!collapsed && <span className="font-sidebar tracking-wide truncate" style={{ fontSize: `${density.folderLabelPx}px` }}>{translate('explorer_favorites')}</span>}
      </button>

      <button
        type="button"
        onMouseEnter={(e) => collapsed && showTooltip(e, translate('explorer_vault'))}
        onMouseLeave={collapsed ? hideTooltip : undefined}
        className={railItem(activeFolderId === 'vault', 'bg-purple-500/10 border-purple-500/30 text-purple-300')}
        style={{ paddingTop: density.folderRowPy + 2, paddingBottom: density.folderRowPy + 2 }}
        onClick={() => onSelect('vault')}
      >
        <Shield className="text-purple-400" style={{ width: iconPx, height: iconPx }} />
        {!collapsed && <span className="font-sidebar tracking-wide truncate" style={{ fontSize: `${density.folderLabelPx}px` }}>{translate('explorer_vault')}</span>}
      </button>

      <div className="border-t border-slate-900/80 my-1" />
      {(childrenByParent.get(null) || []).map(folder => renderFolder(folder, 0))}
      {(childrenByParent.get(null) || []).length === 0 && !collapsed && (
        <p className="px-2 py-3 text-slate-600 font-mono" style={{ fontSize: `${density.folderHeaderPx}px` }}>{translate('explorer_no_folders')}</p>
      )}
    </aside>
  );
}
