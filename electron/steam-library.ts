import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Un acceso creado por Steam es un `.url` cuyo destino es `steam://rungameid/<id>`.
 * Esa cadena sirve para lanzar el juego, pero no es una ruta: no se puede abrir
 * su carpeta, no se puede comprobar si el juego sigue instalado y, como subtítulo
 * bajo el nombre, no dice nada. Este módulo traduce ese identificador al
 * ejecutable real leyendo los manifiestos que Steam deja en disco.
 */

/** Protocolos con los que Steam lanza un juego ya instalado. */
const STEAM_URL_PATTERN = /^steam:\/\/(?:rungameid|run|launch)\/(\d+)/i;

/** Ejecutables que acompañan al juego pero no lo inician. */
const STEAM_HELPER_EXECUTABLES = [
  /^unitycrashhandler/i,
  /crashhandler/i,
  /^crashpad/i,
  /^unins\d*/i,
  /^uninstall/i,
  /^vcredist/i,
  /^vc_?redist/i,
  /^(dx|oal|dotnet|ue4prereq)setup/i,
  /^dxwebsetup/i,
  /errorreporter/i,
  /^notification_helper/i,
  /^launcher_installer/i,
  /^steam_?api/i,
];

export function steamAppIdFromUrl(url: string): string {
  const match = String(url || '').trim().match(STEAM_URL_PATTERN);
  return match ? match[1] : '';
}

function unescapeVdf(value: string): string {
  // En los VDF la barra invertida va escapada (`C:\\SteamLibrary`).
  return String(value || '').replace(/\\\\/g, '\\');
}

function dedupePaths(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = String(value || '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/**
 * Bibliotecas de Steam declaradas en `libraryfolders.vdf`.
 *
 * El formato actual guarda cada biblioteca en un bloque con `"path" "..."`.
 * Las instalaciones antiguas listaban las rutas directamente (`"1" "D:\\Games"`),
 * así que se admiten las dos formas.
 */
export function parseSteamLibraryFolders(vdf: string): string[] {
  const text = String(vdf || '');
  const paths: string[] = [];

  const blockPattern = /"path"\s+"([^"]*)"/gi;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(text)) !== null) {
    paths.push(unescapeVdf(match[1]));
  }
  if (paths.length > 0) return dedupePaths(paths);

  const legacyPattern = /^\s*"\d+"\s+"([A-Za-z]:[^"]*)"/gm;
  while ((match = legacyPattern.exec(text)) !== null) {
    paths.push(unescapeVdf(match[1]));
  }
  return dedupePaths(paths);
}

/** `appmanifest_<id>.acf`: nombre visible y carpeta de instalación del juego. */
export function parseSteamAppManifest(acf: string): { name: string; installDir: string } {
  const text = String(acf || '');
  return {
    name: text.match(/"name"\s+"([^"]*)"/i)?.[1] || '',
    installDir: unescapeVdf(text.match(/"installdir"\s+"([^"]*)"/i)?.[1] || ''),
  };
}

function normalizeGameName(value: string): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isHelperExecutable(fileName: string): boolean {
  return STEAM_HELPER_EXECUTABLES.some(pattern => pattern.test(fileName));
}

/**
 * Carpetas que no contienen el ejecutable del juego: datos, recursos y
 * redistribuibles. Recorrerlas cuesta tiempo y solo aporta candidatos falsos
 * (un instalador de una dependencia, por ejemplo).
 */
const STEAM_IGNORED_FOLDERS = [
  /^data$/i,
  /_data$/i,
  /^content$/i,
  /^assets$/i,
  /^paks$/i,
  /^resources$/i,
  /^mods?([_-].*)?$/i,
  /^mono/i,
  /^dotnet/i,
  /^locales?$/i,
  /^fonts?$/i,
  /^(redist|_commonredist|directx|vcredist)/i,
  /^(engine|plugins)$/i,
];

const STEAM_EXE_SEARCH_DEPTH = 2;
const STEAM_EXE_SEARCH_LIMIT = 300;

/**
 * Elige el ejecutable del juego entre los `.exe` de su carpeta.
 *
 * No sirve quedarse con el más grande ni con el primero: los juegos de Unity
 * instalan `UnityCrashHandler64.exe`, que suele pesar más que el propio juego.
 * Manda la coincidencia con la carpeta de instalación ("AdVenture Capitalist"
 * → `adventure-capitalist.exe`), después el tamaño y, a igualdad, la ruta más
 * superficial. Devuelve la ruta relativa a la carpeta del juego, porque muchos
 * lo esconden en subcarpetas (`bin/x64/factorio.exe`, `bin/64bit/obs64.exe`).
 */
export function pickSteamExecutable(
  candidates: Array<{ name: string; size: number; relativePath?: string; depth?: number }>,
  installDir: string,
): string {
  const usable = candidates
    .map(candidate => ({
      path: candidate.relativePath || candidate.name,
      name: path.basename(candidate.name),
      size: candidate.size,
      depth: candidate.depth ?? 0,
    }))
    .filter(candidate => !isHelperExecutable(candidate.name));
  if (usable.length === 0) return '';

  const wanted = normalizeGameName(installDir);
  const score = (normalized: string): number => {
    if (!wanted || !normalized) return 0;
    if (normalized === wanted) return 100;
    if (normalized.length >= 4 && (wanted.startsWith(normalized) || normalized.startsWith(wanted))) return 60;
    return 0;
  };

  const ranked = usable
    .map(candidate => ({ candidate, score: score(normalizeGameName(candidate.name)) }))
    .sort((a, b) => b.score - a.score
      || a.candidate.depth - b.candidate.depth
      || b.candidate.size - a.candidate.size);

  return ranked[0].candidate.path;
}

