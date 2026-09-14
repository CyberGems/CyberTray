import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, ArrowUpDown, Droplets, Download, Eye, FolderOpen, Globe,
  Grid, HardDrive, Image as ImageIcon, Keyboard, LayoutGrid, List as ListIcon,
  Lock, Monitor, MousePointer2, Palette, Power, Shield, Sliders, Terminal,
  Upload, Volume2, type LucideIcon,
} from 'lucide-react';
import { translate } from '../locales';
import { isElectron, INITIAL_CATEGORIES } from '../lib/appUtils';
import Toggle from './Toggle';

const ICON_TONES = {
  cyan: { wrap: 'bg-cyan-500/10 border-cyan-500/20', icon: 'text-cyan-400', toggle: 'bg-cyan-500', ring: 'focus-visible:ring-cyan-500/50' },
  blue: { wrap: 'bg-blue-500/10 border-blue-500/20', icon: 'text-blue-400', toggle: 'bg-blue-500', ring: 'focus-visible:ring-blue-500/50' },
  amber: { wrap: 'bg-amber-500/10 border-amber-500/20', icon: 'text-amber-400', toggle: 'bg-amber-500', ring: 'focus-visible:ring-amber-500/50' },
  purple: { wrap: 'bg-purple-500/10 border-purple-500/20', icon: 'text-purple-400', toggle: 'bg-purple-500', ring: 'focus-visible:ring-purple-500/50' },
  slate: { wrap: 'bg-slate-500/10 border-slate-500/20', icon: 'text-slate-400', toggle: 'bg-slate-500', ring: 'focus-visible:ring-slate-500/50' },
  emerald: { wrap: 'bg-emerald-500/10 border-emerald-500/20', icon: 'text-emerald-400', toggle: 'bg-emerald-500', ring: 'focus-visible:ring-emerald-500/50' },
  red: { wrap: 'bg-red-500/10 border-red-500/20', icon: 'text-red-400', toggle: 'bg-red-500', ring: 'focus-visible:ring-red-500/50' },
} as const;

type IconTone = keyof typeof ICON_TONES;

function BadgeIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: IconTone }) {
  const t = ICON_TONES[tone];
  return (
    <div className={`p-2 rounded-lg border shrink-0 ${t.wrap}`}>
      <Icon className={`w-4 h-4 ${t.icon}`} />
    </div>
  );
}

function SectionHead({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 mb-3">
      <Icon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <h4 className="font-cyber font-bold text-white text-xs tracking-widest">{title}</h4>
        {desc && <p className="text-xs text-slate-500 mt-1">{desc}</p>}
      </div>
    </div>
  );
}

