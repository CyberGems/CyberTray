import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCw, Cpu, MemoryStick } from 'lucide-react';
import { translate } from '../locales';
import { isElectron } from '../lib/appUtils';
import ProcessMatrixView from './ProcessMatrixView';

interface ProcessMatrixModalProps {
  showProcessMatrixModal: boolean;
  setShowProcessMatrixModal: (v: boolean) => void;
  langCode: 'en' | 'es';
  runningProcesses: Array<{ pid: number; name: string; path: string; memory: number }>;
  setRunningProcesses: (list: Array<{ pid: number; name: string; path: string; memory: number }>) => void;
  processSearchQuery: string;
  setProcessSearchQuery: (q: string) => void;
  processSortOrder: 'memory-desc' | 'memory-asc' | 'name-asc' | 'name-desc' | 'pid-asc' | 'pid-desc';
  setProcessSortOrder: (order: 'memory-desc' | 'memory-asc' | 'name-asc' | 'name-desc' | 'pid-asc' | 'pid-desc') => void;
  isScanningProcesses: boolean;
  handleScanProcesses: () => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, danger?: boolean) => void;
  playCyberBeep: () => void;
  systemInfo: any;
}

export default function ProcessMatrixModal({
  showProcessMatrixModal,
  setShowProcessMatrixModal,
  langCode,
  runningProcesses,
  setRunningProcesses,
  processSearchQuery,
  setProcessSearchQuery,
  processSortOrder,
  setProcessSortOrder,
  isScanningProcesses,
  handleScanProcesses,
  showConfirm,
  playCyberBeep,
  systemInfo,
}: ProcessMatrixModalProps) {
  const filteredCount = runningProcesses.filter(p =>
    p.name.toLowerCase().includes(processSearchQuery.toLowerCase()) ||
    p.pid.toString().includes(processSearchQuery) ||
    (p.path && p.path.toLowerCase().includes(processSearchQuery.toLowerCase()))
  ).length;

  return (
    <AnimatePresence>
      {showProcessMatrixModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowProcessMatrixModal(false)}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            className="fixed inset-x-4 top-16 bottom-10 z-[80] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl flex flex-col pt-5 px-5 max-w-3xl mx-auto rounded-xl select-none overflow-hidden font-mono"
          >
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3 shrink-0">
              <div>
                <h3 className="font-montserrat font-bold text-white text-sm tracking-widest">{translate('tab_process_matrix')}</h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  {translate('process_matrix_desc')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-[10px] text-slate-400 mr-1">
                  {translate('process_count_label')}{' '}
                  <span className="text-emerald-400 font-bold">
                    {filteredCount}
                  </span>
                </div>
                {isElectron && (
                  <button
                    onClick={handleScanProcesses}
                    disabled={isScanningProcesses}
                    className="px-2 py-1 text-[9px] rounded border border-slate-800 hover:border-[var(--neon-glow-border)] bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer font-cyber disabled:opacity-50"
                    title={translate('process_scan_tooltip')}
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isScanningProcesses ? 'animate-spin' : ''}`} />
                    {isScanningProcesses
                      ? translate('process_scanning_btn')
                      : translate('process_scan_btn')}
                  </button>
                )}
                <button
                  onClick={() => setShowProcessMatrixModal(false)}
                  className="w-7 h-7 rounded-lg border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                  title={translate('close_btn')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <ProcessMatrixView
                runningProcesses={runningProcesses}
                processSearchQuery={processSearchQuery}
                setProcessSearchQuery={setProcessSearchQuery}
                processSortOrder={processSortOrder}
                setProcessSortOrder={setProcessSortOrder}
                langCode={langCode}
                showConfirm={showConfirm}
                playCyberBeep={playCyberBeep}
                setRunningProcesses={setRunningProcesses}
                showToolbar={false}
                onScan={handleScanProcesses}
                isScanning={isScanningProcesses}
              />
            </div>

            <div className="border-t border-slate-800/50 shrink-0 pt-3 pb-3 flex items-center gap-3 px-1">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">VRAM</span>
                <span className="text-[10px] font-mono font-bold text-white tracking-wider">
                  {systemInfo.vram ? `${systemInfo.vram.total.toFixed(2)} GB` : '--'}
                </span>
              </div>

              <div className="w-px h-5 bg-slate-800 flex-shrink-0" />

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MemoryStick className="w-4 h-4 text-[var(--neon-glow-color)]" />
                <span className="text-[9px] font-mono text-[var(--neon-glow-color)] tracking-widest uppercase font-bold flex-shrink-0">RAM</span>
                <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-[var(--neon-glow-color)] rounded-full transition-all duration-500 shadow-[0_0_8px_var(--neon-glow-color)]"
                    style={{ width: `${Math.min(100, systemInfo.memory.percent)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--neon-glow-color)] tracking-wider whitespace-nowrap flex-shrink-0">
                  {systemInfo.memory.used.toFixed(2)} / {systemInfo.memory.total.toFixed(2)} GB
                </span>
                <div className="px-1.5 py-0.5 rounded border border-slate-700 text-[10px] font-mono text-white tracking-wider flex-shrink-0">
                  {Math.round(systemInfo.memory.percent)}%
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
