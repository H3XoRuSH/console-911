import React, { useState, useRef } from 'react';
import TitleLogo from '@/public/img/title.svg';

interface StartScreenProps {
  dispatcherName: string;
  setDispatcherName: (val: string) => void;
  onStart: () => void;
  previewMode?: boolean;
  availableScenarios?: Array<{ id: string; title: string; archetype: string }>;
  selectedScenarios?: string[];
  setSelectedScenarios?: (ids: string[]) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  dispatcherName,
  setDispatcherName,
  onStart,
  previewMode = false,
  availableScenarios = [],
  selectedScenarios = [],
  setSelectedScenarios = () => {}
}) => {
  const [error, setError] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredScenarios = React.useMemo(() => {
    const list = availableScenarios.filter(
      (s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.archetype.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...list].sort((a, b) => a.id.localeCompare(b.id));
  }, [availableScenarios, searchQuery]);
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto terminal-scroll">
      <div className="text-emerald-500 crt-glow-green mb-6 flex justify-center select-none">
        <TitleLogo aria-label="CONSOLE911" role="img" />
      </div>

      <div className="w-full max-w-xl border border-emerald-900 bg-zinc-950/60 p-6 rounded shadow-xl text-center space-y-4">
        <h2 className="text-sm font-bold tracking-widest text-emerald-400 uppercase border-b border-emerald-950 pb-2">
          Emergency Dispatcher Operating Manual
        </h2>
        <p className="text-xs text-emerald-500/80 leading-relaxed text-left">
          Welcome to the console terminal, Operator. You are tasked with screening and routing
          incoming 911 lines. Each dispatch shift consists of up to{' '}
          <strong className="text-emerald-400">5 calls</strong>. You must assess the situation,
          query details using free-text, give directions, and route appropriate responders.
        </p>

        <ul className="text-xs text-left text-emerald-500/80 space-y-2 pl-4 list-disc">
          <li>
            <strong className="text-emerald-400">10-Turn Cap:</strong> Standard lines will terminate
            or cutoff forcibly at turn 10. Avoid wasting turns.
          </li>
          <li>
            <strong className="text-emerald-400">Urgency Alerts:</strong> Flashing warnings appear
            at turns 8 and 9. Plan final dispatches quickly.
          </li>
          <li>
            <strong className="text-emerald-400">Leaderboard Protocol:</strong> Score values dictate
            global ranks, ranging from Rookie Survivor to Chief Dispatcher.
          </li>
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!dispatcherName.trim()) {
              setError(true);
              inputRef.current?.focus();
              return;
            }
            setError(false);
            onStart();
          }}
          className="space-y-4 pt-4"
        >
          {previewMode && availableScenarios.length > 0 && (
            <div className="w-full max-w-md mx-auto border border-amber-900/60 bg-zinc-950/60 p-4 rounded text-left space-y-3 shadow-md shadow-amber-950/10">
              <h3 className="text-xs font-bold tracking-widest text-amber-500 uppercase border-b border-amber-950/50 pb-1.5 flex justify-between">
                <span>☣️ Preview Debug Panel</span>
                <span className="text-[10px] text-amber-500/60 font-mono">PREVIEW_MODE=ACTIVE</span>
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-amber-500/80 font-mono">
                    SELECT SCENARIOS ({selectedScenarios.length}/5):
                  </span>
                  {selectedScenarios.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedScenarios([])}
                      className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase underline cursor-pointer font-mono"
                    >
                      [Clear playlist]
                    </button>
                  )}
                </div>

                {/* Search bar */}
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-amber-600 font-bold font-mono select-none">
                    FILTER&gt;
                  </span>
                  <input
                    type="text"
                    placeholder="Search scenarios by title or archetype..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-black border border-amber-900/60 text-amber-400 placeholder:text-amber-900/30 text-xs py-1.5 px-3 rounded focus:outline-none focus:border-amber-600 font-bold"
                  />
                </div>

                {/* Scrollable List */}
                <div className="h-36 overflow-y-auto border border-amber-900/40 rounded bg-black/45 p-2 space-y-1 terminal-scroll text-xs">
                  {filteredScenarios.map((s) => {
                    const selectIndex = selectedScenarios.indexOf(s.id);
                    const isSelected = selectIndex !== -1;

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedScenarios(selectedScenarios.filter((id) => id !== s.id));
                          } else {
                            if (selectedScenarios.length >= 5) {
                              alert('Shift playlist is capped at 5 scenarios.');
                              return;
                            }
                            setSelectedScenarios([...selectedScenarios, s.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-1.5 rounded border border-transparent cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-950/20 border-amber-800/40 text-amber-400 font-bold shadow-[0_0_8px_rgba(245,158,11,0.05)]'
                            : 'hover:bg-amber-950/10 text-amber-500/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="text-[9px] text-amber-600/80 font-mono">[{s.id}]</span>
                          <span className="truncate">{s.title}</span>
                          <span className="text-[9px] text-amber-600/50 italic font-mono truncate">
                            ({s.archetype})
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center font-mono">
                          {isSelected ? (
                            <span className="bg-amber-950/45 border border-amber-600 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse">
                              PLAY #{selectIndex + 1}
                            </span>
                          ) : (
                            <span className="text-amber-900/40 text-[9px]">[+]</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredScenarios.length === 0 && (
                    <div className="text-center text-amber-900/40 py-8 italic font-mono">
                      No scenarios match your query.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <label
              htmlFor="callsign"
              className="text-xs font-bold uppercase tracking-widest text-emerald-400"
            >
              Enter Callsign / Operator ID:
            </label>
            <input
              ref={inputRef}
              id="callsign"
              type="text"
              maxLength={15}
              value={dispatcherName}
              onChange={(e) => {
                if (error) setError(false);
                setDispatcherName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''));
              }}
              placeholder={error ? 'CALLSIGN REQUIRED' : 'OPERATOR-911'}
              className={`bg-black border text-center text-sm py-2 px-4 rounded w-64 focus:outline-none tracking-widest uppercase font-bold transition-all ${
                error
                  ? 'border-red-600 text-red-500 placeholder:text-red-700/80 focus:border-red-500 focus:ring-1 focus:ring-red-600 crt-glow-red animate-pulse'
                  : 'border-emerald-800 text-emerald-400 placeholder:text-emerald-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-800'
              }`}
            />
          </div>

          <button
            type="submit"
            className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-3 px-8 rounded cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            Boot Dispatch Console
          </button>
        </form>
      </div>
    </main>
  );
};