function ToggleCard({
  icon,
  tone,
  title,
  desc,
  on,
  onClick,
  children,
}: {
  icon: LucideIcon;
  tone: IconTone;
  title: string;
  desc: string;
  on: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  const t = ICON_TONES[tone];
  return (
    <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors space-y-3">
      <div className="flex items-start gap-3">
        <BadgeIcon icon={icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <h5 className="text-sm font-medium text-slate-200 leading-tight mb-0.5">{title}</h5>
          <p className="text-xs text-slate-500 leading-snug">{desc}</p>
        </div>
        <Toggle on={on} onClick={onClick} colorClass={t.toggle} ringClass={t.ring} ariaLabel={title} className="mt-0.5" />
      </div>
      {children}
    </div>
  );
}

export interface SettingsPanelProps {
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  settingsTab: 'general' | 'appearance' | 'shortcuts';
  setSettingsTab: (v: 'general' | 'appearance' | 'shortcuts') => void;
  settingsSaved: boolean;
  langCode: string;
  config: any;
  monitors: any[];
  shortcuts: any[];
  tempBgPath: string;
  setTempBgPath: (v: string) => void;
  handleChangeLanguage: (lang: 'en' | 'es') => void;
  handleUpdateConfigSetting: (keyOrUpdates: string | Record<string, any>, value?: any) => void;
  handleBrowseBgImage: () => void;
  handleApplyCustomBg: () => void;
  handleExportBackup: () => void;
  handleImportBackup: () => void;
  playFolderSound: () => void;
  playLaunchSound: () => void;
  playCyberBeep: () => void;
  playPinBlockSound: () => void;
  showAlert: (title: string, message: string, onConfirm?: () => void) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, danger?: boolean) => void;
  saveDataToConfig: (nextShortcuts: any[], nextCategories: any[]) => Promise<void> | void;
  showChangePinForm: boolean;
  setShowChangePinForm: (v: boolean) => void;
  currentPinInput: string;
  setCurrentPinInput: (v: string) => void;
  newPinInput: string;
  setNewPinInput: (v: string) => void;
  confirmPinInput: string;
  setConfirmPinInput: (v: string) => void;
  changePinError: string;
  setChangePinError: (v: string) => void;
  changePinSuccess: boolean;
  setChangePinSuccess: (v: boolean) => void;
  showDisablePinPrompt: boolean;
  setShowDisablePinPrompt: (v: boolean) => void;
  disablePinInput: string;
  setDisablePinInput: (v: string) => void;
  disablePinError: string;
  setDisablePinError: (v: string) => void;
  showEnablePinPrompt: boolean;
  setShowEnablePinPrompt: (v: boolean) => void;
  enablePinInput: string;
  setEnablePinInput: (v: string) => void;
  enableConfirmPinInput: string;
  setEnableConfirmPinInput: (v: string) => void;
  enablePinError: string;
  setEnablePinError: (v: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  iconSortOrder: 'alpha' | 'recent' | 'added';
  setIconSortOrder: (v: 'alpha' | 'recent' | 'added') => void;
}

export default function SettingsPanel({
  showSettings,
  setShowSettings,
  settingsTab,
  setSettingsTab,
  settingsSaved,
  langCode,
  config,
  monitors,
  shortcuts,
  tempBgPath,
  setTempBgPath,
  handleChangeLanguage,
  handleUpdateConfigSetting,
  handleBrowseBgImage,
  handleApplyCustomBg,
  handleExportBackup,
  handleImportBackup,
  playFolderSound,
  playLaunchSound,
  playCyberBeep,
  playPinBlockSound,
  showAlert,
  showConfirm,
  saveDataToConfig,
  showChangePinForm,
  setShowChangePinForm,
  currentPinInput,
  setCurrentPinInput,
  newPinInput,
  setNewPinInput,
  confirmPinInput,
  setConfirmPinInput,
  changePinError,
  setChangePinError,
  changePinSuccess,
  setChangePinSuccess,
  showDisablePinPrompt,
  setShowDisablePinPrompt,
  disablePinInput,
  setDisablePinInput,
  disablePinError,
  setDisablePinError,
  showEnablePinPrompt,
  setShowEnablePinPrompt,
  enablePinInput,
  setEnablePinInput,
  enableConfirmPinInput,
  setEnableConfirmPinInput,
  enablePinError,
  setEnablePinError,
  viewMode,
  setViewMode,
  iconSortOrder,
  setIconSortOrder,
}: SettingsPanelProps) {
  return (
    <>
{/* ── MODAL: PANEL DE CONFIGURACIÓN NEURAL ── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 180 }}
              className="fixed inset-x-0 bottom-10 h-[80%] z-50 bg-[#070b13]/95 border-t border-[var(--neon-glow-border)] shadow-2xl flex p-0 select-none overflow-hidden font-sans"
            >
              {/* Tab Navigation Menu */}
              <div className="w-56 border-r border-slate-900 bg-slate-950/60 p-6 flex flex-col justify-between text-left" style={{ zoom: 1.25 }}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3.5 mb-4.5">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span className="font-cyber font-bold text-xs text-white tracking-widest">{translate('settings_title')}</span>
                  </div>
                  
                  <button
                    onClick={() => { setSettingsTab('general'); playFolderSound(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
                      settingsTab === 'general'
                        ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10 shadow-[0_0_6px_var(--neon-glow-color-raw)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Keyboard className="w-3.5 h-3.5 shrink-0" />
                    {translate('tab_general')}
                  </button>

                  <button
                    onClick={() => { setSettingsTab('appearance'); playFolderSound(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
                      settingsTab === 'appearance'
                        ? 'border-purple-500/80 text-purple-400 bg-purple-950/10 shadow-[0_0_6px_rgba(168,85,247,0.25)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 shrink-0" />
                    {translate('tab_appearance')}
                  </button>

                  <button
                    onClick={() => { setSettingsTab('shortcuts'); playFolderSound(); }}
                    className={`w-full py-2 px-3 text-left text-xs font-cyber font-bold tracking-wider rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
                      settingsTab === 'shortcuts'
                        ? 'border-amber-500/80 text-amber-500 bg-amber-950/10 shadow-[0_0_6px_rgba(245,158,11,0.25)]'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5 shrink-0" />
                    {translate('tab_shortcuts')}
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Auto-save indicator */}
                  <AnimatePresence>
                    {settingsSaved && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-cyber font-bold tracking-widest text-emerald-400"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        {translate('settings_saved')}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => { setShowSettings(false); playCyberBeep(); }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    {translate('close_btn')}
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar text-left font-sans" style={{ zoom: 1.25 }}>
                
                {/* 1. GENERAL SYSTEM SETTINGS */}
                {settingsTab === 'general' && (
                  <div className="space-y-6 max-w-2xl text-xs">
                    
                    {/* Idioma */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <SectionHead icon={Globe} title={translate('general_language')} desc={translate('general_language_desc')} />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleChangeLanguage('en')}
                          className={`px-4 py-1.5 border rounded-lg transition-all text-xs font-cyber font-bold cursor-pointer ${langCode === 'en' ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                        >
                          ENGLISH
                        </button>
                        <button 
                          onClick={() => handleChangeLanguage('es')}
                          className={`px-4 py-1.5 border rounded-lg transition-all text-xs font-cyber font-bold cursor-pointer ${langCode === 'es' ? 'border-[var(--neon-glow-color)] text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                        >
                          ESPAÑOL
                        </button>
                      </div>
                    </div>

                    {/* Monitor de Despliegue */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <SectionHead icon={Monitor} title={translate('general_monitor')} desc={translate('general_monitor_desc')} />
                      
                      <div className="space-y-1.5">
                        <button
                          onClick={() => isElectron && window.electronAPI!.setMonitor('follow-cursor')}
                          className={`w-full py-2 px-4 border rounded-lg text-left text-xs font-mono flex items-center justify-between cursor-pointer ${config.monitorId === 'follow-cursor' ? 'border-[var(--neon-glow-color)] text-white bg-slate-900' : 'border-slate-900 text-slate-400 hover:border-slate-800'}`}
                        >
                          <span>{translate('general_monitor_follow')}</span>
                          <span className="text-[8.5px] font-cyber bg-cyan-500/10 text-cyan-400 px-1 py-0.2 rounded">{translate('general_monitor_follow_tag')}</span>
                        </button>
                        {monitors.length === 0 ? (
                          <span className="text-slate-600 text-xs italic">{translate('general_monitor_loading')}</span>
                        ) : (
                          monitors.map((mon) => (
                            <button
                              key={mon.id}
                              onClick={() => isElectron && window.electronAPI!.setMonitor(mon.id)}
                              className={`w-full py-2 px-4 border rounded-lg text-left text-xs font-mono flex items-center justify-between cursor-pointer ${config.monitorId === mon.id || (mon.isPrimary && !config.monitorId) ? 'border-[var(--neon-glow-color)] text-white bg-slate-900' : 'border-slate-900 text-slate-400 hover:border-slate-800'}`}
                            >
                              <span>{mon.label}</span>
                              {mon.isPrimary && <span className="text-[8.5px] font-cyber bg-cyan-500/10 text-cyan-400 px-1 py-0.2 rounded">{translate('general_monitor_primary')}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Atajo de Activación Global */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <SectionHead icon={Keyboard} title={translate('general_shortcut')} desc={translate('general_shortcut_desc')} />
                      
                      <div className="flex gap-3">
                        <input
                          type="text"
                          readOnly
                          value={config.shortcut}
                          className="bg-slate-950 border border-slate-900 text-[var(--neon-glow-color)] font-cyber font-bold text-center tracking-widest rounded-lg px-4 py-1.5 focus:outline-none w-48 text-xs"
                        />
                        <button
                          onClick={() => {
                            const newKey = prompt(translate('general_shortcut_prompt'), config.shortcut);
                            if (newKey) {
                              if (isElectron) window.electronAPI!.registerShortcut(newKey);
                              handleUpdateConfigSetting('shortcut', newKey);
                            }
                          }}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          {translate('general_shortcut_record_btn')}
                        </button>
                      </div>
                    </div>

                    {/* Toggles Rápidos */}
                    <div className="space-y-2">
                      <ToggleCard
                        icon={Eye}
                        tone="cyan"
                        title={translate('general_hide_on_blur')}
                        desc={translate('general_hide_on_blur_desc')}
                        on={!!config.hideOnBlur}
                        onClick={() => {
                          const next = !config.hideOnBlur;
                          handleUpdateConfigSetting('hideOnBlur', next);
                          if (isElectron) window.electronAPI!.setHideOnBlur(next);
                        }}
                      />
                      <ToggleCard
                        icon={MousePointer2}
                        tone="amber"
                        title={translate('general_hide_on_dead_zone')}
                        desc={translate('general_hide_on_dead_zone_desc')}
                        on={!!config.hideOnDeadZoneClick}
                        onClick={() => {
                          handleUpdateConfigSetting('hideOnDeadZoneClick', !config.hideOnDeadZoneClick);
                        }}
                      />
                      <ToggleCard
                        icon={Monitor}
                        tone="slate"
                        title={translate('general_show_taskbar')}
                        desc={translate('general_show_taskbar_desc')}
                        on={!!config.showTaskbarIcon}
                        onClick={() => {
                          const next = !config.showTaskbarIcon;
                          handleUpdateConfigSetting('showTaskbarIcon', next);
                          if (isElectron) window.electronAPI!.setShowTaskbarIcon(next);
                        }}
                      />
                      <ToggleCard
                        icon={Power}
                        tone="blue"
                        title={translate('sys_startup')}
                        desc={translate('sys_startup_desc')}
                        on={!!config.autoLaunch}
                        onClick={() => {
                          const next = !config.autoLaunch;
                          handleUpdateConfigSetting('autoLaunch', next);
                          if (isElectron) window.electronAPI!.setAutoLaunch(next);
                        }}
                      />
                    </div>

                    {/* Hotspot Corners */}
                    <div className="space-y-4">
                      <label className="text-xs font-cyber font-bold text-slate-400 tracking-widest drop-shadow-sm flex items-center gap-2">
                        <MousePointer2 className="w-4 h-4 text-[var(--neon-glow-color)]" />
                        {translate('general_hotspots')}
                      </label>

                      <div className="flex flex-col gap-4 bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                          <div className="relative w-48 h-32 bg-black/40 border-2 border-white/10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                            <Monitor className="absolute text-slate-700 w-16 h-16 opacity-50" />
                            {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => {
                              const isActive = config.hotspotCorners?.includes(corner) || false;
                              return (
                                <button
                                  key={corner}
                                  type="button"
                                  onClick={() => {
                                    const current = config.hotspotCorners || [];
                                    const next = isActive
                                      ? current.filter((c: string) => c !== corner)
                                      : [...current, corner];
                                    handleUpdateConfigSetting('hotspotCorners', next);
                                    if (isElectron) window.electronAPI!.setHotspots(next, config.hotspotDelay || 300);
                                  }}
                                  className={`absolute w-10 h-10 flex items-center justify-center transition-all focus:outline-none cursor-pointer ${
                                    isActive
                                      ? 'bg-[var(--neon-glow-color-raw)]/30 border-[var(--neon-glow-color)] shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10'
                                      : 'bg-white/5 border-white/20 hover:bg-white/10'
                                  } ${
                                    corner === 'top-left' ? 'top-0 left-0 rounded-br-2xl border-b border-r' :
                                    corner === 'top-right' ? 'top-0 right-0 rounded-bl-2xl border-b border-l' :
                                    corner === 'bottom-left' ? 'bottom-0 left-0 rounded-tr-2xl border-t border-r' :
                                    'bottom-0 right-0 rounded-tl-2xl border-t border-l'
                                  }`}
                                  aria-pressed={isActive}
                                  aria-label={corner}
                                >
                                  <div className={`w-2.5 h-2.5 rounded-full ${
                                    isActive
                                      ? 'bg-[var(--neon-glow-color)] shadow-[0_0_8px_var(--neon-glow-color)]'
                                      : 'bg-slate-500'
                                  }`} />
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex-1 space-y-4 w-full">
                            <div>
                              <h4 className="text-sm font-medium text-slate-200 mb-1">{translate('general_hotspots_corners')}</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">{translate('general_hotspots_corners_desc')}</p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-300">{translate('general_hotspots_delay')}</span>
                                <span className="text-xs font-mono text-[var(--neon-glow-color)] bg-[var(--neon-glow-color-raw)]/10 px-2 py-0.5 rounded border border-[var(--neon-glow-border)]">
                                  {config.hotspotDelay ?? 300}ms
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1000"
                                step="50"
                                value={config.hotspotDelay ?? 300}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleUpdateConfigSetting('hotspotDelay', val);
                                  if (isElectron) window.electronAPI!.setHotspots(config.hotspotCorners || [], val);
                                }}
                                className="w-full accent-[var(--neon-glow-color)] h-1 bg-white/10 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-[var(--neon-glow-color)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.5)] cursor-pointer mt-3"
                              />
                              <p className="text-[10px] text-slate-500 text-right mt-1">{translate('general_hotspots_delay_desc')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sonidos del Sistema */}
                    <ToggleCard
                      icon={Volume2}
                      tone="emerald"
                      title={translate('settings_sound_launch_enable')}
                      desc={translate('settings_sound_launch_enable_desc')}
                      on={config.soundEnabled !== false}
                      onClick={() => handleUpdateConfigSetting('soundEnabled', config.soundEnabled !== false ? false : true)}
                    >
                      {config.soundEnabled !== false && (
                        <div className="border-t border-white/5 pt-3 space-y-2">
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('settings_sound_launch_path')}</h5>
                          <p className="text-xs text-slate-500">{translate('settings_sound_launch_path_desc')}</p>
                          <div className="flex flex-nowrap items-center gap-2 min-w-0">
                            <input
                              type="text"
                              readOnly
                              value={config.soundPath ? config.soundPath : translate('settings_sound_default_label')}
                              className="flex-1 min-w-0 bg-slate-950 border border-slate-900 text-slate-300 font-mono text-[10px] rounded-lg px-3 py-1.5 focus:outline-none truncate"
                            />
                            <button
                              type="button"
                              onClick={playLaunchSound}
                              className="shrink-0 whitespace-nowrap px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-[var(--neon-glow-border)] text-[var(--neon-glow-color)] rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase font-cyber flex items-center gap-1.5"
                            >
                              <Volume2 className="w-3 h-3" />
                              {translate('settings_sound_launch_preview')}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (isElectron) {
                                  const path = await window.electronAPI!.selectAudio();
                                  if (path) {
                                    handleUpdateConfigSetting('soundPath', path);
                                    playFolderSound();
                                  }
                                }
                              }}
                              className="shrink-0 whitespace-nowrap px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase font-cyber"
                            >
                              {translate('settings_sound_launch_browse')}
                            </button>
                            {config.soundPath && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateConfigSetting('soundPath', '');
                                  playFolderSound();
                                }}
                                className="shrink-0 whitespace-nowrap px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 hover:border-red-800/80 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase font-cyber"
                              >
                                {translate('settings_sound_launch_reset')}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </ToggleCard>

                    {/* Cyber-Vault Security Options */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                      <SectionHead icon={Shield} title={translate('vault_settings_title')} />

                      {/* Enable PIN lock */}
                      <div className="flex items-start gap-3">
                        <BadgeIcon icon={Lock} tone="purple" />
                        <div className="min-w-0 flex-1">
                          <h5 className="text-sm font-medium text-slate-200 leading-tight mb-0.5">{translate('vault_settings_pin_enable')}</h5>
                          <p className="text-xs text-slate-500 leading-snug">{translate('vault_settings_pin_enable_desc')}</p>
                        </div>
                        <Toggle
                          on={!!config.vaultPinEnabled}
                          onClick={async () => {
                            if (config.vaultPinEnabled) {
                              setShowDisablePinPrompt(true);
                              setDisablePinInput('');
                              setDisablePinError('');
                              playCyberBeep();
                            } else {
                              setShowEnablePinPrompt(true);
                              setEnablePinInput('');
                              setEnableConfirmPinInput('');
                              setEnablePinError('');
                              playCyberBeep();
                            }
                          }}
                          colorClass="bg-purple-500"
                          ringClass="focus-visible:ring-purple-500/50"
                          ariaLabel={translate('vault_settings_pin_enable')}
                          className="mt-0.5"
                        />
                      </div>

                      {/* Confirmación para desactivar PIN */}
                      {showDisablePinPrompt && (
                        <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 space-y-3 max-w-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-red-400 font-cyber font-bold">{translate('vault_current_pin')}:</span>
                            <input
                              type="password"
                              maxLength={4}
                              pattern="\d*"
                              value={disablePinInput}
                              onChange={async (e) => {
                                const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                setDisablePinInput(val);
                                if (val.length === 4) {
                                  const storedPin = config.vaultPin || '1234';
                                  if (val === storedPin) {
                                    await handleUpdateConfigSetting('vaultPinEnabled', false);
                                    setShowDisablePinPrompt(false);
                                    playFolderSound();
                                  } else {
                                    setDisablePinError(translate('vault_pin_wrong_current'));
                                    playPinBlockSound();
                                    setDisablePinInput('');
                                  }
                                }
                              }}
                              placeholder="••••"
                              className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                              autoFocus
                            />
                          </div>
                          {disablePinError && (
                            <div className="text-[9.5px] text-red-500 font-mono text-center font-bold tracking-wide uppercase">
                              {disablePinError}
                            </div>
                          )}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowDisablePinPrompt(false);
                                playCyberBeep();
                              }}
                              className="py-1 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer"
                            >
                              {translate('vault_btn_cancel')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Configuración de PIN al activar */}
                      {showEnablePinPrompt && (
                        <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 space-y-3 max-w-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_new_pin')}:</span>
                            <input
                              type="password"
                              maxLength={4}
                              pattern="\d*"
                              value={enablePinInput}
                              onChange={(e) => setEnablePinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                              placeholder="••••"
                              className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_confirm_pin')}:</span>
                            <input
                              type="password"
                              maxLength={4}
                              pattern="\d*"
                              value={enableConfirmPinInput}
                              onChange={(e) => setEnableConfirmPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                              placeholder="••••"
                              className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                            />
                          </div>

                          {enablePinError && (
                            <div className="text-[9.5px] text-red-500 font-mono text-center font-bold tracking-wide uppercase">
                              {enablePinError}
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowEnablePinPrompt(false);
                                playCyberBeep();
                              }}
                              className="py-1 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer"
                            >
                              {translate('vault_btn_cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (enablePinInput.length !== 4) {
                                  setEnablePinError(translate('vault_pin_digits_error'));
                                  playPinBlockSound();
                                  return;
                                }
                                if (enablePinInput !== enableConfirmPinInput) {
                                  setEnablePinError(translate('vault_pin_mismatch'));
                                  playPinBlockSound();
                                  return;
                                }
                                await handleUpdateConfigSetting('vaultPin', enablePinInput);
                                await handleUpdateConfigSetting('vaultPinEnabled', true);
                                setEnablePinError('');
                                setShowEnablePinPrompt(false);
                                playFolderSound();
                              }}
                              className="py-1 px-3 bg-purple-600 border border-purple-500 hover:bg-purple-500 text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                            >
                              {translate('vault_btn_save')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Set PIN Code */}
                      {config.vaultPinEnabled && (
                        <div className="border-t border-slate-900 pt-3 space-y-2">
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('vault_settings_pin_code')}</h5>
                          <p className="text-xs text-slate-500 mt-0.5">{translate('vault_settings_pin_code_desc')}</p>
                          
                          {!showChangePinForm ? (
                            <button
                              onClick={() => {
                                setShowChangePinForm(true);
                                setCurrentPinInput('');
                                setNewPinInput('');
                                setConfirmPinInput('');
                                setChangePinError('');
                                setChangePinSuccess(false);
                                playCyberBeep();
                              }}
                              className="py-1.5 px-4 bg-purple-950/20 border border-purple-500/30 hover:border-purple-500/60 text-purple-400 hover:text-purple-300 text-xs font-cyber font-bold tracking-wider rounded-lg transition-all cursor-pointer"
                            >
                              {translate('vault_change_pin_btn')}
                            </button>
                          ) : (
                            <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 space-y-3 max-w-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_current_pin')}:</span>
                                <input
                                  type="password"
                                  maxLength={4}
                                  pattern="\d*"
                                  value={currentPinInput}
                                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                  placeholder="••••"
                                  className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_new_pin')}:</span>
                                <input
                                  type="password"
                                  maxLength={4}
                                  pattern="\d*"
                                  value={newPinInput}
                                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                  placeholder="••••"
                                  className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-400 font-cyber font-bold">{translate('vault_confirm_pin')}:</span>
                                <input
                                  type="password"
                                  maxLength={4}
                                  pattern="\d*"
                                  value={confirmPinInput}
                                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                  placeholder="••••"
                                  className="bg-slate-900 border border-slate-800 text-purple-400 font-cyber font-bold text-center tracking-widest rounded px-2 py-1 focus:outline-none w-20 text-xs"
                                />
                              </div>

                              {changePinError && (
                                <div className="text-[9.5px] text-red-500 font-mono text-center font-bold tracking-wide uppercase">
                                  {changePinError}
                                </div>
                              )}

                              {changePinSuccess && (
                                <div className="text-[9.5px] text-emerald-400 font-mono text-center font-bold tracking-wide uppercase animate-pulse">
                                  {translate('vault_pin_changed_success')}
                                </div>
                              )}

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowChangePinForm(false);
                                    playCyberBeep();
                                  }}
                                  className="py-1 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer"
                                >
                                  {translate('vault_btn_cancel')}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const storedPin = config.vaultPin || '1234';
                                    if (currentPinInput !== storedPin) {
                                      setChangePinError(translate('vault_pin_wrong_current'));
                                      playPinBlockSound();
                                      return;
                                    }
                                    if (newPinInput.length !== 4) {
                                      setChangePinError(translate('vault_pin_digits_error'));
                                      playPinBlockSound();
                                      return;
                                    }
                                    if (newPinInput !== confirmPinInput) {
                                      setChangePinError(translate('vault_pin_mismatch'));
                                      playPinBlockSound();
                                      return;
                                    }
                                    await handleUpdateConfigSetting('vaultPin', newPinInput);
                                    setChangePinError('');
                                    setChangePinSuccess(true);
                                    playFolderSound();
                                    setTimeout(() => {
                                      setShowChangePinForm(false);
                                      setChangePinSuccess(false);
                                    }, 1500);
                                  }}
                                  className="py-1 px-3 bg-purple-600 border border-purple-500 hover:bg-purple-500 text-white text-[10px] font-cyber font-bold tracking-wider rounded transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                                >
                                  {translate('vault_btn_save')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Vault Lock Timeout */}
                      {config.vaultPinEnabled && (
                        <div className="border-t border-slate-900 pt-3 space-y-2">
                          <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('vault_settings_timeout')}</h5>
                          <p className="text-xs text-slate-500 mt-0.5">{translate('vault_settings_timeout_desc')}</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { val: 0, label: translate('vault_timeout_immediate') },
                              { val: 1, label: translate('vault_timeout_1m') },
                              { val: 5, label: translate('vault_timeout_5m') },
                              { val: 15, label: translate('vault_timeout_15m') },
                              { val: -1, label: translate('vault_timeout_session') }
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                onClick={() => handleUpdateConfigSetting('vaultLockTimeout', opt.val)}
                                className={`px-3 py-1.5 border rounded-lg text-[10px] font-cyber font-bold transition-all cursor-pointer ${
                                  config.vaultLockTimeout === opt.val
                                    ? 'border-purple-500 text-purple-400 bg-purple-950/10'
                                    : 'border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* 2. INTERFACE CORE (APPEARANCE) SETTINGS */}
                {settingsTab === 'appearance' && (
                  <div className="space-y-6 max-w-2xl text-xs">

                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                      <SectionHead icon={LayoutGrid} title={translate('app_layout')} desc={translate('app_layout_desc')} />

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-cyber font-bold text-slate-300 text-xs tracking-wider">{translate('app_icon_size')}</h5>
                          <span className="text-xs font-mono text-[var(--neon-glow-color)]">{config.iconSize}px</span>
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={90}
                          value={config.iconSize}
                          onChange={(e) => handleUpdateConfigSetting('iconSize', parseInt(e.target.value, 10))}
                          className="w-full accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-full cursor-pointer"
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-900">
                        <h5 className="font-cyber font-bold text-slate-300 text-xs tracking-wider mb-2">{translate('app_view_mode')}</h5>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => { setViewMode('grid'); playCyberBeep(); }}
                            className={`py-2 px-3 border rounded-lg text-xs font-cyber font-bold flex items-center justify-center gap-2 cursor-pointer ${
                              viewMode === 'grid'
                                ? 'border-[var(--neon-glow-color)] text-white bg-slate-900'
                                : 'border-slate-900 text-slate-500 hover:border-slate-800'
                            }`}
                          >
                            <Grid className="w-3.5 h-3.5" />
                            {translate('view_mode_grid')}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setViewMode('list'); playCyberBeep(); }}
                            className={`py-2 px-3 border rounded-lg text-xs font-cyber font-bold flex items-center justify-center gap-2 cursor-pointer ${
                              viewMode === 'list'
                                ? 'border-[var(--neon-glow-color)] text-white bg-slate-900'
                                : 'border-slate-900 text-slate-500 hover:border-slate-800'
                            }`}
                          >
                            <ListIcon className="w-3.5 h-3.5" />
                            {translate('view_mode_list')}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-900">
                        <h5 className="font-cyber font-bold text-slate-300 text-xs tracking-wider mb-2">{translate('app_sort_order')}</h5>
                        <div className="flex flex-col gap-1">
                          {([
                            ['alpha', 'sort_alpha'],
                            ['recent', 'sort_recent'],
                            ['added', 'sort_added'],
                          ] as const).map(([id, key]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => { setIconSortOrder(id); playCyberBeep(); }}
                              className={`py-1.5 px-3 border rounded-lg text-left text-xs font-cyber font-bold flex items-center gap-2 cursor-pointer ${
                                iconSortOrder === id
                                  ? 'border-[var(--neon-glow-color)] text-white bg-slate-900'
                                  : 'border-slate-900 text-slate-500 hover:border-slate-800'
                              }`}
                            >
                              <ArrowUpDown className="w-3 h-3" />
                              {translate(key)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Presets de Color */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <SectionHead icon={Palette} title={translate('app_theme_presets')} desc={translate('app_theme_presets_desc')} />
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'cyan', name: translate('preset_cyan'), color: 'text-cyan-400 bg-cyan-950/15' },
                          { id: 'purple', name: translate('preset_purple'), color: 'text-purple-400 bg-purple-950/15' },
                          { id: 'amber', name: translate('preset_amber'), color: 'text-amber-500 bg-amber-950/15' },
                          { id: 'crimson', name: translate('preset_crimson'), color: 'text-red-500 bg-red-950/15' },
                          { id: 'emerald', name: translate('preset_emerald'), color: 'text-emerald-400 bg-emerald-950/15' },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => handleUpdateConfigSetting('theme', preset.id)}
                            className={`py-2 px-3 border rounded-lg text-left text-xs font-cyber font-bold flex items-center justify-between cursor-pointer ${config.theme === preset.id ? 'border-[var(--neon-glow-color)] text-white bg-slate-900 shadow-[0_0_8px_var(--neon-glow-color-raw)]' : 'border-slate-900 text-slate-500 hover:border-slate-800'}`}
                          >
                            <span>{preset.name}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${preset.id === 'cyan' ? 'bg-cyan-400' : preset.id === 'purple' ? 'bg-purple-400' : preset.id === 'amber' ? 'bg-amber-500' : preset.id === 'crimson' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selector de Tipo de Fondo */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <SectionHead icon={ImageIcon} title={translate('app_bg_type')} />
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'solid', name: translate('app_bg_type_solid'), icon: Droplets },
                          { id: 'gradient', name: translate('app_bg_type_gradient'), icon: Palette },
                          { id: 'image', name: translate('app_bg_type_image'), icon: ImageIcon }
                        ].map((type) => (
                          <button
                            key={type.id}
                            onClick={() => { handleUpdateConfigSetting('bgType', type.id); playCyberBeep(); }}
                            className={`py-2 px-3 border rounded-lg text-center text-xs font-cyber font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              config.bgType === type.id 
                                ? 'border-[var(--neon-glow-color)] text-white bg-slate-900 shadow-[0_0_8px_var(--neon-glow-color-raw)]' 
                                : 'border-slate-900 text-slate-500 hover:border-slate-800'
                            }`}
                          >
                            <type.icon className="w-3.5 h-3.5" />
                            {type.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Controles Dinámicos Según Tipo de Fondo */}
                    {config.bgType === 'solid' && (
                      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-3">
                        <SectionHead icon={Droplets} title={translate('app_bg_solid_color')} desc={translate('app_bg_solid_color_desc')} />
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={config.bgSolidColor || '#070b13'}
                            onChange={(e) => handleUpdateConfigSetting('bgSolidColor', e.target.value)}
                            className="w-10 h-10 rounded border border-slate-800 bg-transparent cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={config.bgSolidColor || '#070b13'}
                            onChange={(e) => handleUpdateConfigSetting('bgSolidColor', e.target.value)}
                            placeholder="#070b13"
                            className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs font-mono w-28 uppercase"
                          />
                          <button
                            onClick={() => handleUpdateConfigSetting('bgSolidColor', '#070b13')}
                            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            {translate('app_bg_reset')} (#070B13)
                          </button>
                        </div>
                      </div>
                    )}

                    {config.bgType === 'gradient' && (
                      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-3">
                        <SectionHead icon={Palette} title={translate('app_bg_gradients')} desc={translate('app_bg_gradients_desc')} />
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'preset-1', name: translate('app_bg_gradient_cyan'), css: 'bg-gradient-to-br from-[#061826] via-[#070b13] to-[#042f40] border-cyan-800' },
                            { id: 'preset-2', name: translate('app_bg_gradient_purple'), css: 'bg-gradient-to-br from-[#12072b] via-[#070b13] to-[#24083b] border-purple-800' },
                            { id: 'preset-3', name: translate('app_bg_gradient_amber'), css: 'bg-gradient-to-br from-[#1c0d02] via-[#070b13] to-[#3a1a03] border-amber-800' },
                            { id: 'preset-4', name: translate('app_bg_gradient_crimson'), css: 'bg-gradient-to-br from-[#1c0202] via-[#070b13] to-[#3d0303] border-red-950' }
                          ].map((gradient) => (
                            <button
                              key={gradient.id}
                              onClick={() => { handleUpdateConfigSetting('bgGradient', gradient.id); playCyberBeep(); }}
                              className={`h-16 rounded-xl border flex flex-col justify-end p-2.5 text-left transition-all relative overflow-hidden cursor-pointer group ${gradient.css} ${
                                config.bgGradient === gradient.id 
                                  ? 'ring-2 ring-[var(--neon-glow-color)] border-white scale-[1.02] shadow-[0_0_10px_var(--neon-glow-color-raw)]' 
                                  : 'hover:scale-[1.01]'
                              }`}
                            >
                              <span className="text-[9px] font-cyber font-extrabold text-white tracking-widest group-hover:text-[var(--neon-glow-color)] transition-colors">{gradient.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {config.bgType === 'image' && (
                      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                        <SectionHead icon={ImageIcon} title={translate('app_bg_preset_images')} desc={translate('app_bg_preset_images_desc')} />
                        
                        {/* Presets Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: 'preset-1', name: translate('preset_cyan'), path: '/backgrounds/cyber_bg_1.png' },
                            { id: 'preset-2', name: translate('preset_purple'), path: '/backgrounds/cyber_bg_2.png' },
                            { id: 'preset-3', name: translate('preset_amber'), path: '/backgrounds/cyber_bg_3.png' },
                            { id: 'preset-4', name: translate('preset_emerald'), path: '/backgrounds/cyber_bg_4.png' }
                          ].map((img) => (
                            <button
                              key={img.id}
                              onClick={() => { handleUpdateConfigSetting('bgImage', img.id); playCyberBeep(); }}
                              className={`h-20 rounded-xl border relative overflow-hidden transition-all text-left flex flex-col justify-end p-2 cursor-pointer group ${
                                config.bgImage === img.id 
                                  ? 'border-[var(--neon-glow-color)] ring-1 ring-[var(--neon-glow-color)] scale-[1.02] shadow-[0_0_10px_var(--neon-glow-color-raw)]' 
                                  : 'border-slate-950 hover:border-slate-900'
                              }`}
                            >
                              <img src={img.path} alt={img.name} className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent z-1" />
                              <span className="text-[9px] font-cyber font-extrabold text-white tracking-widest relative z-2 uppercase">{img.name}</span>
                            </button>
                          ))}
                        </div>

                        {/* Custom Background Image selection */}
                        <div className="border-t border-slate-900 pt-3">
                          <h5 className="font-cyber font-bold text-white text-[10px] tracking-wider uppercase mb-1">{translate('app_bg_custom')}</h5>
                          <p className="text-xs text-slate-500 mb-2">{translate('app_bg_custom_desc')}</p>
                          
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={tempBgPath}
                              onChange={(e) => setTempBgPath(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustomBg(); }}
                              placeholder="C:\Users\...\background.png o https://..."
                              className="flex-1 bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[var(--neon-glow-color)] text-xs font-mono"
                            />
                            <button
                              onClick={handleBrowseBgImage}
                              className="px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {translate('app_bg_browse')}
                            </button>
                            <button
                              onClick={handleApplyCustomBg}
                              className="px-4.5 bg-[var(--neon-glow-color-raw)] hover:bg-[var(--neon-glow-color)] text-[var(--neon-glow-color)] hover:text-slate-950 font-cyber font-bold tracking-widest text-[9.5px] rounded-lg border border-[var(--neon-glow-border)] transition-all cursor-pointer"
                            >
                              {translate('app_bg_apply')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sliders de Transparencia y/o Desenfoque (visibles en modos de degradado/imagen) */}
                    {(config.bgType === 'image' || config.bgType === 'gradient') && (
                      <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl space-y-4">
                        
                        {config.bgType === 'image' && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('app_opacity')}</h5>
                              <span className="text-[var(--neon-glow-color)] font-bold">{config.opacity}%</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">{translate('app_opacity_desc')}</p>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={config.opacity}
                              onChange={(e) => handleUpdateConfigSetting('opacity', parseInt(e.target.value))}
                              className="w-full accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-lg cursor-pointer"
                            />
                          </div>
                        )}

                        <div className={config.bgType === 'image' ? "border-t border-slate-900 pt-3" : ""}>
                          <div className="flex justify-between items-center mb-1">
                            <h5 className="font-cyber font-bold text-white text-xs tracking-wider">{translate('app_blur')}</h5>
                            <span className="text-[var(--neon-glow-color)] font-bold">{config.blurLevel}px</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{translate('app_blur_desc')}</p>
                          <input
                            type="range"
                            min="0"
                            max="40"
                            value={config.blurLevel}
                            onChange={(e) => handleUpdateConfigSetting('blurLevel', parseInt(e.target.value))}
                            className="w-full accent-[var(--neon-glow-color)] h-1 bg-slate-900 rounded-lg cursor-pointer"
                          />
                        </div>

                      </div>
                    )}

                  </div>
                )}

                {/* 3. SYSTEM LAUNCH & SPEC SETTINGS */}
                {settingsTab === 'shortcuts' && (
                  <div className="space-y-6 max-w-2xl text-xs">
                    
                    {/* Persistencia y backups */}
                    <div className="bg-slate-950/50 p-4 border border-slate-900 rounded-xl">
                      <SectionHead icon={HardDrive} title={translate('sys_backup')} desc={translate('sys_backup_desc')} />
                      
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={handleExportBackup}
                          className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {translate('sys_export_btn')}
                        </button>
                        <button
                          onClick={handleImportBackup}
                          className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {translate('sys_import_btn')}
                        </button>
                        <button
                          onClick={() => isElectron && window.electronAPI!.openDataFolder()}
                          className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          {translate('sys_data_dir_btn')}
                        </button>
                        <button
                          onClick={() => isElectron && window.electronAPI!.openDevTools()}
                          className="py-1.5 px-4 bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          {translate('sys_diag_btn')}
                        </button>
                      </div>
                    </div>

                    {/* Administrador de carpetas físicas indexadas */}
                    <div className="bg-slate-950/50 p-4 border border-red-950/40 rounded-xl">
                      <div className="flex items-start gap-2.5 mb-3">
                        <BadgeIcon icon={AlertTriangle} tone="red" />
                        <div className="min-w-0">
                          <h4 className="font-cyber font-bold text-red-400 text-xs tracking-widest">{translate('sys_danger_title')}</h4>
                          <p className="text-xs text-slate-500 mt-1">{translate('sys_danger_desc')}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          showConfirm(
                            translate('sys_purge_confirm_title'),
                            translate('sys_purge_confirm_desc'),
                            async () => {
                              await saveDataToConfig([], INITIAL_CATEGORIES);
                              showAlert(
                                translate('sys_purge_done_title'),
                                translate('sys_purge_done_desc')
                              );
                            },
                            true
                          );
                        }}
                        className="py-1.5 px-4 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        {translate('sys_purge_btn')}
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
