/**
 * Glifo de "suelta aquí": una flecha que baja hacia una bandeja.
 *
 * Es el mismo dibujo que abre el panel de bienvenida de CyberViewer, para que
 * los dos productos hablen el mismo idioma cuando todavía no hay contenido.
 * Hereda el color del contenedor (`currentColor`).
 */
export default function DropGlyph({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M 12.5 37 A 22 9.5 0 1 0 51.5 37"
        stroke="currentColor"
        strokeWidth={6.6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 28 5 L 36 5 A 2.5 2.5 0 0 1 38.5 7.5 L 38.5 22 L 46.844 22 A 1.2 1.2 0 0 1 47.641 24.097 L 33.661 36.524 A 2.5 2.5 0 0 1 30.339 36.524 L 16.359 24.097 A 1.2 1.2 0 0 1 17.156 22 L 25.5 22 L 25.5 7.5 A 2.5 2.5 0 0 1 28 5 Z"
        fill="currentColor"
      />
    </svg>
  );
}
