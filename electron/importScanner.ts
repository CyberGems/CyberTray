import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { scanStoreApps } from './store-apps';
import { ignorableShortcutReason, type ScannedShortcut, type ImportSourceConfig } from '../src/lib/shortcutImport';

export interface ResolvedImportFile {
  name: string;
  path: string;
  iconPath?: string;
  arguments?: string;
  cwd?: string;
  exists: boolean;
}

export interface ImportScanResult {
  items: ScannedShortcut[];
  scannedSourceIds: string[];
  errors: Array<{ sourceId: string; message: string }>;
}

export interface ImportScanProgress {
  completed: number;
  total: number;
  sourceId: string;
}

interface ImportScanOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ImportScanProgress) => void;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Import scan cancelled.', 'AbortError');
}

function resolveSourceRoot(source: ImportSourceConfig): string {
  if (source.kind === 'folder') return path.resolve(source.path || '');
  if (source.kind === 'desktop') {
    if (source.scope === 'common') return process.env.PUBLIC ? path.join(process.env.PUBLIC, 'Desktop') : '';
    return app.getPath('desktop');
  }
  if (source.kind === 'start-menu') {
    if (source.scope === 'common') {
      return process.env.ProgramData ? path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs') : '';
    }
    return path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  }
  return '';
}

function isCandidate(filePath: string, directory: boolean, includeFiles: boolean): boolean {
  if (directory) return includeFiles;
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.lnk' || ext === '.url' || (includeFiles && ext !== '.ini');
}

async function scanDirectorySource(
  source: ImportSourceConfig,
  resolveFile: (filePath: string) => Promise<ResolvedImportFile | null>,
  options: ImportScanOptions,
): Promise<ScannedShortcut[]> {
  throwIfAborted(options.signal);
  const root = resolveSourceRoot(source);
  if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error('Source folder is unavailable.');
  }
  const files: Array<{ filePath: string; relativeFolder: string }> = [];
  const maxItems = 5000;

  async function walk(directory: string, relativeFolder: string, depth: number): Promise<void> {
    throwIfAborted(options.signal);
    if (depth > 24) return;
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (source.includeFiles && depth === 0) files.push({ filePath, relativeFolder });
        await walk(filePath, path.join(relativeFolder, entry.name), depth + 1);
      } else if (entry.isFile() && isCandidate(filePath, false, source.includeFiles)) {
        files.push({ filePath, relativeFolder });
      }
      if (files.length > maxItems) throw new Error(`Source exceeds ${maxItems} items.`);
    }
  }

  await walk(root, '', 0);
  const results: ScannedShortcut[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(6, Math.max(1, files.length)) }, async () => {
    while (cursor < files.length) {
      const index = cursor++;
      const { filePath, relativeFolder } = files[index];
      const name = path.basename(filePath, path.extname(filePath));
      const sourcePath = path.normalize(filePath);
      throwIfAborted(options.signal);
      let skippedReason = source.skipUninstallers ? ignorableShortcutReason(name, sourcePath, sourcePath) : undefined;
      try {
        const resolved = await resolveFile(filePath);
        if (!resolved) throw new Error('Could not resolve shortcut.');
        const targetPath = resolved.path;
        const iconPath = resolved.iconPath || '';
        const args = resolved.arguments || '';
        const cwd = resolved.cwd || '';
        const exists = resolved.exists;
        skippedReason ||= source.skipUninstallers
          ? ignorableShortcutReason(name, targetPath, sourcePath) || undefined
          : undefined;
        results.push({
          key: `${source.id}:${sourcePath.toLowerCase()}`,
          sourceId: source.id,
          sourcePath,
          name,
          path: targetPath,
          arguments: args,
          cwd,
          iconPath,
          relativeFolder,
          targetCategory: source.targetCategory,
          preserveFolders: source.preserveFolders,
          exists,
          skippedReason,
        });
        options.onProgress?.({ completed: results.length, total: files.length, sourceId: source.id });
      } catch (error) {
        results.push({
          key: `${source.id}:${sourcePath.toLowerCase()}`,
          sourceId: source.id,
          sourcePath,
          name,
          path: '',
          targetCategory: source.targetCategory,
          preserveFolders: source.preserveFolders,
          exists: false,
          error: error instanceof Error ? error.message : String(error),
        });
        options.onProgress?.({ completed: results.length, total: files.length, sourceId: source.id });
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export async function scanImportSources(
  sources: ImportSourceConfig[],
  resolveFile: (filePath: string) => Promise<ResolvedImportFile | null>,
  options: ImportScanOptions = {},
): Promise<ImportScanResult> {
  const items: ScannedShortcut[] = [];
  const scannedSourceIds: string[] = [];
  const errors: Array<{ sourceId: string; message: string }> = [];

  for (const source of sources) {
    if (!source.id || !source.kind) continue;
    try {
      throwIfAborted(options.signal);
      if (source.kind === 'store') {
        const apps = await scanStoreApps(options.signal);
        for (const appInfo of apps) {
          const skippedReason = source.skipUninstallers
            ? ignorableShortcutReason(appInfo.name, appInfo.path, appInfo.path) || undefined
            : undefined;
          items.push({
            key: `${source.id}:${appInfo.path.toLowerCase()}`,
            sourceId: source.id,
            sourcePath: appInfo.path,
            name: appInfo.name,
            path: appInfo.path,
            arguments: '',
            cwd: '',
            iconPath: appInfo.iconPath,
            targetCategory: source.targetCategory,
            preserveFolders: false,
            exists: true,
            skippedReason,
          });
        }
        options.onProgress?.({ completed: apps.length, total: apps.length, sourceId: source.id });
      } else {
        items.push(...await scanDirectorySource(source, resolveFile, options));
      }
      scannedSourceIds.push(source.id);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      errors.push({ sourceId: source.id, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return { items, scannedSourceIds, errors };
}
