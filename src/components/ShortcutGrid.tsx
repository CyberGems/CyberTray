import React from 'react';
import { Check, Clock, Edit, Search, Upload } from 'lucide-react';
import { translate } from '../locales';
import { shortcutIconSrc } from '../lib/iconSrc';
import VaultPanel from './VaultPanel';

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
  langCode: 'en' | 'es';
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
  handleUpdateConfigSetting: (key: string, value: any) => void;
  playFolderSound: () => void;
  playCyberBeep: () => void;
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
    langCode,
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
    handleUpdateConfigSetting,
    playFolderSound,
    playCyberBeep,
  } = props;

  return (
    <main
      ref={gridScrollRef}
      className={`flex-1 overflow-y-auto px-8 py-6 custom-scrollbar relative ${selectionMode ? 'select-none' : ''}`}
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
          className="grid gap-4 transition-all"
          style={{
            gridTemplateColumns: viewMode === 'list'
              ? 'repeat(auto-fill, minmax(280px, 1fr))'
              : `repeat(auto-fill, minmax(${config.iconSize * 2.8}px, 1fr))`
          }}
        >
          {filteredShortcutsList.flatMap((item, index) => {
            const elements: React.ReactNode[] = [];

            if (viewMode === 'list' && iconSortOrder === 'alpha') {
              const firstLetter = item.name.charAt(0).toUpperCase();
              const pLetter = firstLetter.match(/[A-Z0-9]/i) ? firstLetter : '#';
              const prevApp = index > 0 ? filteredShortcutsList[index - 1] : null;
              let showHeader = false;

              if (prevApp) {
                const prevFirstLetter = prevApp.name.charAt(0).toUpperCase();
                const prevPLetter = prevFirstLetter.match(/[A-Z0-9]/i) ? prevFirstLetter : '#';
                showHeader = pLetter !== prevPLetter;
              } else {
                showHeader = true;
              }

              if (showHeader) {
                elements.push(
                  <div
                    key={`header-list-${pLetter}`}
                    className="col-span-full mt-4 mb-2 flex items-center gap-3 opacity-60 text-left select-none"
                    style={{ gridColumn: '1 / -1' }}
                  >
                    <span className="text-[13px] font-cyber font-bold text-slate-400 w-6 pl-1 tracking-wider">{pLetter}</span>
                    <div className="h-px bg-gradient-to-r from-slate-700/40 via-slate-800/10 to-transparent flex-1" />
                  </div>
                );
              }
            }

            if (viewMode === 'list') {
              elements.push(
                <div
                  key={item.id}
                  data-shortcut-id={item.id}
                  onClick={(e) => selectionMode ? handleItemSelect(item, index, e) : handleLaunch(item)}
                  onContextMenu={(e) => handleShortcutContextMenu(e, item)}
                  draggable={!selectionMode}
                  onDragStart={(e) => handleShortcutDragStart(e, item)}
                  className={`cyber-panel-glow bg-slate-950/45 rounded-lg p-2 flex items-center justify-between gap-3 transition-all duration-300 hover:scale-102 hover:bg-slate-900/60 cursor-pointer relative group border ${
                    selectedIds.has(item.id)
                      ? 'border-[var(--neon-glow-color)] ring-1 ring-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10'
                      : 'border-slate-900/30 hover:border-[var(--neon-glow-border)]'
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
                      className="flex-shrink-0 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-[var(--neon-glow-color)] group-hover:shadow-[0_0_6px_var(--neon-glow-color-raw)]"
                      style={{ width: '32px', height: '32px' }}
                    >
                      {item.iconPath ? (
                        <img src={shortcutIconSrc(item.iconPath)} alt={item.name} className="w-[85%] h-[85%] object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950 group-hover:text-[var(--neon-glow-color)]">
                          <span className="font-cyber font-bold text-xs">&gt;_</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 text-left">
                      <h4 className="font-ui font-bold text-white text-[12px] truncate tracking-wide group-hover:text-[var(--neon-glow-color)] flex items-center gap-1">
                        <span className="truncate">{item.name}</span>
                      </h4>
                      <p className={`font-mono text-[9px] truncate w-full ${item.category === 'vault' ? 'text-purple-400/80' : 'text-slate-500'}`} title={item.path}>
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
                      <span className="text-[10px] text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" title={translate('favorite_badge')}>★</span>
                    )}
                    {item.isAdmin && (
                      <span className="text-[7.5px] font-ui font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1 py-0.2 rounded" title={translate('shortcut_run_admin')}>
                        {translate('shortcut_admin_tag')}
                      </span>
                    )}
                    {item.delay > 0 && (
                      <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/20 px-1 py-0.2 rounded flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {item.delay}s
                      </span>
                    )}

                    <button
                      onClick={(e) => handleOpenEditModal(item, e)}
                      className="opacity-0 group-hover:opacity-100 rounded border border-slate-700 hover:border-[var(--neon-glow-color)] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer h-5 w-5 p-0"
                      title={translate('edit_launch_config')}
                    >
                      <Edit className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            } else {
              const isSmallGrid = config.iconSize < 48;
              elements.push(
                <div
                  key={item.id}
                  data-shortcut-id={item.id}
                  onClick={(e) => selectionMode ? handleItemSelect(item, index, e) : handleLaunch(item)}
                  onContextMenu={(e) => handleShortcutContextMenu(e, item)}
                  draggable={!selectionMode}
                  onDragStart={(e) => handleShortcutDragStart(e, item)}
                  className={`cyber-panel-glow rounded-xl transition-all duration-300 hover:scale-103 cursor-pointer relative group ${
                    selectedIds.has(item.id)
                      ? 'bg-[var(--neon-glow-color-raw)]/10 ring-1 ring-[var(--neon-glow-color)]'
                      : 'bg-slate-950/45'
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
                    className="flex-shrink-0 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-[var(--neon-glow-color)] group-hover:shadow-[0_0_6px_var(--neon-glow-color-raw)] relative"
                    style={{ width: `${config.iconSize}px`, height: `${config.iconSize}px` }}
                  >
                    {item.iconPath ? (
                      <img src={shortcutIconSrc(item.iconPath)} alt={item.name} className="w-[85%] h-[85%] object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-950 group-hover:text-[var(--neon-glow-color)]">
                        <span className="font-cyber font-bold text-lg">&gt;_</span>
                      </div>
                    )}

                    {item.isFavorite && isSmallGrid && (
                      <span
                        className="absolute -top-0.5 -right-0.5 text-[8px] text-amber-400 bg-slate-950/90 border border-amber-500/30 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-[0_0_4px_rgba(251,191,36,0.5)] z-10 font-sans"
                        title={translate('favorite_badge')}
                      >
                        ★
                      </span>
                    )}
                  </div>

                  <div className={`min-w-0 ${isSmallGrid ? 'w-full text-center flex flex-col items-center' : 'flex-1 text-left'}`}>
                    <h4
                      className="font-ui font-bold text-white truncate tracking-wide group-hover:text-[var(--neon-glow-color)] flex items-center gap-1"
                      style={{
                        fontSize: `${Math.max(9, Math.min(14, config.iconSize * 0.22))}px`,
                        justifyContent: isSmallGrid ? 'center' : 'flex-start',
                        width: '100%'
                      }}
                    >
                      <span className="truncate">{item.name}</span>
                    </h4>

                    {!isSmallGrid && (
                      <p
                        className={`font-mono truncate w-full ${item.category === 'vault' ? 'text-purple-400/80' : 'text-slate-500'}`}
                        title={item.path}
                        style={{ fontSize: `${Math.max(8, Math.min(11, config.iconSize * 0.17))}px` }}
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
                          <span className="text-[7.5px] font-ui font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 px-1 py-0.2 rounded" title={translate('shortcut_run_admin')}>
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
                      title={translate('favorite_badge')}
                    >
                      ★
                    </span>
                  )}

                  <button
                    onClick={(e) => handleOpenEditModal(item, e)}
                    className="absolute opacity-0 group-hover:opacity-100 rounded border border-slate-700 hover:border-[var(--neon-glow-color)] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
                    style={{
                      width: isSmallGrid ? '18px' : '24px',
                      height: isSmallGrid ? '18px' : '24px',
                      right: isSmallGrid ? '4px' : '8px',
                      top: isSmallGrid ? '4px' : '8px',
                      padding: 0
                    }}
                    title={translate('edit_launch_config')}
                  >
                    <Edit style={{ width: isSmallGrid ? '10px' : '13px', height: isSmallGrid ? '10px' : '13px' }} />
                  </button>
                </div>
              );
            }

            return elements;
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
