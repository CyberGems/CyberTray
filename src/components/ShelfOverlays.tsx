import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit, ExternalLink, FolderOpen, Play, Power, Shield, Trash2 } from 'lucide-react';
import { translate } from '../locales';
import { isElectron } from '../lib/appUtils';

interface ShelfOverlaysProps {
  langCode: string;
  shortcuts: any[];
  categories: any[];
  playCyberBeep: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, danger?: boolean) => void;
  saveDataToConfig: (nextShortcuts: any[], nextCategories: any[]) => Promise<void> | void;
  newCatModal: boolean;
  setNewCatModal: (v: boolean) => void;
  newCatName: string;
  setNewCatName: (v: string) => void;
  newCatColor: string;
  setNewCatColor: (v: string) => void;
  handleAddCategory: () => void;
  categoryMenu: any;
  setCategoryMenu: (v: any) => void;
  renameCatModal: { open: boolean; category?: any };
  setRenameCatModal: (v: { open: boolean; category?: any }) => void;
  renameCatName: string;
  setRenameCatName: (v: string) => void;
  handleRenameCategory: () => void;
  handleDeleteCategory: (id: string) => void;
  handleDeleteShortcut: (id: number) => void;
  getShortcutProcess: (item: any) => any;
  shortcutMenu: any;
  setShortcutMenu: (v: any) => void;
  handleLaunch: (item: any) => void;
  executeLaunch: (item: any) => void;
  handleOpenEditModal: (item: any, e?: any) => void;
  confirmModal: any;
  setConfirmModal: (v: any) => void;
}

