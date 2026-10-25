import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, LayoutGrid, Monitor, Sparkles, Store, X } from 'lucide-react';
import { translate } from '../locales';
import { isElectron } from '../lib/appUtils';
import { useModalAccessibility } from '../lib/useModalAccessibility';
import HotkeyInput from './HotkeyInput';
import type { ImportSourceConfig } from '../lib/shortcutImport';

interface OnboardingModalProps {
  open: boolean;
  langCode: string;
  shortcut: string;
  onSelectLanguage: (lang: 'en' | 'es') => void;
  onShortcutChange: (combo: string) => void | Promise<void>;
  /** Cierra el asistente y lo marca como completado (también al omitirlo). */
  onFinish: () => void;
  playCyberBeep: () => void;
}

type ImportChoice = 'desktop' | 'start-menu' | 'store';

const STEP_COUNT = 3;

/**
 * Asistente de primer inicio: idioma, importación opcional y atajo global.
 *
 * Reutiliza el mismo motor de importación que la ventana avanzada, pero sin
 * vista previa: en una instalación nueva todo lo encontrado es nuevo, y el
 * usuario siempre puede revisar o deshacer desde Ajustes.
 */
export default function OnboardingModal({
  open,
  langCode,
  shortcut,
  onSelectLanguage,
  onShortcutChange,
  onFinish,
  playCyberBeep,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<Record<ImportChoice, boolean>>({
    'desktop': true,
    'start-menu': true,
    'store': false,
  });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ created: number; updated: number; failedSources: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useModalAccessibility(modalRef, open, onFinish);

  // Al reabrirse desde Ajustes el asistente vuelve a empezar.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError('');
    setResult(null);
    setBusy(false);
    setProgress({ completed: 0, total: 0 });
  }, [open]);

  useEffect(() => {
    if (!open || !isElectron) return;
    return window.electronAPI!.onImportProgress(setProgress);
  }, [open]);

  const selectedCount = useMemo(
    () => (Object.keys(choices) as ImportChoice[]).filter(key => choices[key]).length,
    [choices]
  );

  const sources = useMemo<ImportSourceConfig[]>(() => {
    const list: ImportSourceConfig[] = [];
    if (choices['desktop']) {
      list.push({
        id: 'desktop:user',
        kind: 'desktop',
        scope: 'user',
        targetCategory: 'utils',
        preserveFolders: false,
        skipUninstallers: true,
        includeFiles: false,
      });
    }
    if (choices['start-menu']) {
      list.push({
        id: 'start-menu:user',
        kind: 'start-menu',
        scope: 'user',
        targetCategory: 'utils',
        preserveFolders: false,
        skipUninstallers: true,
        includeFiles: false,
      });
    }
    if (choices['store']) {
      list.push({
        id: 'store:apps',
        kind: 'store',
        scope: 'user',
        targetCategory: 'utils',
        preserveFolders: false,
        skipUninstallers: true,
        includeFiles: false,
      });
    }
    return list;
  }, [choices]);

  const toggleChoice = (key: ImportChoice) => {
    setChoices(current => ({ ...current, [key]: !current[key] }));
    playCyberBeep();
  };

  const runImport = async () => {
    if (!isElectron || !sources.length) {
      setStep(2);
      return;
    }
    setBusy(true);
    setError('');
    setProgress({ completed: 0, total: 0 });
    try {
      const { plan, errors } = await window.electronAPI!.scanImportSources(sources);
      const applied = await window.electronAPI!.applyImportPlan(plan, sources);
      if (!applied.success) throw new Error(applied.error || translate('import_apply_error'));
      setResult({
        created: applied.created || 0,
        updated: applied.updated || 0,
        failedSources: errors.length,
      });
      playCyberBeep();
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const finishEmpty = () => {
    setResult({ created: 0, updated: 0, failedSources: 0 });
    playCyberBeep();
    setStep(2);
  };

  const sourceOptions: Array<{ key: ImportChoice; icon: typeof Monitor; title: string; desc: string }> = [
    { key: 'desktop', icon: Monitor, title: translate('onboarding_src_desktop'), desc: translate('onboarding_src_desktop_desc') },
    { key: 'start-menu', icon: LayoutGrid, title: translate('onboarding_src_start'), desc: translate('onboarding_src_start_desc') },
    { key: 'store', icon: Store, title: translate('onboarding_src_store'), desc: translate('onboarding_src_store_desc') },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={translate('onboarding_title')}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2 text-[var(--neon-glow-color)]">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-cyber font-bold tracking-[0.25em]">{translate('onboarding_badge')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {Array.from({ length: STEP_COUNT }).map((_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${index === step ? 'w-6 bg-[var(--neon-glow-color)]' : index < step ? 'w-2.5 bg-slate-600' : 'w-2.5 bg-slate-800'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={onFinish}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-900 cursor-pointer"
                  aria-label={translate('onboarding_skip')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-6 pb-2">
              {step === 0 && (
                <>
                  <h2 className="text-xl font-cyber font-bold text-white tracking-wide">{translate('onboarding_title')}</h2>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">{translate('onboarding_subtitle')}</p>

                  <p className="mt-6 text-[10px] font-cyber font-bold text-slate-400 tracking-widest">{translate('onboarding_language')}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([
                      { code: 'en' as const, label: 'English' },
                      { code: 'es' as const, label: 'Español' },
                    ]).map(option => {
                      const active = langCode === option.code;
                      return (
                        <button
                          key={option.code}
                          onClick={() => onSelectLanguage(option.code)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all cursor-pointer ${active ? 'border-[var(--neon-glow-color)] bg-slate-900 text-white' : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'}`}
                        >
                          <span>{option.label}</span>
                          {active && <Check className="w-4 h-4 text-[var(--neon-glow-color)]" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="text-xl font-cyber font-bold text-white tracking-wide">{translate('onboarding_import_title')}</h2>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">{translate('onboarding_import_desc')}</p>

                  <div className="mt-5 space-y-2">
                    {sourceOptions.map(option => {
                      const active = choices[option.key];
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.key}
                          onClick={() => toggleChoice(option.key)}
                          disabled={busy}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 ${active ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-800 hover:border-slate-700'}`}
                        >
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center border ${active ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-900 text-slate-500'}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-slate-200">{option.title}</span>
                            <span className="block text-[11px] text-slate-500 truncate">{option.desc}</span>
                          </span>
                          <span className={`w-4 h-4 rounded border flex items-center justify-center ${active ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-700'}`}>
                            {active && <Check className="w-3 h-3 text-cyan-300" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {busy && (
                    <div className="mt-4">
                      <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-[var(--neon-glow-color)] transition-all"
                          style={{ width: `${progress.total ? Math.min(100, Math.round((progress.completed / progress.total) * 100)) : 5}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-mono text-slate-500 tracking-wide">
                        {translate('onboarding_importing')}
                        {progress.total > 0 ? ` · ${translate('import_progress', { completed: String(progress.completed), total: String(progress.total) })}` : ''}
                      </p>
                    </div>
                  )}

                  {error && (
                    <p role="alert" className="mt-4 text-[11px] text-red-400 font-mono">{error}</p>
                  )}

                  <p className="mt-4 text-[10px] text-slate-600 leading-relaxed">{translate('onboarding_import_note')}</p>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-xl font-cyber font-bold text-white tracking-wide">{translate('onboarding_hotkey_title')}</h2>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">{translate('onboarding_hotkey_desc')}</p>

                  <div className="mt-5 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                    <HotkeyInput
                      value={shortcut}
                      label={translate('general_shortcut')}
                      onChange={onShortcutChange}
                      playBeep={playCyberBeep}
                    />
                  </div>

                  {result && (
                    <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>
                        {result.created > 0
                          ? translate('onboarding_result_imported', { count: String(result.created) })
                          : translate('onboarding_result_empty')}
                        {result.failedSources > 0 && ` ${translate('onboarding_result_partial', { count: String(result.failedSources) })}`}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-5">
              <div>
                {step > 0 && step < 2 && (
                  <button
                    onClick={() => { setStep(step - 1); playCyberBeep(); }}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {translate('onboarding_back')}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {step === 0 && (
                  <button
                    onClick={() => { setStep(1); playCyberBeep(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 cursor-pointer"
                  >
                    {translate('onboarding_next')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {step === 1 && (
                  <>
                    <button
                      onClick={finishEmpty}
                      disabled={busy}
                      className="px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40 cursor-pointer"
                    >
                      {translate('onboarding_start_empty')}
                    </button>
                    <button
                      onClick={runImport}
                      disabled={busy || selectedCount === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 disabled:opacity-40 cursor-pointer"
                    >
                      {translate('onboarding_import_btn')}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {step === 2 && (
                  <button
                    onClick={onFinish}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 cursor-pointer"
                  >
                    {translate('onboarding_finish')}
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
