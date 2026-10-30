import { describe, expect, it } from 'vitest';
import {
  aumidForFamily,
  aumidFromLnkText,
  packageFamilyFromLnkText,
  packageIdentityFromLnkText,
} from './packagedApp';

/**
 * Los textos son los que de verdad llevan los `.lnk` del escritorio: el
 * `PackageFullName` dentro de la ruta protegida y, en algunos, el AUMID entero.
 */
const CODEX = 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.422.3464.0_x64__2p2nqsd0c76g0\\app\\Codex.exe';
const CLAUDE = 'C:\\Program Files\\WindowsApps\\Claude_1.4758.0.0_x64__pzs8sxrjxfjjc\\Claude.exe';
const TERMINAL = 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminal_1.24.11321.0_x64__8wekyb3d8bbwe\\WindowsTerminal.exe';
const TWOFAST = '38343JanPhilippWeber.2fastTwoFactorAuthenticatorSu_nxr4mypqfqb9c!App';

const LISTING = [
  { aumid: 'OpenAI.Codex_2p2nqsd0c76g0!App', name: 'ChatGPT' },
  { aumid: 'Claude_pzs8sxrjxfjjc!Claude', name: 'Claude' },
  { aumid: 'Microsoft.WindowsTerminal_8wekyb3d8bbwe!App', name: 'Terminal' },
  { aumid: '38343JanPhilippWeber.2fastTwoFactorAuthenticatorSu_nxr4mypqfqb9c!App', name: '2fast' },
];

describe('aumidFromLnkText', () => {
  it('reads a full AUMID written in the shortcut', () => {
    expect(aumidFromLnkText(TWOFAST)).toBe(TWOFAST);
  });

  it('does not invent an AUMID from a plain package path', () => {
    expect(aumidFromLnkText(CODEX)).toBe('');
    expect(aumidFromLnkText(CLAUDE)).toBe('');
  });

  it('ignores Electron-style identifiers', () => {
    expect(aumidFromLnkText('bot.cline.app')).toBe('');
  });
});

describe('packageFamilyFromLnkText', () => {
  it('strips version, architecture and resource id from the package full name', () => {
    expect(packageFamilyFromLnkText(CODEX)).toBe('OpenAI.Codex_2p2nqsd0c76g0');
    expect(packageFamilyFromLnkText(CLAUDE)).toBe('Claude_pzs8sxrjxfjjc');
    expect(packageFamilyFromLnkText(TERMINAL)).toBe('Microsoft.WindowsTerminal_8wekyb3d8bbwe');
  });

  it('takes the family from an AUMID', () => {
    expect(packageFamilyFromLnkText(TWOFAST))
      .toBe('38343JanPhilippWeber.2fastTwoFactorAuthenticatorSu_nxr4mypqfqb9c');
  });

  it('accepts a bare family and rejects text without one', () => {
    expect(packageFamilyFromLnkText('Claude_pzs8sxrjxfjjc')).toBe('Claude_pzs8sxrjxfjjc');
    expect(packageFamilyFromLnkText('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')).toBe('');
  });
});

describe('packageIdentityFromLnkText', () => {
  it('returns the family even when the app id is missing', () => {
    expect(packageIdentityFromLnkText(CODEX)).toEqual({
      family: 'OpenAI.Codex_2p2nqsd0c76g0',
      aumid: '',
    });
  });

  it('returns null for a shortcut that is not a packaged app', () => {
    expect(packageIdentityFromLnkText('C:\\Tools\\notepad.exe')).toBeNull();
  });
});

describe('aumidForFamily', () => {
  it('resolves the single app published by the package', () => {
    expect(aumidForFamily('OpenAI.Codex_2p2nqsd0c76g0', LISTING)).toBe('OpenAI.Codex_2p2nqsd0c76g0!App');
    expect(aumidForFamily('Claude_pzs8sxrjxfjjc', LISTING)).toBe('Claude_pzs8sxrjxfjjc!Claude');
  });

  it('matches families case-insensitively', () => {
    expect(aumidForFamily('claude_PZS8SXRJXFJJC', LISTING)).toBe('Claude_pzs8sxrjxfjjc!Claude');
  });

  it('does not match a different package with a shared prefix', () => {
    expect(aumidForFamily('Claude_aaaaaaaaaaaaa', LISTING)).toBe('');
    expect(aumidForFamily('OpenAI.Codex_2p2nqsd0c76g0_extra', LISTING)).toBe('');
  });

  it('picks the app id by name when the package publishes several', () => {
    const listing = [
      { aumid: 'Vendor.Pack_abcdefghijklm!Browser' },
      { aumid: 'Vendor.Pack_abcdefghijklm!Reader' },
    ];
    expect(aumidForFamily('Vendor.Pack_abcdefghijklm', listing, 'Reader')).toBe('Vendor.Pack_abcdefghijklm!Reader');
    // Sin pista fiable es mejor no tocarlo: lanzar otra app sería peor que
    // seguir usando el acceso del escritorio.
    expect(aumidForFamily('Vendor.Pack_abcdefghijklm', listing)).toBe('');
    expect(aumidForFamily('Vendor.Pack_abcdefghijklm', listing, 'Algo')).toBe('');
  });

  it('returns empty when the package is not installed', () => {
    expect(aumidForFamily('Claude_pzs8sxrjxfjjc', [])).toBe('');
  });
});
