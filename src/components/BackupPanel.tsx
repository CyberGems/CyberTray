import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, Clock, Database, FolderOpen, HardDriveDownload, Loader2, RotateCcw, ShieldCheck, Trash2,
} from 'lucide-react';
import { translate, getLocale } from '../locales';
import { isElectron } from '../lib/appUtils';
import {
  AUTO_BACKUP_FREQUENCIES_HOURS,
  AUTO_BACKUP_KEEP_OPTIONS,
  parseBackupHours,
  parseBackupKeep,
  type BackupItem,
  type BackupStatus,
} from '../lib/backup';
import Toggle from './Toggle';

interface BackupPanelProps {
  config: any;
  handleUpdateConfigSetting: (keyOrUpdates: string | Record<string, any>, value?: any) => void | Promise<void>;
  playCyberBeep: () => void;
  showAlert: (title: string, message: string, onConfirm?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, danger?: boolean) => void;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return translate('backup_last_never');
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return translate('backup_last_never');
  return date.toLocaleString(getLocale(), {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function frequencyLabel(hours: number): string {
  switch (hours) {
    case 6: return translate('backup_freq_6h');
    case 12: return translate('backup_freq_12h');
    case 168: return translate('backup_freq_168h');
    default: return translate('backup_freq_24h');
  }
}

export default function BackupPanel({
  config,
  handleUpdateConfigSetting,
  playCyberBeep,
  showAlert,
  showConfirm,
}: BackupPanelProps) {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [items, setItems] = useState<BackupItem[]>([]);
  const [busy, setBusy] = useState<'idle' | 'backing' | 'restoring' | 'deleting'>('idle');
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);

  const enabled = config.autoBackupEnabled !== false;
  const hours = parseBackupHours(config.autoBackupHours);
  const keep = parseBackupKeep(config.autoBackupKeep);
  const customFolder = typeof config.autoBackupPath === 'string' ? config.autoBackupPath : '';

  const refresh = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.backup) return;
    const [nextStatus, nextItems] = await Promise.all([
      window.electronAPI.backup.getStatus(),
      window.electronAPI.backup.list(),
    ]);
    setStatus(nextStatus);
    setItems(nextItems);
  }, []);

  useEffect(() => { void refresh(); }, [refresh, customFolder, keep, hours, enabled]);

  // El respaldo programado avisa cuando termina: la lista debe reflejarlo.
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.backup) return;
    return window.electronAPI.backup.onCompleted(() => { void refresh(); });
  }, [refresh]);

  // La etiqueta sigue a la configuración (no al estado del IPC) para que no
  // parpadee a "por defecto" mientras se consulta la carpeta real.
  const effectiveFolder = status?.folder ?? customFolder;
  const usingCustom = Boolean(customFolder);
  const customUnavailable = Boolean(customFolder) && status?.customFolderAvailable === false;

  const handleChooseFolder = async () => {
    if (!isElectron || !window.electronAPI?.backup) return;
    const picked = await window.electronAPI.backup.selectFolder();
    if (!picked) return;
    await handleUpdateConfigSetting('autoBackupPath', picked);
    setFeedback({ tone: 'ok', text: translate('backup_folder_saved') });
    playCyberBeep();
    void refresh();
  };

  const handleResetFolder = async () => {
    await handleUpdateConfigSetting('autoBackupPath', '');
    setFeedback({ tone: 'ok', text: translate('backup_folder_reset_done') });
    playCyberBeep();
    void refresh();
  };

  const handleOpenFolder = async () => {
    if (!isElectron || !window.electronAPI?.backup) return;
    await window.electronAPI.backup.openFolder();
  };

  const handleBackupNow = async () => {
    if (!isElectron || !window.electronAPI?.backup || busy !== 'idle') return;
    setBusy('backing');
    setFeedback(null);
    try {
      const result = await window.electronAPI.backup.runNow();
      if (result.ok) {
        setFeedback({
          tone: result.warning ? 'warn' : 'ok',
          text: result.warning
            ? translate('backup_created_fallback')
            : translate('backup_created', { file: result.file || '' }),
        });
      } else {
        setFeedback({ tone: 'error', text: translate('backup_error', { error: result.error || '' }) });
      }
      await refresh();
    } finally {
      setBusy('idle');
    }
  };

  const handleDelete = (item: BackupItem) => {
    showConfirm(
      translate('backup_delete_title'),
      translate('backup_delete_msg', { file: item.file }),
      async () => {
        if (!window.electronAPI?.backup) return;
        setBusy('deleting');
        const result = await window.electronAPI.backup.remove(item.file);
        setBusy('idle');
        setFeedback(
          result.ok
            ? { tone: 'ok', text: translate('backup_deleted') }
            : { tone: 'error', text: translate('backup_error', { error: result.error || '' }) },
        );
        await refresh();
      },
      true,
    );
  };

  const handleRestore = (item: BackupItem) => {
    showConfirm(
      translate('backup_restore_title'),
      translate('backup_restore_msg', { file: item.file }),
      async () => {
        if (!window.electronAPI?.backup) return;
        setBusy('restoring');
        const result = await window.electronAPI.backup.restore(item.file);
        setBusy('idle');
        if (result.ok) {
          setFeedback({ tone: 'ok', text: translate('backup_restored') });
        } else {
          showAlert(translate('backup_restore_failed_title'), translate('backup_error', { error: result.error || '' }));
        }
        await refresh();
      },
      true,
    );
  };

  const keepOptions = useMemo(() => AUTO_BACKUP_KEEP_OPTIONS, []);
  const frequencyOptions = useMemo(() => AUTO_BACKUP_FREQUENCIES_HOURS, []);

  if (!isElectron) {
    return (
      <div className="max-w-2xl text-xs text-slate-500">
        {translate('backup_desktop_only')}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl text-xs">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg border bg-cyan-500/10 border-cyan-500/20 shrink-0">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('backup_title')}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{translate('backup_desc')}</p>
        </div>
      </div>

      {/* Interruptor + ajustes */}
      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('backup_enable')}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{translate('backup_enable_desc')}</p>
          </div>
          <Toggle
            on={enabled}
            onClick={() => { void handleUpdateConfigSetting('autoBackupEnabled', !enabled); playCyberBeep(); }}
            colorClass="bg-cyan-500"
            ringClass="focus-visible:ring-cyan-500/50"
            ariaLabel={translate('backup_enable')}
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-900">
          <div className="flex items-start gap-3 min-w-0">
            <Clock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('backup_frequency')}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{translate('backup_frequency_desc')}</p>
            </div>
          </div>
          <select
            value={hours}
            disabled={!enabled}
            onChange={(event) => { void handleUpdateConfigSetting('autoBackupHours', Number(event.target.value)); }}
            aria-label={translate('backup_frequency')}
            className="bg-slate-900 text-slate-200 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:border-cyan-500/60 outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {frequencyOptions.map((option) => (
              <option key={option} value={option}>{frequencyLabel(option)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-900">
          <div className="flex items-start gap-3 min-w-0">
            <Database className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('backup_keep')}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{translate('backup_keep_desc')}</p>
            </div>
          </div>
          <select
            value={keep}
            disabled={!enabled}
            onChange={(event) => { void handleUpdateConfigSetting('autoBackupKeep', Number(event.target.value)); }}
            aria-label={translate('backup_keep')}
            className="bg-slate-900 text-slate-200 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:border-cyan-500/60 outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {keepOptions.map((option) => (
              <option key={option} value={option}>{translate('backup_keep_n', { count: String(option) })}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Carpeta de destino */}
      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <HardDriveDownload className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('backup_folder')}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{translate('backup_folder_desc')}</p>
            </div>
          </div>
          <span className={`text-[9px] font-cyber font-bold tracking-wider px-2 py-1 rounded border shrink-0 ${
            usingCustom
              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
              : 'text-slate-400 bg-slate-800/40 border-slate-700'
          }`}>
            {usingCustom ? translate('backup_folder_custom_tag') : translate('backup_folder_default_tag')}
          </span>
        </div>

        <div
          className="font-mono text-[11px] text-slate-300 bg-black/40 border border-slate-900 rounded-lg px-3 py-2 break-all select-text"
          title={effectiveFolder}
        >
          {effectiveFolder || '—'}
        </div>

        {customUnavailable && (
          <p className="text-[11px] text-amber-400 leading-relaxed flex items-start gap-1.5">
            <span className="shrink-0">⚠</span>
            {translate('backup_folder_unavailable')}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { void handleChooseFolder(); }}
            className="px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all text-xs font-cyber font-bold tracking-wider cursor-pointer"
          >
            {translate('backup_folder_choose')}
          </button>
          <button
            type="button"
            onClick={() => { void handleOpenFolder(); }}
            className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white transition-all text-xs font-cyber font-bold tracking-wider cursor-pointer flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            {translate('backup_folder_open')}
          </button>
          {customFolder && (
            <button
              type="button"
              onClick={() => { void handleResetFolder(); }}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white transition-all text-xs font-cyber font-bold tracking-wider cursor-pointer"
            >
              {translate('backup_folder_reset')}
            </button>
          )}
        </div>
      </div>

      {/* Última copia + botón */}
      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-slate-200 leading-tight mb-1">{translate('backup_last')}</h4>
            <p className="font-mono text-[11px] text-cyan-400">{formatDateTime(status?.settings.last ?? config.autoBackupLast ?? null)}</p>
          </div>
          <button
            type="button"
            onClick={() => { void handleBackupNow(); }}
            disabled={busy !== 'idle'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 transition-all text-xs font-cyber font-bold tracking-wider disabled:opacity-50 disabled:cursor-wait shrink-0 cursor-pointer"
          >
            {busy === 'backing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
            {busy === 'backing' ? translate('backup_running') : translate('backup_now')}
          </button>
        </div>

        {feedback && (
          <p
            role="status"
            className={`text-[11px] leading-relaxed ${
              feedback.tone === 'error' ? 'text-red-400' : feedback.tone === 'warn' ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {feedback.text}
          </p>
        )}
      </div>

      {/* Lista */}
      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-medium text-slate-200 leading-tight">{translate('backup_list_title')}</h4>
          <span className="text-[10px] font-mono text-slate-500">
            {translate('backup_list_count', { count: String(items.length), keep: String(keep) })}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">{translate('backup_list_empty')}</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {items.map((item) => (
              <div
                key={item.file}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-black/40 border border-slate-900 hover:border-slate-800 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] text-slate-300 truncate" title={item.file}>{item.file}</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{formatDateTime(item.mtime)}</span>
                    <span>•</span>
                    <span>{formatBytes(item.size)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    disabled={busy !== 'idle'}
                    title={translate('backup_restore')}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/20 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-colors text-[11px] font-medium disabled:opacity-40 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {translate('backup_restore')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={busy !== 'idle'}
                    title={translate('backup_delete')}
                    aria-label={translate('backup_delete')}
                    className="flex items-center justify-center w-6 h-6 rounded border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/40 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-600 leading-relaxed pt-1">{translate('backup_note')}</p>
      </div>
    </div>
  );
}
