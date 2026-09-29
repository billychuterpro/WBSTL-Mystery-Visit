import React from 'react';
import { X, Check, Palette, Sparkles, Sun, Moon, Layers, ShieldCheck, TrendingUp } from 'lucide-react';
import { AppThemeId, APP_THEMES, AppTheme } from '../types/themes';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: AppThemeId;
  onSelectTheme: (themeId: AppThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Hub Appearance & Aesthetic Themes
              </h2>
              <p className="text-xs text-slate-400">
                Select a tailored visual identity for Warner Bros Studio Tour London catering operations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.values(APP_THEMES) as AppTheme[]).map((theme) => {
            const isSelected = currentThemeId === theme.id;

            return (
              <div
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`relative rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/20 bg-slate-800/90 shadow-lg'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  {/* Top Bar inside card: Mode & Selection */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                      {theme.mode === 'dark' ? (
                        <Moon className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{theme.mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                        <Check className="w-3 h-3" />
                        <span>Active Theme</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 group-hover:text-slate-300">
                        Click to apply
                      </span>
                    )}
                  </div>

                  {/* Theme Title & Tagline */}
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {theme.name}
                  </h3>
                  <div className="text-xs text-amber-400/90 font-medium mt-0.5">
                    {theme.tagline}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {theme.description}
                  </p>

                  {/* Color Swatches */}
                  <div className="mt-3.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Palette:</span>
                    {theme.previewColors.map((color, cIdx) => (
                      <div
                        key={cIdx}
                        className="w-5 h-5 rounded border border-slate-700 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Mini Preview Mockup */}
                  <div
                    className="mt-4 rounded-lg p-3 border text-xs"
                    style={{
                      backgroundColor: theme.previewColors[0],
                      borderColor: theme.previewColors[1] === '#FFFFFF' ? '#E2E8F0' : '#1E293B',
                      color: theme.mode === 'dark' ? '#F8FAFC' : '#0F172A',
                    }}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center text-white"
                          style={{ backgroundColor: theme.previewColors[2] }}
                        >
                          WB
                        </div>
                        <span className="font-semibold text-[11px]">Catering Hub</span>
                      </div>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: `${theme.previewColors[2]}20`,
                          color: theme.previewColors[2],
                        }}
                      >
                        93.9% YTD
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      <div
                        className="p-1.5 rounded border text-[10px]"
                        style={{
                          backgroundColor: theme.previewColors[1],
                          borderColor: theme.mode === 'dark' ? '#334155' : '#E2E8F0',
                        }}
                      >
                        <div className="text-[9px] opacity-70">Food Hall</div>
                        <div className="font-bold font-mono">100.0%</div>
                      </div>
                      <div
                        className="p-1.5 rounded border text-[10px]"
                        style={{
                          backgroundColor: theme.previewColors[1],
                          borderColor: theme.mode === 'dark' ? '#334155' : '#E2E8F0',
                        }}
                      >
                        <div className="text-[9px] opacity-70">Allergies</div>
                        <div className="font-bold font-mono text-emerald-500">100% OK</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Button */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Font: {theme.fontFamilyDisplay.split(',')[0]}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTheme(theme.id);
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {isSelected ? 'Applied' : 'Select Theme'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <p>
            Appearance settings persist in your browser session for seamless reporting presentations.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