function listExecutables(folder: string): Array<{ name: string; size: number; relativePath: string; depth: number }> {
  const found: Array<{ name: string; size: number; relativePath: string; depth: number }> = [];

  const walk = (current: string, depth: number): void => {
    if (found.length >= STEAM_EXE_SEARCH_LIMIT) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= STEAM_EXE_SEARCH_LIMIT) return;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (depth >= STEAM_EXE_SEARCH_DEPTH) continue;
        if (STEAM_IGNORED_FOLDERS.some(pattern => pattern.test(entry.name))) continue;
        walk(fullPath, depth + 1);
        continue;
      }
      if (!entry.name.toLowerCase().endsWith('.exe')) continue;
      try {
        found.push({
          name: entry.name,
          size: fs.statSync(fullPath).size,
          relativePath: path.relative(folder, fullPath),
          depth,
        });
      } catch {
        found.push({ name: entry.name, size: 0, relativePath: path.relative(folder, fullPath), depth });
      }
    }
  };

  walk(folder, 0);
  return found;
}

let steamRootsPromise: Promise<string[]> | null = null;
const libraryListCache = new Map<string, string[]>();

/**
 * Raíces de instalación de Steam. El registro es la fuente fiable, pero leerlo
 * cuesta un proceso: se resuelve una sola vez por sesión.
 */
function discoverSteamRoots(): Promise<string[]> {
  if (steamRootsPromise) return steamRootsPromise;
  steamRootsPromise = (async () => {
    const roots: string[] = [];
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execFileAsync(
          'reg',
          ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'],
          { windowsHide: true, timeout: 5000, encoding: 'utf-8' },
        );
        const registered = String(stdout || '').match(/SteamPath\s+REG_SZ\s+(.+)/i)?.[1];
        if (registered) roots.push(registered.trim());
      } catch {
        // Sin registro se usan las rutas por defecto.
      }
    }
    for (const base of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA]) {
      if (base) roots.push(path.join(base, 'Steam'));
    }
    return dedupePaths(roots).filter(root => fs.existsSync(root));
  })().then(roots => {
    // Un fallo no se memoriza: la próxima importación vuelve a intentarlo.
    if (roots.length === 0) steamRootsPromise = null;
    return roots;
  });
  return steamRootsPromise;
}

/** Todas las bibliotecas: las raíces conocidas más lo que declaren sus VDF. */
export async function steamLibraryPaths(iconPath?: string): Promise<string[]> {
  const roots: string[] = [];
  // El propio acceso de Steam apunta a `<Steam>\steam\games\<hash>.ico`: de ahí
  // sale la raíz sin tocar el registro.
  const fromIcon = String(iconPath || '').match(/^(.*)[\\/]steam[\\/]games[\\/][^\\/]+\.ico$/i)?.[1];
  if (fromIcon) roots.push(fromIcon);
  roots.push(...await discoverSteamRoots());

  const libraries: string[] = [];
  for (const root of dedupePaths(roots)) {
    libraries.push(root);
    let declared = libraryListCache.get(root.toLowerCase());
    if (!declared) {
      const vdfPath = path.join(root, 'steamapps', 'libraryfolders.vdf');
      try {
        declared = parseSteamLibraryFolders(fs.readFileSync(vdfPath, 'utf-8'));
        libraryListCache.set(root.toLowerCase(), declared);
      } catch {
        declared = [];
      }
    }
    libraries.push(...declared);
  }

  return dedupePaths(libraries).filter(library => fs.existsSync(library));
}

/**
 * Busca el juego en una lista de bibliotecas ya conocida. Se separa de la
 * detección de rutas para poder probarlo sobre una biblioteca de mentira.
 */
export function findSteamGameExecutable(libraries: string[], appId: string): string {
  const id = String(appId || '').trim();
  if (!/^\d+$/.test(id)) return '';

  for (const library of libraries) {
    const manifestPath = path.join(library, 'steamapps', `appmanifest_${id}.acf`);
    if (!fs.existsSync(manifestPath)) continue;

    let installDir = '';
    try {
      installDir = parseSteamAppManifest(fs.readFileSync(manifestPath, 'utf-8')).installDir;
    } catch {
      continue;
    }
    if (!installDir) continue;

    const gameFolder = path.join(library, 'steamapps', 'common', installDir);
    if (!fs.existsSync(gameFolder)) continue;

    const executable = pickSteamExecutable(listExecutables(gameFolder), installDir);
    if (executable) return path.join(gameFolder, executable);
  }

  return '';
}

/**
 * Ejecutable real de un juego instalado, o cadena vacía si no se puede saber
 * (juego desinstalado, biblioteca en un disco desconectado, manifiesto ausente).
 */
export async function resolveSteamGameExecutable(appId: string, options: { iconPath?: string } = {}): Promise<string> {
  return findSteamGameExecutable(await steamLibraryPaths(options.iconPath), appId);
}
