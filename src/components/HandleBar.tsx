import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { translate } from '../locales';
import { isElectron } from '../lib/appUtils';

interface HandleBarProps {
  theme: string;
  dockPosition: 'top' | 'bottom' | string;
  isHandleFadedOut: boolean;
  handleHovered: boolean;
  isDraggingHandle: boolean;
  handleAutoHide: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onMouseEnterHandle: () => void;
  onMouseLeaveHandle: () => void;
  clearAutoHideTimer: () => void;
  startAutoHideTimer: () => void;
  setIsHandleFadedOut: (v: boolean) => void;
  setHandleHovered: (v: boolean) => void;
}

export default function HandleBar({
  theme,
  dockPosition,
  isHandleFadedOut,
  handleHovered,
  isDraggingHandle,
  handleAutoHide,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onMouseEnterHandle,
  onMouseLeaveHandle,
  clearAutoHideTimer,
  startAutoHideTimer,
  setIsHandleFadedOut,
  setHandleHovered,
}: HandleBarProps) {
  const isBottom = dockPosition === 'bottom';

  return (
    <div
      className={`theme-${theme} w-full h-full flex flex-col items-center p-0 bg-transparent overflow-visible relative transition-opacity duration-1000 ${
        isBottom ? 'justify-end pb-1' : 'justify-start pt-1'
      } ${isHandleFadedOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <AnimatePresence>
        {handleHovered && (
          <motion.div
            initial={{ opacity: 0, y: isBottom ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isBottom ? 8 : -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute left-1/2 -translate-x-1/2 ${
              isBottom ? 'bottom-[32px]' : 'top-[32px]'
            } w-max whitespace-nowrap px-2 py-0.5 bg-slate-950/95 border border-[var(--neon-glow-border)] rounded-md shadow-[0_0_8px_var(--neon-glow-color-raw)] z-50 text-[8px] font-cyber text-white tracking-widest uppercase pointer-events-none flex items-center gap-1`}
            style={{
              textShadow: '0 0 4px var(--neon-glow-color)',
            }}
          >
            <span className="w-1 h-1 bg-[var(--neon-glow-color)] rounded-full animate-pulse shadow-[0_0_3px_var(--neon-glow-color)]" />
            {translate('tooltip_handle')}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => {
          if (isElectron) {
            window.electronAPI!.setIgnoreMouseEvents(false);
          }
          clearAutoHideTimer();
          setIsHandleFadedOut(false);
          onMouseEnterHandle();
          setHandleHovered(true);
        }}
        onMouseLeave={() => {
          if (!handleAutoHide && isElectron) {
            window.electronAPI!.setIgnoreMouseEvents(true, { forward: true });
          }
          startAutoHideTimer();
          onMouseLeaveHandle();
          setHandleHovered(false);
        }}
        onDragEnter={async (e) => {
          e.preventDefault();
          if (isElectron) {
            await window.electronAPI!.setDragActive(true);
            await window.electronAPI!.toggleShelf();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        className="cyber-handle-bar w-[150px] h-[20px] rounded-md border flex items-center justify-center relative group"
        style={{ cursor: isDraggingHandle ? 'grabbing' : 'pointer' }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (isElectron) {
            window.electronAPI!.showHandleContextMenu();
          }
        }}
      >
        <div className="flex gap-2 items-center justify-center transition-all duration-300 group-hover:-translate-x-[34px] group-hover:opacity-50">
          <span className="w-[3.6px] h-[8.4px] opacity-50 bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
          <span className="w-[4.8px] h-[11.2px] bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
          <span className="w-[6px] h-[14px] bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
          <span className="w-[4.8px] h-[11.2px] bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
          <span className="w-[3.6px] h-[8.4px] opacity-50 bg-[var(--neon-glow-border)] rounded-sm shadow-[0_0_4px_var(--neon-glow-color-raw)]" />
        </div>

        <div className="absolute right-3.5 flex items-center">
          <span className="text-[9px] font-cyber text-[var(--neon-glow-color)] opacity-0 group-hover:opacity-100 transition-opacity tracking-widest uppercase">
            {translate('handle_activate')}
          </span>
        </div>
      </button>
    </div>
  );
}
