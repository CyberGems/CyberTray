import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { activateStoreApp, isStoreAppUserModelId, resolveStoreAppLauncher } from '../../electron/store-app-launch';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'CyberTray-store-launch-test-'));
afterAll(() => fs.rmSync(temporary, { recursive: true, force: true }));

describe('isStoreAppUserModelId', () => {
  it('accepts package-family application IDs and rejects file paths or URLs', () => {
    expect(isStoreAppUserModelId('5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App')).toBe(true);
    expect(isStoreAppUserModelId('C:\\Apps\\app.exe')).toBe(false);
    expect(isStoreAppUserModelId('https://example.com')).toBe(false);
    expect(isStoreAppUserModelId('package_without_application')).toBe(false);
  });
});

describe('resolveStoreAppLauncher', () => {
  it('finds the development helper and packaged extra resource', () => {
    const development = path.join(temporary, 'electron');
    fs.mkdirSync(development);
    fs.writeFileSync(path.join(development, 'launch-store-app.exe'), '');
    fs.writeFileSync(path.join(temporary, 'launch-store-app.exe'), '');

    expect(resolveStoreAppLauncher(false, 'unused', temporary, path.join(temporary, 'dist-electron')))
      .toBe(path.join(development, 'launch-store-app.exe'));
    expect(resolveStoreAppLauncher(true, temporary, 'unused', 'unused'))
      .toBe(path.join(temporary, 'launch-store-app.exe'));
    expect(() => resolveStoreAppLauncher(true, path.join(temporary, 'absent'), temporary, 'unused'))
      .toThrow(/helper is missing/);
  });
});

describe('activateStoreApp', () => {
  it('requires a valid activated process ID from the helper', async () => {
    const fixture = path.join(temporary, 'result.cjs');
    for (const output of ['', '0', '-1', '1.5', '4294967296', 'not a process ID']) {
      fs.writeFileSync(fixture, `process.stdout.write(${JSON.stringify(output)});`);
      await expect(activateStoreApp(fixture, process.execPath)).rejects.toThrow(/valid activated process ID/);
    }

    fs.writeFileSync(fixture, 'process.stdout.write("1234");');
    await expect(activateStoreApp(fixture, process.execPath)).resolves.toBe(1234);
  }, 20_000);

  it('preserves Windows activation errors and helper failures', async () => {
    const fixture = path.join(temporary, 'failure.cjs');
    fs.writeFileSync(fixture, 'process.stderr.write("0x80073CF1: Package not found"); process.exitCode = 1;');
    await expect(activateStoreApp(fixture, process.execPath)).rejects.toThrow(/0x80073CF1: Package not found/);
    await expect(activateStoreApp('unused', path.join(temporary, 'missing.exe'))).rejects.toThrow(/ENOENT/);
  });

  it('rejects an installed-package mismatch through the native helper', { skip: process.platform !== 'win32' }, async () => {
    const helper = path.resolve('electron/launch-store-app.exe');
    await expect(activateStoreApp('CyberTray.NotInstalled_1234567890123!App', helper)).rejects.toThrow(/0x80073CF1/);
  });

  it('passes shell metacharacters as literal AUMID data', { skip: process.platform !== 'win32' }, async () => {
    const helper = path.resolve('electron/launch-store-app.exe');
    const marker = path.join(temporary, 'must-not-exist.txt');
    await expect(activateStoreApp(
      `CyberTray.NotInstalled_1234567890123!App & echo injected > "${marker}"`,
      helper,
    )).rejects.toThrow();
    expect(fs.existsSync(marker)).toBe(false);
  });

  it('rejects a missing AUMID in the native helper', { skip: process.platform !== 'win32' }, () => {
    const helper = path.resolve('electron/launch-store-app.exe');
    expect(() => execFileSync(helper, [], { windowsHide: true, stdio: 'pipe' })).toThrow();
  });
});
