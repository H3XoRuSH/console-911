import { NextResponse } from 'next/server';
import { loadAllScenarios } from '@/lib/scenarios';
import { normalizeIntent } from '@/lib/intent';
import { redis } from '@/lib/redis';
import { removeStopwords } from 'stopword';

interface ChatHistoryItem {
  role: 'dispatcher' | 'caller';
  text: string;
}

interface ChatRequestBody {
  scenarioId: string;
  dispatcherMessage: string;
  history: ChatHistoryItem[];
  selectedSlots: Record<string, string>;
  currentState?: string;
}

/**
 * Replaces actual slot values in a text with their placeholders (e.g., "Sarah" -> "{caller_name}").
 * This makes cached dialogue responses generic so they can be reused in future sessions
 * that have different randomized names/locations.
 */
function generalizeText(text: string, slots: Record<string, string>): string {
  let generalized = text;
  // Sort slots by length descending to prevent partial replacements (e.g. replacing "Grandpa" before "Grandpa Jim")
  const sortedSlots = Object.entries(slots).sort((a, b) => b[1].length - a[1].length);

  for (const [slotName, value] of sortedSlots) {
    if (value && value.trim().length > 0) {
      // Escape special regex characters in the slot value, and normalize spaces
      const escapedValue = value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
      const regex = new RegExp(`(?<!\\w)${escapedValue}(?!\\w)`, 'gi');
      generalized = generalized.replace(regex, `{${slotName}}`);
    }
  }
  return generalized;
}

/**
 * Replaces slot placeholders (e.g. "{caller_name}") in a text with their actual slot values.
 */
function hydrateText(text: string, slots: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, slotName) => {
    return slots[slotName] !== undefined ? slots[slotName] : match;
  });
}

async function classifyIntentWithLLM(
  message: string,
  deepseekKey?: string,
  geminiKey?: string
): Promise<string> {
  const prompt = `Classify the following 911 dispatcher message into one of these canonical intents if it fits:
- ASK_LOCATION (asking where they are, address, landmarks)
- ASK_BREATHING (asking if they are breathing, conscious, pulse)
- ASK_WEAPONS (asking about guns, knives, armed suspects)
- ASK_CALLER_NAME (asking for their name or identity)
- ASK_DETAILS (asking what happened, what is going on, describe the situation)
- TELL_CALM_DOWN (telling them to relax, calm down, take a deep breath)
- TELL_EVACUATE (telling them to leave, get out, run, escape)
- TELL_STAY_PUT (telling them to stay put, hide, lock doors, stay inside)
- TELL_FIRST_AID (giving CPR directions, applying pressure to wounds)

If it does not fit any of the above (for example, stating this is 911, asking about an animal, or a custom scenario question), return a short, generalized, uppercase keyword of 2-3 words separated by underscores representing the core action/topic (e.g. "TELL_IS_911", "ASK_ANIMAL_TYPE", "ASK_INTRUDER_LOCATION").

Dispatcher message: "${message}"

You must return a JSON object with this exact structure:
{
  "intent": "THE_INTENT_KEY"
}`;

  if (deepseekKey) {
    try {
      const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });
      if (dsRes.ok) {
        const data = await dsRes.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        return parsed.intent;
      }
    } catch (e) {
      console.error('DeepSeek intent classification failed:', e);
    }
  }

  if (geminiKey) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                intent: { type: 'STRING' }
              },
              required: ['intent']
            }
          }
        })
      });
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(text);
        return parsed.intent;
      }
    } catch (e) {
      console.error('Gemini intent classification failed:', e);
    }
  }

  return '';
}

function simplifyMessage(input: string): string {
  const words = input
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '') // Strip punctuation
    .split(/\s+/);

  const cleanWords = removeStopwords(words);

  // Custom game-specific filters (like 'bro', 'kidding', 'its', 'really')
  const gameSpecificFillers = new Set([
    'bro',
    'kidding',
    'hello',
    'hi',
    'hey',
    'please',
    'just',
    'its',
    "it's",
    'really',
    'indeed'
  ]);
  const finalWords = cleanWords.filter(
    (word: string) => !gameSpecificFillers.has(word) && word.length > 0
  );

  return finalWords.join('_').substring(0, 40);
}