export default function ShelfOverlays({
  langCode,
  shortcuts,
  categories,
  playCyberBeep,
  showConfirm,
  saveDataToConfig,
  newCatModal,
  setNewCatModal,
  newCatName,
  setNewCatName,
  newCatColor,
  setNewCatColor,
  handleAddCategory,
  categoryMenu,
  setCategoryMenu,
  renameCatModal,
  setRenameCatModal,
  renameCatName,
  setRenameCatName,
  handleRenameCategory,
  handleDeleteCategory,
  handleDeleteShortcut,
  getShortcutProcess,
  shortcutMenu,
  setShortcutMenu,
  handleLaunch,
  executeLaunch,
  handleOpenEditModal,
  confirmModal,
  setConfirmModal,
}: ShelfOverlaysProps) {
  return (
    <>
{/* ── MODAL: AÑADIR NUEVA CATEGORÍA VIRTUAL ── */}
      <AnimatePresence>
        {newCatModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewCatModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 z-[60] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl rounded-2xl p-5 font-mono text-xs text-left"
            >
              <h3 className="font-montserrat font-bold text-white text-xs tracking-widest border-b border-slate-900 pb-3 mb-4">
                {translate('modal_cat_create_title')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_cat_create_label')}</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                    placeholder={translate('modal_cat_create_placeholder')}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_cat_color_label')}</label>
                  <div className="flex gap-2.5">
                    {['#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#10b981', '#ec4899'].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewCatColor(color)}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${newCatColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-5 pt-3.5 border-t border-slate-900">
                <button
                  onClick={() => setNewCatModal(false)}
                  className="py-1.5 px-3 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  {translate('modal_btn_cancel_short')}
                </button>
                <button
                  onClick={handleAddCategory}
                  className="py-1.5 px-4 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[9.5px] rounded-lg border border-[var(--neon-glow-border)] transition-all cursor-pointer"
                >
                  {translate('modal_cat_create_btn')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MENÚ CONTEXTUAL DE CATEGORÍAS ── */}
      {categoryMenu && categoryMenu.visible && (
        <>
          <div 
            className="fixed inset-0 z-50 cursor-default" 
            onClick={() => setCategoryMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCategoryMenu(null); }}
          />
          <div 
            className="fixed bg-slate-950 border border-[var(--neon-glow-border)] rounded-lg shadow-2xl p-1 z-50 text-left font-mono w-40"
            style={{ 
              left: Math.min(window.innerWidth - 170, categoryMenu.x), 
              top: Math.min(window.innerHeight - 100, categoryMenu.y) 
            }}
          >
            <button 
              onClick={() => {
                const cat = categoryMenu.category;
                setCategoryMenu(null);
                if (cat.id === 'all') return;
                setRenameCatName(cat.name);
                setRenameCatModal({ open: true, category: cat });
                playCyberBeep();
              }}
              disabled={categoryMenu.category.id === 'all'}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              {translate('menu_rename_category')}
            </button>
            <button 
              onClick={() => {
                const cat = categoryMenu.category;
                setCategoryMenu(null);
                handleDeleteCategory(cat.id);
              }}
              disabled={categoryMenu.category.id === 'all' || categoryMenu.category.id === 'utils'}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-red-950 hover:text-red-400 disabled:opacity-40 disabled:hover:bg-transparent text-red-500 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {translate('menu_delete_category')}
            </button>
          </div>
        </>
      )}

      {/* ── MODAL: RENOMBRAR CATEGORÍA VIRTUAL ── */}
      <AnimatePresence>
        {renameCatModal.open && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRenameCatModal({ open: false })}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 z-[60] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl rounded-2xl p-5 font-mono text-xs text-left"
            >
              <h3 className="font-montserrat font-bold text-white text-xs tracking-widest border-b border-slate-900 pb-3 mb-4">
                {translate('modal_cat_rename_title')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_cat_rename_label')}</label>
                  <input
                    type="text"
                    value={renameCatName}
                    onChange={(e) => setRenameCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(); }}
                    placeholder={translate('modal_cat_rename_placeholder')}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-5 pt-3.5 border-t border-slate-900">
                <button
                  onClick={() => setRenameCatModal({ open: false })}
                  className="py-1.5 px-3 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  {translate('modal_btn_cancel_short')}
                </button>
                <button
                  onClick={handleRenameCategory}
                  className="py-1.5 px-4 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[9.5px] rounded-lg border border-[var(--neon-glow-border)] transition-all cursor-pointer"
                >
                  {translate('modal_btn_save_short')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MENÚ CONTEXTUAL DE ACCESOS DIRECTOS ── */}
      {shortcutMenu && shortcutMenu.visible && (
        <>
          <div 
            className="fixed inset-0 z-50 cursor-default" 
            onClick={() => setShortcutMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setShortcutMenu(null); }}
          />
          <div 
            className="fixed bg-slate-950 border border-[var(--neon-glow-border)] rounded-lg shadow-2xl p-1 z-50 text-left font-mono w-48"
            style={{ 
              left: Math.min(window.innerWidth - 200, shortcutMenu.x), 
              top: Math.min(window.innerHeight - 180, shortcutMenu.y) 
            }}
          >
            <button 
              onClick={() => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                handleLaunch(item);
              }}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Play className="w-3.5 h-3.5 text-slate-500" />
              {translate('menu_launch')}
            </button>
            
            <button 
              onClick={() => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                executeLaunch({ ...item, isAdmin: true });
              }}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              {translate('shortcut_run_admin')}
            </button>

            {isElectron && shortcutMenu.item.path && !/^(https?:\/\/)/i.test(shortcutMenu.item.path) && (
              <button 
                onClick={async () => {
                  const item = shortcutMenu.item;
                  setShortcutMenu(null);
                  await window.electronAPI!.openFileLocation(item.path);
                }}
                className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                {translate('menu_open_location')}
              </button>
            )}

            <button
              onClick={(e) => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                handleOpenEditModal(item, e);
              }}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              {translate('menu_edit_config')}
            </button>

            <button
              onClick={async () => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                const updated = shortcuts.map(s => {
                  if (s.id === item.id) {
                    return { ...s, isFavorite: !s.isFavorite };
                  }
                  return s;
                });
                await saveDataToConfig(updated, categories);
                playCyberBeep();
              }}
              className={`w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 flex items-center gap-2 cursor-pointer border-0 bg-transparent ${
                shortcutMenu.item.isFavorite ? 'text-amber-400 hover:text-amber-300' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-[12px]">{shortcutMenu.item.isFavorite ? '★' : '☆'}</span>
              {shortcutMenu.item.isFavorite
                ? translate('remove_from_favorites')
                : translate('add_to_favorites')
              }
            </button>

            {/* Submenú de Mover a Categoría */}
            <div className="relative group">
              <button 
                className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center justify-between cursor-pointer border-0 bg-transparent"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  {translate('menu_move_to')}
                </span>
                <span className="text-[9px] text-slate-500 font-sans">▶</span>
              </button>
              
              <div 
                className={`absolute top-0 hidden group-hover:block bg-slate-950 border border-[var(--neon-glow-border)] rounded-lg shadow-2xl p-1 w-44 z-50 ${
                  shortcutMenu.x > window.innerWidth - 380 ? 'right-full mr-0.5' : 'left-full ml-0.5'
                }`}
              >
                {categories
                  .filter(cat => cat.id !== 'all' && cat.id !== shortcutMenu.item.category && cat.id.trim() !== '')
                  .map(cat => (
                    <button
                      key={cat.id}
                      onClick={async () => {
                        const item = shortcutMenu.item;
                        setShortcutMenu(null);
                        const updatedShortcuts = shortcuts.map(s => {
                          if (s.id === item.id) {
                            return { ...s, category: cat.id };
                          }
                          return s;
                        });
                        await saveDataToConfig(updatedShortcuts, categories);
                        playCyberBeep();
                      }}
                      className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-slate-900 hover:text-white text-slate-300 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                      style={{ color: cat.color || undefined }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color || 'var(--neon-glow-color)' }} />
                      {cat.id === 'utils' ? translate('cat_utils') : cat.name}
                    </button>
                  ))}
              </div>
            </div>

            <div className="border-t border-slate-900 my-1" />

            <button
              onClick={() => {
                const item = shortcutMenu.item;
                setShortcutMenu(null);
                handleDeleteShortcut(item.id);
              }}
              className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-red-950 hover:text-red-400 text-red-500 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              {translate('menu_delete_shortcut')}
            </button>

            <div className="border-t border-slate-900 my-1" />

            {(() => {
              const proc = getShortcutProcess(shortcutMenu.item);
              if (isElectron && proc) {
                return (
                  <button
                    onClick={() => {
                      setShortcutMenu(null);
                      showConfirm(
                        langCode === 'es' ? 'Terminar Proceso' : 'Terminate Process',
                        translate('process_kill_confirm'),
                        async () => {
                          await window.electronAPI!.killProcess(proc.pid);
                          playCyberBeep();
                        },
                        true
                      );
                    }}
                    className="w-full py-1.5 px-3 text-left text-xs rounded hover:bg-red-950/40 hover:text-red-400 text-red-500 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
                  >
                    <Power className="w-3.5 h-3.5 text-red-500" />
                    {translate('menu_kill_process')} ({Math.round(proc.memory / (1024 * 1024))} MB)
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </>
      )}
      <AnimatePresence>
        {confirmModal.open && (
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[100000] animate-fade-in"
            onClick={() => setConfirmModal({ ...confirmModal, open: false })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 26, stiffness: 330 }}
              className={`w-[380px] bg-slate-950/95 border ${
                confirmModal.danger ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-[var(--neon-glow-border)] shadow-[0_0_20px_var(--neon-glow-color-raw)]'
              } rounded-xl p-6 flex flex-col gap-5`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex gap-4 items-start">
                <div 
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                    confirmModal.danger 
                      ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                      : 'bg-[var(--neon-glow-color-raw)]/10 border-[var(--neon-glow-border)] text-[var(--neon-glow-color)] shadow-[0_0_10px_var(--neon-glow-color-raw)]'
                  }`}
                >
                  {confirmModal.danger ? (
                    <Trash2 className="w-6 h-6 animate-pulse" />
                  ) : (
                    <Shield className="w-6 h-6 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-montserrat font-bold text-[13px] text-white tracking-widest uppercase truncate">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                {!confirmModal.isAlert && (
                  <button
                    onClick={() => {
                      setConfirmModal({ ...confirmModal, open: false });
                      playCyberBeep();
                    }}
                    className="py-1.5 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-cyber font-bold tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    {langCode === 'es' ? 'ABORTAR' : 'ABORT'}
                  </button>
                )}
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal({ ...confirmModal, open: false });
                    playCyberBeep();
                  }}
                  className={`py-1.5 px-4 text-xs font-cyber font-bold tracking-wider rounded-lg transition-all cursor-pointer ${
                    confirmModal.danger
                      ? 'bg-red-600 border border-red-500 hover:bg-red-500 text-white hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                      : 'bg-[var(--neon-glow-color-raw)] border border-[var(--neon-glow-border)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 hover:shadow-[0_0_10px_var(--neon-glow-color)]'
                  }`}
                >
                  {confirmModal.isAlert 
                    ? (langCode === 'es' ? 'ENTENDIDO' : 'ACKNOWLEDGE') 
                    : (langCode === 'es' ? 'CONFIRMAR' : 'CONFIRM')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
