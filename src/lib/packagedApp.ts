/**
 * Identidad de una app empaquetada (MSIX / Microsoft Store) deducida de un
 * acceso directo.
 *
 * Un `.lnk` que apunta a una app del Store guarda en su flujo UTF-16 la ruta
 * real `C:\Program Files\WindowsApps\<PackageFullName>\...` o incluso el AUMID
 * completo. El shell no puede resolverlo: esa carpeta está protegida y el
 * proceso no puede leerla, así que el acceso se queda apuntando al `.lnk` y la
 * app termina clasificada como un programa más. El texto del archivo sí lleva
 * la respuesta, y ahí es donde entra este módulo.
 */

/** El editor del paquete: 13 caracteres en base 32, siempre en minúsculas. */
const PUBLISHER_ID = '[a-z0-9]{13}';

/**
 * `Nombre_Version_Arquitectura_Recurso_PublisherId` es el `PackageFullName`,
 * el nombre con el que Windows instala el paquete.
 */
const PACKAGE_FULL_NAME = new RegExp(
  `([A-Za-z0-9][A-Za-z0-9.\\-]*)_(\\d+(?:\\.\\d+){1,3})_([A-Za-z0-9]+)_([A-Za-z0-9]*)_(${PUBLISHER_ID})`,
);

/** `Familia_editor!AppId` identifica una aplicación concreta del paquete. */
const AUMID = new RegExp(`([A-Za-z0-9][A-Za-z0-9.\\-]*_${PUBLISHER_ID})!([A-Za-z0-9][A-Za-z0-9._\\-]*)`);

/** `Familia_editor` sin la aplicación: sirve para preguntar cuál es. */
const PACKAGE_FAMILY = new RegExp(`([A-Za-z0-9][A-Za-z0-9.\\-]*_${PUBLISHER_ID})(?![A-Za-z0-9])`);

export interface PackageIdentity {
  /** `Familia_editor`, la mitad izquierda de un AUMID. */
  family: string;
  /** AUMID completo si el `.lnk` ya lo traía; vacío si solo se sabe la familia. */
  aumid: string;
}

/**
 * AUMID escrito tal cual en el texto del `.lnk`. Es el caso más afortunado:
 * no hace falta preguntar nada al sistema.
 */
export function aumidFromLnkText(text: string): string {
  const match = String(text || '').match(AUMID);
  return match ? `${match[1]}!${match[2]}` : '';
}

/**
 * Nombre de familia del paquete. Se prefiere el `PackageFullName` porque el
 * `.lnk` casi nunca escribe la familia sola, y de ahí sale quitando la versión,
 * la arquitectura y el identificador de recurso.
 */
export function packageFamilyFromLnkText(text: string): string {
  const raw = String(text || '');
  const full = raw.match(PACKAGE_FULL_NAME);
  if (full) return `${full[1]}_${full[5]}`;
  const aumid = raw.match(AUMID);
  if (aumid) return aumid[1];
  const family = raw.match(PACKAGE_FAMILY);
  return family ? family[1] : '';
}

/** Identidad completa que se puede leer del propio archivo. */
export function packageIdentityFromLnkText(text: string): PackageIdentity | null {
  const aumid = aumidFromLnkText(text);
  const family = packageFamilyFromLnkText(text);
  if (!family && !aumid) return null;
  return {
    family: family || aumid.split('!')[0],
    aumid,
  };
}

/**
 * Completa el AUMID a partir de la familia usando la lista de apps del sistema
 * (`Get-StartApps`).
 *
 * El emparejamiento es estricto a propósito: la familia debe coincidir entera.
 * Si el paquete publica varias aplicaciones y ninguna se puede identificar por
 * el nombre del acceso, se devuelve vacío antes que adivinar y lanzar otra.
 */
export function aumidForFamily(
  family: string,
  listing: Array<{ aumid: string; name?: string }> = [],
  hint = '',
): string {
  const wanted = String(family || '').trim().toLowerCase();
  if (!wanted || !wanted.includes('_')) return '';

  const candidates = listing
    .map(entry => String(entry?.aumid || '').trim())
    .filter(aumid => aumid.includes('!') && aumid.split('!')[0].toLowerCase() === wanted);
  if (candidates.length === 0) return '';
  if (candidates.length === 1) return candidates[0];

  // Varias apps en el mismo paquete (paquetes con más de un punto de entrada):
  // se intenta reconocer la correcta por el nombre del acceso.
  const needle = String(hint || '').trim().toLowerCase();
  if (!needle) return '';
  const exact = candidates.find(aumid => aumid.split('!')[1].toLowerCase() === needle);
  if (exact) return exact;
  const prefixed = candidates.find(aumid => {
    const appId = aumid.split('!')[1].toLowerCase();
    return appId.startsWith(needle) || needle.startsWith(appId);
  });
  return prefixed || '';
}
