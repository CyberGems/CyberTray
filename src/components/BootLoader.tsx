import { motion, useReducedMotion } from 'motion/react';
import { CyberTrayWordmark } from './CyberTrayLogo';
import CyberTrayMark from './CyberTrayMark';
import { translate } from '../locales';

/**
 * Pantalla de arranque.
 *
 * Cubre la ventana hasta que la configuración está cargada, para que no se vea
 * el estado vacío ("no hay accesos") durante el primer frame. Muestra el icono
 * de la aplicación a tamaño grande, la marca y una línea de progreso
 * indeterminada.
 *
 * El icono es el vectorial de `CyberTrayMark`, no el PNG, porque sus cuatro
 * piezas interiores se animan por separado con un zoom escalonado.
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
        style={{ background: 'radial-gradient(circle at 50% 45%, rgba(34, 211, 238, 0.13), transparent 62%)' }}
      />

      <motion.div
        className="relative flex flex-col items-center"
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: 'easeOut' }}
      >
        <div className="relative">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[250%] w-[250%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(circle, rgba(83, 234, 253, 0.16), rgba(34, 211, 238, 0.05) 46%, transparent 68%)',
            }}
          />
          <CyberTrayMark
            animated={!reduceMotion}
            className="relative h-[clamp(140px,20vmin,260px)] w-[clamp(140px,20vmin,260px)] drop-shadow-[0_0_26px_rgba(112,204,221,0.22)]"
          />
        </div>

        <CyberTrayWordmark className="mt-8 text-[22px] uppercase tracking-[0.34em] text-slate-300" />

        <div className="mt-6 h-[3px] w-64 overflow-hidden rounded-full bg-slate-800/70" aria-hidden="true">
          {reduceMotion ? (
            <span className="block h-full w-1/3 rounded-full bg-[var(--neon-glow-color)] opacity-70" />
          ) : (
            <motion.span
              className="block h-full w-1/3 rounded-full bg-[var(--neon-glow-color)]"
              animate={{ x: ['-120%', '340%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        <span className="mt-4 text-[10px] font-mono uppercase tracking-[0.32em] text-slate-500">
          {translate('boot_loading')}
        </span>
      </motion.div>
    </motion.div>
  );
}
