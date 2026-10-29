import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  findSteamGameExecutable,
  parseSteamAppManifest,
  parseSteamLibraryFolders,
  pickSteamExecutable,
  steamAppIdFromUrl,
} from '../../electron/steam-library';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'CyberTray-steam-test-'));
afterAll(() => fs.rmSync(temporary, { recursive: true, force: true }));

function writeFile(filePath: string, content = ''): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe('steamAppIdFromUrl', () => {
  it('lee el identificador de los protocolos que lanzan un juego', () => {
    expect(steamAppIdFromUrl('steam://rungameid/346900')).toBe('346900');
    expect(steamAppIdFromUrl('steam://run/842150')).toBe('842150');
    expect(steamAppIdFromUrl('  steam://launch/4147070  ')).toBe('4147070');
  });

  it('no confunde otras URL con un juego', () => {
    expect(steamAppIdFromUrl('https://store.steampowered.com/app/346900')).toBe('');
    expect(steamAppIdFromUrl('steam://open/friends')).toBe('');
    expect(steamAppIdFromUrl('')).toBe('');
  });
});

describe('parseSteamLibraryFolders', () => {
  it('lee el formato con bloques por biblioteca', () => {
    const vdf = [
      '"libraryfolders"',
      '{',
      '\t"0"',
      '\t{',
      '\t\t"path"\t\t"C:\\\\Program Files (x86)\\\\Steam"',
      '\t\t"apps"',
      '\t\t{',
      '\t\t\t"228980"\t\t"150976"',
      '\t\t}',
      '\t}',
      '\t"1"',
      '\t{',
      '\t\t"path"\t\t"E:\\\\SteamLibrary"',
      '\t\t"apps"',
      '\t\t{',
      '\t\t\t"346900"\t\t"2657"',
      '\t\t}',
      '\t}',
      '}',
    ].join('\n');
    expect(parseSteamLibraryFolders(vdf)).toEqual(['C:\\Program Files (x86)\\Steam', 'E:\\SteamLibrary']);
  });

  it('lee el formato antiguo, con la ruta como valor', () => {
    const vdf = ['"LibraryFolders"', '{', '\t"TimeNextStatsReport"\t\t"1699999999"', '\t"1"\t\t"D:\\\\Games\\\\SteamLibrary"', '}'].join('\n');
    expect(parseSteamLibraryFolders(vdf)).toEqual(['D:\\Games\\SteamLibrary']);
  });

  it('devuelve una lista vacía si el archivo no tiene bibliotecas', () => {
    expect(parseSteamLibraryFolders('')).toEqual([]);
    expect(parseSteamLibraryFolders('"libraryfolders"\n{\n}')).toEqual([]);
  });
});

describe('parseSteamAppManifest', () => {
  it('extrae el nombre y la carpeta de instalación', () => {
    const acf = ['"AppState"', '{', '\t"appid"\t\t"346900"', '\t"name"\t\t"AdVenture Capitalist"', '\t"installdir"\t\t"AdVenture Capitalist"', '}'].join('\n');
    expect(parseSteamAppManifest(acf)).toEqual({ name: 'AdVenture Capitalist', installDir: 'AdVenture Capitalist' });
  });

  it('tolera un manifiesto incompleto', () => {
    expect(parseSteamAppManifest('"AppState"\n{\n}')).toEqual({ name: '', installDir: '' });
  });
});

describe('pickSteamExecutable', () => {
  // Los tres juegos de Steam instalados en el equipo real: en todos ellos el
  // crash handler de Unity pesa más que el propio juego.
  it('prefiere el ejecutable que coincide con la carpeta de instalación', () => {
    expect(pickSteamExecutable([
      { name: 'adventure-capitalist.exe', size: 639_488 },
      { name: 'UnityCrashHandler32.exe', size: 1_333_760 },
    ], 'AdVenture Capitalist')).toBe('adventure-capitalist.exe');
  });

  it('reconoce el nombre aunque vaya todo junto', () => {
    expect(pickSteamExecutable([
      { name: 'FlowFactoryBeta.exe', size: 667_648 },
      { name: 'UnityCrashHandler64.exe', size: 1_555_880 },
    ], 'Flow Factory Beta')).toBe('FlowFactoryBeta.exe');
  });

  it('acepta un nombre parcial cuando la carpeta añade palabras', () => {
    expect(pickSteamExecutable([
      { name: 'UnityCrashHandler32.exe', size: 1_479_600 },
      { name: 'wildwest.exe', size: 647_168 },
    ], 'Wild West Saga')).toBe('wildwest.exe');
  });

  it('nunca elige un ayudante, ni siquiera siendo el más grande', () => {
    expect(pickSteamExecutable([
      { name: 'UnityCrashHandler64.exe', size: 9_000_000 },
      { name: 'Game.exe', size: 10_000 },
      { name: 'unins000.exe', size: 8_000_000 },
      { name: 'vcredist_x64.exe', size: 7_000_000 },
      { name: 'crashpad_handler.exe', size: 6_000_000 },
    ], 'Whatever')).toBe('Game.exe');
  });

  it('sin coincidencia de nombre se queda con el mayor de los candidatos', () => {
    expect(pickSteamExecutable([
      { name: 'small.exe', size: 10 },
      { name: 'big.exe', size: 20 },
    ], 'Otro Juego')).toBe('big.exe');
  });

  it('devuelve vacío cuando solo hay ayudantes', () => {
    expect(pickSteamExecutable([{ name: 'UnityCrashHandler32.exe', size: 1 }], 'Juego')).toBe('');
    expect(pickSteamExecutable([], 'Juego')).toBe('');
  });

  it('devuelve la ruta relativa cuando el juego esconde el ejecutable en una subcarpeta', () => {
    expect(pickSteamExecutable([
      { name: 'factorio.exe', size: 43_505_616, relativePath: 'bin\\x64\\factorio.exe', depth: 2 },
      { name: 'Epson_L1250_Series_EM_10_Web.exe', size: 8_634_424, relativePath: 'mods_IR3\\Epson_L1250_Series_EM_10_Web.exe', depth: 1 },
    ], 'Factorio')).toBe('bin\\x64\\factorio.exe');
  });

  it('a igualdad de parecido prefiere la ruta menos profunda', () => {
    expect(pickSteamExecutable([
      { name: 'Game.exe', size: 100, relativePath: 'bin\\Game.exe', depth: 1 },
      { name: 'Game.exe', size: 100, relativePath: 'Game.exe', depth: 0 },
    ], 'Otra Cosa')).toBe('Game.exe');
  });

  it('sin coincidencia de nombre elige el mayor, como obs64.exe en OBS Studio', () => {
    expect(pickSteamExecutable([
      { name: 'obs-amf-test.exe', size: 27_408, relativePath: 'bin\\64bit\\obs-amf-test.exe', depth: 2 },
      { name: 'obs64.exe', size: 5_405_968, relativePath: 'bin\\64bit\\obs64.exe', depth: 2 },
      { name: 'obs-browser-page.exe', size: 563_472, relativePath: 'obs-plugins\\64bit\\obs-browser-page.exe', depth: 2 },
    ], 'OBS Studio')).toBe('bin\\64bit\\obs64.exe');
  });
});

