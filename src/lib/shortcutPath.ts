/**
 * Clasificación mínima de un destino de acceso.
 *
 * Vive aparte de `appUtils` porque la necesita también el proceso main (al
 * resolver accesos y al migrar iconos), y `appUtils` arrastra más peso.
 */

/** `true` si el destino es una URL web, es decir un acceso `.url`. */
export function isUrlPath(value: string | undefined | null): boolean {
  return /^https?:\/\//i.test(String(value || '').trim());
}
