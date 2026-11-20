// Hover text of the tray icon. The suite standard is the app name plus a single
// segment, capped at 63 characters because that is what Windows displays, with
// the ellipsis included in the cap.
export const TRAY_TOOLTIP_MAX_LENGTH = 63;

export function formatTrayTooltip(shortcut?: string | null): string {
  const clean = String(shortcut || '').trim();
  const text = clean ? `CyberTray · ${clean}` : 'CyberTray';
  return text.length > TRAY_TOOLTIP_MAX_LENGTH
    ? `${text.slice(0, TRAY_TOOLTIP_MAX_LENGTH - 1)}…`
    : text;
}
