/** Resolve a shortcut icon for <img src>. Supports data URLs, local-resource, http, and raw disk paths. */
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
  return `local-resource:///${iconPath.replace(/\\/g, '/')}`;
}
