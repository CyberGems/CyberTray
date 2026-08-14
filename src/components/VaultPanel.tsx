import React from 'react';
import { Shield, FolderSearch, FolderOpen, Info } from 'lucide-react';
import { translate } from '../locales';
import { isElectron } from '../lib/appUtils';

interface VaultPanelProps {
  config: any;
  showVaultHelp: boolean;
  setShowVaultHelp: (v: boolean) => void;
  handleUpdateConfigSetting: (key: string, value: any) => void;
  playFolderSound: () => void;
  playCyberBeep: () => void;
}

export default function VaultPanel({
  config,
  showVaultHelp,
  setShowVaultHelp,
  handleUpdateConfigSetting,
  playFolderSound,
  playCyberBeep,
}: VaultPanelProps) {
  return (
    <>
      <div className="mt-8 pt-6 border-t border-purple-900/30 max-w-4xl space-y-4 animate-fade-in">
        <div className="bg-slate-950/40 p-4 border border-purple-950/50 rounded-xl space-y-3">
          <div className="space-y-1">
            <h5 className="font-ui font-bold text-purple-300 text-sm tracking-wide uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              {translate('vault_settings_path')}
            </h5>
            <p className="text-[11px] text-slate-400 leading-normal">
              {translate('vault_settings_path_desc')}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.vaultPath || ''}
              onChange={(e) => handleUpdateConfigSetting('vaultPath', e.target.value)}
              placeholder={isElectron ? "C:\\Users\\... (Default App Data Files)" : "Default Web Storage Path"}
              className="flex-1 min-w-0 bg-slate-950/80 border border-slate-900 text-slate-300 font-mono text-[11px] rounded-lg px-3 py-2 focus:outline-none truncate"
            />
            {isElectron && (
              <button
                onClick={async () => {
                  const selected = await window.electronAPI!.selectVaultFolder();
                  if (selected) {
                    handleUpdateConfigSetting('vaultPath', selected);
                    playFolderSound();
                  }
                }}
                className="shrink-0 px-3 py-2 bg-purple-950/20 hover:bg-purple-950/30 border border-purple-900/50 hover:border-purple-800/80 text-purple-300 hover:text-purple-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <FolderSearch className="w-3.5 h-3.5" />
                {translate('vault_browse_folder')}
              </button>
            )}
            {isElectron && (
              <button
                onClick={async () => {
                  const defPath = await window.electronAPI!.getDefaultVaultPath();
                  handleUpdateConfigSetting('vaultPath', defPath);
                  playFolderSound();
                }}
                className="shrink-0 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
              >
                {translate('vault_default_btn')}
              </button>
            )}
          </div>
          {isElectron && (
            <button
              onClick={() => window.electronAPI!.openVaultFolder()}
              className="w-full md:w-auto px-4 py-2 bg-purple-950/20 hover:bg-purple-950/30 border border-purple-900/50 hover:border-purple-800/80 text-purple-300 hover:text-purple-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {translate('vault_open_folder')}
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-purple-900/30 max-w-4xl space-y-3 animate-fade-in">
        <div className="bg-slate-950/40 border border-purple-950/50 rounded-xl overflow-hidden">
          <button
            onClick={() => { setShowVaultHelp(!showVaultHelp); playCyberBeep(); }}
            className="w-full flex items-center justify-between px-4 py-3 bg-purple-950/10 hover:bg-purple-950/20 transition-all text-left cursor-pointer focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              <span className="font-ui font-bold text-white text-sm tracking-wide uppercase">
                {translate('vault_guide_title')}
              </span>
            </div>
            <span className="text-[11px] font-ui font-bold text-purple-400/80 hover:text-purple-300">
              {showVaultHelp ? translate('vault_guide_toggle_hide') : translate('vault_guide_toggle_show')}
            </span>
          </button>

          {showVaultHelp && (
            <div className="p-4 border-t border-purple-950/30 space-y-4 font-sans text-[11px] text-slate-400 select-text leading-relaxed">
            <p className="text-[12px] text-slate-300 font-ui font-bold tracking-wide uppercase border-b border-purple-950/30 pb-2">
                {translate('vault_guide_intro')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 bg-slate-950/30 p-3 rounded border border-purple-950/20">
                  <h6 className="font-ui font-bold text-purple-300 text-[12px] tracking-wide">{translate('vault_guide_p1_title')}</h6>
                  <p>{translate('vault_guide_p1_desc')}</p>
                </div>

                <div className="space-y-1.5 bg-slate-950/30 p-3 rounded border border-purple-950/20">
                  <h6 className="font-ui font-bold text-purple-300 text-[12px] tracking-wide">{translate('vault_guide_p2_title')}</h6>
                  <p>{translate('vault_guide_p2_desc')}</p>
                </div>

                <div className="space-y-1.5 bg-slate-950/30 p-3 rounded border border-purple-950/20">
                  <h6 className="font-ui font-bold text-purple-300 text-[12px] tracking-wide">{translate('vault_guide_p3_title')}</h6>
                  <p>{translate('vault_guide_p3_desc')}</p>
                </div>

                <div className="space-y-1.5 bg-slate-950/30 p-3 rounded border border-purple-950/20">
                  <h6 className="font-ui font-bold text-purple-300 text-[12px] tracking-wide">{translate('vault_guide_p4_title')}</h6>
                  <p>{translate('vault_guide_p4_desc')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
