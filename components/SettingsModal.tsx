import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'green' | 'amber' | 'cyan' | 'silver' | 'paper' | 'lab';
  setTheme: (theme: 'green' | 'amber' | 'cyan' | 'silver' | 'paper' | 'lab') => void;
  textSize: 'small' | 'medium' | 'large';
  setTextSize: (size: 'small' | 'medium' | 'large') => void;
  crtEnabled: boolean;
  setCrtEnabled: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  setTheme,
  textSize,
  setTextSize,
  crtEnabled,
  setCrtEnabled
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      {/* Click backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md border border-emerald-950 bg-zinc-950/95 p-6 rounded shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto terminal-scroll">
        <div className="border-b border-emerald-950 pb-3 flex justify-between items-center">
          <h2 className="text-sm font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Configurations
          </h2>
          <button
            onClick={onClose}
            className="text-emerald-500 hover:text-emerald-300 font-bold uppercase text-[10px] tracking-wider border border-emerald-950 bg-emerald-950/20 px-2 py-0.5 rounded cursor-pointer hover:bg-emerald-900/40 transition-all"
          >
            [ESC] CLOSE
          </button>
        </div>

        {/* Console Theme Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-emerald-500/70 block">
            Terminal Color Profile
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'green', label: 'GREEN CRT', hex: '#10b981' },
                { id: 'amber', label: 'AMBER CRT', hex: '#f59e0b' },
                { id: 'cyan', label: 'CYAN CRT', hex: '#06b6d4' },
                { id: 'silver', label: 'SILVER MONO', hex: '#d4d4d8' },
                { id: 'paper', label: 'VINTAGE PAPER (LT)', hex: '#d6d3d1' },
                { id: 'lab', label: 'RETRO LAB (LT)', hex: '#0d9488' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-2 border px-3 py-2 rounded text-left text-xs font-bold cursor-pointer transition-all hover:bg-emerald-950/30 ${
                  theme === t.id
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    : 'border-emerald-950/60 text-emerald-500/60 bg-transparent'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.hex }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Size Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-emerald-500/70 block">
            Console Text Scaling
          </label>
          <div className="flex gap-2">
            {(
              [
                { id: 'small', label: 'SMALL (85%)', desc: 'Dense View' },
                { id: 'medium', label: 'MEDIUM (100%)', desc: 'Standard' },
                { id: 'large', label: 'LARGE (115%)', desc: 'High Visibility' }
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setTextSize(s.id)}
                className={`flex-1 flex flex-col items-center justify-center border py-2.5 rounded text-center cursor-pointer transition-all hover:bg-emerald-950/30 ${
                  textSize === s.id
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    : 'border-emerald-950/60 text-emerald-500/60 bg-transparent'
                }`}
              >
                <span className="text-xs font-bold">{s.label}</span>
                <span className="text-[9px] text-emerald-500/40 uppercase mt-0.5">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CRT Scanline Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-emerald-500/70 block">
            Monitor Tube Display
          </label>
          <div className="flex items-center justify-between border border-emerald-950 bg-black/60 p-3 rounded">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-400">CRT SCANLINES & FLICKER</span>
              <span className="text-[9px] text-emerald-500/40 uppercase">
                Simulate analog electron beam raster scanlines
              </span>
            </div>
            <button
              onClick={() => setCrtEnabled(!crtEnabled)}
              className={`px-3 py-1.5 border text-xs font-bold rounded tracking-widest transition-all cursor-pointer ${
                crtEnabled
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                  : 'border-emerald-950 text-emerald-500/40 bg-transparent'
              }`}
            >
              {crtEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        {/* Save/Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-3 px-8 rounded cursor-pointer transition-all active:scale-95 text-center shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          >
            Apply Configurations
          </button>
        </div>
      </div>
    </div>
  );
};
