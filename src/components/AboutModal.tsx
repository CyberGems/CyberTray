import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Github, RefreshCw, Download, CheckCircle2,
  Tag, ClipboardCopy, Check, Globe, BookOpen, Bug, Heart, ExternalLink
} from 'lucide-react';
import { translate, TranslationKey, getLocale } from '../locales';
import { isElectron } from '../lib/appUtils';
import CyberTrayLogo from './CyberTrayLogo';

const REPO_URL = 'https://github.com/CyberGems/CyberTray';

export function githubReleaseUrl(version: string): string {
  const tag = version.startsWith('v') ? version : `v${version}`;
  return `${REPO_URL}/releases/tag/${tag}`;
}

/** Plain-text teaser of GitHub release notes for toasts. */
export function peekReleaseNotes(body: string, maxChars = 220): string {
  const lines = body
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^[-*]\s+/, '• ')
        .replace(/\*\*/g, '')
        .trim()
    )
    .filter((line) => {
      if (!line || /^---+/.test(line)) return false;
      if (/^Release Notes/i.test(line)) return false;
      if (/^Full Changelog/i.test(line)) return false;
      return true;
    });
  const text = lines.slice(0, 4).join('\n');
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}…`;
}

export type AppVersions = {
  app: string;
  electron: string;
  chrome: string;
  node: string;
  platform: string;
  arch: string;
  osRelease: string;
  osType: string;
};

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string; releaseNotes?: string; releaseUrl?: string }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string; releaseNotes?: string; releaseUrl?: string }
  | { state: 'error'; message: string };

interface AboutModalProps {
  showAboutModal: boolean;
  setShowAboutModal: (v: boolean) => void;
  autoUpdate: boolean;
  onAutoUpdateChange: (enabled: boolean) => void;
  playCyberBeep: () => void;
  autoCheckSeq?: number;
}

function platformLabel(platform: string): string {
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return platform;
}

const t = (key: TranslationKey, variables?: Record<string, string>) => translate(key, variables);

export default function AboutModal({
  showAboutModal,
  setShowAboutModal,
  autoUpdate,
  onAutoUpdateChange,
  playCyberBeep,
  autoCheckSeq,
}: AboutModalProps) {
  const [versions, setVersions] = useState<AppVersions | null>(null);
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [diagCopied, setDiagCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandledSeqRef = useRef(0);

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;
    window.electronAPI.getAppVersions?.().then((v) => setVersions(v as AppVersions)).catch(() => {});
    window.electronAPI.getUpdateStatus?.().then((s) => { if (s) setStatus(s as UpdateStatus); }).catch(() => {});
    const off = window.electronAPI.onUpdateStatus?.((s) => setStatus(s as UpdateStatus));
    return () => {
      off?.();
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const appVersion = versions?.app || '';

  const handleCheck = useCallback(async () => {
    if (!window.electronAPI?.checkForUpdates) {
      setStatus({ state: 'error', message: 'Updater unavailable in this environment' });
      return;
    }
    setStatus({ state: 'checking' });
    playCyberBeep();
    try {
      const res = await window.electronAPI.checkForUpdates();
      if (!res?.ok) {
        setStatus({ state: 'error', message: res?.error || 'Update check failed' });
        return;
      }
      setStatus((prev) =>
        prev.state === 'checking'
          ? { state: 'not-available', version: res.version || appVersion }
          : prev
      );
    } catch (e) {
      setStatus({ state: 'error', message: String((e as Error)?.message || e) });
    }
  }, [appVersion, playCyberBeep]);

  useEffect(() => {
    if (autoCheckSeq && autoCheckSeq > lastHandledSeqRef.current) {
      lastHandledSeqRef.current = autoCheckSeq;
      void handleCheck();
    }
  }, [autoCheckSeq, handleCheck]);

  const handleDownload = async () => {
    playCyberBeep();
    await window.electronAPI?.downloadUpdate?.();
  };

  const handleInstall = () => {
    playCyberBeep();
    window.electronAPI?.installUpdate?.();
  };

  const handleCopyDiagnostics = useCallback(async () => {
    if (!versions) return;
    const lines = [
      `CyberTray ${versions.app}`,
      `Electron: ${versions.electron}`,
      `Chrome: ${versions.chrome}`,
      `Node: ${versions.node}`,
      `OS: ${platformLabel(versions.platform)} ${versions.osRelease} (${versions.arch})`,
      `Locale: ${getLocale()}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setDiagCopied(true);
      playCyberBeep();
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setDiagCopied(false), 1800);
    } catch { /* ignore */ }
  }, [versions, playCyberBeep]);

  const openUrl = (url: string) => {
    if (isElectron && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AnimatePresence>
      {showAboutModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowAboutModal(false)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[460px] bg-gradient-to-b from-[#0d1520] to-[#0a0f18] border border-[var(--neon-glow-border)] rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.12)] flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="flex justify-end px-4 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={t('close_btn')}
                title={t('close_btn')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar px-7 pb-5 text-center">
              <div className="relative w-[72px] h-[72px] mx-auto mb-4 flex items-center justify-center">
                <CyberTrayLogo className="w-[72px] h-[72px] drop-shadow-[0_0_8px_rgba(34,211,238,0.28)]" animated={false} />
              </div>

              <h1 className="text-[26px] font-cyber font-bold tracking-wide text-white mb-1">
                Cyber<span className="text-[var(--neon-glow-color)]">Tray</span>
              </h1>
              <div className="text-[11px] font-digits font-bold text-slate-500 uppercase tracking-[0.12em] mb-3.5">
                {t('about_version', { version: appVersion || '…' })}
              </div>

              <p className="text-[13px] text-slate-400 leading-relaxed mb-6">
                {t('about_desc')}
              </p>

              <div className="text-left">
                <div className="text-[11px] font-cyber font-bold uppercase text-[var(--neon-glow-color)] mb-3 flex items-center gap-2 tracking-wider">
                  <div className="h-px flex-1 bg-[var(--neon-glow-color-raw)]/20" />
                  {t('about_maintenance')}
                  <div className="h-px flex-1 bg-[var(--neon-glow-color-raw)]/20" />
                </div>

                <UpdateStatusLine status={status} />

                {(status.state === 'available' || status.state === 'downloaded') && (
                  <ReleaseNotesPanel status={status} currentVersion={appVersion} />
                )}

                <div className="grid grid-cols-1 gap-2">
                  {status.state === 'available' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openUrl(status.releaseUrl || githubReleaseUrl(status.version))}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 px-2 rounded-xl text-[11px] font-cyber font-bold tracking-wide bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        {t('about_view_release')}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 px-2 rounded-xl text-[11px] font-cyber font-bold tracking-wide bg-[var(--neon-glow-color-raw)]/15 hover:bg-[var(--neon-glow-color-raw)]/25 text-[var(--neon-glow-color)] border border-[var(--neon-glow-border)] transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        {t('about_download_btn')}
                      </button>
                    </div>
                  ) : status.state === 'downloaded' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openUrl(status.releaseUrl || githubReleaseUrl(status.version))}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 px-2 rounded-xl text-[11px] font-cyber font-bold tracking-wide bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        {t('about_view_release')}
                      </button>
                      <button
                        type="button"
                        onClick={handleInstall}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 px-2 rounded-xl text-[11px] font-cyber font-bold tracking-wide bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        {t('about_install_btn')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCheck}
                      disabled={status.state === 'checking' || status.state === 'downloading'}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-cyber font-bold tracking-wider bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${status.state === 'checking' ? 'animate-spin' : ''}`} />
                      {t('about_check_updates')}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyDiagnostics}
                    disabled={!versions}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-cyber font-bold tracking-wider border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      diagCopied
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/10'
                    }`}
                  >
                    {diagCopied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                    {diagCopied ? t('about_diagnostics_copied') : t('about_copy_diagnostics')}
                  </button>

                  <div className="flex items-center justify-between px-1 py-2 mt-1 gap-3">
                    <div className="flex flex-col text-left">
                      <span className="text-xs text-slate-200 font-medium leading-tight">{t('about_auto_updates')}</span>
                      <span className="text-[11px] text-slate-400 leading-snug mt-0.5">{t('about_auto_updates_desc')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { onAutoUpdateChange(!autoUpdate); playCyberBeep(); }}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                        autoUpdate ? 'bg-[var(--neon-glow-color-raw)]' : 'bg-slate-700'
                      }`}
                      aria-pressed={autoUpdate}
                      aria-label={t('about_auto_updates')}
                    >
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${
                        autoUpdate ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-black/30 shrink-0">
              <button
                type="button"
                onClick={() => openUrl('https://cybergems.org')}
                className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer select-none"
                title={t('about_website_tooltip')}
              >
                {t('about_footer')}
              </button>
              <div className="flex items-center gap-1">
                <FooterIconButton label={t('about_website_tooltip')} onClick={() => openUrl('https://cybergems.org')}>
                  <Globe className="w-4 h-4" />
                </FooterIconButton>
                <FooterIconButton label={t('about_docs_tooltip')} onClick={() => openUrl(`${REPO_URL}/wiki`)}>
                  <BookOpen className="w-4 h-4" />
                </FooterIconButton>
                <FooterIconButton label={t('about_github_tooltip')} onClick={() => openUrl(REPO_URL)}>
                  <Github className="w-4 h-4" />
                </FooterIconButton>
                <FooterIconButton label={t('about_issues_tooltip')} onClick={() => openUrl(`${REPO_URL}/issues`)}>
                  <Bug className="w-4 h-4" />
                </FooterIconButton>
                <FooterIconButton label={t('about_releases_tooltip')} onClick={() => openUrl(`${REPO_URL}/releases`)}>
                  <Tag className="w-4 h-4" />
                </FooterIconButton>
                <button
                  type="button"
                  onClick={() => openUrl(`${REPO_URL}#%EF%B8%8F-donate`)}
                  className="group flex items-center justify-center w-[30px] h-[30px] rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                  title={t('about_donate_tooltip')}
                  aria-label={t('about_donate_tooltip')}
                >
                  <Heart className="w-4 h-4 fill-[#F43F5E] text-[#F43F5E] transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FooterIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-center w-[30px] h-[30px] rounded-md hover:bg-white/10 text-slate-400 hover:text-[var(--neon-glow-color)] transition-colors cursor-pointer"
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function UpdateStatusLine({ status }: { status: UpdateStatus }) {
  if (status.state === 'idle') return null;

  if (status.state === 'downloading') {
    return (
      <div className="text-center text-[11px] text-slate-400 mb-2.5 font-medium">
        {t('about_status_downloading', { percent: String(status.percent) })}
      </div>
    );
  }

  const color =
    status.state === 'error' ? 'text-red-400'
      : status.state === 'available' ? 'text-[var(--neon-glow-color)]'
      : status.state === 'downloaded' || status.state === 'not-available' ? 'text-emerald-400'
      : 'text-slate-400';

  const text =
    status.state === 'checking' ? t('about_status_checking')
      : status.state === 'not-available' ? t('about_status_latest')
      : status.state === 'available' ? t('about_status_available', { version: status.version })
      : status.state === 'downloaded' ? t('about_status_downloaded', { version: status.version })
      : status.state === 'error' ? t('about_status_error')
      : '';

  return (
    <div className={`text-center text-[11px] mb-2.5 font-medium ${color}`}>
      {text}
      {status.state === 'error' && status.message && (
        <div className="mt-1 text-[10px] text-slate-600 break-words font-normal">
          {status.message}
        </div>
      )}
    </div>
  );
}

function ReleaseNotesPanel({
  status,
  currentVersion,
}: {
  status: Extract<UpdateStatus, { state: 'available' } | { state: 'downloaded' }>;
  currentVersion: string;
}) {
  return (
    <div className="mb-3 space-y-2.5 text-left">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div>
          <div className="text-[10px] font-cyber font-bold uppercase tracking-wider text-slate-500 mb-1">
            {t('about_current_version')}
          </div>
          <span className="inline-block text-[11px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded">
            v{currentVersion || '…'}
          </span>
        </div>
        <div>
          <div className="text-[10px] font-cyber font-bold uppercase tracking-wider text-[var(--neon-glow-color)]/80 mb-1">
            {t('about_latest_version')}
          </div>
          <span className="inline-block text-[11px] font-bold text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10 border border-[var(--neon-glow-border)] px-2 py-0.5 rounded">
            v{status.version}
          </span>
        </div>
      </div>

      {status.releaseNotes && (
        <div>
          <div className="text-[10px] font-cyber font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            {t('about_release_notes')}
          </div>
          <div className="min-h-[6.5rem] max-h-[200px] overflow-y-auto custom-scrollbar rounded-xl border border-slate-800 bg-slate-950/50 px-3.5 py-3 text-left text-[12px] leading-relaxed text-slate-300">
            <ReleaseNotes body={status.releaseNotes} />
          </div>
        </div>
      )}
    </div>
  );
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-white/10 px-1 py-px font-mono text-[11px] text-cyan-100/90">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function ReleaseNotes({ body }: { body: string }) {
  const lines = body.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const items = listItems;
    listItems = [];
    nodes.push(
      <ul key={`list-${nodes.length}`} className="my-1.5 list-disc space-y-1 pl-4 marker:text-[var(--neon-glow-color)]/70">
        {items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (heading) {
      flushList();
      nodes.push(
        <h4 key={`h-${nodes.length}`} className="mb-1 mt-2.5 first:mt-0 text-[13px] font-semibold text-slate-100">
          {renderInline(heading[1])}
        </h4>
      );
    } else if (bullet) {
      listItems.push(bullet[1]);
    } else if (!line.trim() || /^---+/.test(line.trim())) {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={`p-${nodes.length}`} className="text-[12.5px] leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();
  return <div className="space-y-0.5">{nodes}</div>;
}
