import React from 'react';

export default function CyberTrayLogo({ className = "w-6 h-6", animated = false }: { className?: string, animated?: boolean }) {
  return (
    <div className={`relative ${className} flex items-center justify-center p-0.5`} style={animated ? { animation: 'spin 12s linear infinite' } : undefined}>
      <img
        src="/icon.png"
        alt="CyberTray"
        className="w-full h-full object-contain drop-shadow-[0_0_2px_var(--neon-glow-color)]"
        draggable={false}
      />
    </div>
  );
}
