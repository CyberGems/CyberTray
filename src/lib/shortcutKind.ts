/**
 * Clasificación por tipo de los accesos del estante.
 *
 * El tipo no se guarda en el archivo de configuración: se deduce del destino,
 * que es lo único que sobrevive a una importación, a una edición manual del
 * JSON o a una versión anterior de la app. Cualquier cambio aquí se aplica a
 * toda la biblioteca existente sin migración.
 */

export type ShortcutKind = 'program' | 'store' | 'steam' | 'link' | 'file' | 'script';

export type ShortcutKindFilter = ShortcutKind | 'all';

/** Orden en el que se ofrecen los filtros. */
export const SHORTCUT_KINDS: ShortcutKind[] = ['program', 'store', 'steam', 'link', 'script', 'file'];

/** Extensiones que Windows ejecuta como programa. */
const PROGRAM_EXTENSIONS = new Set([
  'exe', 'lnk', 'msc', 'appref-ms', 'com', 'pif', 'cpl', 'scr', 'appx', 'appxbundle', 'msix', 'msixbundle',
]);

/** Extensiones que se interpretan con un motor de script. */
const SCRIPT_EXTENSIONS = new Set(['bat', 'cmd', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh']);

/**
 * Un AUMID de la Microsoft Store lleva familia y aplicación separadas por `_` y
 * `!` (`5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App`). Los identificadores
 * sueltos que escriben algunas apps Electron (`bot.cline.app`) no lo son.
 */
export function isStoreAppId(target: string): boolean {
  const value = String(target || '').trim();
  return value.includes('_') && value.includes('!')
    && !value.includes('\\') && !value.includes('/') && !value.includes(':');
}

/**
 * Protocolo del destino (`steam://`, `https://`, `mailto:`), o cadena vacía si
 * es una ruta. Se exigen dos letras o más para no confundir la unidad `C:`.
 */
function protocolScheme(target: string): string {
  const match = String(target || '').trim().match(/^([a-z][a-z0-9+.-]+):/i);
  return match ? match[1].toLowerCase() : '';
}

function fileExtension(target: string): string {
  const base = String(target || '').trim().split(/[\\/]/).pop() || '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Un juego de Steam instalado se resuelve a su `.exe` real, así que el destino
 * ya no dice "steam". La carpeta de la biblioteca sí lo dice.
 */
function looksLikeSteamInstall(target: string, cwd: string): boolean {
  return /[\\/]steamapps[\\/]common[\\/]/i.test(target) || /[\\/]steamapps[\\/]common[\\/]/i.test(cwd);
}

export function classifyShortcut(item: { path?: string; cwd?: string } | null | undefined): ShortcutKind {
  const rawPath = String(item?.path || '').trim();
  const cwd = String(item?.cwd || '').trim();
  if (!rawPath) return 'file';

  if (isStoreAppId(rawPath)) return 'store';

  const scheme = protocolScheme(rawPath);
  if (scheme === 'steam') return 'steam';
  if (scheme && scheme !== 'file') return 'link';

  // `file:///C:/...` es una ruta con protocolo: se clasifica por su extensión.
  const target = scheme === 'file'
    ? decodeURIComponent(rawPath.replace(/^file:\/{2,}/i, ''))
    : rawPath;

  if (looksLikeSteamInstall(target, cwd)) return 'steam';

  const ext = fileExtension(target);
  if (PROGRAM_EXTENSIONS.has(ext)) return 'program';
  if (SCRIPT_EXTENSIONS.has(ext)) return 'script';
  return 'file';
}

export function countShortcutKinds(list: Array<{ path?: string; cwd?: string }> = []): Record<ShortcutKind, number> {  const counts: Record<ShortcutKind, number> = { program: 0, store: 0, steam: 0, link: 0, file: 0, script: 0 };
  for (const item of list) {
    counts[classifyShortcut(item)] += 1;
  }
  return counts;
}

/**
 * `true` si el icono se puede volver a extraer.
 *
 * Hace falta un archivo real o un paquete instalado: un enlace, o un juego de
 * Steam que ya no está instalado (su destino se quedó en `steam://`), no tienen
 * de dónde sacar el logo.
 */
export function hasExtractableIcon(item: { path?: string; cwd?: string } | null | undefined): boolean {
  const kind = classifyShortcut(item);
  if (kind === 'link') return false;
  if (kind === 'steam') return protocolScheme(String(item?.path || '').trim()) === '';
  return true;
}

/** Clave de traducción del nombre de cada tipo. */
export const SHORTCUT_KIND_LABEL_KEYS: Record<ShortcutKind | 'all', string> = {
  all: 'kind_all',
  program: 'kind_program',
  store: 'kind_store',
  steam: 'kind_steam',
  link: 'kind_link',
  file: 'kind_file',
  script: 'kind_script',
};
