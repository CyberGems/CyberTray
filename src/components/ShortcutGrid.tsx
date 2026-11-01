import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronRight, Clock, Edit, Folder, ListFilter, Lock, Plus, Search, Star } from 'lucide-react';
import { translate } from '../locales';
import { shortcutIconSrc } from '../lib/iconSrc';
import MarqueeText from './MarqueeText';
import ShortcutGlyph from './ShortcutGlyph';
import {
  densityFromIconSize,
  getChildFolders,
  getFolderPath,
  ROOT_FOLDER_ID,
  UNCATEGORIZED_ID,
  type CyberFolder,
} from '../lib/appUtils';
import { SHORTCUT_KIND_LABEL_KEYS, isStoreAppId, type ShortcutKindFilter } from '../lib/shortcutKind';
import VaultPanel from './VaultPanel';

type ShowTooltipFn = (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;

type ShortcutRow =
  | { kind: 'header'; key: string; letter: string }
  | { kind: 'folders'; key: string; folders: CyberFolder[] }
  | { kind: 'items'; key: string; items: { item: any; index: number }[] };

const ROW_GAP = 16;

const alphaLabel = (item: any) => {
  const firstLetter = item.name.charAt(0).toUpperCase();
  return firstLetter.match(/[A-Z0-9]/i) ? firstLetter : '#';
};

interface ShortcutGridProps {
  gridScrollRef: React.RefObject<HTMLElement | null>;
  selectionMode: boolean;
  lassoRect: { x: number; y: number; w: number; h: number } | null;
  filteredShortcutsList: any[];
  searchQuery: string;
  viewMode: 'grid' | 'list';
  iconSortOrder: 'alpha' | 'recent' | 'added';
  config: any;
  categories: any[];
  activeCategory: string;
  selectedIds: Set<number>;
  showVaultHelp: boolean;
  setShowVaultHelp: (v: boolean) => void;
  handleLassoMouseDown: (e: React.MouseEvent) => void;
  handleLassoMouseMove: (e: React.MouseEvent) => void;
  handleLassoMouseUp: () => void;
  handleItemSelect: (item: any, index: number, e: React.MouseEvent) => void;
  handleLaunch: (item: any) => void;
  handleShortcutContextMenu: (e: React.MouseEvent, item: any) => void;
  handleShortcutDragStart: (e: React.DragEvent, item: any) => void;
  handleOpenEditModal: (item: any, e: React.MouseEvent) => void;
  handleDeleteShortcut: (id: number) => void;
  handleUpdateConfigSetting: (key: string, value: any) => void;
  playFolderSound: () => void;
  playCyberBeep: () => void;
  showTooltip: ShowTooltipFn;
  hideTooltip: () => void;
  /** Accesos que existen pero están ocultos porque la bóveda está bloqueada. */
  hiddenVaultCount?: number;
  onOpenVault?: () => void;
  /** Tipo activo en el filtro, para explicar una lista vacía. */
  kindFilter?: ShortcutKindFilter;
  onClearKindFilter?: () => void;
  /** Accesos por carpeta, para el subtítulo de las tarjetas de subcarpeta. */
  folderShortcutCounts?: Map<string, number>;
  onOpenFolder?: (folderId: string) => void;
  onFolderContextMenu?: (e: React.MouseEvent, folder: CyberFolder) => void;
  onFolderDragStart?: (e: React.DragEvent, folder: CyberFolder) => void;
  onFolderDragEnd?: () => void;
  onFolderDrop?: (e: React.DragEvent, folder: CyberFolder) => void;
  draggingFolderId?: string | null;
  dropFolderId?: string | null;
  onDropFolderChange?: (folderId: string | null) => void;
  /** Abre el diálogo de alta desde la vista vacía. */
  onCreateShortcut?: () => void;
}

export default function ShortcutGrid(props: ShortcutGridProps) {
  const {
    gridScrollRef,
    selectionMode,
    lassoRect,
    filteredShortcutsList,
    searchQuery,
    viewMode,
    iconSortOrder,
    config,
    categories,
    activeCategory,
    selectedIds,
    showVaultHelp,
    setShowVaultHelp,
    handleLassoMouseDown,
    handleLassoMouseMove,
    handleLassoMouseUp,
    handleItemSelect,
    handleLaunch,
    handleShortcutContextMenu,
    handleShortcutDragStart,
    handleOpenEditModal,
    handleDeleteShortcut,
    handleUpdateConfigSetting,
    playFolderSound,
    playCyberBeep,
    showTooltip,
    hideTooltip,
    hiddenVaultCount = 0,
    onOpenVault,
    kindFilter = 'all',
    onClearKindFilter,
    folderShortcutCounts,
    onOpenFolder,
    onFolderContextMenu,
    onFolderDragStart,
    onFolderDragEnd,
    onFolderDrop,
    draggingFolderId = null,
    dropFolderId = null,
    onDropFolderChange,
    onCreateShortcut,
  } = props;

  const density = densityFromIconSize(config.iconSize);

  // ── Navegación por teclado ──
  // La rejilla se puede recorrer entera con el teclado: flechas para moverse,
  // Intro para lanzar, Supr para borrar y escritura directa para buscar por
  // nombre. El foco se gestiona con un único elemento activo (roving tabindex).
  const [activeId, setActiveId] = useState<number | null>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const typeaheadRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const pendingFocusRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(0);

  const registerItem = useCallback((id: number, node: HTMLElement | null) => {
    if (node) itemRefs.current.set(id, node);
    else itemRefs.current.delete(id);
  }, []);

  const minColumnWidth = viewMode === 'list' ? 280 : config.iconSize * 2.8;
  const columnCount = Math.max(1, Math.floor((gridWidth + ROW_GAP) / (minColumnWidth + ROW_GAP)));
  const gridTemplateColumns = `repeat(${columnCount}, minmax(${minColumnWidth}px, 1fr))`;

  // ── Subcarpetas como primeras tarjetas ──
  // Dentro de una carpeta real, sus hijas se dibujan antes que los accesos,
  // como en el Explorador. "Todos", Favoritos y la bóveda son vistas, no
  // carpetas: ahí no se dibuja ninguna (sus raíces ya viven en la barra).
  const isRealFolder = activeCategory !== ROOT_FOLDER_ID
    && activeCategory !== 'favorites'
    && activeCategory !== 'vault'
    && activeCategory !== UNCATEGORIZED_ID;

  const folderTiles = useMemo<CyberFolder[]>(() => {
    // Con un filtro de tipo activo la lista es una selección de accesos: las
    // carpetas estorbarían en vez de orientar.
    if (!isRealFolder || kindFilter !== 'all') return [];
    const children = getChildFolders(categories as CyberFolder[], activeCategory);
    const query = searchQuery.trim().toLowerCase();
    if (!query) return children;
    return children.filter(folder => folder.name.toLowerCase().includes(query));
  }, [categories, activeCategory, isRealFolder, kindFilter, searchQuery]);

  // Foco propio para la franja de carpetas: un único punto de tabulación que
  // se recorre con las flechas y que cede el paso a la rejilla al terminarse.
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const folderRefs = useRef<Map<string, HTMLElement>>(new Map());

  const focusFolder = (folder: CyberFolder | undefined) => {
    if (!folder) return;
    setActiveFolderId(folder.id);
    folderRefs.current.get(folder.id)?.focus();
  };

  const registerFolder = (folderId: string, node: HTMLElement | null) => {
    if (node) folderRefs.current.set(folderId, node);
    else folderRefs.current.delete(folderId);
  };

  // Al cambiar de carpeta la franja entera se sustituye: soltar el foco evita
  // quedarse sin ningún punto de tabulación dentro de la nueva lista.
  useEffect(() => {
    if (activeFolderId && !folderTiles.some(folder => folder.id === activeFolderId)) {
      setActiveFolderId(null);
    }
  }, [folderTiles, activeFolderId]);

  /**
   * Lo que se enseña bajo el nombre. Un AUMID (`Familia_editor!App`) no es una
   * ruta: no informa de nada y parece un error. Las apps de Store muestran su
   * origen, con una etiqueta corta porque la columna de la rejilla no da para
   * más; el identificador sigue a mano en el diálogo de edición.
   */
  const displayTarget = (shortcut: any): string =>
    isStoreAppId(shortcut?.path) ? translate('store_app_short') : String(shortcut?.path || '');

  /** En el tooltip sí cabe la explicación completa. */
  const tooltipTarget = (shortcut: any): string =>
    isStoreAppId(shortcut?.path) ? translate('store_app_location') : String(shortcut?.path || '');

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateWidth = () => setGridWidth(grid.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      setGridWidth(entries[0].contentRect.width);
    });
    observer.observe(grid);
    return () => observer.disconnect();
  }, [filteredShortcutsList.length]);

  const rows = useMemo<ShortcutRow[]>(() => {
    const result: ShortcutRow[] = [];

    // Las subcarpetas abren la lista, en filas del mismo ancho que la rejilla.
    for (let i = 0; i < folderTiles.length; i += columnCount) {
      result.push({
        kind: 'folders',
        key: `folders-${i}`,
        folders: folderTiles.slice(i, i + columnCount),
      });
    }

    let pendingItems: { item: any; index: number }[] = [];

    const flushItems = () => {
      if (pendingItems.length === 0) return;
      result.push({
        kind: 'items',
        key: `items-${pendingItems.map(({ item }) => item.id).join('-')}`,
        items: pendingItems,
      });
      pendingItems = [];
    };

    filteredShortcutsList.forEach((item, index) => {
      if (viewMode === 'list' && iconSortOrder === 'alpha') {
        const letter = alphaLabel(item);
        const previous = index > 0 ? filteredShortcutsList[index - 1] : null;
        if (!previous || letter !== alphaLabel(previous)) {
          flushItems();
          result.push({ kind: 'header', key: `header-list-${letter}`, letter });
        }
      }

      pendingItems.push({ item, index });
      if (pendingItems.length === columnCount) flushItems();
    });
    flushItems();
    return result;
  }, [filteredShortcutsList, folderTiles, viewMode, iconSortOrder, columnCount]);

  const rowIndexByItemId = useMemo(() => {
    const indexes = new Map<number, number>();
    rows.forEach((row, rowIndex) => {
      if (row.kind === 'items') {
        row.items.forEach(({ item }) => indexes.set(item.id, rowIndex));
      }
    });
    return indexes;
  }, [rows]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => gridScrollRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (row.kind === 'header') return 64;
      if (row.kind === 'folders') return viewMode === 'list' ? 76 : config.iconSize + 28;
      return viewMode === 'list' ? 76 : config.iconSize + 76;
    },
    getItemKey: (index) => rows[index].key,
    overscan: 8,
    enabled: !selectionMode,
  });

  const focusMountedItem = useCallback((id: number) => {
    const node = itemRefs.current.get(id);
    if (!node) return false;
    node.focus();
    node.scrollIntoView({ block: 'nearest' });
    pendingFocusRef.current = null;
    return true;
  }, []);

  // El destino puede montarse después de que scrollToIndex actualice el rango.
  useEffect(() => {
    if (pendingFocusRef.current !== null) focusMountedItem(pendingFocusRef.current);
  });

  // Si el elemento activo deja de estar visible, se suelta el foco.
  useEffect(() => {
    if (activeId === null) return;
    if (!filteredShortcutsList.some((item: any) => item.id === activeId)) {
      pendingFocusRef.current = null;
      setActiveId(null);
    }
  }, [filteredShortcutsList, activeId]);

  const focusItem = useCallback((item: any) => {
    if (!item) return;
    setActiveId(item.id);
    if (!selectionMode) {
      pendingFocusRef.current = item.id;
      const rowIndex = rowIndexByItemId.get(item.id);
      if (rowIndex !== undefined) rowVirtualizer.scrollToIndex(rowIndex, { align: 'auto' });
    }
    focusMountedItem(item.id);
  }, [selectionMode, rowIndexByItemId, rowVirtualizer, focusMountedItem]);

  // Roving tabindex: solo un elemento es alcanzable con Tab, el resto se
  // recorre con las flechas. Si no hay ninguno activo, lo es el primero.
  const isTabbable = useCallback((item: any, index: number) => {
    if (activeId !== null) return item.id === activeId;
    return index === 0;
  }, [activeId]);

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = filteredShortcutsList;
    if (!items || items.length === 0) return;

    const currentIndex = activeId !== null ? items.findIndex((item: any) => item.id === activeId) : -1;

    // Escritura directa: salta al primer acceso que empiece por lo tecleado.
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== ' ') {
      const now = Date.now();
      const state = typeaheadRef.current;
      const text = now - state.at > 800 ? e.key : state.text + e.key;
      typeaheadRef.current = { text, at: now };
      const match = items.find((item: any) =>
        String(item.name || '').toLowerCase().startsWith(text.toLowerCase())
      );
      if (match) {
        e.preventDefault();
        focusItem(match);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowLeft':
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? columnCount : -columnCount;
        const nextIndex = currentIndex < 0
          ? (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? items.length - 1 : 0)
          : Math.max(0, Math.min(items.length - 1, currentIndex + step));
        focusItem(items[nextIndex]);
        return;
      }
      case 'Home': {
        e.preventDefault();
        focusItem(items[0]);
        return;
      }
      case 'End': {
        e.preventDefault();
        focusItem(items[items.length - 1]);
        return;
      }
      case 'Enter':
      case ' ': {
        if (currentIndex < 0) return;
        e.preventDefault();
        const item = items[currentIndex];
        if (selectionMode) handleItemSelect(item, currentIndex, e as unknown as React.MouseEvent);
        else handleLaunch(item);
        return;
      }
      case 'Delete':
      case 'Backspace': {
        if (currentIndex < 0 || selectionMode) return;
        e.preventDefault();
        handleDeleteShortcut(items[currentIndex].id);
        return;
      }
      default:
        return;
    }
  };

  const renderAlphaHeader = (letter: string) => (
    <div
      key={`header-list-${letter}`}
      className="col-span-full mt-4 mb-2 flex items-center gap-3 opacity-60 text-left select-none"
      style={{ gridColumn: '1 / -1' }}
    >
      <span className="text-[13px] font-cyber font-bold text-slate-400 w-6 pl-1 tracking-wider">{letter}</span>
      <div className="h-px bg-gradient-to-r from-slate-700/40 via-slate-800/10 to-transparent flex-1" />
    </div>
  );

  /** "12 accesos · 3 subcarpetas": lo que el Explorador resuelve en columnas. */
  const folderSubtitle = (folder: CyberFolder): string => {
    const shortcutCount = folderShortcutCounts?.get(folder.id) || 0;
    const childCount = categories.filter((candidate: any) => candidate.parentId === folder.id).length;
    if (shortcutCount === 0 && childCount === 0) return translate('explorer_folder_empty');

    const parts: string[] = [];
    if (shortcutCount > 0) {
      parts.push(translate(
        shortcutCount === 1 ? 'explorer_folder_items_one' : 'explorer_folder_items_many',
        { count: String(shortcutCount) },
      ));
    }
    if (childCount > 0) {
      parts.push(translate(
        childCount === 1 ? 'explorer_folder_children_one' : 'explorer_folder_children_many',
        { count: String(childCount) },
      ));
    }
    return parts.join(' · ');
  };

  const renderFolderTile = (folder: CyberFolder, index: number) => {
    const isSmallGrid = config.iconSize < 48;
    const subtitle = folderSubtitle(folder);
    const isDropTarget = dropFolderId === folder.id;
    const isDragging = draggingFolderId === folder.id;
    const tabbable = activeFolderId !== null ? activeFolderId === folder.id : index === 0;

    const open = () => {
      if (selectionMode) return;
      hideTooltip();
      onOpenFolder?.(folder.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        open();
        return;
      }

      const step = e.key === 'ArrowRight' ? 1
        : e.key === 'ArrowLeft' ? -1
          : e.key === 'ArrowDown' ? columnCount
            : e.key === 'ArrowUp' ? -columnCount
              : e.key === 'Home' ? -folderTiles.length
                : e.key === 'End' ? folderTiles.length
                  : 0;
      if (step === 0) return;

      const target = e.key === 'Home' ? 0 : e.key === 'End' ? folderTiles.length - 1 : index + step;
      // Al agotarse la franja, las flechas siguen su curso natural hacia los
      // accesos: la rejilla recibe la tecla y enfoca el primero o el último.
      if (target < 0 || target >= folderTiles.length || target === index) return;
      e.preventDefault();
      e.stopPropagation();
      focusFolder(folderTiles[target]);
    };

    const dragProps = {
      draggable: !selectionMode,
      onDragStart: (e: React.DragEvent) => onFolderDragStart?.(e, folder),
      onDragEnd: () => onFolderDragEnd?.(),
      onDragOver: (e: React.DragEvent) => {
        if (selectionMode) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        onDropFolderChange?.(folder.id);
      },
      onDragLeave: () => onDropFolderChange?.(null),
      onDrop: (e: React.DragEvent) => {
        if (selectionMode) return;
        onFolderDrop?.(e, folder);
        onDropFolderChange?.(null);
      },
    };

    const sharedProps = {
      role: 'button' as const,
      tabIndex: selectionMode ? -1 : tabbable ? 0 : -1,
      'aria-label': `${translate('explorer_open_folder')}: ${folder.name}`,
      onFocus: () => setActiveFolderId(folder.id),
      onClick: open,
      onKeyDown: handleKeyDown,
      onContextMenu: (e: React.MouseEvent) => {
        if (selectionMode) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onFolderContextMenu?.(e, folder);
      },
      onMouseEnter: (e: React.MouseEvent) => {
        const path = getFolderPath(categories as CyberFolder[], folder.id).map(step => step.name).join(' / ');
        showTooltip(e, folder.name, path);
      },
      onMouseLeave: hideTooltip,
      ...dragProps,
    };

    const stateClasses = `${isDropTarget ? 'border-[var(--neon-glow-color)] ring-1 ring-[var(--neon-glow-color)]' : 'border-white/5'} ${
      isDragging ? 'opacity-40' : ''
    } ${selectionMode ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-white/[0.07] hover:border-white/25 hover:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.98]'}`;

    const iconBox = (size: number) => (
      <div
        className="flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden border transition-colors duration-150"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: `${folder.color}14`,
          borderColor: isDropTarget ? undefined : `${folder.color}38`,
        }}
      >
        <Folder
          className="transition-transform duration-150 group-hover:scale-105"
          style={{ width: '56%', height: '56%', color: folder.color }}
          strokeWidth={1.7}
        />
      </div>
    );

    if (viewMode === 'list') {
      return (
        <div
          key={folder.id}
          {...sharedProps}
          ref={(node) => registerFolder(folder.id, node)}
          className={`rounded-xl p-2.5 flex items-center justify-between gap-3 relative group bg-black/20 backdrop-blur-xl border shadow-lg shadow-black/30 transition-[transform,border-color,background-color,box-shadow] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-glow-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${stateClasses}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {iconBox(density.listIconPx)}
            <div className="min-w-0 flex-1 text-left">
              <h4
                className="font-ui font-bold text-white truncate tracking-wide group-hover:text-[var(--neon-glow-color)]"
                style={{ fontSize: `${density.titlePx}px` }}
              >
                {folder.name}
              </h4>
              <MarqueeText
                className="font-sans tracking-tight w-full text-slate-500"
                style={{ fontSize: `${density.pathPx}px` }}
                text={subtitle}
              />
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[var(--neon-glow-color)] transition-colors shrink-0" />
        </div>
      );
    }

    return (
      <div
        key={folder.id}
        {...sharedProps}
        ref={(node) => registerFolder(folder.id, node)}
        className={`rounded-2xl relative group bg-black/20 backdrop-blur-xl border shadow-xl shadow-black/30 transition-[transform,border-color,background-color,box-shadow] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-glow-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${stateClasses} ${
          isSmallGrid
            ? 'p-2 flex flex-col items-center justify-center gap-1.5 text-center'
            : 'p-3 flex items-center gap-3.5 text-left'
        }`}
      >
        {iconBox(config.iconSize)}
        <div className={`min-w-0 ${isSmallGrid ? 'w-full text-center flex flex-col items-center' : 'flex-1 text-left'}`}>
          <h4
            className="font-ui font-bold text-white truncate tracking-wide group-hover:text-[var(--neon-glow-color)]"
            style={{ fontSize: `${density.titlePx}px`, width: '100%' }}
          >
            {folder.name}
          </h4>
          <p
            className="font-sans tracking-tight text-slate-500 truncate"
            style={{ fontSize: `${density.pathPx}px`, width: '100%' }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    );
  };

  const renderShortcut = (item: any, index: number) => {
    if (viewMode === 'list') {
      return (
        <div
          key={item.id}
          data-shortcut-id={item.id}
          ref={(node) => registerItem(item.id, node)}
          role="button"
          tabIndex={isTabbable(item, index) ? 0 : -1}
          aria-label={item.name}
          onFocus={() => setActiveId(item.id)}
          onClick={(e) => selectionMode ? handleItemSelect(item, index, e) : handleLaunch(item)}
          onContextMenu={(e) => {
            if (selectionMode) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            handleShortcutContextMenu(e, item);
          }}
          draggable={!selectionMode}
          onDragStart={(e) => handleShortcutDragStart(e, item)}
          onMouseEnter={(e) => showTooltip(e, item.name, tooltipTarget(item))}
          onMouseLeave={hideTooltip}
          className={`rounded-xl p-2.5 flex items-center justify-between gap-3 cursor-pointer relative group bg-black/20 backdrop-blur-xl border shadow-lg shadow-black/30 transition-[transform,border-color,background-color,box-shadow] duration-150 ease-out hover:bg-white/[0.07] hover:border-white/25 hover:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:scale-[1.005] active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-glow-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            selectedIds.has(item.id)
              ? 'border-[var(--neon-glow-color)] ring-1 ring-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10'
              : 'border-white/5'
          }`}
        >
          {selectionMode && (
            <span
              className={`absolute -top-1.5 -left-1.5 z-20 w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                selectedIds.has(item.id)
                  ? 'bg-[var(--neon-glow-color)] border-[var(--neon-glow-color)] text-slate-950'
                  : 'bg-slate-950/90 border-slate-600 text-transparent'
              }`}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
            </span>
          )}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="flex-shrink-0 bg-black/30 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden transition-colors duration-150 group-hover:border-white/25"
              style={{ width: `${density.listIconPx}px`, height: `${density.listIconPx}px` }}
            >
              {item.iconPath ? (
                <img src={shortcutIconSrc(item.iconPath)} alt={item.name} className="w-[85%] h-[85%] object-contain" />
              ) : (
                <ShortcutGlyph className="w-[58%] h-[58%] text-[var(--neon-glow-color)] opacity-90 transition-opacity group-hover:opacity-100" />
              )}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <h4
                className="font-ui font-bold text-white truncate tracking-wide group-hover:text-[var(--neon-glow-color)] flex items-center gap-1"
                style={{ fontSize: `${density.titlePx}px` }}
              >
                <span className="truncate">{item.name}</span>
              </h4>
              <MarqueeText
                className={`font-sans tracking-tight w-full ${item.category === 'vault' ? 'text-purple-400/80' : 'text-slate-500'}`}
                style={{ fontSize: `${density.pathPx}px` }}
                text={item.category === 'vault' ? translate('vault_real_path', { path: displayTarget(item) }) : displayTarget(item)}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 z-10">
            {activeCategory === 'all' && (() => {
              const catObj = categories.find((c: any) => c.id === item.category);
              if (!catObj) return null;
              return (
                <span
                  className="text-[8px] font-cyber font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider select-none mr-1"
                  style={{
                    backgroundColor: `${catObj.color}15`,
                    borderColor: `${catObj.color}40`,
                    color: catObj.color,
                  }}
                >
                  {catObj.name}
                </span>
              );
            })()}
            {item.isFavorite && (
              <span
                className="text-[10px] text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]"
                onMouseEnter={(e) => showTooltip(e, translate('favorite_badge'))}
                onMouseLeave={hideTooltip}
              >★</span>
            )}
            {item.isAdmin && (
              <span
                className="text-[7.5px] font-ui font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1 py-0.2 rounded"
                onMouseEnter={(e) => showTooltip(e, translate('shortcut_run_admin'))}
                onMouseLeave={hideTooltip}
              >
                {translate('shortcut_admin_tag')}
              </span>
            )}
            {item.delay > 0 && (
              <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 px-1 py-0.2 rounded flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {item.delay}s
              </span>
            )}

            {!selectionMode && (
            <button
              onClick={(e) => handleOpenEditModal(item, e)}
              onMouseEnter={(e) => showTooltip(e, translate('edit_launch_config'))}
              onMouseLeave={hideTooltip}
              className="opacity-0 group-hover:opacity-100 rounded border border-slate-700 hover:border-[var(--neon-glow-color)] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer h-5 w-5 p-0"
            >
              <Edit className="w-2.5 h-2.5" />
            </button>
            )}
          </div>
        </div>
      );
    }

    const isSmallGrid = config.iconSize < 48;
    return (
      <div
        key={item.id}
        data-shortcut-id={item.id}
        ref={(node) => registerItem(item.id, node)}
        role="button"
        tabIndex={isTabbable(item, index) ? 0 : -1}
        aria-label={item.name}
        onFocus={() => setActiveId(item.id)}
        onClick={(e) => selectionMode ? handleItemSelect(item, index, e) : handleLaunch(item)}
        onContextMenu={(e) => {
          if (selectionMode) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          handleShortcutContextMenu(e, item);
        }}
        draggable={!selectionMode}
        onDragStart={(e) => handleShortcutDragStart(e, item)}
        onMouseEnter={(e) => showTooltip(e, item.name, tooltipTarget(item))}
        onMouseLeave={hideTooltip}
        className={`rounded-2xl cursor-pointer relative group bg-black/20 backdrop-blur-xl border shadow-xl shadow-black/30 transition-[transform,border-color,background-color,box-shadow] duration-150 ease-out hover:bg-white/[0.07] hover:border-white/25 hover:shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-glow-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          selectedIds.has(item.id)
            ? 'border-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10 ring-1 ring-[var(--neon-glow-color)]'
            : 'border-white/5'
        } ${
          isSmallGrid
            ? 'p-2 flex flex-col items-center justify-center gap-1.5 text-center'
            : 'p-3 flex items-center gap-3.5 text-left'
        }`}
      >
        {selectionMode && (
          <span
            className={`absolute top-1 left-1 z-20 w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
              selectedIds.has(item.id)
                ? 'bg-[var(--neon-glow-color)] border-[var(--neon-glow-color)] text-slate-950'
                : 'bg-slate-950/90 border-slate-600 text-transparent'
            }`}
          >
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          </span>
        )}
        <div
          className="flex-shrink-0 bg-black/30 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden transition-colors duration-150 group-hover:border-white/25 relative"
          style={{ width: `${config.iconSize}px`, height: `${config.iconSize}px` }}
        >
          {item.iconPath ? (
            <img src={shortcutIconSrc(item.iconPath)} alt={item.name} className="w-[85%] h-[85%] object-contain" />
          ) : (
            <ShortcutGlyph className="w-[58%] h-[58%] text-[var(--neon-glow-color)] opacity-90 transition-opacity group-hover:opacity-100" />
          )}

          {item.isFavorite && isSmallGrid && (
            <span
              className="absolute -top-0.5 -right-0.5 text-[8px] text-amber-400 bg-slate-950/90 border border-amber-500/30 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-[0_0_4px_rgba(251,191,36,0.5)] z-10 font-sans"
              onMouseEnter={(e) => showTooltip(e, translate('favorite_badge'))}
              onMouseLeave={hideTooltip}
            >
              ★
            </span>
          )}
        </div>

        <div className={`min-w-0 ${isSmallGrid ? 'w-full text-center flex flex-col items-center' : 'flex-1 text-left'}`}>
          <h4
            className="font-ui font-bold text-white truncate tracking-wide group-hover:text-[var(--neon-glow-color)] flex items-center gap-1"
            style={{
              fontSize: `${density.titlePx}px`,
              justifyContent: isSmallGrid ? 'center' : 'flex-start',
              width: '100%'
            }}
          >
            <span className="truncate">{item.name}</span>
          </h4>

          {!isSmallGrid && (
            <MarqueeText
              className={`font-sans tracking-tight w-full ${item.category === 'vault' ? 'text-purple-400/80' : 'text-slate-500'}`}
              style={{ fontSize: `${density.pathPx}px` }}
              text={item.category === 'vault' ? translate('vault_real_path', { path: displayTarget(item) }) : displayTarget(item)}
            />
          )}

          {(!isSmallGrid || (activeCategory === 'all')) && (
            <div className={`flex items-center gap-1.5 mt-0.5 flex-wrap ${isSmallGrid ? 'justify-center' : 'justify-start'}`}>
              {activeCategory === 'all' && (() => {
                const catObj = categories.find((c: any) => c.id === item.category);
                if (!catObj) return null;
                return (
                  <span
                    className="text-[7.5px] font-cyber font-bold px-1.2 py-0.3 rounded border uppercase tracking-wider select-none animate-fade-in"
                    style={{
                      backgroundColor: `${catObj.color}12`,
                      borderColor: `${catObj.color}30`,
                      color: catObj.color,
                      fontSize: isSmallGrid ? '6.5px' : '7.5px'
                    }}
                  >
                    {catObj.name}
                  </span>
                );
              })()}
              {item.isAdmin && !isSmallGrid && (
                <span
                  className="text-[7.5px] font-ui font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1 py-0.2 rounded"
                  onMouseEnter={(e) => showTooltip(e, translate('shortcut_run_admin'))}
                  onMouseLeave={hideTooltip}
                >
                  {translate('shortcut_admin_tag')}
                </span>
              )}
              {item.delay > 0 && !isSmallGrid && (
                <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 px-1 py-0.2 rounded flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {item.delay}s
                </span>
              )}
              {item.usageCount > 0 && !isSmallGrid && (
                <span className="text-[8px] font-ui tracking-wide text-slate-500/75 whitespace-nowrap">
                  {translate(
                    item.usageCount === 1 ? 'launch_count_one' : 'launch_count_many',
                    { count: String(item.usageCount) }
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {item.isFavorite && !isSmallGrid && (
          <span
            className="absolute right-2 top-2 text-[10px] text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)] z-10"
            onMouseEnter={(e) => showTooltip(e, translate('favorite_badge'))}
            onMouseLeave={hideTooltip}
          >
            ★
          </span>
        )}

        {!selectionMode && (
        <button
          onClick={(e) => handleOpenEditModal(item, e)}
          onMouseEnter={(e) => showTooltip(e, translate('edit_launch_config'))}
          onMouseLeave={hideTooltip}
          className="absolute opacity-0 group-hover:opacity-100 rounded border border-slate-700 hover:border-[var(--neon-glow-color)] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            width: isSmallGrid ? '18px' : '24px',
            height: isSmallGrid ? '18px' : '24px',
            right: isSmallGrid ? '4px' : '8px',
            top: isSmallGrid ? '4px' : '8px',
            padding: 0
          }}
        >
          <Edit style={{ width: isSmallGrid ? '10px' : '13px', height: isSmallGrid ? '10px' : '13px' }} />
        </button>
        )}
      </div>
    );
  };

  /** Mensajes y acciones sobre el fondo, sin un panel adicional. */
  const renderEmptyState = () => {
    const frame = (content: {
      icon: React.ReactNode;
      title: string;
      body: string;
      action?: React.ReactNode;
    }) => (
      <div className="flex h-full w-full flex-col items-center justify-center px-4 py-8 text-center">
        <div className="flex w-full max-w-sm flex-col items-center">
          <div aria-hidden="true" className="mb-4 text-slate-500">
            {content.icon}
          </div>
          <h3 className="font-ui text-[15px] font-medium text-slate-200">
            {content.title}
          </h3>
          <p className="mt-2 max-w-[340px] font-sans text-[12px] leading-relaxed text-slate-400 break-words">
            {content.body}
          </p>
          {content.action}
        </div>
      </div>
    );

    if (searchQuery.trim() !== '') {
      return frame({
        icon: <Search className="w-11 h-11" strokeWidth={1.5} />,
        title: translate('empty_search_title'),
        body: translate('empty_search_hint', { query: searchQuery }),
      });
    }

    if (kindFilter !== 'all') {
      return frame({
        icon: <ListFilter className="w-11 h-11" strokeWidth={1.5} />,
        title: translate('empty_filter_title'),
        body: translate('filter_type_empty', {
          kind: translate(SHORTCUT_KIND_LABEL_KEYS[kindFilter] as any).toLowerCase(),
        }),
        action: onClearKindFilter ? (
          <button
            type="button"
            onClick={onClearKindFilter}
            className="mt-3 rounded-lg border border-[var(--neon-glow-border)] bg-[var(--neon-glow-color-raw)] px-4 py-1.5 font-cyber text-[10px] font-bold uppercase tracking-widest text-[var(--neon-glow-color)] transition-colors cursor-pointer hover:bg-[var(--neon-glow-color)] hover:text-slate-950"
          >
            {translate('filter_type_show_all')}
          </button>
        ) : undefined,
      });
    }

    if (hiddenVaultCount > 0 && activeCategory === 'all' && onOpenVault) {
      return frame({
        icon: <Lock className="w-11 h-11 text-purple-400" strokeWidth={1.5} />,
        title: translate('empty_vault_title'),
        body: translate('shortcut_hidden_in_vault', { count: String(hiddenVaultCount) }),
        action: (
          <button
            type="button"
            onClick={onOpenVault}
            className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 font-cyber text-[10px] font-bold uppercase tracking-widest text-purple-200 transition-colors cursor-pointer hover:bg-purple-500/20"
          >
            {translate('explorer_vault')}
          </button>
        ),
      });
    }

    if (activeCategory === 'favorites') {
      return frame({
        icon: <Star className="h-11 w-11" strokeWidth={1.25} />,
        title: translate('empty_favorites_title'),
        body: translate('empty_favorites_hint'),
      });
    }

    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-4 py-8 text-center">
        <button
          type="button"
          onClick={onCreateShortcut}
          disabled={!onCreateShortcut}
          className="group flex max-w-full cursor-pointer flex-col items-center gap-3 rounded-2xl px-8 py-5 text-slate-300 transition-colors hover:text-white disabled:cursor-default"
        >
          <Plus
            aria-hidden="true"
            className="h-16 w-16 text-[var(--neon-glow-color)] transition-[transform,filter] duration-200 group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_var(--neon-glow-color-raw)] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            strokeWidth={1.25}
          />
          <span className="font-ui text-[16px] font-medium tracking-wide">
            {translate('app_add_submit')}
          </span>
        </button>
        <p className="mt-1 max-w-xs font-sans text-[12px] leading-relaxed text-slate-400">
          {translate('empty_folder_hint')}
        </p>
      </div>
    );
  };

  return (
    <main
      ref={gridScrollRef}
      className={`flex-1 min-h-0 overflow-y-auto px-8 py-6 custom-scrollbar relative ${selectionMode ? 'select-none' : ''}`}
      onMouseDown={handleLassoMouseDown}
      onMouseMove={handleLassoMouseMove}
      onMouseUp={handleLassoMouseUp}
      onMouseLeave={handleLassoMouseUp}
    >
      {lassoRect && (
        <div
          className="absolute z-30 pointer-events-none rounded-sm border border-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10"
          style={{ left: lassoRect.x, top: lassoRect.y, width: lassoRect.w, height: lassoRect.h }}
        />
      )}

      {filteredShortcutsList.length === 0 && folderTiles.length === 0 ? (
        renderEmptyState()
      ) : (
        <div
          ref={gridRef}
          role="group"
          aria-label={translate('shortcut_grid_label')}
          tabIndex={-1}
          onKeyDown={handleGridKeyDown}
          className={selectionMode ? 'grid gap-4 transition-all focus:outline-none' : 'relative transition-all focus:outline-none'}
          style={selectionMode ? {
            gridTemplateColumns: viewMode === 'list'
              ? 'repeat(auto-fill, minmax(280px, 1fr))'
              : `repeat(auto-fill, minmax(${config.iconSize * 2.8}px, 1fr))`
          } : {
            height: rowVirtualizer.getTotalSize(),
          }}
        >
          {selectionMode ? (
            <>
              {folderTiles.map((folder, index) => renderFolderTile(folder, index))}
              {filteredShortcutsList.flatMap((item, index) => {
                const elements: React.ReactNode[] = [];
                if (viewMode === 'list' && iconSortOrder === 'alpha') {
                  const letter = alphaLabel(item);
                  const previous = index > 0 ? filteredShortcutsList[index - 1] : null;
                  if (!previous || letter !== alphaLabel(previous)) elements.push(renderAlphaHeader(letter));
                }
                elements.push(renderShortcut(item, index));
                return elements;
              })}
            </>
          ) : rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute top-0 left-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: virtualRow.index === rows.length - 1 ? 0 : ROW_GAP,
                }}
              >
                {row.kind === 'header' ? renderAlphaHeader(row.letter) : row.kind === 'folders' ? (
                  <div className="grid gap-4" style={{ gridTemplateColumns }}>
                    {/* El índice de teclado es el global: con varias filas de
                        carpetas el recorrido no puede reiniciarse en cada una. */}
                    {row.folders.map((folder) => renderFolderTile(folder, folderTiles.indexOf(folder)))}
                  </div>
                ) : (
                  <div className="grid gap-4" style={{ gridTemplateColumns }}>
                    {row.items.map(({ item, index }) => renderShortcut(item, index))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeCategory === 'vault' && (
        <VaultPanel
          config={config}
          showVaultHelp={showVaultHelp}
          setShowVaultHelp={setShowVaultHelp}
          handleUpdateConfigSetting={handleUpdateConfigSetting}
          playFolderSound={playFolderSound}
          playCyberBeep={playCyberBeep}
        />
      )}
    </main>
  );
}
