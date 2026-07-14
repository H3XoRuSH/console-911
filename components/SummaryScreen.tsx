import React from 'react';
import { HydratedCallSession } from '@/lib/hydration';
import { LeaderboardEntry } from '@/types/game';

interface SummaryScreenProps {
  calls: HydratedCallSession[];
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
  totalScore,
  dispatcherName,
  setDispatcherName,
  leaderboard,
  scoreSubmitted,
  submittingScore,
  onSubmitLeaderboard,
  onReboot
}) => {
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
              Call Logs Audit
            </h3>
            <div className="space-y-1">
              {calls.map((call, idx) => (
                <div
                  key={idx}
                  className="flex justify-between border-b border-emerald-950/20 py-1 text-emerald-500/90 font-mono"
                >
                  <span className="truncate max-w-[280px]">
                    {idx + 1}. {call.title} ({call.archetype})
                  </span>
                  <span className="font-bold text-emerald-400">
                    DIFF: {call.difficulty.toUpperCase()}
                  </span>
                </div>
              ))}
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
                  leaderboard.map((entry, idx) => (
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
            Leaderboard data syncs live via Upstash Redis.
          </div>
        </div>
      </section>
    </main>
  );
};
