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
  states: Record<string, string>;
  intents: {
    [key: string]: {
      score_delta: number;
      transitions?: Record<string, string>;
      responses: Record<string, string[]>;
    };
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
  states: Record<string, string>;
  intents: Record<
    string,
    {
      score_delta: number;
      transitions?: Record<string, string>;
      responses: Record<string, string>; // maps state name to hydrated response text
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
      let options = scenario.slots[slotKey as keyof ScenarioSlot] as unknown;
      if (options && typeof options === 'object' && !Array.isArray(options)) {
        const obj = options as Record<string, unknown>;
        if (Array.isArray(obj.options)) {
          options = obj.options;
        } else if (Array.isArray(obj.choices)) {
          options = obj.choices;
        }
      }
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
    const hydrated = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, slotName) => {
      return selectedSlots[slotName] !== undefined ? selectedSlots[slotName] : match;
    });

    // Fix indefinite article agreement dynamically.
    // Replace "a" with "an" before a vowel sound (approximated by starting with a vowel letter: a, e, i, o, u).
    // Replace "an" with "a" before a consonant sound (approximated by starting with a non-vowel letter, except "h" to preserve "an hour", etc.).
    return hydrated
      .replace(/\b(a)\s+([aeiouAEIOU])/g, '$1n $2')
      .replace(/\b(A)\s+([aeiouAEIOU])/g, '$1n $2')
      .replace(/\b(an)\s+([^aeiouAEIOUhH\s\d\W])/g, 'a $2')
      .replace(/\b(An)\s+([^aeiouAEIOUhH\s\d\W])/g, 'A $2');
  };

  // 2. Select a random initial variation and hydrate it
  const initialVariations = scenario.initial_variations || [];
  const initialMessage =
    initialVariations.length > 0
      ? hydrateString(initialVariations[Math.floor(Math.random() * initialVariations.length)])
      : '911. What is your emergency?';

  // 3. For each intent, select a random response variation for each state and hydrate it
  const intents: Record<
    string,
    {
      score_delta: number;
      transitions?: Record<string, string>;
      responses: Record<string, string>;
    }
  > = {};
  if (scenario.intents) {
    for (const intentKey in scenario.intents) {
      const intentData = scenario.intents[intentKey];
      if (intentData) {
        const responses: Record<string, string> = {};
        if (intentData.responses) {
          for (const stateName in intentData.responses) {
            const variations = intentData.responses[stateName];
            if (Array.isArray(variations) && variations.length > 0) {
              const randomIndex = Math.floor(Math.random() * variations.length);
              responses[stateName] = hydrateString(variations[randomIndex]);
            } else {
              responses[stateName] = '';
            }
          }
        }
        intents[intentKey] = {
          score_delta: intentData.score_delta || 0,
          transitions: intentData.transitions,
          responses
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
          status: outcome.status || 'CRITICAL_FAILURE',
          score_delta: outcome.score_delta || 0,
          message: hydrateString(outcome.message || '')
        };
      }
    }
  }

  // Normalize states structure (support both object maps and string arrays)
  let statesObj: Record<string, string> = {};
  const rawStates = scenario.states;
  if (Array.isArray(rawStates)) {
    for (const st of rawStates) {
      if (typeof st === 'string') {
        statesObj[st] = `Caller is in ${st} state.`;
      }
    }
  } else if (rawStates && typeof rawStates === 'object') {
    statesObj = rawStates;
  }
  if (!statesObj.initial) {
    statesObj.initial = 'Line connected.';
  }

  return {
    scenarioId: scenario.id,
    title:
      scenario.title ||
      ((scenario as unknown as Record<string, unknown>).scenario_title as string) ||
      'Unknown Incident',
    archetype: scenario.archetype || 'Unknown Archetype',
    difficulty: scenario.difficulty || 'Medium', // Fallback default difficulty
    selectedSlots,
    initialMessage,
    states: statesObj,
    intents,
    dispatchOutcomes
  };
}
