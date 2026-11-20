import { describe, expect, it } from 'vitest';
import { TRAY_TOOLTIP_MAX_LENGTH, formatTrayTooltip } from '../electron/tray-tooltip';

describe('formatTrayTooltip', () => {
  it('uses the suite format with a single shortcut segment', () => {
    expect(formatTrayTooltip('Alt+Shift+T')).toBe('CyberTray · Alt+Shift+T');
  });

  it('falls back to the bare app name without a shortcut', () => {
    expect(formatTrayTooltip(undefined)).toBe('CyberTray');
    expect(formatTrayTooltip('')).toBe('CyberTray');
    expect(formatTrayTooltip('   ')).toBe('CyberTray');
    expect(formatTrayTooltip(null)).toBe('CyberTray');
  });

  it('trims the segment before formatting', () => {
    expect(formatTrayTooltip('  Alt+Shift+T  ')).toBe('CyberTray · Alt+Shift+T');
  });

  it('caps the tooltip at 63 characters with an ellipsis', () => {
    const tooltip = formatTrayTooltip('X'.repeat(80));
    expect(tooltip).toHaveLength(TRAY_TOOLTIP_MAX_LENGTH);
    expect(tooltip.endsWith('…')).toBe(true);
    expect(tooltip.startsWith('CyberTray · ')).toBe(true);
  });

  it('never includes the app version', () => {
    expect(formatTrayTooltip('1.9.3')).toBe('CyberTray · 1.9.3');
    expect(formatTrayTooltip('Alt+Shift+T')).not.toMatch(/\bv?\d+\.\d+\.\d+/);
  });
});
