export interface ScenarioSlot {
  caller_name: string[];
  victim_relation: string[];
  address_location: string[];
  ambient_audio: string[];
  specific_details: string[];
}

export interface ScenarioIntent {
  variations: string[];
  score_delta: number;
}

export interface ScenarioOutcome {
  status: 'SUCCESS' | 'MINOR_ERROR' | 'CRITICAL_FAILURE';
  score_delta: number;
  message: string;
}

export interface Scenario {
  id: string;
  archetype: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  initial_variations: string[];
  slots: ScenarioSlot;
  intents: {
    [key: string]: ScenarioIntent;
  };
  dispatch_outcomes: {
    SEND_POLICE: ScenarioOutcome;
    SEND_FIRE: ScenarioOutcome;
    SEND_MEDICAL: ScenarioOutcome;
    ANIMAL_CONTROL: ScenarioOutcome;
    DISMISS: ScenarioOutcome;
  };
}

export interface HydratedCallSession {
  scenarioId: string;
  title: string;
  archetype: string;
  difficulty: string;
  selectedSlots: Record<string, string>;
  initialMessage: string;
  intents: Record<
    string,
    {
      response: string;
      score_delta: number;
    }
  >;
  dispatchOutcomes: Record<
    string,
    {
      status: 'SUCCESS' | 'MINOR_ERROR' | 'CRITICAL_FAILURE';
      score_delta: number;
      message: string;
    }
  >;
}

/**
 * Hydrates a scenario for an active gameplay call.
 * This guarantees consistent randomized values (e.g. same caller name and location)
 * throughout the entire dialogue of the specific call.
 */
export function hydrateScenario(scenario: Scenario): HydratedCallSession {
  // 1. Choose a random value for each slot variable
  const selectedSlots: Record<string, string> = {};

  if (scenario.slots) {
    for (const slotKey in scenario.slots) {
      const options = scenario.slots[slotKey as keyof ScenarioSlot];
      if (Array.isArray(options) && options.length > 0) {
        const randomIndex = Math.floor(Math.random() * options.length);
        selectedSlots[slotKey] = options[randomIndex];
      } else {
        selectedSlots[slotKey] = '';
      }
    }
  }

  // Helper function to replace {slot_name} placeholders in a string
  const hydrateString = (template: string): string => {
    if (!template) return '';
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, slotName) => {
      return selectedSlots[slotName] !== undefined ? selectedSlots[slotName] : match;
    });
  };

  // 2. Select a random initial variation and hydrate it
  const initialVariations = scenario.initial_variations || [];
  const initialMessage =
    initialVariations.length > 0
      ? hydrateString(initialVariations[Math.floor(Math.random() * initialVariations.length)])
      : '911. What is your emergency?';

  // 3. For each intent, select a random response variation and hydrate it
  const intents: Record<string, { response: string; score_delta: number }> = {};
  if (scenario.intents) {
    for (const intentKey in scenario.intents) {
      const intentData = scenario.intents[intentKey];
      if (intentData && Array.isArray(intentData.variations) && intentData.variations.length > 0) {
        const randomVar =
          intentData.variations[Math.floor(Math.random() * intentData.variations.length)];
        intents[intentKey] = {
          response: hydrateString(randomVar),
          score_delta: intentData.score_delta || 0
        };
      }
    }
  }

  // 4. Hydrate dispatch outcome messages
  const dispatchOutcomes: Record<
    string,
    { status: 'SUCCESS' | 'MINOR_ERROR' | 'CRITICAL_FAILURE'; score_delta: number; message: string }
  > = {};
  if (scenario.dispatch_outcomes) {
    for (const outcomeKey in scenario.dispatch_outcomes) {
      const outcome =
        scenario.dispatch_outcomes[outcomeKey as keyof typeof scenario.dispatch_outcomes];
      if (outcome) {
        dispatchOutcomes[outcomeKey] = {
          status: outcome.status,
          score_delta: outcome.score_delta || 0,
          message: hydrateString(outcome.message)
        };
      }
    }
  }

  return {
    scenarioId: scenario.id,
    title: scenario.title,
    archetype: scenario.archetype,
    difficulty: scenario.difficulty,
    selectedSlots,
    initialMessage,
    intents,
    dispatchOutcomes
  };
}
