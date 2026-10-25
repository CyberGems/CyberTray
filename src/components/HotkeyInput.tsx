import React, { useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { translate } from '../locales';
import { isElectron } from '../lib/appUtils';
import { DEFAULT_GLOBAL_SHORTCUT } from '../lib/configDefaults';

interface HotkeyInputProps {
  /** Atajo actual, cadena vacía si está desactivado. */
  value: string;
  /** Se llama solo después de que Windows acepte el atajo. */
  onChange: (combo: string) => void | Promise<void>;
  /** Etiqueta accesible del campo. */
  label?: string;
  playBeep?: () => void;
  className?: string;
}

/**
 * Campo de atajo global con grabación, restablecer y limpiar.
 *
 * El registro real ocurre en el proceso principal; si Windows rechaza la
 * combinación (ya ocupada por otra aplicación) se muestra el error y el atajo
 * anterior sigue activo, sin guardar un valor que no funciona.
 */
export default function HotkeyInput({ value, onChange, label, playBeep, className = '' }: HotkeyInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startRecording = () => {
    setError('');
    setIsRecording(true);
    inputRef.current?.focus();
  };

  const applyShortcut = async (combo: string) => {
    if (isElectron) {
      const res = await window.electronAPI!.registerShortcut(combo);
      if (!res.success) {
        setError(translate('general_shortcut_conflict'));
        return;
      }
    }
    await onChange(combo);
    setError('');
    setIsRecording(false);
    playBeep?.();
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      setIsRecording(false);
      setError('');
      return;
    }
    // Se espera a la tecla real: los modificadores solos no forman atajo.
    if (['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(event.key)) return;

    const parts: string[] = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');

    if (parts.length === 0) {
      setError(translate('general_shortcut_invalid'));
      return;
    }

    const rawKey = event.key === ' ' ? 'Space' : event.key;
    const mainKey = rawKey.length === 1 ? rawKey.toUpperCase() : rawKey;
    await applyShortcut([...parts, mainKey].join('+'));
  };

  const isDefault = value === DEFAULT_GLOBAL_SHORTCUT;

  return (
    <div className={className}>
      <div className="flex gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={isRecording ? translate('general_shortcut_rec') : value}
          placeholder={translate('general_shortcut_none')}
          onFocus={startRecording}
          onBlur={() => setIsRecording(false)}
          onKeyDown={handleKeyDown}
          aria-label={label || translate('general_shortcut')}
          className={`bg-slate-950 border text-[var(--neon-glow-color)] font-cyber font-bold text-center tracking-widest rounded-lg px-4 py-1.5 focus:outline-none w-48 text-xs ${
            isRecording ? 'border-[var(--neon-glow-color)]' : 'border-slate-900'
          }`}
        />
        <button
          onClick={startRecording}
          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          {translate('general_shortcut_record_btn')}
        </button>
        <button
          onClick={() => applyShortcut(DEFAULT_GLOBAL_SHORTCUT)}
          disabled={isDefault}
          title={translate('general_shortcut_reset_desc', { hotkey: DEFAULT_GLOBAL_SHORTCUT })}
          aria-label={translate('general_shortcut_reset')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {translate('general_shortcut_reset')}
        </button>
        <button
          onClick={() => applyShortcut('')}
          disabled={!value}
          title={translate('general_shortcut_clear_desc')}
          aria-label={translate('general_shortcut_clear')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <X className="w-3.5 h-3.5" />
          {translate('general_shortcut_clear')}
        </button>
      </div>
      {!value && !error && (
        <p className="text-[10px] text-amber-400/80 font-mono mt-2 tracking-wide">
          {translate('general_shortcut_cleared_hint')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[10px] text-red-400 font-mono mt-2 tracking-wide">
          {error}
        </p>
      )}
    </div>
  );
}
