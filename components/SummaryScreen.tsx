import React, { useState, useEffect } from 'react';
import { HydratedCallSession } from '@/lib/hydration';
import { LeaderboardEntry, TranscriptMessage } from '@/types/game';

interface SummaryScreenProps {
  calls: HydratedCallSession[];
  completedTranscripts: TranscriptMessage[][];
  totalScore: number;
  dispatcherName: string;
  setDispatcherName: (val: string) => void;
  leaderboard: LeaderboardEntry[];
  scoreSubmitted: boolean;
  submittingScore: boolean;
  onSubmitLeaderboard: (e: React.FormEvent) => void;
  onReboot: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  calls,
  completedTranscripts,
  totalScore,
  dispatcherName,
  setDispatcherName,
  leaderboard,
  scoreSubmitted,
  submittingScore,
  onSubmitLeaderboard,
  onReboot
}) => {
  const [selectedCallIndex, setSelectedCallIndex] = useState<number | null>(null);
  // Assign dispatcher operator rating
  const getDispatcherRank = (score: number) => {
    if (score >= 1400)
      return {
        title: 'CHIEF DISPATCHER (LEVEL 5)',
        style: 'text-yellow-400 crt-glow-amber border-yellow-400/30'
      };
    if (score >= 1000)
      return {
        title: 'SENIOR OPERATOR (LEVEL 4)',
        style: 'text-emerald-400 crt-glow-green border-emerald-400/30'
      };
    if (score >= 600)
      return { title: 'ROOKIE SURVIVOR (LEVEL 3)', style: 'text-amber-500 border-amber-500/30' };
    if (score >= 200)
      return { title: 'JUNIOR LIABILITY (LEVEL 2)', style: 'text-orange-600 border-orange-600/30' };
    return {
      title: 'TERMINAL NEGLIGENCE (DISMISSED)',
      style: 'text-red-600 crt-glow-red border-red-600/30 animate-pulse'
    };
  };

  const rank = getDispatcherRank(totalScore);

  useEffect(() => {
    if (selectedCallIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCallIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCallIndex]);

  const transcriptToAudit =
    selectedCallIndex !== null ? completedTranscripts[selectedCallIndex] || [] : [];

  return (
    <main className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6 justify-center max-w-6xl mx-auto w-full">
      {/* LEFT COLUMN: PERFORMANCE & RANKING */}
      <section className="flex-1 flex flex-col justify-center max-w-xl space-y-4 overflow-y-auto pr-2 terminal-scroll">
        <div className="border border-emerald-900 bg-zinc-950/70 p-5 rounded shadow-xl space-y-4">
          <h2 className="text-base font-bold tracking-widest text-emerald-400 border-b border-emerald-950 pb-2 uppercase text-center">
            Shift Operations Review
          </h2>

          {/* RANK ASSESSMENT */}
          <div className="text-center p-3 border border-emerald-950 bg-black/60 rounded flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-emerald-500/60 uppercase tracking-widest">
              Operator Ranking Status
            </span>
            <span
              className={`text-md font-black tracking-widest uppercase border px-4 py-1.5 rounded ${rank.style}`}
            >
              {rank.title}
            </span>
            <span className="text-lg font-bold text-emerald-400 mt-2">
              CUMULATIVE SCORE: {totalScore} PTS
            </span>
          </div>

          {/* GAME SCRIPT SUMMARY TABLE */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold text-emerald-500/70 uppercase tracking-widest border-b border-emerald-950/60 pb-1">
              Call Logs Audit (CLICK TO AUDIT)
            </h3>
            <div className="space-y-1">
              {calls.map((call, idx) => {
                const hasTranscript =
                  completedTranscripts &&
                  completedTranscripts[idx] &&
                  completedTranscripts[idx].length > 0;
                return (
                  <button
                    key={idx}
                    disabled={!hasTranscript}
                    onClick={() => setSelectedCallIndex(idx)}
                    className={`w-full flex justify-between border-b border-emerald-950/20 py-1.5 px-2 text-left text-emerald-500/90 font-mono transition-all rounded ${
                      hasTranscript
                        ? 'hover:bg-emerald-950/30 hover:text-emerald-300 cursor-pointer border border-transparent hover:border-emerald-900/60'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className="truncate max-w-[280px] font-bold">
                      {idx + 1}. {call.title} ({call.archetype})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400">
                        DIFF: {call.difficulty.toUpperCase()}
                      </span>
                      {hasTranscript && (
                        <span className="text-[10px] text-emerald-500/60 font-semibold uppercase tracking-wider animate-pulse">
                          [AUDIT]
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LEADERBOARD SUBMISSION FORM */}
          {!scoreSubmitted ? (
            <form
              onSubmit={onSubmitLeaderboard}
              className="border-t border-emerald-950 pt-4 flex flex-col items-center gap-3"
            >
              <span className="text-xs text-emerald-500/80 font-bold uppercase tracking-wider text-center">
                Submit Callsign to Global Leaderboard:
              </span>
              <div className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  maxLength={15}
                  value={dispatcherName}
                  onChange={(e) => setDispatcherName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  className="bg-black border border-emerald-900 text-center text-emerald-400 text-xs py-2 px-3 rounded flex-1 focus:outline-none focus:border-emerald-500 uppercase tracking-widest font-bold"
                />
                <button
                  type="submit"
                  disabled={submittingScore || !dispatcherName.trim()}
                  className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 hover:border-emerald-500 disabled:opacity-40 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs px-6 py-2 rounded transition-all cursor-pointer whitespace-nowrap"
                >
                  {submittingScore ? 'Transacting...' : 'Upload Score'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center text-emerald-400 text-xs border-t border-emerald-950 pt-4 animate-pulse uppercase tracking-widest font-bold">
              ✓ Score Posted Successfully to Global Database.
            </div>
          )}

          {/* REBOOT GAME BUTTON */}
          <div className="text-center pt-2">
            <button
              onClick={onReboot}
              className="w-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-3 px-8 rounded cursor-pointer transition-all active:scale-95"
            >
              Reboot Console System
            </button>
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: HIGH SCORE LEADERBOARD */}
      <section className="w-full md:w-80 flex flex-col justify-center max-w-sm">
        <div className="border border-emerald-900 bg-zinc-950/70 p-5 rounded shadow-xl space-y-4 flex flex-col max-h-[480px]">
          <h2 className="text-base font-bold tracking-widest text-emerald-400 border-b border-emerald-950 pb-2 uppercase text-center crt-glow-green">
            Global Database Rankings
          </h2>

          <div className="flex-1 overflow-y-auto terminal-scroll pr-1 border border-emerald-950 bg-black/60 rounded">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-emerald-950 bg-zinc-950 text-emerald-500/70 text-[9px] uppercase tracking-wider">
                  <th className="py-2 px-3 w-12 text-center">Rank</th>
                  <th className="py-2 px-2">Callsign</th>
                  <th className="py-2 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/20 font-mono">
                {leaderboard.length > 0 ? (
                  leaderboard.slice(0, 10).map((entry, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-emerald-950/10 ${entry.name === dispatcherName.toUpperCase() ? 'bg-emerald-950/20 text-emerald-300 font-bold' : 'text-emerald-500/80'}`}
                    >
                      <td className="py-2 px-3 text-center">{idx + 1}</td>
                      <td className="py-2 px-2 uppercase tracking-wide truncate max-w-[120px]">
                        {entry.name}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-400">{entry.score} PTS</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 text-center text-emerald-800 uppercase tracking-widest text-[10px]"
                    >
                      Database Empty. Write first entry!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[9px] text-center text-emerald-500/40 uppercase select-none">
            Leaderboard data syncs live.
          </div>
        </div>
      </section>

      {/* CALL AUDIT MODAL OVERLAY */}
      {selectedCallIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text"
          onClick={() => setSelectedCallIndex(null)}
        >
          <div
            className="w-full max-w-2xl border border-emerald-500 bg-zinc-950 p-6 rounded shadow-[0_0_20px_rgba(16,185,129,0.2)] flex flex-col max-h-[85vh] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-emerald-950 pb-3 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold tracking-widest text-emerald-400 uppercase">
                Call Audit: {calls[selectedCallIndex]?.title}
              </h3>
              <span className="text-[10px] text-emerald-500/60 uppercase font-bold">
                Difficulty: {calls[selectedCallIndex]?.difficulty}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-4 border border-emerald-950 bg-black/40 rounded terminal-scroll max-h-[50vh]">
              {transcriptToAudit
                .filter((msg) => msg.sender === 'dispatcher' || msg.sender === 'caller')
                .map((msg, idx) => {
                  const isDispatcher = msg.sender === 'dispatcher';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[85%] ${isDispatcher ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <span className="text-[10px] opacity-75 text-emerald-500/40 mb-1 select-none">
                        [{msg.timestamp}] {isDispatcher ? 'DISPATCHER' : 'CALLER'}
                      </span>
                      <div
                        className={`rounded px-3 py-2 text-xs leading-relaxed border ${
                          isDispatcher
                            ? 'bg-amber-950/20 border-amber-800 text-amber-400 font-bold'
                            : 'bg-emerald-950/20 border-emerald-900 text-emerald-300'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="border-t border-emerald-950 pt-3 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-emerald-500/40 uppercase font-bold">
                [ESC] KEY TO EXIT
              </span>
              <button
                onClick={() => setSelectedCallIndex(null)}
                className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-2 px-6 rounded cursor-pointer transition-all"
              >
                [CLOSE AUDIT]
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
