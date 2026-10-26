import { motion, useReducedMotion } from 'motion/react';
import CyberTrayLogo, { CyberTrayWordmark } from './CyberTrayLogo';
import { translate } from '../locales';

/**
 * Pantalla de arranque.
 *
 * Cubre la ventana hasta que la configuración está cargada, para que no se vea
 * el estado vacío ("no hay accesos") durante el primer frame. Es deliberadamente
 * sobria: logo, marca y una línea de progreso indeterminada.
 *
 * El fondo coincide con el `backgroundColor` de la BrowserWindow (#070b13), así
 * que la transición desde el primer frame de Chromium no produce destellos.
 */
export default function BootLoader() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b13]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ background: 'radial-gradient(circle at 50% 44%, rgba(34, 211, 238, 0.10), transparent 58%)' }}
      />

      <motion.div
        className="relative flex flex-col items-center gap-3.5"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
      >
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-cyan-400/15 blur-xl" aria-hidden="true" />
          <CyberTrayLogo className="relative w-9 h-9" animated={!reduceMotion} />
        </div>

        <CyberTrayWordmark className="text-[13px] uppercase tracking-[0.34em] text-slate-300" />

        <div className="mt-1.5 h-[2px] w-32 overflow-hidden rounded-full bg-slate-800/70" aria-hidden="true">
          {reduceMotion ? (
            <span className="block h-full w-1/3 rounded-full bg-[var(--neon-glow-color)] opacity-70" />
          ) : (
            <motion.span
              className="block h-full w-1/3 rounded-full bg-[var(--neon-glow-color)]"
              animate={{ x: ['-120%', '340%'] }}
              transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        <span className="text-[9px] font-mono uppercase tracking-[0.32em] text-slate-500">
          {translate('boot_loading')}
        </span>
      </motion.div>
    </motion.div>
  );
}
