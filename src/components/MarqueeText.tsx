import { useLayoutEffect, useRef, useState } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Línea de una sola tirada que se desplaza de ida y vuelta cuando no cabe.
 *
 * El recorrido se mide al montar (y cada vez que cambia el ancho), no al pasar
 * el ratón: así la animación la dispara el CSS con `:hover` sobre la ficha y la
 * rejilla no vuelve a pintar sus decenas de elementos cada vez que el puntero
 * entra en uno. En reposo el texto se recorta con un degradado en lugar de un
 * corte seco, que es lo que hacía que una ruta larga pareciera rota.
 */
export default function MarqueeText({ text, className = '', style }: MarqueeTextProps) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      // Por debajo de 4 px el recorte no se aprecia y el vaivén solo distraería.
      const overflow = content.scrollWidth - viewport.clientWidth;
      setShift(overflow > 4 ? overflow : 0);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, [text]);

  // 26 px/s: más lento se hace eterno, más rápido no da tiempo a leerlo.
  const duration = Math.min(14, Math.max(3.2, shift / 26)).toFixed(2);

  return (
    <span
      ref={viewportRef}
      className={`block overflow-hidden whitespace-nowrap ${shift ? 'ct-marquee' : ''} ${className}`}
      style={style}
    >
      <span
        ref={contentRef}
        className="ct-marquee-run inline-block w-max align-top"
        style={{
          '--ct-marquee-shift': `-${shift}px`,
          '--ct-marquee-duration': `${duration}s`,
        } as React.CSSProperties}
      >
        {text}
      </span>
    </span>
  );
}
