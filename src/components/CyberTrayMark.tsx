import { motion } from 'motion/react';
import type { Easing } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Réplica vectorial del icono de la aplicación (icon.png), con las cuatro piezas
 * interiores (tres cuadrados y el signo "+") como elementos independientes para
 * poder animarlas por separado.
 *
 * La geometría se midió sobre el PNG de 1024 px: marco 1024, radio 187; cara
 * interior desde 45 con radio 140; cuadrados de 264 con radio 61.5; y el "+" son
 * dos barras de 74 px de grosor con radio 6.5. Colores muestreados del original.
 *
 * El PNG sigue siendo la fuente de verdad para el icono del sistema; esto solo
 * existe para poder animar las piezas.
 */

const RING_COLOR = '#70CCDD';
const FACE_COLOR = '#0E1726';
const TILE_COLOR = '#249BB3';
const PLUS_COLOR = '#53EAFD';

const TILE_RADIUS = 61.5;
const TILE_SIZE = 264;

/** Duración de un pulso (segundos). */
const PULSE = 0.44;
/** Separación entre pulsos: el ciclo completo recorre las cuatro piezas. */
const BEAT = 0.62;

type Tile = { key: string; x: number; y: number };

/**
 * Orden del pulso. Va de arriba a abajo y de izquierda a derecha, cerrando con
 * el "+" para que el recorrido termine en la esquina de añadir.
 */
const TILES: Tile[] = [
  { key: 'tile-top-left', x: 180, y: 181 },
  { key: 'tile-top-right', x: 578, y: 181 },
  { key: 'tile-bottom-left', x: 180, y: 583 },
];

function pulseTransition(index: number) {
  return {
    duration: PULSE,
    times: [0, 0.4, 1],
    ease: ['easeOut', 'easeInOut'] as Easing[],
    repeat: Infinity,
    // Un elemento cada BEAT, así que el hueco es lo que resta del ciclo.
    repeatDelay: BEAT * 4 - PULSE,
    delay: index * BEAT,
  };
}

/**
 * Envuelve una pieza para escalarla sobre su propio centro. `fill-box` es
 * necesario porque en SVG el origen por defecto es el del viewBox, no el del
 * elemento.
 */
function Pulso({
  part,
  index,
  animated,
  children,
}: {
  part: string;
  index: number;
  animated: boolean;
  children: ReactNode;
}) {
  return (
    <motion.g
      data-part={part}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      animate={animated ? { scale: [1, 1.16, 1] } : undefined}
      transition={animated ? pulseTransition(index) : undefined}
    >
      {children}
    </motion.g>
  );
}

export default function CyberTrayMark({
  className = 'w-10 h-10',
  animated = true,
  label,
}: {
  className?: string;
  /** Anima el zoom de cada pieza, una a la vez. */
  animated?: boolean;
  /** Nombre accesible. Sin él el icono se marca como decorativo. */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {label ? <title>{label}</title> : null}

      <rect x="0" y="0" width="1024" height="1024" rx="187" fill={RING_COLOR} />
      <rect x="45" y="45" width="934" height="934" rx="140" fill={FACE_COLOR} />

      {TILES.map((tile, index) => (
        <Pulso key={tile.key} part={tile.key} index={index} animated={animated}>
          <rect
            x={tile.x}
            y={tile.y}
            width={TILE_SIZE}
            height={TILE_SIZE}
            rx={TILE_RADIUS}
            fill={TILE_COLOR}
          />
        </Pulso>
      ))}

      <Pulso part="plus" index={3} animated={animated}>
        <g fill={PLUS_COLOR}>
          <rect x="581" y="676" width="262" height="74" rx="6.5" />
          <rect x="676" y="582" width="74" height="262" rx="6.5" />
        </g>
      </Pulso>
    </svg>
  );
}
