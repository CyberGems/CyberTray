import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, Clock, Edit, ListFilter, Lock, Search, Upload } from 'lucide-react';
import { translate } from '../locales';
import { shortcutIconSrc } from '../lib/iconSrc';
import ShortcutGlyph from './ShortcutGlyph';
import { densityFromIconSize } from '../lib/appUtils';
import { SHORTCUT_KIND_LABEL_KEYS, type ShortcutKindFilter } from '../lib/shortcutKind';
import VaultPanel from './VaultPanel';

type ShowTooltipFn = (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;

type ShortcutRow =
  | { kind: 'header'; key: string; letter: string }
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
  }, [filteredShortcutsList, viewMode, iconSortOrder, columnCount]);

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
    estimateSize: (index) => rows[index].kind === 'header' ? 64 : (viewMode === 'list' ? 76 : config.iconSize + 76),
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
          onMouseEnter={(e) => showTooltip(e, item.name, item.path)}
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
              <p
                className={`font-mono truncate w-full ${item.category === 'vault' ? 'text-purple-400/80' : 'text-slate-500'}`}
                style={{ fontSize: `${density.pathPx}px` }}
              >
                {item.category === 'vault' ? translate('vault_real_path', { path: item.path }) : item.path}
              </p>
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
        onMouseEnter={(e) => showTooltip(e, item.name, item.path)}
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
            <p
              className={`font-mono truncate w-full ${item.category === 'vault' ? 'text-purple-400/80' : 'text-slate-500'}`}
              style={{ fontSize: `${density.pathPx}px` }}
            >
              {item.category === 'vault' ? translate('vault_real_path', { path: item.path }) : item.path}
            </p>
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
                <span className="text-[8px] font-mono text-slate-500">
                  {item.usageCount} ex.
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

      {filteredShortcutsList.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-[var(--neon-glow-border)] rounded-xl bg-slate-950/65 backdrop-blur-md py-12 px-6 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          {searchQuery.trim() !== '' ? (
            <>
              <Search className="w-12 h-12 text-slate-500 opacity-60 mb-4" />
              <p className="text-xs font-mono text-slate-400 max-w-md text-center leading-relaxed tracking-wider">
                {translate('search_no_results', { query: searchQuery })}
              </p>
            </>
          ) : kindFilter !== 'all' ? (
            <>
              <ListFilter className="w-12 h-12 text-[var(--neon-glow-color)] opacity-60 mb-4" />
              <p className="text-xs font-mono text-slate-300 max-w-md text-center leading-relaxed tracking-wider">
                {translate('filter_type_empty', {
                  kind: translate(SHORTCUT_KIND_LABEL_KEYS[kindFilter] as any).toLowerCase(),
                })}
              </p>
              {onClearKindFilter && (
                <button
                  type="button"
                  onClick={onClearKindFilter}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-[var(--neon-glow-color)] bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--neon-glow-border)] transition-colors cursor-pointer"
                >
                  {translate('filter_type_show_all')}
                </button>
              )}
            </>
          ) : hiddenVaultCount > 0 && activeCategory === 'all' && onOpenVault ? (
            <>
              <Lock className="w-12 h-12 text-purple-400 opacity-70 mb-4" />
              <p className="text-xs font-mono text-slate-200 max-w-md text-center leading-relaxed tracking-wider">
                {translate('shortcut_hidden_in_vault', { count: String(hiddenVaultCount) })}
              </p>
              <button
                type="button"
                onClick={onOpenVault}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-colors cursor-pointer"
              >
                {translate('explorer_vault')}
              </button>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-[var(--neon-glow-color)] opacity-70 animate-pulse mb-4" />
              <p className="text-xs font-mono text-slate-200 max-w-md text-center leading-relaxed tracking-wider">
                {translate('shortcut_no_items')}
              </p>
            </>
          )}
        </div>
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
          {selectionMode ? filteredShortcutsList.flatMap((item, index) => {
            const elements: React.ReactNode[] = [];
            if (viewMode === 'list' && iconSortOrder === 'alpha') {
              const letter = alphaLabel(item);
              const previous = index > 0 ? filteredShortcutsList[index - 1] : null;
              if (!previous || letter !== alphaLabel(previous)) elements.push(renderAlphaHeader(letter));
            }
            elements.push(renderShortcut(item, index));
            return elements;
          }) : rowVirtualizer.getVirtualItems().map((virtualRow) => {
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
                {row.kind === 'header' ? renderAlphaHeader(row.letter) : (
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
