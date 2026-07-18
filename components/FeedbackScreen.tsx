import React from 'react';
import { HydratedCallSession } from '@/lib/hydration';
import { FeedbackInfo } from '@/types/game';

interface FeedbackScreenProps {
  calls: HydratedCallSession[];
  currentCallIndex: number;
  feedbackInfo: FeedbackInfo;
  onAdvanceCall: () => void;
}

export const FeedbackScreen: React.FC<FeedbackScreenProps> = ({
  calls,
  currentCallIndex,
  feedbackInfo,
  onAdvanceCall
}) => {
  return (
    <main className="flex-1 flex flex-col items-center justify-start sm:justify-center p-6 overflow-y-auto terminal-scroll space-y-6">
      <div className="w-full max-w-2xl border border-emerald-900 bg-zinc-950/80 p-6 rounded shadow-2xl space-y-6">
        <div className="border-b border-emerald-950 pb-4 text-center">
          <span className="text-xs tracking-widest text-emerald-500/60 uppercase block mb-1">
            Line Summary & Resource Audit
          </span>
          <h2 className="text-xl font-bold tracking-widest text-emerald-400 uppercase">
            Incident Resolved
          </h2>
        </div>

        {/* STATUS BADGE */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-emerald-500/60">OUTCOME STATUS:</span>
          <span
            className={`text-lg font-black tracking-widest px-6 py-2 border rounded shadow-md ${
              feedbackInfo.status === 'SUCCESS'
                ? 'text-emerald-400 bg-emerald-950/30 border-emerald-500 crt-glow-green'
                : feedbackInfo.status === 'MINOR_ERROR'
                  ? 'text-amber-500 bg-amber-950/30 border-amber-500 crt-glow-amber'
                  : 'text-red-500 bg-red-950/30 border-red-500 crt-glow-red animate-pulse'
            }`}
          >
            {feedbackInfo.status.replace('_', ' ')}
          </span>
        </div>

        {/* REPORT CARD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-emerald-950 bg-black/60 p-4 rounded text-xs">
          <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-emerald-950/40 pb-2 sm:pb-0 sm:pr-2">
            <div className="flex justify-between">
              <span>Incident:</span>
              <strong className="text-emerald-400">{calls[currentCallIndex]?.title}</strong>
            </div>
            <div className="flex justify-between">
              <span>Archetype:</span>
              <strong className="text-emerald-400/80 truncate max-w-[150px]">
                {calls[currentCallIndex]?.archetype}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Route Target:</span>
              <strong className="text-emerald-400">{feedbackInfo.dispatchType}</strong>
            </div>
          </div>

          <div className="space-y-1.5 sm:pl-2 font-mono">
            <div className="flex justify-between text-emerald-500/60">
              <span>Dialogue Score:</span>
              <strong
                className={feedbackInfo.dialogueScore >= 0 ? 'text-emerald-400' : 'text-red-500'}
              >
                {feedbackInfo.dialogueScore >= 0
                  ? `+${feedbackInfo.dialogueScore}`
                  : feedbackInfo.dialogueScore}
              </strong>
            </div>
            <div className="flex justify-between text-emerald-500/60">
              <span>Dispatch Score:</span>
              <strong
                className={feedbackInfo.dispatchScore >= 0 ? 'text-emerald-400' : 'text-red-500'}
              >
                {feedbackInfo.dispatchScore >= 0
                  ? `+${feedbackInfo.dispatchScore}`
                  : feedbackInfo.dispatchScore}
              </strong>
            </div>
            <div className="border-t border-emerald-950 pt-1.5 flex justify-between font-bold text-sm text-emerald-400">
              <span>Total Net Score:</span>
              <span
                className={feedbackInfo.totalCallScore >= 0 ? 'text-emerald-400' : 'text-red-500'}
              >
                {feedbackInfo.totalCallScore >= 0
                  ? `+${feedbackInfo.totalCallScore}`
                  : feedbackInfo.totalCallScore}{' '}
                PTS
              </span>
            </div>
          </div>
        </div>

        {/* FEEDBACK DIALOGUE SUMMARY */}
        <div className="p-4 bg-zinc-900/50 border border-emerald-950 rounded text-xs leading-relaxed space-y-2">
          <strong className="text-emerald-400 uppercase tracking-widest block border-b border-emerald-950 pb-1">
            Operational Response Report:
          </strong>
          <p className="text-emerald-300 break-all">{feedbackInfo.message}</p>
        </div>

        {/* PRESS TO CONTINUE BUTTON */}
        <div className="text-center pt-2">
          <button
            onClick={onAdvanceCall}
            autoFocus
            className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest text-xs py-3 px-8 rounded cursor-pointer transition-all animate-pulse"
          >
            Connect Call {currentCallIndex + 2 <= calls.length ? currentCallIndex + 2 : 'Summary'}{' '}
            &gt;&gt;
          </button>
        </div>
      </div>
    </main>
  );
};
