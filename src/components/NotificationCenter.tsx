import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCheck, Info, LayoutGrid, Monitor, Plus, Store, Trash2, X } from 'lucide-react';
import { translate } from '../locales';
import { shortcutIconSrc } from '../lib/iconSrc';
import FolderDropdown from './FolderDropdown';
import ShortcutGlyph from './ShortcutGlyph';
import { UNCATEGORIZED_ID, type CyberFolder } from '../lib/appUtils';
import {
  countUnseenEntries,
  entrySources,
  type NotificationEntry,
  type NotificationItem,
  type NotificationSource,
  type NotificationState,
} from '../lib/notificationCenter';

/**
 * Centro de notificaciones del vigilante.
 *
 * El aviso flotante se cierra solo; esto es donde se acumula lo que no se
 * llegó a decidir. Nada se marca como leído al llegar: cada lote se marca
 * cuando de verdad se ha visto en el panel.
 */

interface NotificationCenterProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  state: NotificationState;
  folders: CyberFolder[];
  watcherEnabled: boolean;
  onMarkSeen: (ids: string[]) => void;
  onRemove: (ids: string[]) => void;
  onClear: () => void;
  onAdd: (keys: string[], folderId: string) => Promise<{ success: boolean; added: number }>;
  onOpenSettings: () => void;
}

const SOURCE_ICON: Record<NotificationSource, typeof Monitor> = {
  desktop: Monitor,
  'start-menu': LayoutGrid,
  store: Store,
};

const SOURCE_LABEL_KEY: Record<NotificationSource, string> = {
  desktop: 'notifications_source_desktop',
  'start-menu': 'notifications_source_start_menu',
  store: 'notifications_source_store',
};

function formatWhen(timestamp: number, now = Date.now()): string {
  if (!timestamp) return '';
  const elapsed = now - timestamp;
  if (elapsed < 60_000) return translate('notifications_just_now');
  if (elapsed < 3_600_000) {
    return translate('notifications_minutes_ago', { count: String(Math.floor(elapsed / 60_000)) });
  }
  const date = new Date(timestamp);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const today = new Date(now);
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return time;
  const yesterday = new Date(now - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) {
    return `${translate('notifications_yesterday')} ${time}`;
  }
  return `${date.toLocaleDateString()} ${time}`;
}

function shortPath(value: string): string {
  const text = String(value || '');
  if (text.length <= 52) return text;
  return `${text.slice(0, 22)}…${text.slice(-26)}`;
}

/** Marca el lote como visto solo cuando ha estado visible un momento. */
function useSeenWhenVisible(entryId: string, seen: boolean, onMarkSeen: (ids: string[]) => void) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onMarkSeen);
  callbackRef.current = onMarkSeen;

  useEffect(() => {
    if (seen) return;
    const node = nodeRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    let timer: number | null = null;

    const observer = new IntersectionObserver((records) => {
      for (const record of records) {
        if (record.isIntersecting) {
          if (timer === null) {
            timer = window.setTimeout(() => {
              timer = null;
              callbackRef.current([entryId]);
            }, 1500);
          }
        } else if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
      }
    }, { threshold: 0.55 });

    observer.observe(node);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [entryId, seen]);

  return nodeRef;
}

