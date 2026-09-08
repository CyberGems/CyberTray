import electronUpdater from 'electron-updater';
import { ipcMain, BrowserWindow, app, shell } from 'electron';
import os from 'node:os';

// electron-updater is CJS; named ESM import fails when the module is externalized.
const { autoUpdater } = electronUpdater;

const GITHUB_REPO = 'CyberGems/CyberTray';
const NOTES_MAX_CHARS = 8000;

type UpdateInfoLike = {
  version?: string;
  releaseNotes?: string | Array<{ version: string; note: string | null }> | null;
  releaseName?: string | null;
};

/**
 * Update lifecycle via electron-updater + GitHub Releases.
 * Auto-download is off: the user always confirms download and install.
 */

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string; releaseNotes?: string; releaseUrl?: string }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string; releaseNotes?: string; releaseUrl?: string }
  | { state: 'error'; message: string };

let autoUpdateEnabled = false;
let lastStatus: UpdateStatus = { state: 'idle' };
let ipcRegistered = false;
let cachedRelease: { version: string; notes?: string; url: string } | null = null;

function githubReleaseUrl(version: string): string {
  const tag = version.startsWith('v') ? version : `v${version}`;
  return `https://github.com/${GITHUB_REPO}/releases/tag/${tag}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '### ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractReleaseNotes(info: UpdateInfoLike): string | undefined {
  const raw = info.releaseNotes;
  let text = '';
  if (typeof raw === 'string') {
    text = raw;
  } else if (Array.isArray(raw) && raw.length > 0) {
    const match = raw.find((n) => n.version === info.version) || raw[0];
    text = match?.note || '';
  }
  if (!text && info.releaseName && info.releaseName !== info.version) {
    text = info.releaseName;
  }
  const cleaned = stripHtml(text);
  if (!cleaned) return undefined;
  return cleaned.length > NOTES_MAX_CHARS ? `${cleaned.slice(0, NOTES_MAX_CHARS).trimEnd()}…` : cleaned;
}

function rememberRelease(version: string, notes?: string, url?: string): { notes?: string; url: string } {
  const resolvedUrl = url || cachedRelease?.url || githubReleaseUrl(version);
  const resolvedNotes = notes || (cachedRelease?.version === version ? cachedRelease.notes : undefined);
  cachedRelease = { version, notes: resolvedNotes, url: resolvedUrl };
  return { notes: resolvedNotes, url: resolvedUrl };
}

async function fetchGithubReleaseMeta(version: string): Promise<{ notes?: string; url?: string } | null> {
  const tag = version.startsWith('v') ? version : `v${version}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'CyberTray',
      },
    });
    if (!res.ok) return null;
    const data = await res.json() as { body?: string | null; html_url?: string | null };
    const notes = extractReleaseNotes({ version, releaseNotes: data.body || '' });
    return {
      notes,
      url: data.html_url || githubReleaseUrl(version),
    };
  } catch {
    return null;
  }
}

function enrichFromGithubIfNeeded(version: string, alreadyHasNotes: boolean): void {
  if (alreadyHasNotes && cachedRelease?.url) return;
  void fetchGithubReleaseMeta(version).then((meta) => {
    if (!meta) return;
    if (lastStatus.state !== 'available' && lastStatus.state !== 'downloaded') return;
    if (lastStatus.version !== version) return;
    const next = rememberRelease(version, lastStatus.releaseNotes || meta.notes, meta.url);
    if (next.notes === lastStatus.releaseNotes && next.url === lastStatus.releaseUrl) return;
    broadcast({ ...lastStatus, releaseNotes: next.notes, releaseUrl: next.url });
  });
}

function broadcast(status: UpdateStatus): void {
  lastStatus = status;
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:status', status);
  }
}

export function getLastUpdateStatus(): UpdateStatus {
  return lastStatus;
}

export function setAutoUpdate(enabled: boolean): void {
  autoUpdateEnabled = enabled;
}

export function initUpdater(opts: { autoUpdate: boolean }): void {
  autoUpdateEnabled = opts.autoUpdate;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.removeAllListeners();

  autoUpdater.on('checking-for-update', () => broadcast({ state: 'checking' }));

  autoUpdater.on('update-available', (info) => {
    const version = info.version;
    const notes = extractReleaseNotes(info);
    const meta = rememberRelease(version, notes);
    broadcast({ state: 'available', version, releaseNotes: meta.notes, releaseUrl: meta.url });
    enrichFromGithubIfNeeded(version, !!meta.notes);
  });

  autoUpdater.on('update-not-available', (info) => {
    broadcast({ state: 'not-available', version: info.version });
  });

  autoUpdater.on('download-progress', (p) => {
    broadcast({ state: 'downloading', percent: Math.round(p.percent) });
  });

  autoUpdater.on('update-downloaded', (info) => {
    const version = info.version;
    const notes = extractReleaseNotes(info);
    const meta = rememberRelease(version, notes);
    broadcast({ state: 'downloaded', version, releaseNotes: meta.notes, releaseUrl: meta.url });
    enrichFromGithubIfNeeded(version, !!meta.notes);
  });

  autoUpdater.on('error', (err) => {
    broadcast({ state: 'error', message: String(err?.message || err) });
  });

  registerUpdateIpc();

  if (autoUpdateEnabled) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => { /* offline: ignore */ });
    }, 8000);
  }
}

function registerUpdateIpc(): void {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.handle('update:get-status', () => lastStatus);

  ipcMain.handle('update:check', async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Update check timed out')), 20000);
      });
      const result = await Promise.race([
        autoUpdater.checkForUpdates(),
        timeoutPromise,
      ]) as { updateInfo?: { version?: string } } | null;
      return { ok: true, version: result?.updateInfo?.version };
    } catch (err) {
      console.error('[Updater] Check failed:', err);
      const message = String((err as Error)?.message || err);
      broadcast({ state: 'error', message });
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      const message = String((err as Error)?.message || err);
      broadcast({ state: 'error', message });
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle('app:get-versions', () => ({
    app: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    osType: os.type(),
  }));

  ipcMain.handle('open-external', async (_event, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Invalid URL' };
  });

  ipcMain.handle('set-auto-update', (_event, enabled: boolean) => {
    setAutoUpdate(!!enabled);
    return { success: true, enabled: !!enabled };
  });
}
