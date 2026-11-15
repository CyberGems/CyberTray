import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'vitest';
import path from 'node:path';
import { HotspotGesture } from '../../electron/hotspot-gesture';

const outside = { key: '', isWithinExitZone: false };
const nearCorner = { key: '', isWithinExitZone: true };
const corner = { key: '1:top-left', isWithinExitZone: true };

test('a held corner at startup needs a verified exit before activating', () => {
  const gesture = new HotspotGesture();
  assert.equal(gesture.observe(corner, 0, 0), false);
  assert.equal(gesture.observe(corner, 100, 0), false);
  assert.equal(gesture.observe(outside, 200, 0), false);
  assert.equal(gesture.observe(corner, 300, 0), true);
});

test('secure desktop invalidates a pending dwell and cannot count as an exit', () => {
  const gesture = new HotspotGesture();
  gesture.observe(outside, 0, 150);
  gesture.observe(corner, 100, 150);
  gesture.observe(null, 200, 150);
  assert.equal(gesture.observe(corner, 300, 150), false);
  assert.equal(gesture.observe(corner, 600, 150), false);
  assert.equal(gesture.observe(nearCorner, 700, 150), false);
  assert.equal(gesture.observe(corner, 800, 150), false);

  gesture.observe(outside, 900, 150);
  assert.equal(gesture.observe(corner, 1000, 150), false);
  assert.equal(gesture.observe(corner, 1100, 150), false);
  assert.equal(gesture.observe(corner, 1200, 150), true);
});

test('a sampling gap cannot finish a gesture begun before the interruption', () => {
  const gesture = new HotspotGesture();
  gesture.observe(outside, 0, 150);
  gesture.observe(corner, 100, 150);
  assert.equal(gesture.observe(corner, 700, 150), false);
  assert.equal(gesture.observe(corner, 900, 150), false);
});

test('dwell requires consecutive samples in the same corner on the same display', () => {
  const gesture = new HotspotGesture();
  const otherDisplay = { ...corner, key: '2:top-left' };
  gesture.observe(outside, 0, 150);
  gesture.observe(corner, 100, 150);
  gesture.observe(nearCorner, 200, 150);
  assert.equal(gesture.observe(corner, 300, 150), false);
  assert.equal(gesture.observe(otherDisplay, 500, 150), false);
  assert.equal(gesture.observe(otherDisplay, 700, 150), true);
});

test('a toggle cannot repeat until the cursor exits and the cooldown passes', () => {
  const gesture = new HotspotGesture();
  gesture.observe(outside, 0, 0);
  assert.equal(gesture.observe(corner, 100, 0), true);
  gesture.consume(100);
  assert.equal(gesture.observe(corner, 300, 0), false);
  gesture.observe(outside, 400, 0);
  assert.equal(gesture.observe(corner, 500, 0), true);

  gesture.consume(500);
  gesture.observe(outside, 550, 0);
  assert.equal(gesture.observe(corner, 600, 0), false);
  assert.equal(gesture.observe(corner, 700, 0), true);
});

test.skipIf(process.platform !== 'win32')('the packaged Windows helper serves cursor requests until EOF', () => {
  const exe = path.resolve('electron/hotspot-cursor.exe');
  const result = spawnSync(exe, [], {
    input: 'cursor\ncursor\ncursor\n', encoding: 'utf8', windowsHide: true, timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const samples = result.stdout.trim().split(/\r?\n/u);
  assert.equal(samples.length, 3);
  for (const sample of samples) {
    assert.match(sample, /^(?:unavailable|inactive-desktop|-?\d+ -?\d+)$/u);
  }
});
