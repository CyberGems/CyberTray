import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';
import { translate } from '../locales';

interface PinPadModalProps {
  showPinModal: boolean;
  setShowPinModal: (v: boolean) => void;
  pinInput: string;
  setPinInput: (v: string) => void;
  pinError: boolean;
  setPinError: (v: boolean) => void;
  handlePinSubmit: (enteredPin: string) => void;
  playCyberBeep: () => void;
}

export default function PinPadModal({
  showPinModal,
  setShowPinModal,
  pinInput,
  setPinInput,
  pinError,
  setPinError,
  handlePinSubmit,
  playCyberBeep,
}: PinPadModalProps) {
  return (
    <>
{/* ── MODAL: PIN PAD PARA DESBLOQUEAR BÓVEDA ── */}
      <AnimatePresence>
        {showPinModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPinModal(false)}
              className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] z-[1001] bg-[#070b13]/95 border border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.3)] rounded-2xl p-6 font-mono text-center flex flex-col gap-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-1">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              
              <div>
                <h3 className="font-montserrat font-bold text-white text-xs tracking-widest">
                  {translate('vault_locked_title')}
                </h3>
                <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">
                  {translate('vault_locked_desc')}
                </p>
              </div>

              {/* Dots display for digits entered */}
              <div className="flex justify-center gap-3 my-2.5">
                {[0, 1, 2, 3].map(idx => (
                  <div 
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                      pinInput.length > idx 
                        ? 'bg-purple-500 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] scale-110' 
                        : pinError 
                          ? 'border-red-500 bg-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                          : 'border-slate-800 bg-slate-950'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider animate-pulse">
                  {translate('vault_pin_error')}
                </div>
              )}

              {/* Numeric Keyboard Grid */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      if (pinInput.length < 4) {
                        const val = pinInput + num;
                        setPinInput(val);
                        setPinError(false);
                        playCyberBeep();
                        if (val.length === 4) {
                          // Auto check PIN code
                          setTimeout(() => handlePinSubmit(val), 250);
                        }
                      }
                    }}
                    disabled={pinInput.length >= 4}
                    className="py-2.5 bg-slate-950/60 border border-slate-900 hover:border-purple-500/40 text-slate-200 hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Clear Button */}
                <button
                  onClick={() => { setPinInput(''); setPinError(false); playCyberBeep(); }}
                  className="py-2.5 bg-slate-950/40 border border-slate-900 hover:border-red-500/40 text-red-500 hover:text-red-400 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
                >
                  {translate('vault_pin_clear')}
                </button>
                
                {/* 0 Button */}
                <button
                  onClick={() => {
                    if (pinInput.length < 4) {
                      const val = pinInput + '0';
                      setPinInput(val);
                      setPinError(false);
                      playCyberBeep();
                      if (val.length === 4) {
                        setTimeout(() => handlePinSubmit(val), 250);
                      }
                    }
                  }}
                  disabled={pinInput.length >= 4}
                  className="py-2.5 bg-slate-950/60 border border-slate-900 hover:border-purple-500/40 text-slate-200 hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer select-none active:scale-95 disabled:opacity-50"
                >
                  0
                </button>
                
                {/* Cancel Button */}
                <button
                  onClick={() => { setShowPinModal(false); playCyberBeep(); }}
                  className="py-2.5 bg-slate-950/40 border border-slate-900 hover:border-slate-800 text-slate-500 hover:text-slate-400 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
                >
                  {translate('vault_pin_abort')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
