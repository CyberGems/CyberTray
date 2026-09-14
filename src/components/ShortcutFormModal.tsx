import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Clock, CornerDownLeft, Keyboard, Lock, Pin,
  SlidersHorizontal, Star, Trash2, Upload, X,
} from 'lucide-react';
import { translate } from '../locales';
import { getFolderPath, isElectron } from '../lib/appUtils';
import { shortcutIconSrc } from '../lib/iconSrc';
import Toggle from './Toggle';

export type ShortcutDraft = { name: string; path: string; iconPath?: string };

type ShowTooltipFn = (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;

interface ShortcutFormModalProps {
  shortcutModal: { open: boolean; item?: any; batchItems?: ShortcutDraft[] };
  setShortcutModal: (v: { open: boolean; item?: any; batchItems?: ShortcutDraft[] }) => void;
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
  formHotkey: string;
  setFormHotkey: (v: string) => void;
  formIconPath: string;
  setFormIconPath: (v: string) => void;
  formFavorite: boolean;
  setFormFavorite: (v: boolean) => void;
  formPinToTaskbar: boolean;
  setFormPinToTaskbar: (v: boolean) => void;
  handleSaveShortcut: () => void;
  handleBrowseFile: () => void;
  handleBrowseIcon: () => void;
  handleDeleteShortcut: (id: number) => void;
  showTooltip: ShowTooltipFn;
  hideTooltip: () => void;
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
  formHotkey,
  setFormHotkey,
  formIconPath,
  setFormIconPath,
  formFavorite,
  setFormFavorite,
  formPinToTaskbar,
  setFormPinToTaskbar,
  handleSaveShortcut,
  handleBrowseFile,
  handleBrowseIcon,
  handleDeleteShortcut,
  showTooltip,
  hideTooltip,
}: ShortcutFormModalProps) {
  const isEdit = !!shortcutModal.item;
  const batchItems = shortcutModal.batchItems || [];
  const isBatch = batchItems.length > 1;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [recordingHotkey, setRecordingHotkey] = useState(false);

  useEffect(() => {
    if (!shortcutModal.open) {
      setAdvancedOpen(false);
      setRecordingHotkey(false);
      return;
    }
    if (formPinToTaskbar || formFavorite || formAdmin || formDelay > 0 || formArgs || formHotkey) {
      setAdvancedOpen(true);
    }
    // Only when the drawer opens: later field edits should not force the panel back open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcutModal.open]);

  useEffect(() => {
    if (!shortcutModal.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShortcutModal({ open: false });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutModal.open, setShortcutModal]);

  const folderOptions = categories
    .filter(folder => folder && folder.id && folder.id.trim() !== '' && folder.id !== 'all')
    .sort((a, b) => {
      const pathA = getFolderPath(categories, a.id).map(folder => folder.name).join('/');
      const pathB = getFolderPath(categories, b.id).map(folder => folder.name).join('/');
      return pathA.localeCompare(pathB);
    });

  const canSave = isBatch
    ? batchItems.length > 0 && !!formCategory
    : !!formName.trim() && !!formPath.trim();

  const close = () => setShortcutModal({ open: false });

  const submitForm = () => {
    if (canSave) handleSaveShortcut();
  };

  const onEnterSubmit = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    submitForm();
  };

  const onBrowseKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    submitForm();
  };

  const afterBrowse = (btn: HTMLButtonElement) => {
    btn.blur();
  };

  const title = isEdit
    ? translate('app_edit_title')
    : isBatch
      ? translate('app_add_batch_title', { count: String(batchItems.length) })
      : translate('app_add_title');

  const submitLabel = isEdit
    ? translate('app_edit_submit')
    : isBatch
      ? translate('app_add_batch_submit', { count: String(batchItems.length) })
      : translate('app_add_submit');

  return (
    <AnimatePresence>
      {shortcutModal.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-0 top-0 bottom-0 z-[60] flex shadow-2xl"
          >
            <motion.div
              initial={false}
              animate={{ width: advancedOpen ? 300 : 0, opacity: advancedOpen ? 1 : 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className={`h-full overflow-hidden shrink-0 bg-[#070b13]/95 backdrop-blur-2xl ${advancedOpen ? 'border-l border-[var(--neon-glow-border)]' : ''}`}
            >
              <div className="w-[300px] h-full flex flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-[var(--neon-glow-border)] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <SlidersHorizontal className="w-4 h-4 text-[var(--logo-accent)] shrink-0" />
                    <h3 className="text-xs font-cyber font-bold text-white tracking-widest truncate">{translate('app_advanced_title')}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(false)}
                    onMouseEnter={(e) => showTooltip(e, translate('app_advanced_hide'))}
                    onMouseLeave={hideTooltip}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--logo-accent)] hover:bg-cyan-500/10 transition-colors shrink-0 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                  <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 shrink-0">
                        <Star className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('app_pin_fav_title')}</h4>
                        <p className="text-[11px] text-slate-500 leading-snug">{translate('app_pin_fav_desc')}</p>
                      </div>
                      <Toggle on={formFavorite} onClick={() => setFormFavorite(!formFavorite)} colorClass="bg-blue-500" ringClass="focus-visible:ring-blue-500/50" className="mt-0.5" />
                    </div>
                  </div>

                  <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 shrink-0">
                        <Pin className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('app_pin_taskbar_title')}</h4>
                        <p className="text-[11px] text-slate-500 leading-snug">{translate('app_pin_taskbar_desc')}</p>
                      </div>
                      <Toggle on={formPinToTaskbar} onClick={() => setFormPinToTaskbar(!formPinToTaskbar)} colorClass="bg-cyan-500" ringClass="focus-visible:ring-cyan-500/50" className="mt-0.5" />
                    </div>
                  </div>

                  <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 shrink-0">
                        <Lock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('app_admin_title')}</h4>
                        <p className="text-[11px] text-slate-500 leading-snug">{translate('app_admin_desc')}</p>
                      </div>
                      <Toggle on={formAdmin} onClick={() => setFormAdmin(!formAdmin)} colorClass="bg-amber-500" ringClass="focus-visible:ring-amber-500/50" className="mt-0.5" />
                    </div>
                  </div>

                  <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 shrink-0">
                        <Clock className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('app_delay_title')}</h4>
                        <p className="text-[11px] text-slate-500 leading-snug">{translate('app_delay_desc')}</p>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={formDelay}
                          onChange={(e) => setFormDelay(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          onKeyDown={onEnterSubmit}
                          className="mt-2 w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {!isBatch && (
                    <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors space-y-2">
                      <h4 className="text-sm font-medium text-slate-200 leading-tight">{translate('app_args_title')}</h4>
                      <p className="text-[11px] text-slate-500 leading-snug">{translate('app_args_desc')}</p>
                      <input
                        type="text"
                        value={formArgs}
                        onChange={(e) => setFormArgs(e.target.value)}
                        placeholder={translate('app_args_placeholder')}
                        onKeyDown={onEnterSubmit}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  )}

                  {!isBatch && (
                    <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 shrink-0">
                            <Keyboard className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1 text-left">{translate('app_shortcut_title')}</h4>
                            <p className="text-[11px] text-slate-500 text-left leading-snug">{translate('app_shortcut_desc')}</p>
                          </div>
                        </div>
                        {formHotkey && (
                          <button
                            type="button"
                            onClick={() => setFormHotkey('')}
                            className="text-xs text-red-400 hover:text-red-300 font-cyber transition-colors shrink-0 cursor-pointer"
                          >
                            {translate('app_shortcut_clear')}
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecordingHotkey(true)}
                        onKeyDown={(e) => {
                          if (!recordingHotkey) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const keys: string[] = [];
                          if (e.ctrlKey) keys.push('Ctrl');
                          if (e.altKey) keys.push('Alt');
                          if (e.shiftKey) keys.push('Shift');
                          if (e.metaKey) keys.push('Meta');
                          if (e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift' && e.key !== 'Meta') {
                            keys.push(e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key);
                            setFormHotkey(keys.join('+'));
                            setRecordingHotkey(false);
                          }
                        }}
                        onBlur={() => setRecordingHotkey(false)}
                        className={`w-full text-center px-3 py-2.5 rounded-lg text-xs font-mono outline-none transition-all cursor-pointer ${
                          recordingHotkey
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                            : 'bg-black/30 text-slate-300 hover:bg-white/5 border border-white/10'
                        }`}
                      >
                        {recordingHotkey ? translate('app_shortcut_recording') : (formHotkey || translate('app_shortcut_none'))}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <div className="w-[420px] max-w-[100vw] h-full bg-[#070b13]/95 backdrop-blur-2xl border-l border-[var(--neon-glow-border)] flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--neon-glow-border)] flex items-center justify-between shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen(prev => !prev)}
                    onMouseEnter={(e) => showTooltip(e, advancedOpen ? translate('app_advanced_hide') : translate('app_advanced_show'))}
                    onMouseLeave={hideTooltip}
                    className={`p-1.5 rounded-lg border transition-all shrink-0 focus:outline-none cursor-pointer ${
                      advancedOpen
                        ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
                        : 'border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10'
                    }`}
                  >
                    {advancedOpen ? <SlidersHorizontal className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                  <h2 className="text-sm font-cyber font-bold text-white tracking-widest truncate">{title}</h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                className="flex flex-col flex-1 min-h-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitForm();
                }}
              >
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                {isBatch && (
                  <div className="space-y-2">
                    <p className="text-[12px] text-slate-400 leading-relaxed">{translate('app_batch_desc')}</p>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar rounded-xl border border-white/10 bg-black/30 divide-y divide-white/5">
                      {batchItems.map((item, index) => (
                        <div key={`${item.path}-${index}`} className="flex items-center gap-2.5 px-3 py-2">
                          <span className="w-7 h-7 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {item.iconPath ? (
                              <img src={shortcutIconSrc(item.iconPath)} alt="" className="w-4 h-4 object-contain" />
                            ) : (
                              <span className="text-[9px] font-cyber font-bold text-slate-500">&gt;_</span>
                            )}
                          </span>
                          <span className="text-[12px] text-slate-200 truncate">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isBatch && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 tracking-wider mb-2 block">{translate('app_field_name')}</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={translate('app_name_placeholder')}
                        autoFocus={!isEdit}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 tracking-wider mb-2 block">{translate('app_field_path')}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formPath}
                          onChange={(e) => setFormPath(e.target.value)}
                          placeholder={translate('app_path_placeholder')}
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                        />
                        {isElectron && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              const btn = e.currentTarget;
                              await handleBrowseFile();
                              afterBrowse(btn);
                            }}
                            onKeyDown={onBrowseKeyDown}
                            onMouseEnter={(e) => showTooltip(e, translate('app_browse'))}
                            onMouseLeave={hideTooltip}
                            className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border border-white/5 shrink-0 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {translate('app_browse')}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 tracking-wider mb-2 block">{translate('app_field_icon')}</label>
                      <div className="flex gap-3 items-center">
                        <div className="w-11 h-11 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                          {formIconPath ? (
                            <img src={shortcutIconSrc(formIconPath)} alt="" className="w-8 h-8 object-contain" draggable={false} />
                          ) : (
                            <span className="text-[9px] font-cyber font-bold text-slate-500">&gt;_</span>
                          )}
                        </div>
                        <div className="flex-1 flex gap-2 min-w-0">
                          <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-300 truncate select-none pointer-events-none">
                            {!formIconPath
                              ? '\u00a0'
                              : formIconPath.startsWith('data:') || formIconPath.startsWith('local-resource:')
                                ? translate('app_icon_extracted')
                                : formIconPath}
                          </div>
                          {isElectron && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                const btn = e.currentTarget;
                                await handleBrowseIcon();
                                afterBrowse(btn);
                              }}
                              onKeyDown={onBrowseKeyDown}
                              onMouseEnter={(e) => showTooltip(e, translate('app_browse'))}
                              onMouseLeave={hideTooltip}
                              className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border border-white/5 shrink-0 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/40"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-400 tracking-wider mb-2 block">{translate('app_field_folder')}</label>
                  <div className="relative">
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white outline-none focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none"
                    >
                      {folderOptions.map(folder => (
                        <option key={folder.id} value={folder.id} className="bg-[#0f172a]">
                          {getFolderPath(categories, folder.id).map(item => item.id === 'all' ? translate('explorer_all') : item.name).join(' / ')}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[var(--neon-glow-border)] flex items-center justify-between gap-3 bg-black/20">
                {isEdit ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteShortcut(shortcutModal.item.id)}
                    className="px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer inline-flex items-center gap-1.5 outline-none focus:outline-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {translate('app_delete')}
                  </button>
                ) : <div />}
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors cursor-pointer outline-none focus:outline-none"
                  >
                    {translate('app_cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!canSave}
                    className="px-4 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-300 border border-cyan-500/40 rounded-xl font-cyber font-bold text-sm shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all inline-flex items-center gap-1.5 cursor-pointer outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/50"
                  >
                    <span>{submitLabel}</span>
                    <CornerDownLeft className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
