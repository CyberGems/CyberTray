import React from 'react';

export function CyberTrayWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-cyber font-bold tracking-wide ${className}`}>
      <span className="text-white">Cyber</span>
      <span className="text-[var(--logo-accent)]">Tray</span>
    </span>
  );
}

export default function CyberTrayLogo({
  className = "w-6 h-6",
  animated = false,
  alt = "CyberTray",
}: {
  className?: string;
  animated?: boolean;
  alt?: string;
}) {
  return (
    <div className={`relative ${className} flex items-center justify-center p-0.5`} style={animated ? { animation: 'spin 12s linear infinite' } : undefined}>
      <img
        src="/icon.png"
        alt={alt}
        className="w-full h-full object-contain drop-shadow-[0_0_2px_var(--neon-glow-color)]"
        draggable={false}
      />
    </div>
  );
}
