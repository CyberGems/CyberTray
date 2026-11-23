import React, { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Github, RefreshCw,
  Tag, ClipboardCopy, Check, Globe, BookOpen, Bug, Heart
} from 'lucide-react';
import { translate, TranslationKey, getLocale } from '../locales';
import { isElectron } from '../lib/appUtils';
import { useModalAccessibility } from '../lib/useModalAccessibility';
import CyberTrayLogo, { CyberTrayWordmark } from './CyberTrayLogo';
import { pickSuiteApps } from '../lib/suiteApps';

const REPO_URL = 'https://github.com/CyberGems/CyberTray';

export type AppVersions = {
  app: string;
  electron: string;
  chrome: string;
  node: string;
  platform: string;
  arch: string;
  osRelease: string;
  osType: string;
  portable?: boolean;
};

type CheckStatus = 'idle' | 'checking' | 'available' | 'latest' | 'error';

interface AboutModalProps {
  showAboutModal: boolean;
  setShowAboutModal: (v: boolean) => void;
  onUpdateAvailable: (version: string) => void;
  updateNoticeRef: RefObject<HTMLDivElement | null>;
  playCyberBeep: () => void;
  autoCheckSeq?: number;
  showTooltip: (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;
  hideTooltip: () => void;
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
  onUpdateAvailable,
  updateNoticeRef,
  playCyberBeep,
  autoCheckSeq,
  showTooltip,
  hideTooltip,
}: AboutModalProps) {
  const aboutDialogRef = useRef<HTMLDivElement>(null);
  const closeAbout = useCallback(() => setShowAboutModal(false), [setShowAboutModal]);
  useModalAccessibility(aboutDialogRef, showAboutModal, closeAbout, updateNoticeRef);
  const [versions, setVersions] = useState<AppVersions | null>(null);
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [diagCopied, setDiagCopied] = useState(false);
  const [suitePick, setSuitePick] = useState(pickSuiteApps);

  useEffect(() => {
    if (showAboutModal) setSuitePick(pickSuiteApps());
    else hideTooltip();
  }, [showAboutModal]);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandledSeqRef = useRef(0);

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;
    window.electronAPI.getAppVersions?.().then((v) => setVersions(v as AppVersions)).catch(() => {});
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const appVersion = versions?.app || '';

  const handleCheck = useCallback(async () => {
    if (!window.electronAPI) {
      setStatus('error');
      return;
    }
    setStatus('checking');
    playCyberBeep();
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.ok) {
        setStatus('error');
      } else if (result.available) {
        setStatus('available');
        onUpdateAvailable(result.version);
      } else {
        setStatus('latest');
      }
    } catch (error) {
      console.warn('[Updater] Could not check for updates:', error);
      setStatus('error');
    }
  }, [onUpdateAvailable, playCyberBeep]);

  useEffect(() => {
    if (autoCheckSeq && autoCheckSeq > lastHandledSeqRef.current) {
      lastHandledSeqRef.current = autoCheckSeq;
      void handleCheck();
    }
  }, [autoCheckSeq, handleCheck]);

  const handleCopyDiagnostics = useCallback(async () => {
    if (!versions) return;
    const lines = [
      `CyberTray ${versions.app}`,
      `Electron: ${versions.electron}`,
      `Chrome: ${versions.chrome}`,
      `Node: ${versions.node}`,
      `OS: ${platformLabel(versions.platform)} ${versions.osRelease} (${versions.arch})`,
      `Portable: ${versions.portable ? 'Yes' : 'No'}`,
      `Locale: ${getLocale()}`,
    ];
    try {
      const configPath = await window.electronAPI?.getConfigPath?.();
      if (configPath) lines.push(`Config: ${configPath}`);
    } catch { /* ignore */ }
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
            ref={aboutDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('about_title')}
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
                onMouseEnter={(e) => showTooltip(e, t('close_btn'))}
                onMouseLeave={hideTooltip}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar px-7 pb-5 text-center">
              <div className="relative w-[72px] h-[72px] mx-auto mb-4 flex items-center justify-center">
                <CyberTrayLogo className="w-[72px] h-[72px]" animated={false} />
              </div>

              <h1 className="mb-1">
                <CyberTrayWordmark className="text-[26px]" />
              </h1>
              <div className="text-[11px] font-digits font-bold text-slate-500 uppercase tracking-[0.12em] mb-3.5">
                {t('about_version', { version: appVersion || '…' })}
                {versions?.portable && (
                  <span className="ml-2 inline-block align-middle text-[9px] font-cyber font-bold tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded normal-case">
                    {t('about_portable_badge')}
                  </span>
                )}
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

                {status !== 'idle' && (
                  <div
                    role="status"
                    className={`mb-2.5 text-center text-[11px] font-medium ${status === 'available'
                      ? 'text-[var(--neon-glow-color)]'
                      : status === 'latest' ? 'text-emerald-400' : 'text-slate-400'}`}
                  >
                    {t(`about_status_${status}`)}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={handleCheck}
                    disabled={status === 'checking'}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-cyber font-bold tracking-wider bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {t('about_check_updates')}
                  </button>

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

                </div>
              </div>

              <section className="mt-5 pt-4 border-t border-white/10" aria-label={t('about_suite_title')}>
                <h2 className="text-[11px] font-cyber font-bold uppercase text-[var(--neon-glow-color)] tracking-wider mb-3">{t('about_suite_title')}</h2>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {suitePick.map((app) => (
                    <button
                      key={app.slug}
                      type="button"
                      aria-label={app.name}
                      onClick={() => { hideTooltip(); openUrl(app.site); }}
                      onMouseEnter={(e) => showTooltip(e, app.name, t(app.pitchKey))}
                      onMouseLeave={hideTooltip}
                      onBlur={hideTooltip}
                      className="group flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 hover:border-[var(--neon-glow-border)] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[var(--neon-glow-color)] transition-colors cursor-pointer"
                    >
                      <img src={`./suite/${app.slug}.png`} alt="" draggable={false} className="w-7 h-7 object-contain opacity-70 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => openUrl('https://cybergems.org/#apps')} className="inline-flex items-center gap-1 mt-2 text-[11px] text-slate-400 hover:text-[var(--neon-glow-color)] focus-visible:underline cursor-pointer">
                  {t('about_suite_all')} <span aria-hidden="true">→</span>
                </button>
              </section>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-black/30 shrink-0">
              <button
                type="button"
                onClick={() => openUrl('https://cybergems.org')}
                className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer select-none"
                onMouseEnter={(e) => showTooltip(e, t('about_website_tooltip'))}
                onMouseLeave={hideTooltip}
              >
                {t('about_footer')}
              </button>
              <div className="flex items-center gap-1">
                <FooterIconButton label={t('about_website_tooltip')} onClick={() => openUrl('https://cybergems.org')} showTooltip={showTooltip} hideTooltip={hideTooltip}>
                  <Globe className="w-4 h-4" />
                </FooterIconButton>
                <FooterIconButton label={t('about_docs_tooltip')} onClick={() => openUrl(`${REPO_URL}/wiki`)} showTooltip={showTooltip} hideTooltip={hideTooltip}>
                  <BookOpen className="w-4 h-4" />
                </FooterIconButton>
                <FooterIconButton label={t('about_github_tooltip')} onClick={() => openUrl(REPO_URL)} showTooltip={showTooltip} hideTooltip={hideTooltip}>
                  <Github className="w-4 h-4" />
                </FooterIconButton>
                <FooterIconButton label={t('about_issues_tooltip')} onClick={() => openUrl(`${REPO_URL}/issues`)} showTooltip={showTooltip} hideTooltip={hideTooltip}>
                  <Bug className="w-4 h-4" />
                </FooterIconButton>
                <FooterIconButton label={t('about_releases_tooltip')} onClick={() => openUrl(`${REPO_URL}/releases`)} showTooltip={showTooltip} hideTooltip={hideTooltip}>
                  <Tag className="w-4 h-4" />
                </FooterIconButton>
                <button
                  type="button"
                  onClick={() => openUrl(`${REPO_URL}#%EF%B8%8F-donate`)}
                  onMouseEnter={(e) => showTooltip(e, t('about_donate_tooltip'))}
                  onMouseLeave={hideTooltip}
                  className="group flex items-center justify-center w-[30px] h-[30px] rounded-md hover:bg-white/10 transition-colors cursor-pointer"
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
  showTooltip,
  hideTooltip,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  showTooltip: (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;
  hideTooltip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => showTooltip(e, label)}
      onMouseLeave={hideTooltip}
      className="group flex items-center justify-center w-[30px] h-[30px] rounded-md hover:bg-white/10 text-slate-400 hover:text-[var(--neon-glow-color)] transition-colors cursor-pointer"
      aria-label={label}
    >
      {children}
    </button>
  );
}
