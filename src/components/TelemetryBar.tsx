import React, { useRef } from 'react';
import { Clock, Cpu, HardDrive, Plus, Sliders } from 'lucide-react';
import { translate } from '../locales';
import { shortcutIconSrc } from '../lib/iconSrc';

interface TelemetryBarProps {
  categoriesCount: number;
  shortcutsCount: number;
  totalLaunches: number;
  systemInfo: {
    uptime: number;
    cpu: { model: string; cores: number };
    memory: { total: number; percent: number };
  };
  disks: Array<{ drive: string; total: number; free: number; percent: number }>;
  langCode: 'en' | 'es';
  shortcuts: any[];
  taskbarIds: number[];
  onLaunch: (item: any) => void;
  onOpenAdd: () => void;
  onPinShortcut: (id: number) => void;
  onReorderTaskbar: (fromId: number, toId: number) => void;
  onShortcutContextMenu: (e: React.MouseEvent, item: any) => void;
  showTooltip: (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;
  hideTooltip: () => void;
}

function parseDragId(raw: string, prefix: string): number | null {
  if (!raw.startsWith(prefix)) return null;
  const n = Number(raw.slice(prefix.length));
  return Number.isFinite(n) ? n : null;
}

export default function TelemetryBar({
  categoriesCount,
  shortcutsCount,
  totalLaunches,
  systemInfo,
  disks,
  langCode,
  shortcuts,
  taskbarIds,
  onLaunch,
  onOpenAdd,
  onPinShortcut,
  onReorderTaskbar,
  onShortcutContextMenu,
  showTooltip,
  hideTooltip,
}: TelemetryBarProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const pinned = taskbarIds
    .map((id) => shortcuts.find((s) => s.id === id))
    .filter(Boolean);

  const acceptDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleBarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData('text/plain') || '';
    const shortcutId = parseDragId(raw, 'shortcut:');
    if (shortcutId !== null) onPinShortcut(shortcutId);
  };

  return (
    <footer data-no-dead-zone className="h-12 shrink-0 border-t border-[var(--neon-glow-border)] flex items-center gap-4 px-5 bg-slate-950/80 z-10">
      <div
        className="flex items-center gap-2 min-w-0 flex-1"
        onDragOver={acceptDrop}
        onDrop={handleBarDrop}
      >
        <button
          type="button"
          onClick={() => { hideTooltip(); onOpenAdd(); }}
          onMouseEnter={(e) => showTooltip(e, translate('tooltip_add_taskbar'))}
          onMouseLeave={hideTooltip}
          className="w-9 h-9 shrink-0 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-dashed border-white/15 hover:border-white/25 cursor-pointer"
          aria-label={translate('tooltip_add_taskbar')}
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-white/10 shrink-0" />
        <div
          ref={stripRef}
          onWheel={(e) => {
            const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
            if (delta === 0) return;
            e.currentTarget.scrollLeft += delta;
            e.preventDefault();
          }}
          className="flex items-center gap-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5"
        >
          {pinned.map((item: any) => (
            <button
              key={`taskbar-${item.id}`}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', `taskbar:${item.id}`);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const raw = e.dataTransfer.getData('text/plain') || '';
                const fromTaskbar = parseDragId(raw, 'taskbar:');
                if (fromTaskbar !== null) {
                  onReorderTaskbar(fromTaskbar, item.id);
                  return;
                }
                const fromGrid = parseDragId(raw, 'shortcut:');
                if (fromGrid !== null) onPinShortcut(fromGrid);
              }}
              onClick={() => { hideTooltip(); onLaunch(item); }}
              onContextMenu={(e) => onShortcutContextMenu(e, item)}
              onMouseEnter={(e) => showTooltip(e, item.name)}
              onMouseLeave={hideTooltip}
              className="group relative shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="w-8 h-8 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-center overflow-hidden">
                {item.iconPath ? (
                  <img src={shortcutIconSrc(item.iconPath)} alt="" className="w-5 h-5 object-contain" draggable={false} />
                ) : (
                  <span className="text-[10px] font-cyber font-bold text-slate-500">&gt;_</span>
                )}
              </span>
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-0.5 rounded-full bg-[var(--logo-accent)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_0_8px_var(--logo-accent)]" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3.5 shrink-0 text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="font-cyber text-[11px] font-semibold tracking-wide text-slate-500">
            {translate('stat_total_categories')}
          </span>
          <span className="font-mono text-[13px] font-medium tabular-nums text-purple-300">{categoriesCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-cyber text-[11px] font-semibold tracking-wide text-slate-500">
            {translate('stat_total_shortcuts')}
          </span>
          <span className="font-mono text-[13px] font-medium tabular-nums text-[var(--logo-accent)]">{shortcutsCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-cyber text-[11px] font-semibold tracking-wide text-slate-500">
            {translate('stat_total_launches')}
          </span>
          <span className="font-mono text-[13px] font-medium tabular-nums text-pink-300">{totalLaunches}</span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        <div
          className="flex items-center gap-1.5 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_uptime'), translate('tooltip_uptime'))}
          onMouseLeave={hideTooltip}
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono text-[13px] tracking-wide tabular-nums text-slate-300">
            {Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 whitespace-nowrap cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_cpu'), `${translate('tooltip_cpu')}\n\n${systemInfo.cpu.model}`)}
          onMouseLeave={hideTooltip}
        >
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-cyber text-[11px] font-semibold tracking-wide text-slate-500">CPU</span>
          <span className="font-mono text-[13px] font-medium tabular-nums text-slate-200">
            {translate('stat_cpu_cores', { count: String(systemInfo.cpu.cores) })}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_ram'), `${translate('tooltip_ram')}\n\nTotal: ${systemInfo.memory.total.toFixed(1)} GB`)}
          onMouseLeave={hideTooltip}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-cyber text-[11px] font-semibold tracking-wide text-slate-500">RAM</span>
          <div className="w-14 h-1.5 bg-slate-900 border border-slate-800 rounded overflow-hidden">
            <div
              className="h-full bg-[var(--neon-glow-color)] transition-all duration-1000"
              style={{ width: `${systemInfo.memory.percent}%` }}
            />
          </div>
          <span className="font-mono text-[13px] font-medium tabular-nums text-slate-200 w-9 text-right">
            {Math.round(systemInfo.memory.percent)}%
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_disks'), `${translate('tooltip_disk')}\n\n${disks.map((d) => `${d.drive} (Total: ${Math.round(d.total)}GB, ${translate('stat_disk_free')}: ${Math.round(d.free)}GB)`).join('\n')}`)}
          onMouseLeave={hideTooltip}
        >
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono text-[13px] font-medium tabular-nums text-slate-200">
            {disks[0] ? `${disks[0].drive} ${disks[0].percent}%` : '--'}
          </span>
        </div>
      </div>
    </footer>
  );
}
