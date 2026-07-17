'use client';

import React, { useState, useEffect } from 'react';
import { StartScreen } from '@/components/StartScreen';
import { PlayingScreen } from '@/components/PlayingScreen';
import { FeedbackScreen } from '@/components/FeedbackScreen';
import { SummaryScreen } from '@/components/SummaryScreen';
import { SettingsModal } from '@/components/SettingsModal';
import { HydratedCallSession } from '@/lib/hydration';
import { TranscriptMessage, LeaderboardEntry, FeedbackInfo } from '@/types/game';

const VALID_THEMES = ['green', 'amber', 'cyan', 'silver', 'paper', 'lab'] as const;
type ThemeType = (typeof VALID_THEMES)[number];

const VALID_SIZES = ['small', 'medium', 'large'] as const;
type TextSizeType = (typeof VALID_SIZES)[number];

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
  const [completedTranscripts, setCompletedTranscripts] = useState<TranscriptMessage[][]>([]);

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
  const [completedFeedbacks, setCompletedFeedbacks] = useState<FeedbackInfo[]>([]);

  // Abort confirmation intermediate state
  const [abortConfirm, setAbortConfirm] = useState(false);

  // Audio wave indicators bars
  const [soundwaveBars, setSoundwaveBars] = useState<number[]>([
    10, 10, 10, 10, 10, 10, 10, 10, 10, 10
  ]);

  // Settings States
  const [theme, setTheme] = useState<ThemeType>('green');
  const [textSize, setTextSize] = useState<TextSizeType>('medium');
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Preview / Debug States
  const [previewMode, setPreviewMode] = useState(false);
  const [availableScenarios, setAvailableScenarios] = useState<
    Array<{ id: string; title: string; archetype: string }>
  >([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showScenarioId, setShowScenarioId] = useState(false);

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

  // Load saved preferences and leaderboard on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('console911-theme');
    const savedTextSize = localStorage.getItem('console911-text-size');
    const savedCrt = localStorage.getItem('console911-crt-enabled');

    if (savedTheme && (VALID_THEMES as readonly string[]).includes(savedTheme)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(savedTheme as ThemeType);
    }
    if (savedTextSize && (VALID_SIZES as readonly string[]).includes(savedTextSize)) {
      setTextSize(savedTextSize as TextSizeType);
    }
    if (savedCrt !== null) {
      setCrtEnabled(savedCrt === 'true');
    }

    fetchLeaderboard();

    // Check preview mode configurations
    const checkPreviewMode = async () => {
      try {
        const res = await fetch('/api/session');
        if (res.ok) {
          const data = await res.json();
          if (data.previewMode) {
            setPreviewMode(true);
            const listRes = await fetch('/api/session?list=all');
            if (listRes.ok) {
              const listData = await listRes.json();
              setAvailableScenarios(listData.scenarios || []);
            }
          }
        }
      } catch (e) {
        console.error('Failed to check preview mode:', e);
      }
    };
    checkPreviewMode();
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

  // Reset abort confirmation after 4 seconds of inactivity
  useEffect(() => {
    if (!abortConfirm) return;
    const timer = setTimeout(() => {
      setAbortConfirm(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [abortConfirm]);

  // Get current timestamp format e.g., [16:42:01]
  const getTimestamp = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  };

  // Start the entire game session
  const startSession = async () => {
    if (!dispatcherName.trim()) {
      return;
    }
    setGameState('loading');
    setTotalScore(0);
    setCurrentCallIndex(0);
    setScoreSubmitted(false);
    setCompletedTranscripts([]);
    setCompletedFeedbacks([]);

    try {
      let url = '/api/session';
      if (previewMode && selectedScenarios.length > 0) {
        url += `?scenarios=${encodeURIComponent(selectedScenarios.join(','))}`;
      }
      const res = await fetch(url);
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
        text: `--- ACTIVE LINE OPENED: CALL ${index + 1} OF ${sessionCalls.length} ---`,
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

    const feedback: FeedbackInfo = {
      status: outcome.status,
      message: outcome.message,
      dispatchType: actionType.replace('_', ' '),
      dialogueScore: callScore,
      dispatchScore: outcome.score_delta,
      totalCallScore: finalScore
    };
    setFeedbackInfo(feedback);
    setCompletedFeedbacks((prev) => {
      const updated = [...prev];
      updated[currentCallIndex] = feedback;
      return updated;
    });

    setCompletedTranscripts((prev) => {
      const updated = [...prev];
      updated[currentCallIndex] = transcript;
      return updated;
    });

    setGameState('feedback');
  };

  // Turn 10 force timeout penalty
  const handleTimeout = () => {
    const penalty = -150 - Math.floor(Math.random() * 150);
    const finalScore = callScore + penalty;
    setTotalScore((prev) => prev + finalScore);

    const feedback: FeedbackInfo = {
      status: 'CRITICAL_FAILURE',
      message:
        '⚠️ CALL CUTOFF: You failed to make a dispatch decision within the strict 10-turn limit. The line went silent. Emergency dispatch failed to route resources in time, resulting in a critical failure.',
      dispatchType: 'NONE (TIMEOUT CUTOFF)',
      dialogueScore: callScore,
      dispatchScore: penalty,
      totalCallScore: finalScore
    };
    setFeedbackInfo(feedback);
    setCompletedFeedbacks((prev) => {
      const updated = [...prev];
      updated[currentCallIndex] = feedback;
      return updated;
    });

    setCompletedTranscripts((prev) => {
      const updated = [...prev];
      updated[currentCallIndex] = transcript;
      return updated;
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

  // Abort active session and return to start screen
  const handleAbortSession = () => {
    if (!abortConfirm) {
      setAbortConfirm(true);
      return;
    }

    setAbortConfirm(false);
    setGameState('start');
    setCalls([]);
    setCurrentCallIndex(0);
    setTurnCount(1);
    setTotalScore(0);
    setCurrentState('initial');
    setCallScore(0);
    setTranscript([]);
    setInputText('');
    setIsCallerTyping(false);
    setFeedbackInfo(null);
    setCompletedTranscripts([]);
    setCompletedFeedbacks([]);
    setScoreSubmitted(false);
    setSubmittingScore(false);
  };

  return (
    <div
      className={`flex flex-col flex-1 h-[100dvh] bg-zinc-950 text-emerald-400 selection:bg-emerald-800 selection:text-white select-none font-mono theme-${theme} size-${textSize} ${crtEnabled ? 'crt-effect' : ''}`}
    >
      {/* SCREEN BEZEL GLOW */}
      <div className="screen-bezel" />

      {/* HEADER SECTION */}
      <header className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-950 px-4 py-2 gap-2 text-xs select-none bg-black/80">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold tracking-widest text-emerald-500 crt-glow-green">
              <span className="hidden sm:inline">CONSOLE 911 // DISPATCH SYSTEM v1.0</span>
              <span className="inline sm:hidden">CONSOLE 911</span>
            </span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-2 py-0.5 border border-emerald-900 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900 hover:text-emerald-300 font-bold uppercase tracking-widest text-[10px] rounded cursor-pointer transition-all"
          >
            [⚙️ CONFIG]
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto border-t sm:border-t-0 border-emerald-950/30 pt-1.5 sm:pt-0">
          {gameState === 'playing' && (
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-x-2 gap-y-1 text-emerald-500/80 text-[10px] sm:text-xs w-full sm:w-auto">
              <span className="hidden md:inline">
                CALLSIGN:{' '}
                <strong className="text-emerald-400">{dispatcherName.toUpperCase()}</strong>
              </span>
              <span className="hidden md:inline text-emerald-950">|</span>
              <span>
                CALL:{' '}
                <strong className="text-emerald-400">
                  {currentCallIndex + 1}/{calls.length}
                </strong>
              </span>
              <span className="text-emerald-950">|</span>
              <span>
                TURN:{' '}
                <strong
                  className={
                    turnCount >= 8 ? 'text-red-500 font-bold animate-pulse' : 'text-emerald-400'
                  }
                >
                  {turnCount}/10
                </strong>
              </span>
              <span className="text-emerald-950">|</span>
              <span>
                SCORE: <strong className="text-emerald-400">{totalScore} PTS</strong>
              </span>
              <span className="text-emerald-950">|</span>
              <button
                onClick={handleAbortSession}
                className={`w-[80px] text-center font-bold uppercase tracking-widest cursor-pointer transition-all border py-0.5 rounded text-[9px] ${
                  abortConfirm
                    ? 'text-red-400 border-red-500 bg-red-950/60 animate-pulse crt-glow-red'
                    : 'text-red-500 hover:text-red-400 border-red-950 hover:border-red-800 bg-red-950/20 hover:bg-red-950/40'
                }`}
              >
                {abortConfirm ? 'Sure?' : 'Abort'}
              </button>
            </div>
          )}
          {gameState !== 'playing' && (
            <div className="flex items-center justify-between sm:justify-end gap-4 text-emerald-500/60 font-semibold uppercase font-mono text-[10px] sm:text-xs w-full sm:w-auto">
              <span>STATUS: {gameState === 'start' ? 'SYSTEM IDLE' : gameState.toUpperCase()}</span>
              {(gameState === 'feedback' || gameState === 'loading') && (
                <>
                  <span className="text-emerald-950">|</span>
                  <button
                    onClick={handleAbortSession}
                    className={`w-[80px] text-center font-bold uppercase tracking-widest cursor-pointer transition-all border py-0.5 rounded text-[9px] ${
                      abortConfirm
                        ? 'text-red-400 border-red-500 bg-red-950/60 animate-pulse crt-glow-red'
                        : 'text-red-500 hover:text-red-400 border-red-950 hover:border-red-800 bg-red-950/20 hover:bg-red-950/40'
                    }`}
                  >
                    {abortConfirm ? 'Sure?' : 'Abort'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {gameState === 'start' && (
          <StartScreen
            dispatcherName={dispatcherName}
            setDispatcherName={setDispatcherName}
            onStart={startSession}
            previewMode={previewMode && showDebugPanel}
            availableScenarios={availableScenarios}
            selectedScenarios={selectedScenarios}
            setSelectedScenarios={setSelectedScenarios}
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
            previewMode={previewMode && showScenarioId}
            turnCount={turnCount}
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
            completedTranscripts={completedTranscripts}
            completedFeedbacks={completedFeedbacks}
            totalScore={totalScore}
            dispatcherName={dispatcherName}
            leaderboard={leaderboard}
            scoreSubmitted={scoreSubmitted}
            submittingScore={submittingScore}
            onSubmitLeaderboard={handleLeaderboardSubmit}
            onReboot={() => {
              setGameState('start');
              setCalls([]);
              setCompletedTranscripts([]);
              setCompletedFeedbacks([]);
            }}
          />
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        setTheme={(t) => {
          setTheme(t);
          localStorage.setItem('console911-theme', t);
        }}
        textSize={textSize}
        setTextSize={(s) => {
          setTextSize(s);
          localStorage.setItem('console911-text-size', s);
        }}
        crtEnabled={crtEnabled}
        setCrtEnabled={(e) => {
          setCrtEnabled(e);
          localStorage.setItem('console911-crt-enabled', String(e));
        }}
        previewMode={previewMode}
        showDebugPanel={showDebugPanel}
        setShowDebugPanel={setShowDebugPanel}
        showScenarioId={showScenarioId}
        setShowScenarioId={setShowScenarioId}
      />
    </div>
  );
}