describe('findSteamGameExecutable', () => {
  const library = path.join(temporary, 'SteamLibrary');
  const otherLibrary = path.join(temporary, 'OtherLibrary');

  it('resuelve el ejecutable desde el manifiesto de la biblioteca', () => {
    writeFile(path.join(library, 'steamapps', 'appmanifest_346900.acf'), '"AppState"\n{\n\t"installdir"\t\t"AdVenture Capitalist"\n}\n');
    writeFile(path.join(library, 'steamapps', 'common', 'AdVenture Capitalist', 'adventure-capitalist.exe'), 'x');
    writeFile(path.join(library, 'steamapps', 'common', 'AdVenture Capitalist', 'UnityCrashHandler32.exe'), 'x');

    expect(findSteamGameExecutable([library], '346900'))
      .toBe(path.join(library, 'steamapps', 'common', 'AdVenture Capitalist', 'adventure-capitalist.exe'));
  });

  it('encuentra el juego en la segunda biblioteca', () => {
    writeFile(path.join(otherLibrary, 'steamapps', 'appmanifest_842150.acf'), '"AppState"\n{\n\t"installdir"\t\t"Wild West Saga"\n}\n');
    writeFile(path.join(otherLibrary, 'steamapps', 'common', 'Wild West Saga', 'wildwest.exe'), 'x');

    expect(findSteamGameExecutable([library, otherLibrary], '842150'))
      .toBe(path.join(otherLibrary, 'steamapps', 'common', 'Wild West Saga', 'wildwest.exe'));
  });

  it('encuentra el ejecutable dentro de una subcarpeta del juego', () => {
    writeFile(path.join(library, 'steamapps', 'appmanifest_1905180.acf'), '"AppState"\n{\n\t"installdir"\t\t"OBS Studio"\n}\n');
    writeFile(path.join(library, 'steamapps', 'common', 'OBS Studio', 'bin', '64bit', 'obs64.exe'), 'x');
    writeFile(path.join(library, 'steamapps', 'common', 'OBS Studio', 'data', 'obs-studio', 'plugin.exe'), 'x');

    expect(findSteamGameExecutable([library], '1905180'))
      .toBe(path.join(library, 'steamapps', 'common', 'OBS Studio', 'bin', '64bit', 'obs64.exe'));
  });

  it('no rebusca dentro de carpetas de datos ni de mods', () => {
    writeFile(path.join(library, 'steamapps', 'appmanifest_424242.acf'), '"AppState"\n{\n\t"installdir"\t\t"Solo Datos"\n}\n');
    writeFile(path.join(library, 'steamapps', 'common', 'Solo Datos', 'data', 'tool.exe'), 'x');
    writeFile(path.join(library, 'steamapps', 'common', 'Solo Datos', 'mods_pack', 'tool.exe'), 'x');

    expect(findSteamGameExecutable([library], '424242')).toBe('');
  });

  it('devuelve vacío si el juego no está instalado o ya no existe la carpeta', () => {
    expect(findSteamGameExecutable([library], '999999')).toBe('');
    writeFile(path.join(library, 'steamapps', 'appmanifest_111111.acf'), '"AppState"\n{\n\t"installdir"\t\t"Desinstalado"\n}\n');
    expect(findSteamGameExecutable([library], '111111')).toBe('');
    expect(findSteamGameExecutable([library], 'no-numerico')).toBe('');
  });
});
