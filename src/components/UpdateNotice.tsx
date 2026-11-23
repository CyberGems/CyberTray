import { useMemo, useState, type MouseEvent } from 'react';
import { ExternalLink, RefreshCw, Rocket, Sparkles, X } from 'lucide-react';
import { getLocale, translate } from '../locales';
import { peekReleaseNotes } from '../lib/releaseNotes';
import type { PendingUpdate } from '../lib/update';

interface UpdateNoticeProps {
  status: PendingUpdate;
  noticeRef: (element: HTMLDivElement | null) => void;
  onDismiss: () => void;
  onSkip: (version: string) => void;
  onDownload: (version: string) => Promise<void>;
  showTooltip: (event: MouseEvent, text: string) => void;
  hideTooltip: () => void;
}

const BUTTON = 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY = `${BUTTON} text-slate-300 hover:bg-white/10 hover:text-white`;
const PRIMARY = `${BUTTON} update-notice-primary`;

export default function UpdateNotice({
  status, noticeRef, onDismiss, onSkip, onDownload, showTooltip, hideTooltip,
}: UpdateNoticeProps) {
  const locale = getLocale();
  const { version, releaseUrl, releaseNotes, notesLoading, portableUrl } = status.release;
  const [actionError, setActionError] = useState<{ state: PendingUpdate['state']; message: string } | null>(null);
  const notes = useMemo(() => peekReleaseNotes(releaseNotes, locale), [releaseNotes, locale]);
  const installing = status.state === 'installing';
  const downloading = status.state === 'downloading';
  const title = {
    available: translate('update_available'),
    downloading: translate(status.state === 'downloading' && status.cancelling ? 'update_cancelling' : 'update_downloading'),
    downloaded: translate('update_ready'),
    installing: translate('update_installing'),
  }[status.state];
  const closeLabel = translate(downloading ? 'update_background' : 'update_dismiss');
  const failure = (actionError?.state === status.state && actionError.message)
    || (status.state === 'available' && status.downloadFailed && translate('update_download_failed'))
    || (status.state === 'downloaded' && status.installFailed && translate('update_install_failed'));

  const runAction = async (action: () => Promise<void>, message: string) => {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      console.error('[Updater] Could not complete the requested action:', error);
      setActionError({ state: status.state, message });
    }
  };

  const openExternal = async (url: string) => {
    const result = await window.electronAPI?.openExternal(url);
    if (!result?.success) throw new Error(result?.error || 'Could not open the update URL');
  };

  const formatSize = (bytes: number) => new Intl.NumberFormat(locale, {
    style: 'unit', unit: 'megabyte', maximumFractionDigits: 1,
  }).format(bytes / 1_000_000);

  return (
    <div
      ref={noticeRef}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="update-notice-heading update-notice-version"
      data-no-dead-zone
      className="update-notice custom-scrollbar fixed bottom-5 right-5 z-[70] flex max-h-[calc(100%-2.5rem)] w-[510px] max-w-[calc(100%-2.5rem)] flex-col gap-3 overflow-auto rounded-xl border border-[var(--neon-glow-border)] bg-slate-950 px-4 py-3.5 text-slate-200 shadow-2xl"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          if (!installing) onDismiss();
        }
      }}
    >
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--neon-glow-color-raw)] text-[var(--neon-glow-color)]">
          {downloading || installing ? <RefreshCw size={16} className="motion-safe:animate-spin" />
            : status.state === 'downloaded' ? <Rocket size={16} /> : <Sparkles size={16} />}
        </span>
        <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 id="update-notice-heading" className="font-cyber text-sm font-bold text-slate-100">{title}</h2>
          <span id="update-notice-version" className="update-notice-version rounded bg-[var(--neon-glow-color-raw)] px-1.5 py-0.5 font-mono text-[11px] font-bold [overflow-wrap:anywhere]">
            v{version}
          </span>
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={() => { hideTooltip(); onDismiss(); }}
          onMouseEnter={event => showTooltip(event, closeLabel)}
          onMouseLeave={hideTooltip}
          disabled={installing}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
        <h3 className="font-cyber text-[11px] font-bold uppercase tracking-wider text-slate-400">{translate('about_release_notes')}</h3>
        {notes.length > 0 ? (
          <>
            <ul className="selectable-text custom-scrollbar mt-1 max-h-28 list-disc space-y-1 overflow-auto pl-4 text-xs leading-relaxed text-slate-200 [overflow-wrap:anywhere] marker:text-[var(--neon-glow-color)]">
              {notes.slice(0, 4).map((note, index) => <li key={index}>{note}</li>)}
            </ul>
            {notes.length > 4 && (
              <p className="mt-1 text-[11px] text-slate-400">
                {translate('update_more_notes', { count: String(notes.length - 4) })}
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            {translate(notesLoading ? 'update_notes_loading' : 'update_notes_unavailable')}
          </p>
        )}
      </section>

      {downloading && (
        <div className="space-y-1 text-xs text-slate-300">
          <div className="flex flex-wrap justify-between gap-x-2">
            <span id="update-progress-label">{translate('update_progress')}</span>
            <span>
              {status.transferred !== undefined && status.total
                ? `${formatSize(status.transferred)} / ${formatSize(status.total)}`
                : `${status.percent}%`}
            </span>
          </div>
          <progress className="update-progress" max={100} value={status.percent} aria-labelledby="update-progress-label" />
        </div>
      )}

      {portableUrl && <p className="text-xs text-slate-400">{translate('update_portable_hint')}</p>}
      {failure && <p role="alert" className="text-xs text-slate-200">{failure}</p>}

      <div className="update-notice-actions flex flex-wrap justify-end gap-1.5">
        {status.state === 'available' && (
          <>
            <button type="button" className={SECONDARY} onClick={() => {
              void runAction(() => openExternal(releaseUrl), translate('update_open_failed'));
            }}>
              <ExternalLink size={13} aria-hidden="true" />
              {translate('update_github')}
            </button>
            <button type="button" className={SECONDARY} onClick={() => onSkip(version)}>
              {translate('update_skip')}
            </button>
            <button type="button" className={SECONDARY} onClick={onDismiss}>
              {translate('update_later')}
            </button>
            <button type="button" className={PRIMARY} onClick={() => {
              if (portableUrl) {
                void runAction(() => openExternal(portableUrl), translate('update_open_failed'));
              } else {
                void runAction(() => onDownload(version), translate('update_download_failed'));
              }
            }}>
              {translate(portableUrl ? 'update_download_portable' : 'update_now')}
            </button>
          </>
        )}
        {downloading && (
          <>
            <button type="button" className={SECONDARY} onClick={onDismiss}>{translate('update_background')}</button>
            <button type="button" className={SECONDARY} disabled={status.cancelling} onClick={() => {
              void runAction(async () => { await window.electronAPI?.cancelUpdateDownload(version); }, translate('update_cancel_failed'));
            }}>
              {translate('update_cancel')}
            </button>
          </>
        )}
        {status.state === 'downloaded' && (
          <>
            <button type="button" className={SECONDARY} onClick={onDismiss}>{translate('update_later')}</button>
            <button type="button" className={PRIMARY} onClick={() => {
              void runAction(async () => { await window.electronAPI?.installUpdate(version); }, translate('update_install_failed'));
            }}>
              {translate('update_restart')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
