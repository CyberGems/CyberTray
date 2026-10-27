/**
 * Glifo vectorial para accesos web.
 *
 * Un `.url` sin `IconFile` hereda el globo 3D genérico de Windows, que no dice
 * nada y desentona con el resto. Cuando no hay icono propio se dibuja esta
 * flecha curva, plana y con el color de acento de la app.
 */

interface UrlLinkIconProps {
  className?: string;
}

export default function UrlLinkIcon({ className = '' }: UrlLinkIconProps) {
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
