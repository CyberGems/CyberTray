import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Selector de carpeta con estética propia.
 *
 * Un `<select>` nativo abre el desplegable del sistema: fondo claro, azul de
 * Windows y cero relación con el tema. Este lo dibuja en un portal con
 * `position: fixed` para que ni el scroll del panel ni el `overflow` de las
 * tarjetas lo recorten.
 */

export interface FolderOption {
  id: string;
  name: string;
  color?: string;
}

interface FolderDropdownProps {
  value: string;
  options: FolderOption[];
  onChange: (id: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  /** Texto cuando el valor no está entre las opciones. */
  fallbackLabel?: string;
}

const OPTION_HEIGHT = 28;
const MENU_PADDING = 8;
const MENU_MAX_HEIGHT = 224;

export default function FolderDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  fallbackLabel = '',
}: FolderDropdownProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = options.find(option => option.id === value);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = Math.min(MENU_MAX_HEIGHT, options.length * OPTION_HEIGHT + MENU_PADDING);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < height + 8;
    setPlacement({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      top: openUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
      width: rect.width,
    });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // El panel también escucha Escape: aquí solo cierra el desplegable.
      event.stopPropagation();
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
        className={`min-w-0 flex-1 h-6 flex items-center gap-1 pl-1.5 pr-1 rounded-md border bg-black/40 text-[10px] text-slate-300 outline-none transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default ${
          open ? 'border-cyan-400/50' : 'border-white/10 hover:border-white/25'
        }`}
      >
        {current?.color && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: current.color }} />
        )}
        <span className="truncate flex-1 text-left">{current?.name ?? fallbackLabel}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && placement && createPortal(
        <div
          ref={menuRef}
          data-folder-menu
          role="listbox"
          aria-label={ariaLabel}
          style={{ left: placement.left, top: placement.top, width: placement.width }}
          className="fixed z-[80] py-1 rounded-lg border border-white/10 bg-[#0b1220]/98 backdrop-blur-xl shadow-[0_12px_28px_rgba(0,0,0,0.85)] overflow-y-auto"
        >
          {options.map((option) => {
            const active = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={`w-full h-7 flex items-center gap-1.5 px-2 text-[11px] text-left transition-colors cursor-pointer ${
                  active ? 'text-cyan-300 bg-cyan-500/12' : 'text-slate-300 hover:text-white hover:bg-white/8'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: option.color || '#475569' }}
                />
                <span className="truncate flex-1">{option.name}</span>
                {active && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
