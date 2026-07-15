'use client';

import React, { useState, useEffect } from 'react';
import { StartScreen } from '@/components/StartScreen';
import { PlayingScreen } from '@/components/PlayingScreen';
import { FeedbackScreen } from '@/components/FeedbackScreen';
import { SummaryScreen } from '@/components/SummaryScreen';
import { HydratedCallSession } from '@/lib/hydration';
import { TranscriptMessage, LeaderboardEntry, FeedbackInfo } from '@/types/game';

export default function Console911Game() {
  // Game state manager
  // 'start' | 'loading' | 'playing' | 'feedback' | 'summary'
  const [gameState, setGameState] = useState<
    'start' | 'loading' | 'playing' | 'feedback' | 'summary'
  >('start');

  // Game session states
  const [dispatcherName, setDispatcherName] = useState('');
  const [calls, setCalls] = useState<HydratedCallSession[]>([]);
  const [currentCallIndex, setCurrentCallIndex] = useState(0);
  const [turnCount, setTurnCount] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [currentState, setCurrentState] = useState('initial');

  // Current active call states
  const [callScore, setCallScore] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isCallerTyping, setIsCallerTyping] = useState(false);

  // Feedback state
  const [feedbackInfo, setFeedbackInfo] = useState<FeedbackInfo | null>(null);

  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);

  // Audio wave indicators bars
  const [soundwaveBars, setSoundwaveBars] = useState<number[]>([
    10, 10, 10, 10, 10, 10, 10, 10, 10, 10
  ]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error('Error loading leaderboard:', e);
    }
  };

  // Load Leaderboard on component mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeaderboard();
  }, []);

  // Animate soundwave indicator when playing
  useEffect(() => {
    if (gameState !== 'playing') {
      // Only set if not already flatlined to avoid cascading render loops
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSoundwaveBars((prev) => {
        const isFlat = prev.every((val) => val === 4);
        return isFlat ? prev : [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
      });
      return;
    }

    const interval = setInterval(() => {
      setSoundwaveBars((prev) =>
        prev.map(() => Math.floor(Math.random() * (isCallerTyping ? 32 : 12)) + 4)
      );
    }, 120);

    return () => clearInterval(interval);
  }, [gameState, isCallerTyping]);

  // Get current timestamp format e.g., [16:42:01]
  const getTimestamp = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  };

  // Start the entire game session
  const startSession = async () => {
    if (!dispatcherName.trim()) {
      alert('PLEASE ENTER DISPATCHER CALLSIGN TO BOOT SYSTEM.');
      return;
    }
    setGameState('loading');
    setTotalScore(0);
    setCurrentCallIndex(0);
    setScoreSubmitted(false);

    try {
      const res = await fetch('/api/session');
      if (!res.ok) {
        throw new Error('Failed to initialize session');
      }
      const data = await res.json();
      setCalls(data.calls || []);

      if (data.calls && data.calls.length > 0) {
        initiateCall(0, data.calls);
      } else {
        alert('ERROR: No scenarios available in database.');
        setGameState('start');
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('CRITICAL ERROR LOADING SESSION DATA. CHECK DATABASE CONNECTION.');
      setGameState('start');
    }
  };

  // Initiate a single call event
  const initiateCall = (index: number, sessionCalls: HydratedCallSession[]) => {
    const call = sessionCalls[index];
    setTurnCount(1);
    setCallScore(0);
    setFeedbackInfo(null);
    setCurrentState('initial'); // Reset state
    setGameState('playing');

    // Set initial transcript with the caller's randomized first statement
    setTranscript([
      {
        sender: 'system',
        text: `--- ACTIVE LINE OPENED: CALL ${index + 1} OF ${sessionCalls.length} (ARCHETYPE: ${call.archetype.toUpperCase()}) ---`,
        timestamp: getTimestamp()
      },
      {
        sender: 'caller',
        text: call.initialMessage,
        timestamp: getTimestamp()
      }
    ]);
  };

  // Handle free-text dispatcher response submit
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isCallerTyping) return;

    const messageText = inputText.trim();
    setInputText('');

    // Append dispatcher query to transcript
    const userMsg: TranscriptMessage = {
      sender: 'dispatcher',
      text: messageText,
      timestamp: getTimestamp()
    };

    const newTranscript = [...transcript, userMsg];
    setTranscript(newTranscript);

    // Apply immediate UI turn counter increment
    const currentTurn = turnCount;
    setTurnCount((prev) => prev + 1);

    // Trigger Warning alerts
    if (currentTurn === 8 || currentTurn === 9) {
      setTranscript((prev) => [
        ...prev,
        {
          sender: 'warning',
          text: `⚠️ LINE TIMEOUT IMMINENT. DISPATCH OUTCOME FORCED ON TURN 10.`,
          timestamp: getTimestamp()
        }
      ]);
    }

    // Call forced Turn 10 Cutoff if turn counter has run out
    if (currentTurn >= 10) {
      handleTimeout();
      return;
    }

    // Trigger caller typing animation
    setIsCallerTyping(true);

    try {
      const activeCall = calls[currentCallIndex];
      // Format chat history for LLM
      const history = newTranscript
        .filter((t) => t.sender === 'dispatcher' || t.sender === 'caller')
        .map((t) => ({
          role: t.sender === 'dispatcher' ? ('dispatcher' as const) : ('caller' as const),
          text: t.text
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: activeCall.scenarioId,
          dispatcherMessage: messageText,
          history,
          selectedSlots: activeCall.selectedSlots,
          currentState
        })
      });

      if (!res.ok) {
        throw new Error('Dialogue API error');
      }

      const data = await res.json();

      // Simulate typing latency
      setTimeout(() => {
        setIsCallerTyping(false);
        setCallScore((prev) => prev + (data.scoreDelta || 0));
        setCurrentState(data.newState || currentState);
        setTranscript((prev) => [
          ...prev,
          {
            sender: 'caller',
            text: data.response,
            timestamp: getTimestamp()
          }
        ]);
      }, 700);
    } catch (err) {
      console.error(err);
      setTimeout(() => {
        setIsCallerTyping(false);
        setCallScore((prev) => prev - 10);
        setTranscript((prev) => [
          ...prev,
          {
            sender: 'caller',
            text: "I... I can't hear you clearly! Just send someone quickly, please!",
            timestamp: getTimestamp()
          }
        ]);
      }, 700);
    }
  };

  // Perform dispatch action selection
  const handleDispatchAction = (
    actionType: 'SEND_POLICE' | 'SEND_FIRE' | 'SEND_MEDICAL' | 'ANIMAL_CONTROL' | 'DISMISS'
  ) => {
    if (isCallerTyping || gameState !== 'playing') return;

    const activeCall = calls[currentCallIndex];
    const outcome = activeCall.dispatchOutcomes[actionType];

    if (!outcome) {
      alert('INVALID DISPATCH PROTOCOL');
      return;
    }

    // Apply outcomes
    const finalScore = callScore + outcome.score_delta;
    setTotalScore((prev) => prev + finalScore);

    setFeedbackInfo({
      status: outcome.status,
      message: outcome.message,
      dispatchType: actionType.replace('_', ' '),
      dialogueScore: callScore,
      dispatchScore: outcome.score_delta,
      totalCallScore: finalScore
    });

    setGameState('feedback');
  };

  // Turn 10 force timeout penalty
  const handleTimeout = () => {
    const penalty = -150 - Math.floor(Math.random() * 150);
    const finalScore = callScore + penalty;
    setTotalScore((prev) => prev + finalScore);

    setFeedbackInfo({
      status: 'CRITICAL_FAILURE',
      message:
        '⚠️ CALL CUTOFF: You failed to make a dispatch decision within the strict 10-turn limit. The line went silent. Emergency dispatch failed to route resources in time, resulting in a critical failure.',
      dispatchType: 'NONE (TIMEOUT CUTOFF)',
      dialogueScore: callScore,
      dispatchScore: penalty,
      totalCallScore: finalScore
    });

    setGameState('feedback');
  };

  // Advance to next screen
  const advanceCall = () => {
    if (currentCallIndex < calls.length - 1) {
      const nextIndex = currentCallIndex + 1;
      setCurrentCallIndex(nextIndex);
      initiateCall(nextIndex, calls);
    } else {
      // Completed all calls, transition to game summary
      setGameState('summary');
      fetchLeaderboard();
    }
  };

  // Submit high score to database
  const handleLeaderboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingScore || scoreSubmitted) return;

    setSubmittingScore(true);
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dispatcherName,
          score: totalScore
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setScoreSubmitted(true);
      } else {
        alert('COULD NOT SUBMIT SCORE. DB CONNECTION ERROR.');
      }
    } catch (err) {
      console.error(err);
      alert('LEADERBOARD TRANSACTION FAILED.');
    } finally {
      setSubmittingScore(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-screen bg-zinc-950 text-emerald-400 selection:bg-emerald-800 selection:text-white crt-effect select-none font-mono">
      {/* SCREEN BEZEL GLOW */}
      <div className="absolute inset-0 border-[6px] border-zinc-900 pointer-events-none z-[1000] shadow-[inset_0_0_80px_rgba(0,0,0,0.9)]" />

      {/* HEADER SECTION */}
      <header className="shrink-0 flex items-center justify-between border-b border-emerald-950 px-4 py-2 text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold tracking-widest text-emerald-500 crt-glow-green">
            CONSOLE 911 // DISPATCH SYSTEM v1.0
          </span>
        </div>
        {gameState === 'playing' && (
          <div className="flex items-center gap-4 text-emerald-500/80">
            <span>
              CALLSIGN: <strong className="text-emerald-400">{dispatcherName.toUpperCase()}</strong>
            </span>
            <span>|</span>
            <span>
              CALL:{' '}
              <strong className="text-emerald-400">
                {currentCallIndex + 1} / {calls.length}
              </strong>
            </span>
            <span>|</span>
            <span>
              TURN:{' '}
              <strong
                className={
                  turnCount >= 8 ? 'text-red-500 font-bold animate-pulse' : 'text-emerald-400'
                }
              >
                {turnCount} / 10
              </strong>
            </span>
            <span>|</span>
            <span>
              SESSION SCORE: <strong className="text-emerald-400">{totalScore} PTS</strong>
            </span>
          </div>
        )}
        {gameState !== 'playing' && (
          <div className="text-emerald-500/60 font-semibold uppercase font-mono">
            STATUS: {gameState === 'start' ? 'SYSTEM IDLE' : gameState.toUpperCase()}
          </div>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {gameState === 'start' && (
          <StartScreen
            dispatcherName={dispatcherName}
            setDispatcherName={setDispatcherName}
            onStart={startSession}
          />
        )}

        {gameState === 'loading' && (
          <main className="flex-1 flex flex-col items-center justify-center space-y-4">
            <span className="text-sm tracking-widest text-emerald-500 animate-pulse uppercase">
              Establishing Secure Line Encryptors...
            </span>
            <div className="w-64 h-1 border border-emerald-950 bg-black overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 left-0 bg-emerald-500 w-1/2 animate-[scanline_2s_infinite_linear]"
                style={{ animationName: 'progress' }}
              />
            </div>
            <style jsx>{`
              @keyframes progress {
                0% {
                  left: -50%;
                  width: 50%;
                }
                100% {
                  left: 100%;
                  width: 50%;
                }
              }
            `}</style>
          </main>
        )}

        {gameState === 'playing' && (
          <PlayingScreen
            calls={calls}
            currentCallIndex={currentCallIndex}
            transcript={transcript}
            inputText={inputText}
            setInputText={setInputText}
            isCallerTyping={isCallerTyping}
            soundwaveBars={soundwaveBars}
            onSendMessage={handleSendMessage}
            onDispatchAction={handleDispatchAction}
          />
        )}

        {gameState === 'feedback' && feedbackInfo && (
          <FeedbackScreen
            calls={calls}
            currentCallIndex={currentCallIndex}
            feedbackInfo={feedbackInfo}
            onAdvanceCall={advanceCall}
          />
        )}

        {gameState === 'summary' && (
          <SummaryScreen
            calls={calls}
            totalScore={totalScore}
            dispatcherName={dispatcherName}
            setDispatcherName={setDispatcherName}
            leaderboard={leaderboard}
            scoreSubmitted={scoreSubmitted}
            submittingScore={submittingScore}
            onSubmitLeaderboard={handleLeaderboardSubmit}
            onReboot={() => {
              setGameState('start');
              setCalls([]);
            }}
          />
        )}
      </div>
    </div>
  );
}
