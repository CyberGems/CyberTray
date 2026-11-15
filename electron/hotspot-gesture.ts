const MAX_SAMPLE_GAP_MS = 400;
const TOGGLE_COOLDOWN_MS = 200;

export type HotspotPosition = { key: string; isWithinExitZone: boolean };

export class HotspotGesture {
  private waitingForExit = true;
  private lastSampleTime: number | null = null;
  private entry: { key: string; since: number } | null = null;
  private nextToggleTime = 0;

  requireExit() {
    this.waitingForExit = true;
    this.lastSampleTime = null;
    this.entry = null;
  }

  isReady(now: number, delay: number) {
    return this.entry !== null && now - this.entry.since >= delay && now >= this.nextToggleTime;
  }

  observe(position: HotspotPosition | null, now: number, delay: number) {
    if (!position) {
      this.requireExit();
      return false;
    }
    if (this.lastSampleTime !== null && now - this.lastSampleTime > MAX_SAMPLE_GAP_MS) {
      this.requireExit();
    }
    this.lastSampleTime = now;

    if (!position.isWithinExitZone) this.waitingForExit = false;
    if (!position.key || this.waitingForExit) {
      this.entry = null;
      return false;
    }

    if (position.key !== this.entry?.key) this.entry = { key: position.key, since: now };
    return this.isReady(now, delay);
  }

  consume(now: number) {
    this.requireExit();
    this.nextToggleTime = now + TOGGLE_COOLDOWN_MS;
  }
}
