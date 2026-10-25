import { app, nativeImage } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);

export interface StoreAppInfo {
  name: string;
  path: string;
  iconPath: string;
}

interface StoreAppPayload {
  name?: unknown;
  aumid?: unknown;
  icon?: unknown;
}

const STORE_SCAN_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$apps = [System.Collections.Generic.List[object]]::new()
$startApps = @(Get-StartApps | Where-Object { $_.AppID -like '*!*' -and $_.AppID -like '*_*' })
$packages = @(Get-AppxPackage)
$packageMap = @{}
foreach ($pkg in $packages) { $packageMap[$pkg.PackageFamilyName] = $pkg.InstallLocation }
foreach ($entry in $startApps) {
  $aumid = [string]$entry.AppID
  $name = [string]$entry.Name
  $iconBase64 = ''
  try {
    $parts = $aumid.Split('!')
    $family = $parts[0]
    $appId = $parts[1]
    $installDir = $packageMap[$family]
    if ($installDir) {
      $manifestPath = Join-Path $installDir 'AppxManifest.xml'
      if (Test-Path -LiteralPath $manifestPath) {
        [xml]$manifest = [System.IO.File]::ReadAllText($manifestPath)
        $appNode = @($manifest.Package.Applications.Application | Where-Object { $_.Id -eq $appId })[0]
        if (-not $appNode) { $appNode = @($manifest.GetElementsByTagName('Application') | Where-Object { $_.Id -eq $appId })[0] }
        $visual = $appNode.VisualElements
        if (-not $visual) { $visual = @($appNode.ChildNodes | Where-Object { $_.LocalName -eq 'VisualElements' })[0] }
        $displayName = [string]$visual.DisplayName
        if ($displayName -and -not $displayName.StartsWith('ms-resource:')) { $name = $displayName }
        foreach ($attribute in @('Square44x44Logo', 'Square150x150Logo', 'Logo', 'SmallLogo')) {
          if ($iconBase64) { break }
          $logo = [string]$visual.$attribute
          if (-not $logo) { continue }
          $logoPath = Join-Path $installDir $logo
          $parentDir = Split-Path -Parent $logoPath
          $baseName = [System.IO.Path]::GetFileNameWithoutExtension($logoPath)
          $ext = [System.IO.Path]::GetExtension($logoPath)
          if (-not (Test-Path -LiteralPath $parentDir)) { continue }
          $candidates = @(Get-ChildItem -LiteralPath $parentDir -Filter "$baseName*$ext" -File)
          $bestFile = $candidates | Where-Object { $_.Name -like '*targetsize-256*' } | Select-Object -First 1
          if (-not $bestFile) { $bestFile = $candidates | Where-Object { $_.Name -like '*scale-200*' } | Select-Object -First 1 }
          if (-not $bestFile) { $bestFile = $candidates | Where-Object { $_.Name -like '*targetsize-48*' } | Select-Object -First 1 }
          if (-not $bestFile) { $bestFile = $candidates | Where-Object { $_.Name -like '*scale-100*' } | Select-Object -First 1 }
          if (-not $bestFile) { $bestFile = $candidates | Select-Object -First 1 }
          if ($bestFile) {
            $bytes = [System.IO.File]::ReadAllBytes($bestFile.FullName)
            $mime = switch ($ext.ToLowerInvariant()) { '.jpg' { 'image/jpeg' } '.jpeg' { 'image/jpeg' } '.ico' { 'image/x-icon' } default { 'image/png' } }
            $iconBase64 = "data:$mime;base64,$([System.Convert]::ToBase64String($bytes))"
          }
        }
      }
    }
  } catch {
    $iconBase64 = ''
  }
  $apps.Add([PSCustomObject]@{ name = $name; aumid = $aumid; icon = $iconBase64 })
}
$output = @($apps.ToArray())
ConvertTo-Json -InputObject $output -Depth 3 -Compress
`;

export function normalizeStoreAppsPayload(payload: unknown): StoreAppPayload[] {
  const list = Array.isArray(payload) ? payload : payload && typeof payload === 'object' ? [payload] : [];
  return list.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const record = item as StoreAppPayload;
    const name = String(record.name ?? '').trim();
    const aumid = String(record.aumid ?? '').trim();
    if (!name || !aumid.includes('!') || !aumid.includes('_')) return [];
    return [{
      name: name.slice(0, 180),
      aumid,
      icon: typeof record.icon === 'string' && record.icon.startsWith('data:image/') ? record.icon : '',
    }];
  });
}

function persistStoreIcon(aumid: string, dataUrl: string): string {
  if (!dataUrl) return '';
  try {
    const image = nativeImage.createFromDataURL(dataUrl);
    if (image.isEmpty()) return '';
    const dir = path.join(app.getPath('userData'), 'icons');
    fs.mkdirSync(dir, { recursive: true });
    const key = crypto.createHash('sha1').update(aumid.toLowerCase()).digest('hex').slice(0, 20);
    const destination = path.join(dir, `store_${key}.png`);
    fs.writeFileSync(destination, image.toPNG());
    return `local-resource:///${destination.replace(/\\/g, '/')}`;
  } catch (error) {
    console.warn('[STORE] Could not persist icon:', error);
    return '';
  }
}

export async function scanStoreApps(signal?: AbortSignal): Promise<StoreAppInfo[]> {
  if (process.platform !== 'win32') return [];
  const tempPath = path.join(os.tmpdir(), `cybertray-store-${process.pid}-${Date.now()}.ps1`);
  await fs.promises.writeFile(tempPath, STORE_SCAN_SCRIPT, 'utf8');
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tempPath,
    ], {
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 32 * 1024 * 1024,
      encoding: 'utf8',
      signal,
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout.trim() || '[]');
    } catch {
      throw new Error('Windows returned an invalid Microsoft Store app list.');
    }
    const seen = new Set<string>();
    const apps: StoreAppInfo[] = [];
    for (const item of normalizeStoreAppsPayload(parsed)) {
      const aumid = String(item.aumid);
      const key = aumid.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      apps.push({
        name: String(item.name),
        path: aumid,
        iconPath: persistStoreIcon(aumid, String(item.icon || '')),
      });
    }
    return apps.sort((a, b) => a.name.localeCompare(b.name));
  } finally {
    await fs.promises.unlink(tempPath).catch(() => undefined);
  }
}
