import React from 'react';
import TitleLogo from '@/public/img/title.svg';

interface StartScreenProps {
  dispatcherName: string;
  setDispatcherName: (val: string) => void;
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  dispatcherName,
  setDispatcherName,
  onStart
}) => {
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
            onStart();
          }}
          className="space-y-4 pt-4"
        >
          <div className="flex flex-col items-center gap-2">
            <label
              htmlFor="callsign"
              className="text-xs font-bold uppercase tracking-widest text-emerald-400"
            >
              Enter Callsign / Operator ID:
            </label>
            <input
              id="callsign"
              type="text"
              maxLength={15}
              value={dispatcherName}
              onChange={(e) => setDispatcherName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              placeholder="OPERATOR-911"
              className="bg-black border border-emerald-800 text-center text-emerald-400 placeholder:text-emerald-800 text-sm py-2 px-4 rounded w-64 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-800 tracking-widest uppercase font-bold"
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
