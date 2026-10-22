/** Resolve a shortcut icon for <img src>. Supports data URLs, local-resource, http, and raw disk paths. */

/**
 * Construye una URL `local-resource://` para una ruta absoluta en disco.
 *
 * `#` y `?` se escapan porque, sin codificar, el navegador los interpreta
 * como fragmento y query string y recorta la ruta.
 */
export function localResourceUrl(absolutePath: string): string {
  const normalized = absolutePath.replace(/\\/g, '/');
  return `local-resource:///${normalized.replace(/#/g, '%23').replace(/\?/g, '%3F')}`;
}

export function shortcutIconSrc(iconPath?: string): string {
  if (!iconPath) return '';
  if (
    iconPath.startsWith('data:') ||
    iconPath.startsWith('http://') ||
    iconPath.startsWith('https://') ||
    iconPath.startsWith('local-resource:') ||
    iconPath.startsWith('/')
  ) {
    return iconPath;
  }
  return localResourceUrl(iconPath);
}
