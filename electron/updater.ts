import electronUpdater from 'electron-updater';
import { CancellationToken } from 'builder-util-runtime';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import os from 'node:os';
import type { ElectronHttpExecutor } from 'electron-updater/out/electronHttpExecutor';
import type { PendingUpdate, UpdateCheckResult } from '../src/lib/update';

// electron-updater is CJS; named ESM import fails when the module is externalized.
const { autoUpdater } = electronUpdater;
const GITHUB_REPO = 'CyberGems/CyberTray';
const REPO_URL = `https://github.com/${GITHUB_REPO}`;
const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);

let autoUpdateEnabled = false;
let currentStatus: PendingUpdate | null = null;
let activeCheck: Promise<UpdateCheckResult> | null = null;
let activeDownload: { token: CancellationToken; requests: Set<Electron.ClientRequest> } | null = null;

function broadcast(status: PendingUpdate | null): void {
  currentStatus = status;
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('update:status', status);
  }
}

function refreshReleaseNotes(version: string, tag: string): void {
  void fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CyberTray' },
  })
    .then(async (response) => {
      if (!response.ok) return undefined;
      const release = await response.json();
      return typeof release?.body === 'string' ? release.body.trim() || undefined : undefined;
    })
    .catch((error) => {
      console.warn('[Updater] Could not fetch release notes:', error);
      return undefined;
    })
    .then((notes) => {
      if (currentStatus?.release.version !== version) return;
      broadcast({
        ...currentStatus,
        release: {
          ...currentStatus.release,
          releaseNotes: notes ?? currentStatus.release.releaseNotes,
          notesLoading: false,
        },
      });
    });
}

function checkForUpdates(): Promise<UpdateCheckResult> {
  if (currentStatus && currentStatus.state !== 'available') {
    return Promise.resolve({ ok: true, available: true, version: currentStatus.release.version });
  }
  if (activeCheck) return activeCheck;

  activeCheck = autoUpdater.checkForUpdates()
    .then<UpdateCheckResult>((result) => {
      if (!result?.isUpdateAvailable) {
        broadcast(null);
        return { ok: true, available: false };
      }

      const { version, releaseNotes } = result.updateInfo;
      if (currentStatus?.release.version !== version) {
        const notes = typeof releaseNotes === 'string'
          ? releaseNotes.trim()
          : releaseNotes?.find((release) => release.version === version)?.note?.trim();
        const tag = version.startsWith('v') ? version : `v${version}`;
        broadcast({
          state: 'available',
          release: {
            version,
            releaseUrl: `${REPO_URL}/releases/tag/${tag}`,
            releaseNotes: notes || undefined,
            notesLoading: !notes,
            portableUrl: isPortable
              ? `${REPO_URL}/releases/download/${tag}/CyberTray-Portable-${tag.slice(1)}.exe`
              : undefined,
          },
        });
        // The feed can contain an English summary without the Spanish details.
        if (!notes || !/<details\b/i.test(notes)) refreshReleaseNotes(version, tag);
      }
      return { ok: true, available: true, version };
    })
    .catch<UpdateCheckResult>((error) => {
      console.warn('[Updater] Check failed:', error);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    })
    .finally(() => { activeCheck = null; });

  return activeCheck;
}

function connectDownloadCancellation(): void {
  const { httpExecutor } = autoUpdater as typeof autoUpdater & { httpExecutor: ElectronHttpExecutor };
  const createRequest = httpExecutor.createRequest.bind(httpExecutor);
  httpExecutor.createRequest = (options, onResponse) => {
    const download = activeDownload;
    if (!download) return createRequest(options, onResponse);

    // ClientRequest closes its writable side before the response has arrived.
    // Track the request until the response ends so cancellation stops the transfer.
    const request = createRequest(options, (response: Electron.IncomingMessage) => {
      response.once('end', forgetRequest);
      response.once('error', forgetRequest);
      onResponse(response);
    });
    function forgetRequest(): void { download?.requests.delete(request); }

    download.requests.add(request);
    request.once('abort', forgetRequest);
    request.once('error', forgetRequest);
    if (download.token.cancelled) request.abort();
    return request;
  };
}

export function initUpdater({ autoUpdate }: { autoUpdate: boolean }): void {
  autoUpdateEnabled = autoUpdate && !isPortable;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  connectDownloadCancellation();

  autoUpdater.on('download-progress', ({ percent, transferred, total }) => {
    if (currentStatus?.state === 'downloading' && !currentStatus.cancelling) {
      broadcast({ ...currentStatus, percent: Math.round(percent), transferred, total });
    }
  });

  autoUpdater.on('error', () => {
    if (currentStatus?.state === 'installing') {
      broadcast({ release: currentStatus.release, state: 'downloaded', installFailed: true });
    }
  });

  ipcMain.handle('update:get-status', () => currentStatus);
  ipcMain.handle('update:check', async () => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        checkForUpdates(),
        new Promise<UpdateCheckResult>(resolve => {
          timeout = setTimeout(() => resolve({ ok: false, error: 'Update check timed out' }), 20000);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  });

  ipcMain.handle('update:download', async (_event, version: string) => {
    // Let any outstanding check finish selecting its installer first.
    await activeCheck;
    if (isPortable || currentStatus?.state !== 'available' || currentStatus.release.version !== version) return;

    const { release } = currentStatus;
    const token = new CancellationToken();
    activeDownload = { token, requests: new Set() };
    broadcast({ release, state: 'downloading', percent: 0 });
    try {
      await autoUpdater.downloadUpdate(token);
      broadcast({ release: currentStatus?.release ?? release, state: 'downloaded' });
    } catch (error) {
      if (!token.cancelled) console.error('[Updater] Download failed:', error);
      broadcast({
        release: currentStatus?.release ?? release,
        state: 'available',
        downloadFailed: !token.cancelled,
      });
    } finally {
      activeDownload = null;
      token.dispose();
    }
  });

  ipcMain.handle('update:cancel-download', (_event, version: string) => {
    if (currentStatus?.state !== 'downloading' || currentStatus.release.version !== version || !activeDownload) return;
    broadcast({ ...currentStatus, cancelling: true });
    // The updater can reject its promise without closing the HTTP response.
    activeDownload.token.cancel();
    for (const request of activeDownload.requests) request.abort();
  });

  ipcMain.handle('update:install', (_event, version: string) => {
    if (isPortable || currentStatus?.state !== 'downloaded' || currentStatus.release.version !== version) return;
    const { release } = currentStatus;
    broadcast({ release, state: 'installing' });
    try {
      // Silent NSIS installation preserves the existing relaunch behavior.
      autoUpdater.quitAndInstall(true, true);
    } catch (error) {
      console.error('[Updater] Installation failed:', error);
      broadcast({ release, state: 'downloaded', installFailed: true });
    }
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
    portable: isPortable,
  }));

  ipcMain.handle('open-external', async (_event, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'Invalid URL' };
  });

  ipcMain.handle('set-auto-update', (_event, enabled: boolean) => {
    autoUpdateEnabled = Boolean(enabled) && !isPortable;
    return { success: true, enabled: autoUpdateEnabled };
  });

  setTimeout(() => {
    if (autoUpdateEnabled) void checkForUpdates();
  }, 8000);
}
