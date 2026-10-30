import { describe, expect, it } from 'vitest';
import { classifyShortcut, countShortcutKinds, hasExtractableIcon, isStoreAppId } from './shortcutKind';

describe('classifyShortcut', () => {
  it('treats executables and shortcuts to executables as programs', () => {
    expect(classifyShortcut({ path: 'C:\\Program Files\\App\\app.exe' })).toBe('program');
    expect(classifyShortcut({ path: 'C:\\Users\\Me\\Desktop\\App.lnk' })).toBe('program');
    expect(classifyShortcut({ path: 'C:\\Windows\\System32\\compmgmt.msc' })).toBe('program');
  });

  it('detects Microsoft Store apps by their AUMID', () => {
    expect(classifyShortcut({ path: '5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App' })).toBe('store');
  });

  it('does not mistake Electron-style identifiers for store apps', () => {
    // Los AUMID de escritorio sin `_!` no apuntan a un paquete instalado.
    expect(isStoreAppId('bot.cline.app')).toBe(false);
    expect(classifyShortcut({ path: 'bot.cline.app' })).not.toBe('store');
  });

  it('classifies protocol targets as links', () => {
    expect(classifyShortcut({ path: 'https://example.com/docs' })).toBe('link');
    expect(classifyShortcut({ path: 'mailto:hola@example.com' })).toBe('link');
    expect(classifyShortcut({ path: 'ms-settings:display' })).toBe('link');
  });

  it('separates Steam games from ordinary programs', () => {
    expect(classifyShortcut({ path: 'steam://rungameid/427520' })).toBe('steam');
    expect(classifyShortcut({ path: 'E:\\SteamLibrary\\steamapps\\common\\Factorio\\bin\\x64\\factorio.exe' })).toBe('steam');
    expect(classifyShortcut({ path: 'C:\\Games\\Factorio\\factorio.exe' })).toBe('program');
  });

  it('classifies scripts and plain files', () => {
    expect(classifyShortcut({ path: 'C:\\Tools\\deploy.cmd' })).toBe('script');
    expect(classifyShortcut({ path: 'C:\\Tools\\backup.ps1' })).toBe('script');
    expect(classifyShortcut({ path: 'C:\\Users\\Me\\Desktop\\notes.pdf' })).toBe('file');
    expect(classifyShortcut({ path: 'C:\\Users\\Me\\Documents' })).toBe('file');
  });

  it('unwraps file:// targets before looking at the extension', () => {
    expect(classifyShortcut({ path: 'file:///C:/Windows/notepad.exe' })).toBe('program');
  });

  it('never throws on empty input', () => {
    expect(classifyShortcut({})).toBe('file');
    expect(classifyShortcut(null)).toBe('file');
  });
});

describe('countShortcutKinds', () => {
  it('counts every kind and keeps zeroes for the missing ones', () => {
    const counts = countShortcutKinds([
      { path: 'C:\\App\\a.exe' },
      { path: 'C:\\App\\b.exe' },
      { path: '5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App' },
      { path: 'https://example.com' },
    ]);
    expect(counts).toEqual({ program: 2, store: 1, steam: 0, link: 1, file: 0, script: 0 });
  });
});

describe('hasExtractableIcon', () => {
  it('accepts anything backed by a file or an installed package', () => {
    expect(hasExtractableIcon({ path: 'C:////Program Files\\App\\app.exe' })).toBe(true);
    expect(hasExtractableIcon({ path: 'C:////Users////Me////Desktop////App.lnk' })).toBe(true);
    expect(hasExtractableIcon({ path: '5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App' })).toBe(true);
    // Un juego de Steam instalado ya apunta a su ejecutable real.
    expect(hasExtractableIcon({ path: 'D:////Steam////steamapps////common////Game////game.exe' })).toBe(true);
  });

  it('rejects links and uninstalled Steam games, which have no file to read', () => {
    expect(hasExtractableIcon({ path: 'https://example.com' })).toBe(false);
    expect(hasExtractableIcon({ path: 'mailto:someone@example.com' })).toBe(false);
    expect(hasExtractableIcon({ path: 'steam://rungameid/1234' })).toBe(false);
  });
});
