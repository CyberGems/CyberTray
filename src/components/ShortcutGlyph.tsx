/**
 * Glifo vectorial para cualquier acceso sin icono propio.
 *
 * Cuando no hay icono (un `.url` sin `IconFile`, un ejecutable cuya extracción
 * falló, un alias de la tienda sin imagen...) Windows tiende a dar el globo 3D
 * genérico, que parece un enlace roto. En su lugar se dibuja esta flecha
 * curva, plana y con el color de acento de la app.
 */

interface ShortcutGlyphProps {
  className?: string;
}

export default function ShortcutGlyph({ className = '' }: ShortcutGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4.6 19.4v-1.9a5.2 5.2 0 0 1 5.2-5.2h9.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M14.4 8.1 20.2 12.7 14.4 17.3Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
