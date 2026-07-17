'use client';

import React, { useState, useEffect } from 'react';
import { StartScreen } from '@/components/StartScreen';
import { PlayingScreen } from '@/components/PlayingScreen';
import { FeedbackScreen } from '@/components/FeedbackScreen';
import { SummaryScreen } from '@/components/SummaryScreen';
import { SettingsModal } from '@/components/SettingsModal';
import { useGameState } from '@/hooks/useGameState';

const VALID_THEMES = ['green', 'amber', 'cyan', 'silver', 'paper', 'lab'] as const;
type ThemeType = (typeof VALID_THEMES)[number];

const VALID_SIZES = ['small', 'medium', 'large'] as const;
type TextSizeType = (typeof VALID_SIZES)[number];

export default function Console911Game() {
  // Settings States
  const [theme, setTheme] = useState<ThemeType>('green');
  const [textSize, setTextSize] = useState<TextSizeType>('medium');
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showScenarioId, setShowScenarioId] = useState(false);

  // Load saved preferences on component mount
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
  }, []);

  // Delegate all gameplay state and events to custom hook
  const {
    gameState,
    setGameState,
    dispatcherName,
    setDispatcherName,
    calls,
    setCalls,
    currentCallIndex,
    turnCount,
    totalScore,
    completedTranscripts,
    setCompletedTranscripts,
    transcript,
    inputText,
    setInputText,
    isCallerTyping,
    feedbackInfo,
    leaderboard,
    scoreSubmitted,
    submittingScore,
    completedFeedbacks,
    setCompletedFeedbacks,
    abortConfirm,
    soundwaveBars,
    previewMode,
    availableScenarios,
    selectedScenarios,
    setSelectedScenarios,
    scenarioDataset,
    changeScenarioDataset,
    startSession,
    handleSendMessage,
    handleDispatchAction,
    advanceCall,
    handleLeaderboardSubmit,
    handleAbortSession
  } = useGameState();

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
        scenarioDataset={scenarioDataset}
        setScenarioDataset={changeScenarioDataset}
      />
    </div>
  );
}
