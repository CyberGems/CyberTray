import React from 'react';

export default function Toggle({
  on,
  onClick,
  colorClass,
  ringClass,
  className = '',
  ariaLabel,
}: {
  on: boolean;
  onClick: () => void;
  colorClass: string;
  ringClass: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 ${ringClass} ${on ? colorClass : 'bg-slate-700'} ${className}`}
    >
      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow flex items-center justify-center ${on ? 'translate-x-5' : 'translate-x-0'}`}>
        <div className={`w-2 h-2 rounded-full ${on ? `${colorClass} shadow-[0_0_5px_currentColor]` : 'bg-slate-400'}`} />
      </div>
    </button>
  );
}
