import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Check, FileWarning, FolderOpen, Import, RefreshCw, Search, Store, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { translate } from '../locales';
import { isElectron } from '../lib/appUtils';
import { UNCATEGORIZED_ID } from '../lib/appUtils';
import { shortcutIconSrc } from '../lib/iconSrc';
import { useModalAccessibility } from '../lib/useModalAccessibility';
import type { ImportPlan, ImportSourceConfig } from '../lib/shortcutImport';
import type { TranslationKey } from '../locales';

interface ImportSyncModalProps {
  open: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  initialSources: ImportSourceConfig[];
  onApplied: (result: { created?: number; updated?: number; removed?: number; undone?: boolean }) => void;
  showTooltip: (e: React.MouseEvent, text: string) => void;
  hideTooltip: () => void;
}

const DEFAULT_SOURCES: ImportSourceConfig[] = [
  { id: 'desktop:user', kind: 'desktop', scope: 'user', targetCategory: UNCATEGORIZED_ID, preserveFolders: false, skipUninstallers: true, includeFiles: false },
  { id: 'desktop:common', kind: 'desktop', scope: 'common', targetCategory: UNCATEGORIZED_ID, preserveFolders: false, skipUninstallers: true, includeFiles: false },
  { id: 'start-menu:user', kind: 'start-menu', scope: 'user', targetCategory: UNCATEGORIZED_ID, preserveFolders: true, skipUninstallers: true, includeFiles: false },
  { id: 'start-menu:common', kind: 'start-menu', scope: 'common', targetCategory: UNCATEGORIZED_ID, preserveFolders: true, skipUninstallers: true, includeFiles: false },
  { id: 'store:apps', kind: 'store', scope: 'user', targetCategory: UNCATEGORIZED_ID, preserveFolders: false, skipUninstallers: true, includeFiles: false },
];

function sourceLabel(source: ImportSourceConfig): string {
  if (source.kind === 'desktop') return translate(source.scope === 'common' ? 'import_source_desktop_common' : 'import_source_desktop_user');
  if (source.kind === 'start-menu') return translate(source.scope === 'common' ? 'import_source_start_common' : 'import_source_start_user');
  if (source.kind === 'store') return translate('import_source_store');
  return source.label || source.path || '';
}