export async function POST(req: Request) {
  try {
    const body: ChatRequestBody = await req.json();
    const {
      scenarioId,
      dispatcherMessage,
      history,
      selectedSlots,
      currentState = 'initial'
    } = body;

    if (!scenarioId || !dispatcherMessage || !selectedSlots) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // 1. Normalize the dispatcher's message
    let normalizedIntent = normalizeIntent(dispatcherMessage);

    const canonicalIntents = [
      'ASK_LOCATION',
      'ASK_BREATHING',
      'ASK_WEAPONS',
      'ASK_CALLER_NAME',
      'ASK_DETAILS',
      'TELL_CALM_DOWN',
      'TELL_EVACUATE',
      'TELL_STAY_PUT',
      'TELL_FIRST_AID'
    ];

    // If local rules result in a non-canonical fallback, resolve semantically via LLM classifier
    if (!canonicalIntents.includes(normalizedIntent)) {
      const messageSlug = simplifyMessage(dispatcherMessage);
      const mapKey = `intent-map:${messageSlug}`;
      let resolvedIntent = null;

      if (redis) {
        try {
          resolvedIntent = await redis.get<string>(mapKey);
        } catch (e) {
          console.error('Redis intent-map lookup failed:', e);
        }
      }

      if (resolvedIntent) {
        normalizedIntent = resolvedIntent;
        console.log(
          `Resolved semantic intent from Redis map: ${dispatcherMessage} -> ${normalizedIntent}`
        );
      } else {
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (DEEPSEEK_API_KEY || GEMINI_API_KEY) {
          try {
            const classified = await classifyIntentWithLLM(
              dispatcherMessage,
              DEEPSEEK_API_KEY,
              GEMINI_API_KEY
            );
            if (classified) {
              normalizedIntent = classified;
              if (redis) {
                try {
                  await redis.set(mapKey, normalizedIntent);
                  console.log(
                    `Saved semantic intent mapping in Redis: ${mapKey} -> ${normalizedIntent}`
                  );
                } catch (e) {
                  console.error('Redis intent-map save failed:', e);
                }
              }
            }
          } catch (e) {
            console.error('Semantic intent classification failed:', e);
          }
        }
      }
    }

    // Load the raw scenario to search predefined intents
    const allScenarios = loadAllScenarios();
    const scenario = allScenarios.find((s) => s.id === scenarioId);

    if (!scenario) {
      return NextResponse.json({ error: `Scenario ${scenarioId} not found.` }, { status: 404 });
    }

    // === TIER 1: Pre-scripted Decision Tree Match ===
    const preScriptedIntent = scenario.intents[normalizedIntent];
    if (preScriptedIntent && preScriptedIntent.responses) {
      const stateResponses =
        preScriptedIntent.responses[currentState] || preScriptedIntent.responses['initial'] || [];
      if (stateResponses.length > 0) {
        // Pick a random variation
        const randomIndex = Math.floor(Math.random() * stateResponses.length);
        const template = stateResponses[randomIndex];
        const hydratedResponse = hydrateText(template, selectedSlots);

        // Determine new state
        const newState =
          (preScriptedIntent.transitions && preScriptedIntent.transitions[currentState]) ||
          currentState;

        return NextResponse.json({
          response: hydratedResponse,
          scoreDelta: preScriptedIntent.score_delta || 0,
          newState,
          tier: 1,
          normalizedIntent
        });
      }
    }

    // === TIER 2: Global Upstash Redis Cache Match ===
    const cacheKey = `cache:${scenarioId}:${currentState}:${normalizedIntent}`;
    if (redis) {
      try {
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
          // The cached item is stored in generalized template format. Hydrate it before returning.
          // Format expected: { responseTemplate: string, scoreDelta: number, newState: string }
          const parsedCache = typeof cached === 'string' ? JSON.parse(cached) : cached;
          const hydratedResponse = hydrateText(parsedCache.responseTemplate, selectedSlots);

          return NextResponse.json({
            response: hydratedResponse,
            scoreDelta: parsedCache.scoreDelta || 0,
            newState: parsedCache.newState || currentState,
            tier: 2,
            normalizedIntent
          });
        }
      } catch (cacheError) {
        console.error('Upstash Redis lookup failed:', cacheError);
      }
    }

    // === TIER 3: LLM Fallback ===
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!DEEPSEEK_API_KEY && !GEMINI_API_KEY) {
      // No API key configured. Return generic, safe fallback response to prevent app crash.
      return NextResponse.json({
        response: hydrateText(
          "I... I don't understand what you're asking. Please, just send help! I can hear {ambient_audio}!",
          selectedSlots
        ),
        scoreDelta: -10,
        newState: currentState,
        tier: 3,
        fallbackMode: true,
        normalizedIntent
      });
    }

    const statesList = Object.entries(scenario.states || {})
      .map(([k, desc]) => `- "${k}": ${desc}`)
      .join('\n');

    // Construct chat prompt with state machine context
    const systemPrompt = `You are playing the role of a caller in a 911 emergency dispatch simulation.
Scenario Archetype: ${scenario.archetype}
Scenario Title: ${scenario.title}
Scenario Description: ${scenario.description}

The caller's details for this session are:
- Caller Name: ${selectedSlots.caller_name || 'Unknown'}
- Victim Relationship to Caller: ${selectedSlots.victim_relation || 'None'}
- Address Location: ${selectedSlots.address_location || 'Unknown'}
- Ambient Audio in Background: ${selectedSlots.ambient_audio || 'Silence'}
- Specific Details: ${selectedSlots.specific_details || 'None'}

Caller States:
The caller must be in one of the following states:
${statesList}

Current Caller State: "${currentState}" (${scenario.states[currentState] || ''})

You MUST stay in character as this caller. Respond to the dispatcher's message.
Since this is an emergency, keep your responses relatively short, realistic, and emotional (match the archetype panic level).
Do not break character. Do not mention that you are an AI. Use the specific details/location/names provided above.

Review the history of the conversation so far:
${history.map((h) => `${h.role === 'dispatcher' ? 'Dispatcher' : 'Caller'}: ${h.text}`).join('\n')}
Dispatcher's current message: "${dispatcherMessage}"

Generate your next response as the caller. Also, assess the quality of the dispatcher's message:
- If they gave useful advice or asked a helpful emergency question (e.g. asking for weapons, breathing status, giving CPR directions or evacuation commands), set "score_delta" to a positive integer (+10 to +30).
- If they asked something redundant, silly, or delayed dispatch unnecessarily, set "score_delta" to a negative integer (-10 to -30).
- Otherwise, set "score_delta" to 0.

Also, determine if the dispatcher's message causes you to change your state (e.g. if they tell you to hide, transition to "hiding", if they tell you to run/leave, transition to "evacuated" or the closest matching state from the list of valid states). If no action/posture change occurs, keep the state as "${currentState}".

You must return a JSON object with this exact structure:
{
  "response": "Your spoken dialogue response in character.",
  "score_delta": -25,
  "new_state": "the selected state key"
}`;

    let responseText = '';

    if (DEEPSEEK_API_KEY) {
      const dsUrl = 'https://api.deepseek.com/chat/completions';
      const dsRes = await fetch(dsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [{ role: 'user', content: systemPrompt }],
          response_format: { type: 'json_object' }
        })
      });

      if (!dsRes.ok) {
        throw new Error(`DeepSeek API returned status ${dsRes.status}`);
      }

      const dsData = await dsRes.json();
      responseText = dsData.choices[0].message.content;
    } else {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: systemPrompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                response: { type: 'STRING' },
                score_delta: { type: 'INTEGER' },
                new_state: { type: 'STRING' }
              },
              required: ['response', 'score_delta', 'new_state']
            }
          }
        })
      });

      if (!geminiRes.ok) {
        throw new Error(`Gemini API returned status ${geminiRes.status}`);
      }

      const geminiData = await geminiRes.json();
      responseText = geminiData.candidates[0].content.parts[0].text;
    }

    const parsedLLM = JSON.parse(responseText);
    const generatedResponse = parsedLLM.response;
    const scoreDelta = Number(parsedLLM.score_delta) || 0;
    const newState = parsedLLM.new_state || currentState;

    // === WRITE BACK TO CACHE ===
    const generalizedTemplate = generalizeText(generatedResponse, selectedSlots);

    if (redis) {
      try {
        await redis.set(
          cacheKey,
          JSON.stringify({
            responseTemplate: generalizedTemplate,
            scoreDelta,
            newState
          })
        );
        console.log(`Cached response for: ${cacheKey}`);
      } catch (cacheWriteError) {
        console.error('Upstash Redis write failed:', cacheWriteError);
      }
    }

    return NextResponse.json({
      response: generatedResponse,
      scoreDelta,
      newState,
      tier: 3,
      normalizedIntent
    });
  } catch (error: unknown) {
    console.error('API Chat handler error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
