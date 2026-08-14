import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  duration: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastStackProps {
  toasts: ToastItem[];
  dockPosition: string;
  dismissToast: (id: number) => void;
}

export default function ToastStack({ toasts, dockPosition, dismissToast }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[90000] flex flex-col gap-2 pointer-events-none w-[min(92%,420px)] ${dockPosition === 'top' ? 'top-20' : 'bottom-20'}`}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto relative overflow-hidden rounded-xl border bg-[#0c111c]/95 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.55)] animate-toast-in"
          style={{
            borderColor:
              t.type === 'error' ? 'rgba(244,63,94,0.5)'
              : t.type === 'success' ? 'var(--neon-glow-border)'
              : 'rgba(148,163,184,0.35)',
          }}
        >
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <div className="shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[var(--neon-glow-color)]" />}
              {t.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-slate-300" />}
            </div>
            <p className="flex-1 min-w-0 text-[12px] font-montserrat text-slate-100 leading-snug break-words">{t.message}</p>
            {t.actionLabel && (
              <button
                onClick={(e) => { e.stopPropagation(); t.onAction?.(); dismissToast(t.id); }}
                className="shrink-0 text-[10px] font-cyber font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-[var(--neon-glow-border)] text-[var(--neon-glow-color)] hover:bg-[var(--neon-glow-color-raw)]/10 transition-colors cursor-pointer"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); dismissToast(t.id); }}
              className="shrink-0 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 h-[2.5px] w-full bg-white/5">
            <div
              className="h-full w-full origin-left"
              style={{
                animation: `toast-shrink ${t.duration}ms linear forwards`,
                background:
                  t.type === 'error'
                    ? 'linear-gradient(90deg,#f43f5e,#fb7185)'
                    : 'linear-gradient(90deg, var(--neon-glow-color), #a855f7)',
                boxShadow: '0 0 8px var(--neon-glow-color-raw)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