function ItemRow({
  item,
  disabled,
  onAdd,
}: {
  item: NotificationItem;
  disabled: boolean;
  onAdd: () => void;
}) {
  const [iconBroken, setIconBroken] = useState(false);
  return (
    <div className="group flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-white/5 transition-colors">
      <span className="w-6 h-6 shrink-0 rounded bg-slate-900/80 border border-white/5 flex items-center justify-center overflow-hidden">
        {item.iconPath && !iconBroken ? (
          <img
            src={shortcutIconSrc(item.iconPath)}
            alt=""
            className="w-4 h-4 object-contain"
            draggable={false}
            onError={() => setIconBroken(true)}
          />
        ) : (
          <ShortcutGlyph className="w-3.5 h-3.5 text-[var(--neon-glow-color)]" />
        )}
      </span>
      <span className="min-w-0 flex-1 flex flex-col">
        <span className="text-[12px] text-slate-200 truncate leading-tight">{item.name}</span>
        <span className="text-[10px] text-slate-500 font-mono truncate leading-tight" title={item.path}>
          {shortPath(item.path)}
        </span>
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        title={translate('notifications_add')}
        aria-label={translate('notifications_add')}
        className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md border border-white/10 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-cyan-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EntryCard({
  entry,
  folders,
  onMarkSeen,
  onRemove,
  onAdd,
}: {
  entry: NotificationEntry;
  folders: CyberFolder[];
  onMarkSeen: (ids: string[]) => void;
  onRemove: (ids: string[]) => void;
  onAdd: (keys: string[], folderId: string) => Promise<{ success: boolean; added: number }>;
}) {
  const [folderId, setFolderId] = useState(UNCATEGORIZED_ID);
  const [busy, setBusy] = useState(false);
  const nodeRef = useSeenWhenVisible(entry.id, entry.seen, onMarkSeen);
  const sources = useMemo(() => entrySources(entry), [entry]);
  const folderOptions = useMemo(
    () => [
      { id: UNCATEGORIZED_ID, name: translate('folder_all'), color: '#64748b' },
      ...folders.map(folder => ({ id: folder.id, name: folder.name, color: folder.color })),
    ],
    [folders],
  );

  const add = async (keys: string[]) => {
    if (busy || keys.length === 0) return;
    setBusy(true);
    try {
      await onAdd(keys, folderId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={nodeRef}
      className={`relative rounded-lg border transition-colors ${
        entry.seen
          ? 'border-white/5 bg-white/[0.02]'
          : 'border-cyan-400/20 bg-cyan-400/[0.04] shadow-[inset_2px_0_0_0_var(--neon-glow-color,#22d3ee)]'
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 pt-1.5">
        {!entry.seen && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)] shrink-0" />
        )}
        <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500">
          {sources.map((source) => {
            const Icon = SOURCE_ICON[source];
            return (
              <span key={source} className="flex items-center gap-0.5">
                <Icon className="w-2.5 h-2.5" />
                {translate(SOURCE_LABEL_KEY[source] as Parameters<typeof translate>[0])}
              </span>
            );
          })}
        </span>
        <span className="text-[9px] text-slate-600 font-mono ml-auto">{formatWhen(entry.createdAt)}</span>
        <button
          type="button"
          onClick={() => onRemove([entry.id])}
          title={translate('notifications_remove')}
          aria-label={translate('notifications_remove')}
          className="flex items-center justify-center w-4 h-4 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="px-1 py-1">
        {entry.items.map(item => (
          <ItemRow
            key={item.key}
            item={item}
            disabled={busy}
            onAdd={() => void add([item.key])}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5 px-2 pb-2">
        <FolderDropdown
          value={folderId}
          options={folderOptions}
          onChange={setFolderId}
          ariaLabel={translate('notifications_folder')}
          disabled={busy}
          fallbackLabel={translate('folder_all')}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void add(entry.items.map(item => item.key))}
          className="shrink-0 h-6 px-2 rounded-md border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 text-[10px] font-semibold tracking-wide hover:bg-cyan-500/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          {entry.items.length === 1 ? translate('notifications_add') : translate('notifications_add_all')}
        </button>
      </div>
    </div>
  );
}

/** Aviso que no es un acceso: respaldo fallido, resultado de una sincronización. */
function MessageCard({
  entry,
  onMarkSeen,
  onRemove,
}: {
  entry: NotificationEntry;
  onMarkSeen: (ids: string[]) => void;
  onRemove: (ids: string[]) => void;
}) {
  const nodeRef = useSeenWhenVisible(entry.id, entry.seen, onMarkSeen);
  const level = entry.level || 'info';
  const tone = level === 'error'
    ? { icon: 'text-red-400', border: 'border-red-500/25', bg: 'bg-red-500/[0.05]' }
    : level === 'warning'
      ? { icon: 'text-amber-400', border: 'border-amber-500/25', bg: 'bg-amber-500/[0.05]' }
      : { icon: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/[0.04]' };
  const Icon = level === 'info' ? Info : AlertTriangle;

  return (
    <div
      ref={nodeRef}
      className={`relative rounded-lg border px-2 py-1.5 transition-colors ${
        entry.seen ? 'border-white/5 bg-white/[0.02]' : `${tone.border} ${tone.bg}`
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${entry.seen ? 'text-slate-500' : tone.icon}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold leading-tight ${entry.seen ? 'text-slate-400' : 'text-slate-200'}`}>
            {entry.title}
          </p>
          {entry.detail && (
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 break-words">{entry.detail}</p>
          )}
          <span className="text-[9px] text-slate-600 font-mono">{formatWhen(entry.createdAt)}</span>
        </div>
        <button
          type="button"
          onClick={() => onRemove([entry.id])}
          title={translate('notifications_remove')}
          aria-label={translate('notifications_remove')}
          className="shrink-0 flex items-center justify-center w-4 h-4 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationCenter({
  open,
  onToggle,
  onClose,
  state,
  folders,
  watcherEnabled,
  onMarkSeen,
  onRemove,
  onClear,
  onAdd,
  onOpenSettings,
}: NotificationCenterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const unseen = countUnseenEntries(state);
  const total = state.entries.reduce((sum, entry) => sum + entry.items.length, 0);
  const targetFolders = useMemo(
    () => folders.filter(folder => folder.id !== 'all' && folder.id !== 'vault'),
    [folders],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // El desplegable de carpeta vive en un portal fuera del panel.
      if (target.closest?.('[data-folder-menu]')) return;
      if (rootRef.current && !rootRef.current.contains(target)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={translate('notifications_title')}
        aria-expanded={open}
        title={translate('notifications_title')}
        className={`relative flex items-center justify-center w-7 h-7 rounded-md transition-colors group cursor-pointer ${
          open ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'
        }`}
      >
        <Bell className="w-3.5 h-3.5" />
        {unseen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[13px] h-[13px] px-1 rounded-full bg-cyan-400 text-[8px] font-bold text-slate-950 flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.8)]">
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            role="dialog"
            aria-label={translate('notifications_title')}
            className="absolute right-0 top-full mt-1.5 z-50 w-[352px] max-h-[min(520px,calc(100vh-84px))] rounded-xl bg-[#0c121e]/97 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_15px_rgba(34,211,238,0.08)] flex flex-col overflow-hidden"
          >
            <div className="shrink-0 flex items-center gap-2 px-2.5 h-8 border-b border-white/5">
              <Bell className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-200">
                {translate('notifications_title')}
              </span>
              {unseen > 0 ? (
                <span className="text-[9px] text-cyan-300/80 font-mono">{translate('notifications_unseen', { count: String(unseen) })}</span>
              ) : total > 0 ? (
                <span className="text-[9px] text-slate-600 font-mono">{translate('notifications_all_seen')}</span>
              ) : null}
              <div className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={unseen === 0}
                  onClick={() => onMarkSeen(state.entries.filter(entry => !entry.seen).map(entry => entry.id))}
                  title={translate('notifications_mark_all')}
                  aria-label={translate('notifications_mark_all')}
                  className="flex items-center justify-center w-5 h-5 rounded text-slate-500 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={state.entries.length === 0}
                  onClick={onClear}
                  title={translate('notifications_clear')}
                  aria-label={translate('notifications_clear')}
                  className="flex items-center justify-center w-5 h-5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-1.5 flex flex-col gap-1.5">
              {state.entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                  <Bell className="w-7 h-7 text-slate-700" />
                  <p className="text-[11px] font-medium text-slate-400">{translate('notifications_empty_title')}</p>
                  <p className="text-[10px] leading-relaxed text-slate-600">{translate('notifications_empty_desc')}</p>
                </div>
              ) : (
                state.entries.map(entry => (
                  entry.kind === 'message' ? (
                    <MessageCard
                      key={entry.id}
                      entry={entry}
                      onMarkSeen={onMarkSeen}
                      onRemove={onRemove}
                    />
                  ) : (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      folders={targetFolders}
                      onMarkSeen={onMarkSeen}
                      onRemove={onRemove}
                      onAdd={onAdd}
                    />
                  )
                ))
              )}
            </div>

            {!watcherEnabled && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="shrink-0 px-2.5 py-1.5 border-t border-white/5 text-left text-[10px] text-slate-500 hover:text-cyan-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                {translate('notifications_watcher_off')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