export default function ImportSyncModal({ open, onClose, categories, initialSources, onApplied, showTooltip, hideTooltip }: ImportSyncModalProps) {
  const [sources, setSources] = useState<ImportSourceConfig[]>([]);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [errors, setErrors] = useState<Array<{ sourceId: string; message: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [applyError, setApplyError] = useState('');
  const [backupAvailable, setBackupAvailable] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setSources(initialSources.length ? initialSources : DEFAULT_SOURCES);
    setPlan(null);
    setErrors([]);
    setApplyError('');
    setFilter('all');
    setQuery('');
    if (isElectron) {
      void window.electronAPI!.getImportBackupStatus()
        .then(status => setBackupAvailable(!!status.available))
        .catch(() => setBackupAvailable(false));
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isElectron) return;
    return window.electronAPI!.onImportProgress(setProgress);
  }, [open]);

  const requestClose = useCallback(() => {
    if (busy && !scanning) return;
    if (scanning && isElectron) void window.electronAPI!.cancelImportScan();
    onClose();
  }, [busy, scanning, onClose]);

  useModalAccessibility(modalRef, open, requestClose);

  const toggleSource = (source: ImportSourceConfig) => {
    setSources(current => current.some(item => item.id === source.id)
      ? current.filter(item => item.id !== source.id)
      : [...current, source]);
    setPlan(null);
  };

  const updateSources = (patch: Partial<ImportSourceConfig>) => {
    setSources(current => current.map(source => ({ ...source, ...patch })));
    setPlan(null);
  };

  const addFolder = async () => {
    if (!isElectron) return;
    const selected = await window.electronAPI!.selectFolder();
    if (!selected) return;
    const id = `folder:${selected.toLowerCase()}`;
    setSources(current => [
      ...current.filter(source => source.id !== id),
      { id, kind: 'folder', path: selected, label: selected, targetCategory: UNCATEGORIZED_ID, preserveFolders: true, skipUninstallers: true, includeFiles: true },
    ]);
    setPlan(null);
  };

  const runScan = async () => {
    if (!isElectron || !sources.length) return;
    setBusy(true);
    setScanning(true);
    setProgress({ completed: 0, total: 0 });
    setErrors([]);
    setApplyError('');
    try {
      const result = await window.electronAPI!.scanImportSources(sources);
      setPlan(result.plan);
      setErrors(result.errors || []);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setApplyError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setBusy(false);
      setScanning(false);
    }
  };

  const cancelScan = async () => {
    if (!isElectron) return;
    await window.electronAPI!.cancelImportScan();
  };

  const applyPlan = async () => {
    if (!plan || !isElectron) return;
    setBusy(true);
    setApplyError('');
    try {
      const result = await window.electronAPI!.applyImportPlan(plan, sources);
      if (!result.success) throw new Error(result.error || translate('import_apply_error'));
      onApplied(result);
      onClose();
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const undoLastImport = async () => {
    if (!isElectron) return;
    setBusy(true);
    setApplyError('');
    try {
      const result = await window.electronAPI!.undoLastImport();
      if (!result.success) throw new Error(result.error || translate('import_undo_error'));
      onApplied({ undone: true });
      onClose();
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const result: Record<string, number> = { create: 0, update: 0, duplicate: 0, unchanged: 0, missing: 0, error: 0, skipped: 0 };
    for (const item of plan?.items || []) result[item.action] = (result[item.action] || 0) + 1;
    return result;
  }, [plan]);

  const filteredItems = useMemo(() => (plan?.items || []).filter(item => {
    if (filter !== 'all' && item.action !== filter) return false;
    if (!query.trim()) return true;
    const haystack = `${item.name} ${item.path} ${item.sourcePath}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [plan, filter, query]);

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  const toggleItem = (key: string) => {
    setPlan(current => current ? {
      ...current,
      items: current.items.map(item => item.key === key && ['create', 'update', 'missing', 'skipped'].includes(item.action)
        ? { ...item, selected: !item.selected }
        : item),
    } : current);
  };

  const selectedChanges = plan?.items.filter(item => item.selected).length || 0;
  const sourceTypes: ImportSourceConfig[] = DEFAULT_SOURCES;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={requestClose} />
          <motion.div
            ref={modalRef}
            className="fixed inset-x-6 top-[5%] bottom-[6%] z-[70] max-w-6xl mx-auto bg-[#070b13]/98 border border-[var(--neon-glow-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            role="dialog" aria-modal="true" aria-label={translate('import_title')}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20"><Import className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <h2 className="text-sm font-cyber font-bold text-white tracking-widest">{translate('import_title')}</h2>
                  <p className="text-xs text-slate-500 mt-1">{translate('import_desc')}</p>
                </div>
              </div>
              <button onClick={requestClose} disabled={busy && !scanning} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-slate-900 disabled:opacity-40" aria-label={translate('close_btn')}><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-[280px_1fr] flex-1 min-h-0">
              <aside className="border-r border-slate-900 p-4 overflow-y-auto custom-scrollbar space-y-4">
                <div>
                  <label className="text-[10px] font-cyber font-bold text-slate-400 tracking-widest">{translate('import_sources')}</label>
                  <div className="mt-2 space-y-1.5">
                    {sourceTypes.map(source => {
                      const selected = sources.some(item => item.id === source.id);
                      return (
                        <label key={source.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-900 hover:border-slate-700 cursor-pointer text-xs text-slate-300">
                          <input type="checkbox" checked={selected} disabled={busy} onChange={() => toggleSource(source)} className="accent-cyan-400" />
                          {source.kind === 'store' ? <Store className="w-3.5 h-3.5 text-purple-400" /> : <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />}
                          <span>{sourceLabel(source)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button onClick={addFolder} disabled={busy} className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 disabled:opacity-40">{translate('import_add_folder')}</button>
                  {sources.filter(source => source.kind === 'folder').map(source => (
                    <div key={source.id} className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="truncate flex-1">{source.path}</span>
                      <button onClick={() => toggleSource(source)} disabled={busy} className="text-slate-500 hover:text-red-400 disabled:opacity-40" aria-label={translate('import_remove_source')}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] font-cyber font-bold text-slate-400 tracking-widest">{translate('import_target_category')}</label>
                  <select value={sources[0]?.targetCategory || UNCATEGORIZED_ID} disabled={busy} onChange={event => updateSources({ targetCategory: event.target.value })} className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200">
                    <option value={UNCATEGORIZED_ID}>{translate('folder_all')}</option>
                    {categories.filter(category => category.id !== 'all' && category.id !== 'vault').map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>
                <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={sources[0]?.preserveFolders ?? true} disabled={busy} onChange={event => updateSources({ preserveFolders: event.target.checked })} className="mt-0.5 accent-cyan-400" />
                  <span>{translate('import_preserve_folders')}</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={sources[0]?.skipUninstallers ?? true} disabled={busy} onChange={event => updateSources({ skipUninstallers: event.target.checked })} className="mt-0.5 accent-cyan-400" />
                  <span>{translate('import_skip_uninstallers')}</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={sources[0]?.includeFiles ?? false} disabled={busy} onChange={event => updateSources({ includeFiles: event.target.checked })} className="mt-0.5 accent-cyan-400" />
                  <span>{translate('import_include_files')}</span>
                </label>
                <button disabled={!sources.length || (busy && !scanning)} onClick={scanning ? cancelScan : runScan} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold disabled:opacity-40">
                  <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                  {translate(scanning ? 'import_cancel_scan' : plan ? 'import_rescan' : 'import_scan')}
                </button>
                {scanning && (
                  <div className="space-y-1.5" aria-live="polite">
                    <div className="h-1 rounded-full bg-slate-900 overflow-hidden">
                      <div className="h-full bg-cyan-400 transition-all" style={{ width: progress.total ? `${Math.round(progress.completed / progress.total * 100)}%` : '20%' }} />
                    </div>
                    <p className="text-[10px] text-slate-500 text-center">{translate('import_progress', { completed: String(progress.completed), total: String(progress.total) })}</p>
                  </div>
                )}
              </aside>

              <section className="flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-900 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'create', 'update', 'missing', 'duplicate', 'skipped', 'error'].map(action => (
                      <button key={action} onClick={() => setFilter(action)} className={`px-2.5 py-1 rounded-md text-[10px] border ${filter === action ? 'border-cyan-500/50 text-cyan-300 bg-cyan-500/10' : 'border-slate-800 text-slate-500'}`}>
                        {translate(`import_filter_${action}` as TranslationKey)}{action !== 'all' && plan ? ` (${counts[action] || 0})` : ''}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-600" />
                    <input value={query} onChange={event => setQuery(event.target.value)} placeholder={translate('import_search')} className="w-full bg-slate-950/70 border border-slate-900 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500/50" />
                  </div>
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                  {!plan ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 px-8 text-center">{translate('import_empty_preview')}</div>
                  ) : filteredItems.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">{translate('search_no_results', { query })}</div>
                  ) : (
                    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                      {virtualizer.getVirtualItems().map(virtualRow => {
                        const item = filteredItems[virtualRow.index];
                        return (
                          <div key={item.key} data-index={virtualRow.index} ref={virtualizer.measureElement} className="absolute inset-x-0 top-0 px-4 py-1.5" style={{ transform: `translateY(${virtualRow.start}px)` }}>
                            <div className={`flex items-center gap-3 min-h-[60px] p-2.5 rounded-lg border ${item.selected ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-slate-900 bg-slate-950/40'}`}>
                              <label className="flex items-center cursor-pointer">
                                <input type="checkbox" disabled={!['create', 'update', 'missing', 'skipped'].includes(item.action)} checked={item.selected} onChange={() => toggleItem(item.key)} className="accent-cyan-400" />
                              </label>
                              <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                                {item.iconPath ? <img src={shortcutIconSrc(item.iconPath)} alt="" className="w-7 h-7 object-contain" /> : <FileWarning className="w-4 h-4 text-slate-600" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-200 truncate">{item.name}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${item.action === 'missing' || item.action === 'error' ? 'text-red-400 border-red-500/20' : item.action === 'create' ? 'text-emerald-400 border-emerald-500/20' : 'text-slate-500 border-slate-800'}`}>{translate(`import_filter_${item.action}` as TranslationKey)}</span>
                                  {!item.exists && item.action !== 'missing' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                                </div>
                                <p className="text-[10px] font-mono text-slate-500 truncate" onMouseEnter={event => showTooltip(event, item.path || item.sourcePath)} onMouseLeave={hideTooltip}>{item.path || item.sourcePath}</p>
                                <p className="text-[9px] text-slate-600 truncate">{sourceLabel(sources.find(source => source.id === item.sourceId) || { kind: 'folder', id: item.sourceId, targetCategory: UNCATEGORIZED_ID, preserveFolders: false, skipUninstallers: true, includeFiles: false })}{item.relativeFolder ? ` · ${item.relativeFolder}` : ''}{item.changedFields?.length ? ` · ${item.changedFields.join(', ')}` : ''}</p>
                              </div>
                              {item.selected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {(errors.length > 0 || applyError) && (
                  <div className="px-4 py-2 border-t border-red-500/20 bg-red-500/5 text-[10px] text-red-300 max-h-20 overflow-y-auto">
                    {applyError || errors.map(error => `${error.sourceId}: ${error.message}`).join(' · ')}
                  </div>
                )}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-900">
                  <span className="text-[10px] text-slate-500">{translate('import_selected', { count: String(selectedChanges) })}</span>
                  <div className="flex gap-2">
                    {backupAvailable && (
                      <button disabled={busy} onClick={undoLastImport} className="px-3 py-2 rounded-lg border border-amber-500/30 text-xs text-amber-300 disabled:opacity-40">{translate('import_undo')}</button>
                    )}
                    <button onClick={requestClose} disabled={busy && !scanning} className="px-4 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 disabled:opacity-40">{translate('modal_btn_cancel_short')}</button>
                    <button disabled={!plan || busy || selectedChanges === 0} onClick={applyPlan} className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold disabled:opacity-40">{translate('import_apply')}</button>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
