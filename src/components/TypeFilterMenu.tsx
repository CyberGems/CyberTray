import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppWindow, Check, ChevronDown, FileText, Gamepad2, Globe, ListFilter, Store, Terminal } from 'lucide-react';
import { translate } from '../locales';
import { SHORTCUT_KINDS, SHORTCUT_KIND_LABEL_KEYS, type ShortcutKind, type ShortcutKindFilter } from '../lib/shortcutKind';

type ShowTooltipFn = (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;

interface TypeFilterMenuProps {
  value: ShortcutKindFilter;
  /** Recuento por tipo dentro del alcance actual (carpeta + búsqueda). */
  counts: Record<ShortcutKind, number>;
  total: number;
  onChange: (next: ShortcutKindFilter) => void;
  showTooltip: ShowTooltipFn;
  hideTooltip: () => void;
}

const KIND_ICONS: Record<ShortcutKind, React.ComponentType<{ className?: string }>> = {
  program: AppWindow,
  store: Store,
  steam: Gamepad2,
  link: Globe,
  file: FileText,
  script: Terminal,
};

/**
 * Filtro por tipo de acceso.
 *
 * El tipo no se guarda: se deduce del destino (ver `shortcutKind`). Por eso el
 * menú enseña los recuentos del alcance actual en vez de una lista fija, y deja
 * visible el número real de cada tipo antes de filtrar.
 */
export default function TypeFilterMenu({ value, counts, total, onChange, showTooltip, hideTooltip }: TypeFilterMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const active = value !== 'all';
  const activeIcon = active ? KIND_ICONS[value as ShortcutKind] : null;
  const activeLabel = active ? translate(SHORTCUT_KIND_LABEL_KEYS[value] as any) : '';
  const ActiveIcon = activeIcon;

  const select = (next: ShortcutKindFilter) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => { setOpen(prev => !prev); hideTooltip(); }}
        onMouseEnter={(e) => showTooltip(
          e,
          translate('filter_type_tooltip'),
          active ? activeLabel : translate('kind_all'),
          active ? 'rgba(34,211,238,0.5)' : 'rgba(148,163,184,0.45)'
        )}
        onMouseLeave={hideTooltip}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={translate('filter_type_tooltip')}
        className={`flex items-center gap-1.5 h-8 pl-2 pr-1.5 rounded-lg border text-[10px] font-ui tracking-wider uppercase transition-colors cursor-pointer ${
          active
            ? 'bg-[var(--neon-glow-color-raw)]/15 border-[var(--neon-glow-border)] text-[var(--neon-glow-color)]'
            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/15 hover:bg-white/[0.05]'
        }`}
      >
        {ActiveIcon ? <ActiveIcon className="w-3.5 h-3.5 shrink-0" /> : <ListFilter className="w-3.5 h-3.5 shrink-0" />}
        {active && <span className="truncate max-w-24">{activeLabel}</span>}
        {active && <span className="font-mono text-[10px] text-slate-500">{counts[value as ShortcutKind]}</span>}
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.12 }}
            role="menu"
            aria-label={translate('filter_type_tooltip')}
            className="absolute right-0 top-full mt-1.5 z-50 w-[236px] p-1.5 rounded-xl bg-[#0c121e]/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.8),0_0_15px_rgba(34,211,238,0.1)] flex flex-col gap-0.5 select-none"
          >
            <FilterRow
              icon={ListFilter}
              label={translate('kind_all')}
              count={total}
              checked={!active}
              onSelect={() => select('all')}
            />
            <div className="h-px bg-white/10 my-1 mx-1.5" />
            {SHORTCUT_KINDS.map((kind) => {
              const Icon = KIND_ICONS[kind];
              const count = counts[kind] || 0;
              return (
                <FilterRow
                  key={kind}
                  icon={Icon}
                  label={translate(SHORTCUT_KIND_LABEL_KEYS[kind] as any)}
                  count={count}
                  checked={value === kind}
                  disabled={count === 0}
                  onSelect={() => select(kind)}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterRow({ icon: Icon, label, count, checked, disabled, onSelect }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={`group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[11px] font-ui tracking-wide transition-colors text-left ${
        disabled
          ? 'text-slate-600 cursor-default'
          : checked
            ? 'text-[var(--neon-glow-color)] bg-white/[0.07] cursor-pointer'
            : 'text-slate-300 hover:text-white hover:bg-white/[0.06] cursor-pointer'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${disabled ? 'text-slate-700' : checked ? 'text-[var(--neon-glow-color)]' : 'text-slate-500 group-hover:text-slate-300'}`} />
      <span className="flex-1 truncate">{label}</span>
      <span className={`font-mono text-[10px] tabular-nums ${disabled ? 'text-slate-700' : 'text-slate-500'}`}>{count}</span>
      <Check className={`w-3 h-3 shrink-0 ${checked ? 'opacity-100 text-[var(--neon-glow-color)]' : 'opacity-0'}`} />
    </button>
  );
}
