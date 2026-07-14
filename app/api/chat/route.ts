import { NextResponse } from 'next/server';
import { loadAllScenarios } from '@/lib/scenarios';
import { normalizeIntent } from '@/lib/intent';
import { redis } from '@/lib/redis';

// Gemini API Fallback configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ChatHistoryItem {
  role: 'dispatcher' | 'caller';
  text: string;
}

interface ChatRequestBody {
  scenarioId: string;
  dispatcherMessage: string;
  history: ChatHistoryItem[];
  selectedSlots: Record<string, string>;
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
      // Escape special regex characters in the slot value
      const escapedValue = value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedValue}\\b`, 'gi');
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

export async function POST(req: Request) {
  try {
    const body: ChatRequestBody = await req.json();
    const { scenarioId, dispatcherMessage, history, selectedSlots } = body;

    if (!scenarioId || !dispatcherMessage || !selectedSlots) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // 1. Normalize the dispatcher's message
    const normalizedIntent = normalizeIntent(dispatcherMessage);

    // Load the raw scenario to search predefined intents
    const allScenarios = loadAllScenarios();
    const scenario = allScenarios.find((s) => s.id === scenarioId);

    if (!scenario) {
      return NextResponse.json({ error: `Scenario ${scenarioId} not found.` }, { status: 404 });
    }

    // === TIER 1: Pre-scripted Decision Tree Match ===
    const preScriptedIntent = scenario.intents[normalizedIntent];
    if (
      preScriptedIntent &&
      preScriptedIntent.variations &&
      preScriptedIntent.variations.length > 0
    ) {
      // Pick a random variation
      const randomIndex = Math.floor(Math.random() * preScriptedIntent.variations.length);
      const template = preScriptedIntent.variations[randomIndex];
      const hydratedResponse = hydrateText(template, selectedSlots);

      return NextResponse.json({
        response: hydratedResponse,
        scoreDelta: preScriptedIntent.score_delta || 0,
        tier: 1,
        normalizedIntent
      });
    }

    // === TIER 2: Global Upstash Redis Cache Match ===
    const cacheKey = `cache:${scenarioId}:${normalizedIntent}`;
    if (redis) {
      try {
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
          // The cached item is stored in generalized template format. Hydrate it before returning.
          // Format expected: { responseTemplate: string, scoreDelta: number }
          const parsedCache = typeof cached === 'string' ? JSON.parse(cached) : cached;
          const hydratedResponse = hydrateText(parsedCache.responseTemplate, selectedSlots);

          return NextResponse.json({
            response: hydratedResponse,
            scoreDelta: parsedCache.scoreDelta || 0,
            tier: 2,
            normalizedIntent
          });
        }
      } catch (cacheError) {
        console.error('Upstash Redis lookup failed:', cacheError);
      }
    }

    // === TIER 3: LLM Fallback (Gemini API) ===
    if (!GEMINI_API_KEY) {
      // No API key configured. Return generic, safe fallback response to prevent app crash.
      return NextResponse.json({
        response: hydrateText(
          "I... I don't understand what you're asking. Please, just send help! I can hear {ambient_audio}!",
          selectedSlots
        ),
        scoreDelta: -10,
        tier: 3,
        fallbackMode: true,
        normalizedIntent
      });
    }

    // Construct chat prompt for Gemini
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

You must return a JSON object with this exact structure:
{
  "response": "Your spoken dialogue response in character.",
  "score_delta": -25
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
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
              score_delta: { type: 'INTEGER' }
            },
            required: ['response', 'score_delta']
          }
        }
      })
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini API returned status ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const resultText = geminiData.candidates[0].content.parts[0].text;
    const parsedLLM = JSON.parse(resultText);

    // Re-verify keys
    const generatedResponse = parsedLLM.response;
    const scoreDelta = Number(parsedLLM.score_delta) || 0;

    // === WRITE BACK TO CACHE ===
    // Generalize the response before caching to make it reusable
    const generalizedTemplate = generalizeText(generatedResponse, selectedSlots);

    if (redis) {
      try {
        await redis.set(
          cacheKey,
          JSON.stringify({
            responseTemplate: generalizedTemplate,
            scoreDelta
          })
        );
        console.log(`Cached response for: ${cacheKey}`);
      } catch (cacheWriteError) {
        console.error('Upstash Redis write failed:', cacheWriteError);
      }
    }

    return NextResponse.json({
      response: generatedResponse, // Return the fully hydrated response generated by LLM
      scoreDelta,
      tier: 3,
      normalizedIntent
    });
  } catch (error: unknown) {
    console.error('API Chat handler error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
