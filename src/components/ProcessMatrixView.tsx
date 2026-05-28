import React, { useRef } from 'react';
import { translate, TranslationKey } from '../locales';
import { Search, X } from 'lucide-react';

interface Process {
  pid: number;
  name: string;
  path: string;
  memory: number;
}

interface ProcessMatrixViewProps {
  runningProcesses: Process[];
  processSearchQuery: string;
  setProcessSearchQuery: (q: string) => void;
  processSortOrder: 'memory-desc' | 'memory-asc' | 'name-asc' | 'name-desc' | 'pid-asc' | 'pid-desc';
  setProcessSortOrder: (order: 'memory-desc' | 'memory-asc' | 'name-asc' | 'name-desc' | 'pid-asc' | 'pid-desc') => void;
  langCode: 'en' | 'es';
  showConfirm: (title: string, message: string, onConfirm: () => void, danger?: boolean) => void;
  playCyberBeep: () => void;
  setRunningProcesses: (list: Process[]) => void;
  embedded?: boolean;
  showToolbar?: boolean;
}

export default function ProcessMatrixView({
  runningProcesses,
  processSearchQuery,
  setProcessSearchQuery,
  processSortOrder,
  setProcessSortOrder,
  langCode,
  showConfirm,
  playCyberBeep,
  setRunningProcesses,
  embedded = false,
  showToolbar = true,
}: ProcessMatrixViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isElectron = !!window.electronAPI;

  const handleKillProcess = (pid: number) => {
    showConfirm(
      langCode === 'es' ? 'Terminar Proceso' : 'Terminate Process',
      translate('process_kill_confirm'),
      async () => {
        if (isElectron && window.electronAPI) {
          await window.electronAPI.killProcess(pid);
          const list = await window.electronAPI.getRunningProcesses();
          if (Array.isArray(list)) {
            setRunningProcesses(list);
          }
        }
        playCyberBeep();
      },
      true
    );
  };

  const handleColumnSort = (column: 'pid' | 'name' | 'memory') => {
    playCyberBeep();
    const current = processSortOrder;
    if (column === 'pid') {
      if (current === 'pid-desc') setProcessSortOrder('pid-asc');
      else setProcessSortOrder('pid-desc');
    } else if (column === 'name') {
      if (current === 'name-desc') setProcessSortOrder('name-asc');
      else setProcessSortOrder('name-desc');
    } else if (column === 'memory') {
      if (current === 'memory-desc') setProcessSortOrder('memory-asc');
      else setProcessSortOrder('memory-desc');
    }
  };

  const getSortIndicator = (column: 'pid' | 'name' | 'memory') => {
    if (processSortOrder.startsWith(column)) {
      return processSortOrder.endsWith('asc') ? ' ▲' : ' ▼';
    }
    return '';
  };

  const isActiveSort = (column: 'pid' | 'name' | 'memory') => processSortOrder.startsWith(column);

  const filtered = runningProcesses.filter(p =>
    p.name.toLowerCase().includes(processSearchQuery.toLowerCase()) ||
    p.pid.toString().includes(processSearchQuery) ||
    (p.path && p.path.toLowerCase().includes(processSearchQuery.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    switch (processSortOrder) {
      case 'memory-desc': return b.memory - a.memory;
      case 'memory-asc': return a.memory - b.memory;
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'pid-asc': return a.pid - b.pid;
      case 'pid-desc': return b.pid - a.pid;
      default: return b.memory - a.memory;
    }
  });

  return (
    <div className={`space-y-3 max-w-3xl font-mono text-xs flex flex-col ${embedded ? '' : 'h-full'}`}>
      {showToolbar && (
        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
          <div>
            <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{translate('tab_process_matrix')}</h4>
            <p className="text-[10px] text-slate-500 mt-1">
              {langCode === 'es'
                ? 'Monitoreo de telemetría activa de la red y terminación de subprocesos.'
                : 'Active network telemetry monitoring and subprocess termination.'}
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-400">
            {langCode === 'es' ? 'PROCESOS: ' : 'PROCESSES: '}
            <span className="text-emerald-400 font-bold">{filtered.length}</span>
          </div>
        </div>
      )}

      {/* Buscador de procesos */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder={translate('search_process_placeholder')}
          value={processSearchQuery}
          onChange={(e) => setProcessSearchQuery(e.target.value)}
          className="w-full bg-slate-950/60 border border-slate-900 focus:border-[var(--neon-glow-color)] text-white placeholder-slate-600 rounded-lg py-2 pl-9 pr-4 text-xs font-mono transition-all outline-none"
        />
        {processSearchQuery && (
          <button
            onClick={() => setProcessSearchQuery('')}
            className="absolute right-3 top-2.5 text-slate-500 hover:text-white border-0 bg-transparent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cabeceras de tabla clickeables */}
      <div className="flex items-center justify-between bg-slate-950/70 border border-slate-900 px-4 py-2 text-[9px] font-bold tracking-wider select-none">
        <div className="flex-1 flex items-center gap-3">
          <button
            onClick={() => handleColumnSort('pid')}
            className={`w-12 text-left hover:text-white transition-colors cursor-pointer ${isActiveSort('pid') ? 'text-[var(--neon-glow-color)]' : 'text-slate-500'}`}
          >
            PID{getSortIndicator('pid')}
          </button>
          <button
            onClick={() => handleColumnSort('name')}
            className={`text-left hover:text-white transition-colors cursor-pointer ${isActiveSort('name') ? 'text-[var(--neon-glow-color)]' : 'text-slate-500'}`}
          >
            {langCode === 'es' ? 'PROCESO / RUTA' : 'PROCESS / PATH'}{getSortIndicator('name')}
          </button>
        </div>
        <div className="flex items-center gap-4 w-44 justify-end">
          <button
            onClick={() => handleColumnSort('memory')}
            className={`w-20 text-right hover:text-white transition-colors cursor-pointer ${isActiveSort('memory') ? 'text-[var(--neon-glow-color)]' : 'text-slate-500'}`}
          >
            {langCode === 'es' ? 'RAM' : 'MEMORY'}{getSortIndicator('memory')}
          </button>
          <span className="w-16 text-center text-slate-500">{langCode === 'es' ? 'ACCION' : 'ACTION'}</span>
        </div>
      </div>

      {/* Lista de Procesos */}
      <div ref={scrollContainerRef} className="border border-slate-900 rounded-xl overflow-y-auto custom-scrollbar bg-slate-950/20 flex-1" style={{ maxHeight: embedded ? 340 : undefined }}>
        {sorted.length > 0 ? (
          <div>
            {sorted.map((proc) => {
              const ramMb = Math.round(proc.memory / (1024 * 1024));
              return (
                <div
                  key={proc.pid}
                  className="flex items-center justify-between border-b border-slate-900/60 px-4 py-3 hover:bg-slate-900/40 font-mono text-xs text-slate-300"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-emerald-500 font-bold w-12 flex-shrink-0">PID {proc.pid}</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-bold truncate block" title={proc.name}>
                        {proc.name}
                      </span>
                      <span className="text-[9px] text-slate-500 truncate block font-sans" title={proc.path}>
                        {proc.path || 'System / Kernel Process'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-purple-400 font-bold w-20 text-right">{ramMb} MB</span>
                    <button
                      onClick={() => handleKillProcess(proc.pid)}
                      className="px-2 py-1 bg-red-950/30 border border-red-500/30 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[9px] font-cyber font-bold rounded cursor-pointer transition-all"
                    >
                      {translate('kill_btn')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            {langCode === 'es' ? 'No se encontraron procesos activos.' : 'No active processes found.'}
          </div>
        )}
      </div>
    </div>
  );
}
