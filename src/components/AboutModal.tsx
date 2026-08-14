import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { translate } from '../locales';
import { isElectron } from '../lib/appUtils';
import CyberTrayLogo from './CyberTrayLogo';

interface AboutModalProps {
  showAboutModal: boolean;
  setShowAboutModal: (v: boolean) => void;
  currentVer: string;
  config: any;
  handleUpdateConfigSetting: (keyOrUpdates: string | Record<string, any>, value?: any) => void;
  playCyberBeep: () => void;
  updateCheckState: {
    status: 'idle' | 'scanning' | 'up-to-date' | 'update-available' | 'failed';
    latestVersion?: string;
  };
  checkForUpdates: (manual?: boolean) => void;
}

export default function AboutModal({
  showAboutModal,
  setShowAboutModal,
  currentVer,
  config,
  handleUpdateConfigSetting,
  playCyberBeep,
  updateCheckState,
  checkForUpdates,
}: AboutModalProps) {
  return (
    <>
{/* ── MODAL: ABOUT CYBERTRAY ── */}
      <AnimatePresence>
        {showAboutModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAboutModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] z-[60] bg-[#070b13]/95 border border-[var(--neon-glow-border)] shadow-2xl rounded-2xl p-6 font-mono text-xs text-left"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4.5">
                <h3 className="font-montserrat font-bold text-white text-sm tracking-widest uppercase">
                  {translate('about_title')}
                </h3>
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="w-7 h-7 rounded-lg border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 py-2">
                <CyberTrayLogo className="w-16 h-16 animate-pulse" animated={false} />
                
                <div>
                  <h4 className="font-cyber font-bold text-lg text-white tracking-widest" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    CyberTray
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 tracking-wider font-semibold">
                    NEURAL DOCK STATION
                  </p>
                </div>

                <div className="w-full bg-slate-950/50 border border-slate-900 rounded-xl p-3.5 space-y-2.5 text-left text-[11px]">
                  <div className="flex justify-between items-center border-b border-slate-900/60 pb-1.5">
                    <span className="text-slate-400 font-cyber text-[10px] tracking-wider uppercase">{translate('about_version')}</span>
                    <span className="text-white font-bold font-mono">v{currentVer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-cyber text-[10px] tracking-wider uppercase">{translate('about_developer')}</span>
                    <span className="text-[var(--neon-glow-color)] font-bold font-cyber tracking-widest uppercase">CyberGems</span>
                  </div>
                </div>

                {/* Auto Update Check Toggle */}
                <div className="w-full flex items-center justify-between bg-slate-950/40 p-3 border border-slate-900 rounded-xl text-left">
                  <div>
                    <h5 className="font-montserrat font-bold text-white text-[11px] tracking-wider uppercase">{translate('about_auto_check')}</h5>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">{translate('about_auto_check_desc')}</p>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = config.autoCheckUpdates === false;
                      handleUpdateConfigSetting('autoCheckUpdates', nextVal);
                      playCyberBeep();
                    }}
                    className={`w-11 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer flex-shrink-0 ${config.autoCheckUpdates !== false ? 'bg-[var(--neon-glow-color-raw)]' : 'bg-slate-800'}`}
                  >
                    <div className={`w-4.5 h-4.5 bg-slate-950 rounded-full transition-transform ${config.autoCheckUpdates !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Update Checker Panel */}
                <div className="w-full pt-2">
                  {updateCheckState.status === 'idle' && (
                    <button
                      onClick={() => { checkForUpdates(true); playCyberBeep(); }}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white font-cyber font-bold tracking-widest text-[10px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {translate('about_check_updates_btn')}
                    </button>
                  )}

                  {updateCheckState.status === 'scanning' && (
                    <div className="w-full py-2.5 bg-slate-950/50 border border-slate-900 rounded-xl text-slate-400 flex items-center justify-center gap-2.5 font-bold tracking-widest text-[9.5px]">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--neon-glow-color)]" />
                      {translate('update_scanning')}
                    </div>
                  )}

                  {updateCheckState.status === 'up-to-date' && (
                    <div className="space-y-2.5 w-full">
                      <div className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center justify-center gap-2 font-bold tracking-widest text-[9.5px]">
                        <Check className="w-4 h-4 text-emerald-400" />
                        {translate('update_up_to_date', { ver: currentVer })}
                      </div>
                      <button
                        onClick={() => { checkForUpdates(true); playCyberBeep(); }}
                        className="w-full py-1.5 bg-transparent hover:bg-slate-900/40 border border-slate-900 text-slate-500 hover:text-slate-300 text-[9px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        {translate('about_check_updates_btn')}
                      </button>
                    </div>
                  )}

                  {updateCheckState.status === 'update-available' && (
                    <div className="space-y-2.5 w-full">
                      <div className="w-full py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 flex items-center justify-center gap-2 font-bold tracking-widest text-[9.5px] uppercase">
                        <Info className="w-4 h-4 text-blue-400 animate-pulse" />
                        {translate('update_available', { ver: updateCheckState.latestVersion || '' })}
                      </div>
                      <button
                        onClick={() => {
                          if (isElectron) {
                            window.electronAPI!.launchApp('https://github.com/CyberGems/CyberTray/releases/latest');
                          } else {
                            window.open('https://github.com/CyberGems/CyberTray/releases/latest', '_blank');
                          }
                          playCyberBeep();
                        }}
                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-cyber font-bold tracking-widest text-[10px] rounded-xl border border-blue-400 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {translate('update_download_btn')}
                      </button>
                    </div>
                  )}

                  {updateCheckState.status === 'failed' && (
                    <div className="space-y-2.5 w-full">
                      <div className="w-full py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-center gap-2 font-bold tracking-widest text-[9.5px]">
                        <X className="w-4 h-4 text-red-400" />
                        {translate('update_failed')}
                      </div>
                      <button
                        onClick={() => { checkForUpdates(true); playCyberBeep(); }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white font-cyber font-bold tracking-widest text-[10px] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {translate('about_check_updates_btn')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
