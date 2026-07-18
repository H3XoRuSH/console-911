import { useState, useEffect } from 'react';
import { HydratedCallSession } from '@/lib/hydration';
import { TranscriptMessage, LeaderboardEntry, FeedbackInfo } from '@/types/game';

export function useGameState() {
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

  // Checklist States
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);

  // Abort confirmation intermediate state
  const [abortConfirm, setAbortConfirm] = useState(false);

  // Audio wave indicators bars
  const [soundwaveBars, setSoundwaveBars] = useState<number[]>([
    10, 10, 10, 10, 10, 10, 10, 10, 10, 10
  ]);

  // Preview / Debug States
  const [previewMode, setPreviewMode] = useState(false);
  const [availableScenarios, setAvailableScenarios] = useState<
    Array<{ id: string; title: string; archetype: string }>
  >([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [scenarioDataset, setScenarioDataset] = useState<'original' | 'experimental'>('original');

  const changeScenarioDataset = (dataset: 'original' | 'experimental') => {
    setScenarioDataset(dataset);
    setSelectedScenarios([]);
    localStorage.setItem('console911-dataset', dataset);
  };

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

  // Load leaderboard, dataset preference, and preview mode settings on component mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeaderboard();

    const savedDataset = localStorage.getItem('console911-dataset');
    if (savedDataset === 'experimental' || savedDataset === 'original') {
      setScenarioDataset(savedDataset);
    }

    const checkPreviewMode = async () => {
      try {
        const res = await fetch('/api/session');
        if (res.ok) {
          const data = await res.json();
          if (data.previewMode) {
            setPreviewMode(true);
          }
        }
      } catch (e) {
        console.error('Failed to check preview mode:', e);
      }
    };
    checkPreviewMode();
  }, []);

  // Fetch available scenarios when previewMode or scenarioDataset changes
  useEffect(() => {
    if (!previewMode) return;
    const fetchScenariosList = async () => {
      try {
        const listRes = await fetch(`/api/session?list=all&dataset=${scenarioDataset}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          setAvailableScenarios(listData.scenarios || []);
        }
      } catch (e) {
        console.error('Failed to fetch scenarios list:', e);
      }
    };
    fetchScenariosList();
  }, [previewMode, scenarioDataset]);

  // Animate soundwave indicator when playing
  useEffect(() => {
    if (gameState !== 'playing') {
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

  const getTimestamp = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  };

  // Start the entire game session
  const startSession = async () => {
    if (!dispatcherName.trim()) return;
    setGameState('loading');
    setTotalScore(0);
    setCurrentCallIndex(0);
    setScoreSubmitted(false);
    setCompletedTranscripts([]);
    setCompletedFeedbacks([]);

    try {
      let url = `/api/session?dataset=${scenarioDataset}`;
      if (previewMode && selectedScenarios.length > 0) {
        url += `&scenarios=${encodeURIComponent(selectedScenarios.join(','))}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to initialize session');
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
    setCurrentState('initial');
    setGameState('playing');
    setIsCallerTyping(true);

    const addressVal = call.selectedSlots?.['address_location'];
    const detailsVal = call.selectedSlots?.['specific_details'];
    
    const locationInInitial = addressVal ? call.initialMessage.toLowerCase().includes(addressVal.toLowerCase()) : false;
    const detailsInInitial = detailsVal ? call.initialMessage.toLowerCase().includes(detailsVal.toLowerCase()) : false;

    setLocationConfirmed(locationInInitial);
    setDetailsConfirmed(detailsInInitial);

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

    const userMsg: TranscriptMessage = {
      sender: 'dispatcher',
      text: messageText,
      timestamp: getTimestamp()
    };

    const newTranscript = [...transcript, userMsg];
    setTranscript(newTranscript);

    const currentTurn = turnCount;
    setTurnCount((prev) => prev + 1);

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

    if (currentTurn >= 10) {
      handleTimeout();
      return;
    }

    setIsCallerTyping(true);

    try {
      const activeCall = calls[currentCallIndex];
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
          currentState,
          dataset: scenarioDataset
        })
      });

      if (!res.ok) throw new Error('Dialogue API error');
      const data = await res.json();

      setTimeout(() => {
        setCallScore((prev) => prev + (data.scoreDelta || 0));
        setCurrentState(data.newState || currentState);

        const addressVal = activeCall.selectedSlots?.['address_location'];
        const detailsVal = activeCall.selectedSlots?.['specific_details'];
        
        let hasLoc = false;
        let hasDet = false;
        if (data.normalizedIntent === 'ASK_LOCATION') {
          hasLoc = true;
        }
        if (data.normalizedIntent === 'ASK_DETAILS') {
          hasDet = true;
        }
        if (addressVal && data.response.toLowerCase().includes(addressVal.toLowerCase())) {
          hasLoc = true;
        }
        if (detailsVal && data.response.toLowerCase().includes(detailsVal.toLowerCase())) {
          hasDet = true;
        }
        
        if (hasLoc) setLocationConfirmed(true);
        if (hasDet) setDetailsConfirmed(true);

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

    let finalStatus = outcome.status;
    let penaltyMessage = '';
    let dispatchScoreModifier = 0;

    if (actionType !== 'DISMISS') {
      if (!locationConfirmed) {
        finalStatus = 'CRITICAL_FAILURE';
        dispatchScoreModifier -= 150;
        penaltyMessage += `🚨 BLIND DISPATCH FAILURE: You dispatched responders without confirming the caller's address! Responders spent critical time searching the area and arrived too late.\n\n`;
      } else if (!detailsConfirmed) {
        if (finalStatus === 'SUCCESS') {
          finalStatus = 'MINOR_ERROR';
        }
        dispatchScoreModifier -= 75;
        penaltyMessage += `⚠️ INCOMPLETE INTEL PENALTY: Responders were dispatched without details on the threat. Units arrived unprepared for the specific circumstances, causing confusion and delay.\n\n`;
      }
    }

    if (!(actionType === 'DISMISS' && finalStatus === 'SUCCESS')) {
      const lowerState = currentState.toLowerCase();
      const stateKeys = Object.keys(activeCall.states || {});
      const hasSafetyState = stateKeys.some(s => ['hiding', 'secured', 'safe', 'escaped', 'evacuated'].includes(s.toLowerCase()));

      if (lowerState.includes('confront') || lowerState.includes('escalat') || lowerState.includes('danger') || lowerState.includes('threat')) {
        dispatchScoreModifier -= 50;
        penaltyMessage += `⚠️ LATE DISPATCH / CALLER CONFRONTED: The caller was in active confrontation or the threat escalated before responders were dispatched, causing avoidable harm/stress.\n\n`;
      } else if (currentState === 'initial' && hasSafetyState) {
        dispatchScoreModifier -= 30;
        penaltyMessage += `⚠️ LACK OF SAFETY GUIDANCE: You dispatched immediately without advising the caller on how to protect themselves (e.g. hiding or staying put). The caller panicked, increasing risk.\n\n`;
      } else if (lowerState.includes('secured') || lowerState.includes('safe') || lowerState.includes('escape') || lowerState.includes('evacuate')) {
        dispatchScoreModifier += 30;
        penaltyMessage += `✨ EXCELLENT DISPATCHER GUIDANCE: You successfully guided the caller to a secure/safe state before dispatching. Responders arrived to a controlled situation.\n\n`;
      }
    }

    const finalDispatchScore = outcome.score_delta + dispatchScoreModifier;
    const finalScore = callScore + finalDispatchScore;
    setTotalScore((prev) => prev + finalScore);

    const feedback: FeedbackInfo = {
      status: finalStatus,
      message: penaltyMessage + outcome.message,
      dispatchType: actionType.replace('_', ' '),
      dialogueScore: callScore,
      dispatchScore: finalDispatchScore,
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

  const advanceCall = () => {
    if (currentCallIndex < calls.length - 1) {
      const nextIndex = currentCallIndex + 1;
      setCurrentCallIndex(nextIndex);
      initiateCall(nextIndex, calls);
    } else {
      setGameState('summary');
      fetchLeaderboard();
    }
  };

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

  return {
    gameState,
    setGameState,
    dispatcherName,
    setDispatcherName,
    calls,
    setCalls,
    currentCallIndex,
    turnCount,
    totalScore,
    currentState,
    completedTranscripts,
    setCompletedTranscripts,
    transcript,
    inputText,
    setInputText,
    isCallerTyping,
    setIsCallerTyping,
    feedbackInfo,
    leaderboard,
    scoreSubmitted,
    submittingScore,
    completedFeedbacks,
    setCompletedFeedbacks,
    locationConfirmed,
    detailsConfirmed,
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
  };
}
