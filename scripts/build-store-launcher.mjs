import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'electron', 'launch-store-app.exe');
if (process.platform !== 'win32') {
  if (!existsSync(output)) throw new Error('The Windows Store launcher binary is missing.');
  console.log('Using the checked-in Windows Store launcher binary.');
} else {
  const windows = process.env.SystemRoot || 'C:\\Windows';
  const compiler = ['Framework64', 'Framework']
    .map(framework => path.join(windows, 'Microsoft.NET', framework, 'v4.0.30319', 'csc.exe'))
    .find(existsSync);
  if (!compiler) throw new Error('The .NET Framework C# compiler is required to build the Store launcher.');
  execFileSync(compiler, [
    '/nologo', '/target:exe', '/platform:anycpu', '/optimize+',
    '/out:' + output, path.join(root, 'electron', 'LaunchStoreApp.cs'),
  ], { stdio: 'inherit', windowsHide: true });
  console.log('Built electron/launch-store-app.exe');
}
