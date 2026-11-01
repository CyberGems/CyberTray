import React, { useRef } from 'react';
import { Clock, Cpu, HardDrive, Plus, Sliders } from 'lucide-react';
import { translate } from '../locales';
import { shortcutIconSrc } from '../lib/iconSrc';
import ShortcutGlyph from './ShortcutGlyph';

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

/** Etiqueta de la barra: mayúsculas pequeñas, misma voz que la barra lateral. */
function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sidebar text-[9.5px] font-semibold uppercase leading-none tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

/** Cifra: monoespaciada y tabular, para que no baile al actualizarse. */
function StatValue({ children, tone = 'text-slate-200' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`font-mono text-[11.5px] leading-none tabular-nums ${tone}`}>
      {children}
    </span>
  );
}

/** Unidad o sufijo: un punto más pequeño y apagado que la cifra. */
function StatUnit({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sidebar text-[9.5px] font-medium leading-none text-slate-500">
      {children}
    </span>
  );
}

/** Color del medidor según lo lleno que esté: el acento solo cuando importa. */
function meterTone(percent: number) {
  if (percent >= 95) return 'bg-red-400';
  if (percent >= 85) return 'bg-amber-400';
  return 'bg-[var(--neon-glow-color)]';
}

function meterTextTone(percent: number) {
  if (percent >= 95) return 'text-red-300';
  if (percent >= 85) return 'text-amber-300';
  return 'text-slate-200';
}

/** Medidor de 3 px compartido por RAM y disco: antes cada uno tenía su forma. */
function StatMeter({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <span className="inline-flex w-9 h-[3px] shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
      <span
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${meterTone(clamped)}`}
        style={{ width: `${clamped}%` }}
      />
    </span>
  );
}

export default function TelemetryBar({
  categoriesCount,
  shortcutsCount,
  totalLaunches,
  systemInfo,
  disks,
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
        <div className="w-px h-6 bg-white/[0.07] shrink-0" />
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
                  <ShortcutGlyph className="w-4 h-4 text-[var(--neon-glow-color)]" />
                )}
              </span>
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-0.5 rounded-full bg-[var(--logo-accent)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_0_8px_var(--logo-accent)]" />
            </button>
          ))}
        </div>
      </div>

      {/* Tres bloques: contenido, sesión y sistema. Un solo tipo de etiqueta,
          una sola tipografía para las cifras y un separador entre bloques. */}
      <div className="flex items-center gap-4 shrink-0 text-slate-400">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <StatLabel>{translate('stat_total_categories')}</StatLabel>
            <StatValue tone="text-slate-100">{categoriesCount}</StatValue>
          </div>
          <div className="flex items-center gap-2">
            <StatLabel>{translate('stat_total_shortcuts')}</StatLabel>
            <StatValue tone="text-slate-100">{shortcutsCount}</StatValue>
          </div>
          <div className="flex items-center gap-2">
            <StatLabel>{translate('stat_total_launches')}</StatLabel>
            <StatValue tone="text-slate-100">{totalLaunches}</StatValue>
          </div>
        </div>

        <span className="w-px h-3.5 bg-white/[0.07]" />

        <div
          className="flex items-center gap-1.5 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_uptime'), translate('tooltip_uptime'))}
          onMouseLeave={hideTooltip}
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="flex items-baseline gap-0.5">
            <StatValue>{Math.floor(systemInfo.uptime / 3600)}</StatValue>
            <StatUnit>h</StatUnit>
            <StatValue>{Math.floor((systemInfo.uptime % 3600) / 60)}</StatValue>
            <StatUnit>m</StatUnit>
          </span>
        </div>

        <span className="w-px h-3.5 bg-white/[0.07]" />

        <div
          className="flex items-center gap-2 whitespace-nowrap cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_cpu'), `${translate('stat_cpu_cores', { count: String(systemInfo.cpu.cores) })}\n\n${systemInfo.cpu.model}`)}
          onMouseLeave={hideTooltip}
        >
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <StatLabel>CPU</StatLabel>
          <span className="flex items-baseline gap-1">
            <StatValue>{systemInfo.cpu.cores}</StatValue>
            <StatUnit>{translate('stat_cpu_cores_unit')}</StatUnit>
          </span>
        </div>

        <div
          className="flex items-center gap-2 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_ram'), `${translate('tooltip_ram')}\n\nTotal: ${systemInfo.memory.total.toFixed(1)} GB`)}
          onMouseLeave={hideTooltip}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <StatLabel>RAM</StatLabel>
          <StatMeter percent={systemInfo.memory.percent} />
          <span className="flex items-baseline gap-[1px]">
            <StatValue tone={meterTextTone(systemInfo.memory.percent)}>
              {Math.round(systemInfo.memory.percent)}
            </StatValue>
            <StatUnit>%</StatUnit>
          </span>
        </div>

        <div
          className="flex items-center gap-2 cursor-help"
          onMouseEnter={(e) => showTooltip(e, translate('stat_disks'), disks.length > 0
            ? `${translate('tooltip_disk')}\n\n${disks.map((d) => `${d.drive} (Total: ${Math.round(d.total)}GB, ${translate('stat_disk_free')}: ${Math.round(d.free)}GB)`).join('\n')}`
            : translate('stat_disks_unavailable'))}
          onMouseLeave={hideTooltip}
        >
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          {disks[0] ? (
            <>
              <span className="font-mono text-[11.5px] leading-none tabular-nums text-slate-400">{disks[0].drive}</span>
              <StatMeter percent={disks[0].percent} />
              <span className="flex items-baseline gap-[1px]">
                <StatValue tone={meterTextTone(disks[0].percent)}>
                  {Math.round(disks[0].percent)}
                </StatValue>
                <StatUnit>%</StatUnit>
              </span>
            </>
          ) : (
            <span className="font-mono text-[11.5px] leading-none text-slate-600">--</span>
          )}
        </div>
      </div>
    </footer>
  );
}
