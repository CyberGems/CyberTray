import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

type WindowsHotspotSample = { x: number; y: number } | 'inactive-desktop';

/** One request at a time. The helper exits if its parent closes stdin. */
export function createWindowsHotspotCursor(exePath: string, reportFailure: (reason: string) => void) {
  let connection: ReturnType<typeof start> | null = null;
  let pending: ((sample: WindowsHotspotSample | null) => void) | null = null;
  let retryAfter = 0;

  function stop() {
    const child = connection?.child;
    connection = null;
    pending?.(null);
    child?.kill();
  }

  function start() {
    const child = spawn(exePath, [], { windowsHide: true });
    child.stderr.resume();
    const lines = createInterface({ input: child.stdout });

    function fail(reason: string) {
      if (connection?.child !== child) return;
      retryAfter = performance.now() + 5000;
      stop();
      reportFailure(reason);
    }

    child.on('error', (error) => fail(error.message));
    child.stdin.on('error', (error) => fail(error.message));
    child.once('close', (code) => fail(`exit ${code}`));
    lines.on('line', (line) => {
      if (connection?.child !== child || !pending) return;
      if (line === 'unavailable') {
        pending(null);
        return;
      }
      if (line === 'inactive-desktop') {
        pending('inactive-desktop');
        return;
      }
      const match = /^(-?\d+) (-?\d+)$/u.exec(line);
      if (!match) {
        fail('invalid cursor sample');
        return;
      }
      pending({ x: Number(match[1]), y: Number(match[2]) });
    });

    return { child, fail };
  }

  function read(): Promise<WindowsHotspotSample | null> {
    if (pending || performance.now() < retryAfter) return Promise.resolve(null);
    const { child, fail } = connection ??= start();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => fail('cursor sample timed out'), 300);
      pending = (sample) => {
        clearTimeout(timeout);
        pending = null;
        resolve(sample);
      };
      child.stdin.write('cursor\n');
    });
  }

  return { read, stop };
}
