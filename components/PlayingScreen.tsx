import React, { useEffect, useRef } from 'react';
import { HydratedCallSession } from '@/lib/hydration';
import { TranscriptMessage } from '@/types/game';

interface PlayingScreenProps {
  calls: HydratedCallSession[];
  currentCallIndex: number;
  transcript: TranscriptMessage[];
  inputText: string;
  setInputText: (val: string) => void;
  isCallerTyping: boolean;
  soundwaveBars: number[];
  onSendMessage: (e?: React.FormEvent) => void;
  onDispatchAction: (
    action: 'SEND_POLICE' | 'SEND_FIRE' | 'SEND_MEDICAL' | 'ANIMAL_CONTROL' | 'DISMISS'
  ) => void;
}

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  calls,
  currentCallIndex,
  transcript,
  inputText,
  setInputText,
  isCallerTyping,
  soundwaveBars,
  onSendMessage,
  onDispatchAction
}) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll transcript to bottom on new messages
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, isCallerTyping]);

  // Focus input automatically
  useEffect(() => {
    if (!isCallerTyping) {
      inputRef.current?.focus();
    }
  }, [isCallerTyping]);

  const activeCall = calls[currentCallIndex];
  if (!activeCall) return null;

  return (
    <main className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
      {/* LEFT TRANSCRIPT COLUMN */}
      <section className="flex-1 flex flex-col border-r border-emerald-950 bg-zinc-950/40 relative min-h-0">
        {/* SCROLLING TRANSCRIPT PANEL */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 terminal-scroll select-text">
          {transcript.map((msg, idx) => {
            if (msg.sender === 'system') {
              return (
                <div
                  key={idx}
                  className="text-center text-xs tracking-widest text-emerald-500/50 my-2 select-none uppercase font-semibold"
                >
                  {msg.text}
                </div>
              );
            }
            if (msg.sender === 'warning') {
              return (
                <div
                  key={idx}
                  className="bg-red-950/40 border border-red-800 text-red-500 text-xs px-3 py-2 rounded animate-pulse select-none flex items-center gap-2"
                >
                  <span>{msg.text}</span>
                </div>
              );
            }
            const isDispatcher = msg.sender === 'dispatcher';
            return (
              <div
                key={idx}
                className={`flex flex-col max-w-[85%] ${isDispatcher ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-xs opacity-75 text-emerald-500/40 mb-1 select-none">
                  [{msg.timestamp}] {isDispatcher ? 'DISPATCHER' : 'CALLER'}
                </span>
                <div
                  className={`rounded px-3 py-2 text-xs leading-relaxed border ${
                    isDispatcher
                      ? 'bg-amber-950/20 border-amber-800 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.05)]'
                      : 'bg-emerald-950/20 border-emerald-900 text-emerald-300'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {/* CALLER TYPING INDICATOR */}
          {isCallerTyping && (
            <div className="flex flex-col mr-auto items-start max-w-[85%]">
              <span className="text-xs opacity-75 text-emerald-500/40 mb-1 select-none">
                [{new Date().toTimeString().split(' ')[0]}] CALLER TYPING...
              </span>
              <div className="rounded px-3 py-2 text-xs bg-emerald-950/20 border border-emerald-900/40 text-emerald-500/60 animate-pulse">
                LINE INCOMING... [████████]
              </div>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* INPUT BAR */}
        <form
          onSubmit={onSendMessage}
          className="border-t border-emerald-950 p-2 flex items-center bg-black/60 gap-2 relative"
        >
          <span className="text-xs text-amber-500 font-bold pl-2 select-none h-9 flex items-center">
            DISPATCHER_PROMPT&gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isCallerTyping
                ? 'WAITING FOR LINE INPUT...'
                : 'Type dispatcher instruction / query...'
            }
            disabled={isCallerTyping}
            className="flex-1 bg-transparent text-xs text-amber-400 placeholder:text-emerald-900/60 font-bold h-9 outline-none focus:ring-0 border-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isCallerTyping || !inputText.trim()}
            className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-400 px-4 h-9 flex items-center justify-center rounded text-xs uppercase font-bold tracking-widest transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-emerald-950 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </section>

      {/* RIGHT SIDEBAR COLUMN */}
      <aside className="w-full md:w-80 flex flex-col border-t md:border-t-0 border-emerald-950 bg-black/40 min-h-0">
        {/* AUDIO & LINE STATUS */}
        <div className="p-4 border-b border-emerald-950 space-y-3">
          <div className="flex justify-between items-center text-xs tracking-widest text-emerald-500/60 uppercase">
            <span>Audio Stream 911</span>
            <span
              className={
                isCallerTyping ? 'text-emerald-400 animate-pulse font-bold' : 'text-emerald-500/80'
              }
            >
              {isCallerTyping ? 'RECEIVING' : 'CONNECTED'}
            </span>
          </div>

          {/* RENDER SOUNDWAVE */}
          <div className="h-10 bg-black border border-emerald-950 flex items-center justify-center gap-1.5 px-4 overflow-hidden relative">
            {soundwaveBars.map((height, i) => (
              <div
                key={i}
                className={`w-2.5 rounded bg-emerald-500/80 transition-all duration-100 ${
                  isCallerTyping ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''
                }`}
                style={{ height: `${height * 2.5}px` }}
              />
            ))}
            {/* CRT SCAN BAR ON SOUNDWAVE */}
            <div className="absolute top-0 bottom-0 left-0 bg-emerald-500/5 w-0.5 animate-[scan_2s_infinite_linear]" />
          </div>
        </div>

        {/* ACTIVE CASE DETAILS */}
        <div className="p-4 border-b border-emerald-950 space-y-2 flex-1 overflow-y-auto terminal-scroll">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 border-b border-emerald-950 pb-1">
            Active Case Profile
          </h3>
          <div className="space-y-1.5 text-xs text-emerald-500/80">
            <div className="flex justify-between">
              <span>LINE STATUS:</span>
              <span className="text-emerald-400 font-bold animate-pulse">ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span>TRUNK PORT:</span>
              <span className="text-emerald-400/90 font-bold">
                PORT_911_TRK{currentCallIndex + 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SEVERITY CAP:</span>
              <span
                className={`font-bold ${
                  activeCall.difficulty === 'Hard'
                    ? 'text-red-500 crt-glow-red'
                    : activeCall.difficulty === 'Medium'
                      ? 'text-amber-500 crt-glow-amber'
                      : 'text-emerald-500'
                }`}
              >
                {activeCall.difficulty.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* CONTROL BOARD (DISPATCH BUTTONS) */}
        <div className="p-4 bg-zinc-950 border-t border-emerald-950 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 text-center select-none animate-pulse">
            ☣️ RESPONDER ROUTING BOARD ☣️
          </h3>

          <div className="grid grid-cols-2 gap-2 text-center">
            <button
              onClick={() => onDispatchAction('SEND_POLICE')}
              className="border border-blue-900 bg-blue-950/20 hover:bg-blue-900/40 text-blue-400 hover:text-blue-300 font-bold py-2 rounded text-xs transition-all cursor-pointer hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] active:scale-95 uppercase"
            >
              Send Police
            </button>
            <button
              onClick={() => onDispatchAction('SEND_FIRE')}
              className="border border-red-900 bg-red-950/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 font-bold py-2 rounded text-xs transition-all cursor-pointer hover:shadow-[0_0_10px_rgba(239,68,68,0.2)] active:scale-95 uppercase"
            >
              Send Fire
            </button>
            <button
              onClick={() => onDispatchAction('SEND_MEDICAL')}
              className="border border-orange-950 bg-orange-900/10 hover:bg-orange-900/30 text-orange-400 hover:text-orange-300 font-bold py-2 rounded text-xs transition-all cursor-pointer hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] active:scale-95 uppercase"
            >
              Send Medical
            </button>
            <button
              onClick={() => onDispatchAction('ANIMAL_CONTROL')}
              className="border border-emerald-950 bg-emerald-900/10 hover:bg-emerald-900/30 text-emerald-400 hover:text-emerald-300 font-bold py-2 rounded text-xs transition-all cursor-pointer hover:shadow-[0_0_10px_rgba(16,185,129,0.2)] active:scale-95 uppercase"
            >
              Animal Ctrl
            </button>
          </div>

          <button
            onClick={() => onDispatchAction('DISMISS')}
            className="w-full border border-yellow-950 bg-yellow-950/15 hover:bg-yellow-950/30 text-yellow-500 hover:text-yellow-400 font-bold py-2 rounded text-xs transition-all cursor-pointer hover:shadow-[0_0_10px_rgba(234,179,8,0.2)] active:scale-95 uppercase mt-1"
          >
            Dismiss / Prank Call
          </button>
        </div>
      </aside>
    </main>
  );
};
