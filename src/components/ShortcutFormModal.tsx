import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { translate } from '../locales';
import { getFolderPath } from '../lib/appUtils';

interface ShortcutFormModalProps {
  shortcutModal: { open: boolean; item?: any };
  setShortcutModal: (v: { open: boolean; item?: any }) => void;
  categories: any[];
  formName: string;
  setFormName: (v: string) => void;
  formPath: string;
  setFormPath: (v: string) => void;
  formArgs: string;
  setFormArgs: (v: string) => void;
  formDelay: number;
  setFormDelay: (v: number) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  formAdmin: boolean;
  setFormAdmin: (v: boolean) => void;
  handleSaveShortcut: () => void;
  handleBrowseFile: () => void;
  handleDeleteShortcut: (id: number) => void;
}

export default function ShortcutFormModal({
  shortcutModal,
  setShortcutModal,
  categories,
  formName,
  setFormName,
  formPath,
  setFormPath,
  formArgs,
  setFormArgs,
  formDelay,
  setFormDelay,
  formCategory,
  setFormCategory,
  formAdmin,
  setFormAdmin,
  handleSaveShortcut,
  handleBrowseFile,
  handleDeleteShortcut,
}: ShortcutFormModalProps) {
  const folderOptions = categories
    .filter(folder => folder && folder.id && folder.id.trim() !== '' && folder.id !== 'all')
    .sort((a, b) => {
      const pathA = getFolderPath(categories, a.id).map(folder => folder.name).join('/');
      const pathB = getFolderPath(categories, b.id).map(folder => folder.name).join('/');
      return pathA.localeCompare(pathB);
    });

  return (
    <AnimatePresence>
      {shortcutModal.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShortcutModal({ open: false })}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] z-[60] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl rounded-2xl p-6 font-mono text-xs text-left"
          >
            <h3 className="font-ui font-bold text-white text-sm tracking-widest border-b border-slate-900 pb-3 mb-4.5">
              {shortcutModal.item ? translate('modal_title_edit') : translate('modal_title_add')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_name')}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShortcut(); }}
                  placeholder={translate('modal_placeholder_name')}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs"
                />
              </div>

              <div>
                <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_path')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formPath}
                    onChange={(e) => setFormPath(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShortcut(); }}
                    placeholder={translate('modal_placeholder_path')}
                    className="flex-1 bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs font-mono"
                  />
                  <button
                    onClick={handleBrowseFile}
                    className="px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-bold text-xs transition-all cursor-pointer"
                  >
                    {translate('modal_btn_select_file')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_category')}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs"
                  >
                    {folderOptions.map(folder => (
                      <option key={folder.id} value={folder.id} className="bg-slate-950">
                        {getFolderPath(categories, folder.id).map(item => item.id === 'all' ? translate('explorer_all') : item.name).join(' / ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_delay')}</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formDelay}
                    onChange={(e) => setFormDelay(Math.max(0, parseInt(e.target.value) || 0))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShortcut(); }}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] text-slate-500 mb-1.5 tracking-wider uppercase">{translate('modal_label_args')}</label>
                <input
                  type="text"
                  value={formArgs}
                  onChange={(e) => setFormArgs(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveShortcut(); }}
                  placeholder={translate('modal_placeholder_args')}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-950/40 p-3 border border-slate-900 rounded-xl">
                <div>
                  <h5 className="font-ui font-bold text-white text-[11px] tracking-wider uppercase">{translate('modal_label_admin')}</h5>
                  <p className="text-[9px] text-slate-500 mt-0.5">{translate('modal_admin_hint')}</p>
                </div>
                <button
                  onClick={() => setFormAdmin(!formAdmin)}
                  className={`w-11 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${formAdmin ? 'bg-amber-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4.5 h-4.5 bg-slate-950 rounded-full transition-transform ${formAdmin ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4.5 border-t border-slate-900">
              {shortcutModal.item ? (
                <button
                  onClick={() => handleDeleteShortcut(shortcutModal.item.id)}
                  className="py-2 px-3 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-red-300 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {translate('modal_btn_delete')}
                </button>
              ) : <div />}

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShortcutModal({ open: false })}
                  className="py-2 px-3.5 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  {translate('modal_btn_cancel')}
                </button>
                <button
                  onClick={handleSaveShortcut}
                  className="py-2 px-4.5 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[10px] rounded-lg border border-[var(--neon-glow-border)] transition-all cursor-pointer"
                >
                  {translate('modal_btn_save')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
