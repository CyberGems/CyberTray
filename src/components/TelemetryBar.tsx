import React from 'react';
import { Clock, Cpu, Sliders, HardDrive } from 'lucide-react';
import { translate } from '../locales';

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
  showTooltip: (e: React.MouseEvent, text: string, subText?: string, borderColor?: string) => void;
  hideTooltip: () => void;
}

export default function TelemetryBar({
  categoriesCount,
  shortcutsCount,
  totalLaunches,
  systemInfo,
  disks,
  langCode,
  showTooltip,
  hideTooltip,
}: TelemetryBarProps) {
  return (
    <footer className="h-10 border-t border-[var(--neon-glow-border)] flex items-center justify-between px-8 bg-slate-950/80 z-10 text-xs font-mono text-slate-400">
      <div className="flex items-center gap-4.5">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">{translate('stat_total_categories')}:</span>
          <span className="text-purple-400 font-bold">{categoriesCount}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">{translate('stat_total_shortcuts')}:</span>
          <span className="text-[var(--neon-glow-color)] font-bold">{shortcutsCount}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">{translate('stat_total_launches')}:</span>
          <span className="text-pink-400 font-bold">{totalLaunches}</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div
          className="flex items-center gap-1 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_uptime'), translate('tooltip_uptime'))}
          onMouseLeave={hideTooltip}
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>
            {Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m
          </span>
        </div>

        <div
          className="flex items-center gap-2 whitespace-nowrap cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_cpu'), `${translate('tooltip_cpu')}\n\n${systemInfo.cpu.model}`)}
          onMouseLeave={hideTooltip}
        >
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500">CPU:</span>
          <span className="text-slate-200 font-bold">
            {systemInfo.cpu.cores} Cores
          </span>
        </div>

        <div
          className="flex items-center gap-2 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_ram'), `${translate('tooltip_ram')}\n\nTotal: ${systemInfo.memory.total.toFixed(1)} GB`)}
          onMouseLeave={hideTooltip}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500">RAM:</span>
          <div className="w-14 h-1.5 bg-slate-900 border border-slate-800 rounded overflow-hidden">
            <div
              className="h-full bg-[var(--neon-glow-color)] transition-all duration-1000"
              style={{ width: `${systemInfo.memory.percent}%` }}
            />
          </div>
          <span className="text-slate-200 font-bold w-9 text-right">
            {Math.round(systemInfo.memory.percent)}%
          </span>
        </div>

        <div
          className="flex items-center gap-2 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_disks'), `${translate('tooltip_disk')}\n\n${disks.map((d) => `${d.drive} (Total: ${Math.round(d.total)}GB, Libre: ${Math.round(d.free)}GB)`).join('\n')}`)}
          onMouseLeave={hideTooltip}
        >
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-200 font-bold">
            {disks[0] ? `${disks[0].drive} ${disks[0].percent}%` : '--'}
          </span>
        </div>
      </div>
    </footer>
  );
}
