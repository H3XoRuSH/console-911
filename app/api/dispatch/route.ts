import { NextResponse } from 'next/server';
import { loadAllScenarios } from '@/lib/scenarios';

interface DispatchRequestBody {
  scenarioId: string;
  actionType: 'SEND_POLICE' | 'SEND_FIRE' | 'SEND_MEDICAL' | 'ANIMAL_CONTROL' | 'DISMISS' | 'TIMEOUT';
  locationConfirmed: boolean;
  detailsConfirmed: boolean;
  currentState: string;
  dialogueScore: number;
  selectedSlots: Record<string, string>;
  dataset?: string;
}

function hydrateText(template: string, slots: Record<string, string>): string {
  if (!template) return '';
  const hydrated = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, slotName) => {
    return slots[slotName] !== undefined ? slots[slotName] : match;
  });
  return hydrated
    .replace(/\b(a)\s+([aeiouAEIOU])/g, '$1n $2')
    .replace(/\b(A)\s+([aeiouAEIOU])/g, '$1n $2')
    .replace(/\b(an)\s+([^aeiouAEIOUhH\s\d\W])/g, 'a $2')
    .replace(/\b(An)\s+([^aeiouAEIOUhH\s\d\W])/g, 'A $2');
}

export async function POST(req: Request) {
  try {
    const body: DispatchRequestBody = await req.json();
    const {
      scenarioId,
      actionType,
      locationConfirmed,
      detailsConfirmed,
      currentState,
      dialogueScore,
      selectedSlots,
      dataset = 'original',
    } = body;

    if (!scenarioId || !actionType || !selectedSlots) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const allScenarios = loadAllScenarios(dataset);
    const scenario = allScenarios.find((s) => s.id === scenarioId);

    if (!scenario) {
      return NextResponse.json({ error: `Scenario ${scenarioId} not found.` }, { status: 404 });
    }

    const title = scenario.title || (scenario as unknown as { scenario_title?: string }).scenario_title || 'Unknown Incident';
    const archetype = scenario.archetype || 'Unknown Archetype';

    if (actionType === 'TIMEOUT') {
      const penalty = -150 - Math.floor(Math.random() * 150);
      const finalScore = dialogueScore + penalty;
      return NextResponse.json({
        status: 'CRITICAL_FAILURE',
        message: '⚠️ CALL CUTOFF: You failed to make a dispatch decision within the strict 10-turn limit. The line went silent. Emergency dispatch failed to route resources in time, resulting in a critical failure.',
        dispatchScore: penalty,
        totalCallScore: finalScore,
        title,
        archetype,
      });
    }

    const outcome = scenario.dispatch_outcomes[actionType];
    if (!outcome) {
      return NextResponse.json({ error: 'Invalid dispatch protocol.' }, { status: 400 });
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
      const stateKeys = Object.keys(scenario.states || {});
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
    const finalScore = dialogueScore + finalDispatchScore;
    const outcomeMessageHydrated = hydrateText(outcome.message || '', selectedSlots);

    return NextResponse.json({
      status: finalStatus,
      message: penaltyMessage + outcomeMessageHydrated,
      dispatchScore: finalDispatchScore,
      totalCallScore: finalScore,
      title,
      archetype,
    });
  } catch (error: unknown) {
    console.error('API Dispatch handler error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
