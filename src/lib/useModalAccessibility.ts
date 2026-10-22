import { useEffect, type RefObject } from 'react';

/**
 * Accesibilidad de los modales.
 *
 * - Escape cierra el modal.
 * - El foco queda atrapado dentro del modal mientras está abierto (Tab no se
 *   escapa al contenido de detrás).
 * - Al abrir, el foco entra en el modal; al cerrar, vuelve al elemento que
 *   lo tenía antes.
 */
export function useModalAccessibility(
  modalRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose?: () => void
) {
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusFirst = () => {
      const target =
        modal.querySelector<HTMLElement>('[data-autofocus]') ??
        modal.querySelector<HTMLElement>(focusableSelector);
      target?.focus();
    };

    // El foco entra en el modal en el siguiente fotograma, cuando ya está montado.
    const raf = requestAnimationFrame(focusFirst);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !modal.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, modalRef, onClose]);
}
