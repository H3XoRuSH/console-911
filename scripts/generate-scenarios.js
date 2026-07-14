/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Target directory and files
const DATA_DIR = path.join(__dirname, '..', 'data');
const SCENARIOS_FILE = path.join(DATA_DIR, 'scenarios.json');
const SEED_FILE = path.join(DATA_DIR, 'seed_scenarios.json');

// Archetypes definition (11 archetypes, 20 scenarios each = 220 total)
const ARCHETYPES = [
  'Life-Threatening Emergency',
  'Low-Priority / Non-Emergency',
  'Prank / Hoax Call',
  'Ambiguous / Code Call',
  'Psychological / Delusional Call',
  'Communication Barrier',
  'Animal Chaos',
  'Pocket Dial / Open Line',
  'Automated / Sensor Emergency',
  'Suspicious / Probing Call',
  'Absurd Entitlement Call'
];

const SCENARIOS_PER_ARCHETYPE = 20;
const BATCH_SIZE = 5; // Generate 5 scenarios at a time to stay within limits and avoid timeouts

// Retrieve API Key
function getApiKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // Try reading .env or .env.local
  const envPaths = [path.join(__dirname, '..', '.env.local'), path.join(__dirname, '..', '.env')];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY\s*=\s*(.*)/);
      if (match && match[1]) {
        return match[1].trim().replace(/['"]/g, '');
      }
    }
  }

  return null;
}

// Helper to delay execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// OpenAPI schema definition for Gemini 2.0 response
const responseSchema = {
  type: 'ARRAY',
  description: 'A list of console-911 dispatcher game scenarios',
  items: {
    type: 'OBJECT',
    properties: {
      title: {
        type: 'STRING',
        description: 'The name/title of the call scenario. Should be unique and engaging.'
      },
      description: {
        type: 'STRING',
        description: "A short one-sentence description of the call's true underlying situation."
      },
      difficulty: {
        type: 'STRING',
        enum: ['Easy', 'Medium', 'Hard'],
        description: 'Difficulty assessment of this dispatcher scenario.'
      },
      initial_variations: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description:
          "Exactly 3 distinct phrasing variations for the caller's initial message. Must contain slot variables in curly braces like {caller_name}, {victim_relation}, {address_location}, {ambient_audio}, or {specific_details}."
      },
      slots: {
        type: 'OBJECT',
        description:
          'Lists of slot values to randomize during hydration. Each slot key must have 3 to 5 options.',
        properties: {
          caller_name: { type: 'ARRAY', items: { type: 'STRING' } },
          victim_relation: { type: 'ARRAY', items: { type: 'STRING' } },
          address_location: { type: 'ARRAY', items: { type: 'STRING' } },
          ambient_audio: { type: 'ARRAY', items: { type: 'STRING' } },
          specific_details: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: [
          'caller_name',
          'victim_relation',
          'address_location',
          'ambient_audio',
          'specific_details'
        ]
      },
      intents: {
        type: 'OBJECT',
        description:
          'Mapped responses for matching intents. Specify only the intents that make sense for this call. Choose at least 3-4 intents from: ASK_LOCATION, ASK_DETAILS, ASK_CALLER_NAME, ASK_BREATHING, ASK_WEAPONS, TELL_CALM_DOWN, TELL_EVACUATE, TELL_STAY_PUT, TELL_FIRST_AID. All variation texts should support slots where relevant.',
        properties: {
          ASK_LOCATION: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: {
                type: 'INTEGER',
                description:
                  'Score change (usually +10 to +30 for asking location in emergencies, or 0 to -10 for pranks)'
              }
            },
            required: ['variations', 'score_delta']
          },
          ASK_DETAILS: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: { type: 'INTEGER' }
            },
            required: ['variations', 'score_delta']
          },
          ASK_CALLER_NAME: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: { type: 'INTEGER' }
            },
            required: ['variations', 'score_delta']
          },
          ASK_BREATHING: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: { type: 'INTEGER' }
            },
            required: ['variations', 'score_delta']
          },
          ASK_WEAPONS: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: { type: 'INTEGER' }
            },
            required: ['variations', 'score_delta']
          },
          TELL_CALM_DOWN: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: { type: 'INTEGER' }
            },
            required: ['variations', 'score_delta']
          },
          TELL_EVACUATE: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: { type: 'INTEGER' }
            },
            required: ['variations', 'score_delta']
          },
          TELL_STAY_PUT: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: { type: 'INTEGER' }
            },
            required: ['variations', 'score_delta']
          },
          TELL_FIRST_AID: {
            type: 'OBJECT',
            properties: {
              variations: { type: 'ARRAY', items: { type: 'STRING' } },
              score_delta: { type: 'INTEGER' }
            },
            required: ['variations', 'score_delta']
          }
        }
      },
      dispatch_outcomes: {
        type: 'OBJECT',
        description:
          'Scoring outcomes and summary feedbacks for each potential final dispatch action.',
        properties: {
          SEND_POLICE: {
            type: 'OBJECT',
            properties: {
              status: { type: 'STRING', enum: ['SUCCESS', 'MINOR_ERROR', 'CRITICAL_FAILURE'] },
              score_delta: { type: 'INTEGER' },
              message: {
                type: 'STRING',
                description: 'Detailed feedback on what happened, referencing slots if applicable.'
              }
            },
            required: ['status', 'score_delta', 'message']
          },
          SEND_FIRE: {
            type: 'OBJECT',
            properties: {
              status: { type: 'STRING', enum: ['SUCCESS', 'MINOR_ERROR', 'CRITICAL_FAILURE'] },
              score_delta: { type: 'INTEGER' },
              message: { type: 'STRING' }
            },
            required: ['status', 'score_delta', 'message']
          },
          SEND_MEDICAL: {
            type: 'OBJECT',
            properties: {
              status: { type: 'STRING', enum: ['SUCCESS', 'MINOR_ERROR', 'CRITICAL_FAILURE'] },
              score_delta: { type: 'INTEGER' },
              message: { type: 'STRING' }
            },
            required: ['status', 'score_delta', 'message']
          },
          ANIMAL_CONTROL: {
            type: 'OBJECT',
            properties: {
              status: { type: 'STRING', enum: ['SUCCESS', 'MINOR_ERROR', 'CRITICAL_FAILURE'] },
              score_delta: { type: 'INTEGER' },
              message: { type: 'STRING' }
            },
            required: ['status', 'score_delta', 'message']
          },
          DISMISS: {
            type: 'OBJECT',
            properties: {
              status: { type: 'STRING', enum: ['SUCCESS', 'MINOR_ERROR', 'CRITICAL_FAILURE'] },
              score_delta: { type: 'INTEGER' },
              message: {
                type: 'STRING',
                description:
                  'Feedback for dismissing the call (either successfully identifying a hoax/prank or failure to respond to a real threat).'
              }
            },
            required: ['status', 'score_delta', 'message']
          }
        },
        required: ['SEND_POLICE', 'SEND_FIRE', 'SEND_MEDICAL', 'ANIMAL_CONTROL', 'DISMISS']
      }
    },
    required: [
      'title',
      'description',
      'difficulty',
      'initial_variations',
      'slots',
      'intents',
      'dispatch_outcomes'
    ]
  }
};

// Generate a batch of scenarios for a specific archetype
async function generateBatch(apiKey, archetype, count, existingTitles = []) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `You are a creative writer and game design expert. Generate exactly ${count} distinct, highly creative, immersive, and text-based 911 dispatch game scenarios for the archetype: "${archetype}".
Each scenario must be unique, with realistic dialogues and outcomes.
Do NOT generate any of the following already existing titles for this archetype: ${JSON.stringify(existingTitles)}.

Make sure:
1. "initial_variations" contains exactly 3-4 phrasings representing different emotional states of the caller (e.g. frantic, calm, speaking in code, panicking).
2. The initial variations and intents MUST contain slot variables enclosed in curly braces like {caller_name}, {victim_relation}, {address_location}, {ambient_audio}, {specific_details}.
3. Define 3-5 distinct slots (e.g. caller_name, victim_relation, address_location, ambient_audio, specific_details) with 3-5 options each.
4. Create suitable "intents" mappings (with 3 phrasings each) for player queries. At least 3 intents must be mapped for each scenario.
5. In "dispatch_outcomes", define realistic statuses ("SUCCESS", "MINOR_ERROR", "CRITICAL_FAILURE"), score deltas, and descriptive feedback messages for ALL 5 dispatch types: SEND_POLICE, SEND_FIRE, SEND_MEDICAL, ANIMAL_CONTROL, DISMISS. Adjust the points properly:
   - Correct choice: +100 to +300 points
   - Minor errors: -50 to -150 points
   - Critical failures: -300 to -500 points
6. Match the archetype closely:
   - Life-Threatening Emergency: Real urgent life-and-death cases. SEND_MEDICAL, SEND_POLICE, or SEND_FIRE is SUCCESS, DISMISS is critical failure.
   - Low-Priority: Noise complaints, minor civil matters. DISMISS or minor dispatch is correct. Sending emergency units is MINOR_ERROR or failure.
   - Prank / Hoax: Callers making up absurd stuff or kids messing on line. DISMISS is SUCCESS, sending units is CRITICAL_FAILURE.
   - Ambiguous / Code Call: Domestic violence victims pretending to order pizza, or breathing silently. Police or investigation dispatch is SUCCESS, DISMISS is critical failure.
   - Psychological: Caller seeing monsters or having panic attacks. Police or psychiatric medical is correct.
   - Communication Barrier: Non-English, stroke victims, or touch-tone. Check breathing or locations via touch tones.
   - Animal Chaos: Dangerous bear on loose or cow blocking major highway. ANIMAL_CONTROL is SUCCESS.
   - Pocket Dial: Background noises of domestic violence, car crashes, or just a TV. Police is SUCCESS.
   - Automated: Smartwatch detection, fire panels. Dispatch is SUCCESS.
   - Suspicious / Probing: Robbers checking police response. Dispatching police is SUCCESS.
   - Absurd Entitlement: Customer complaint about wrong food, weather. DISMISS is SUCCESS, sending police is CRITICAL_FAILURE.`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
      temperature: 1.0 // High temperature for high creative diversity
    }
  };

  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const text = responseData.candidates[0].content.parts[0].text;

      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('API response is not an array');
      }
      return parsed;
    } catch (error) {
      attempt++;
      console.warn(`[Batch Generation Attempt ${attempt}/${maxAttempts} Failed]: ${error.message}`);
      if (attempt < maxAttempts) {
        const backoff = attempt * 5000;
        console.log(`Retrying in ${backoff / 1000}s...`);
        await sleep(backoff);
      } else {
        throw error;
      }
    }
  }
}

// Main execution function
async function main() {
  console.log('=== CONSOLE 911 SCENARIO GENERATOR ===');
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(
      'CRITICAL ERROR: GEMINI_API_KEY is not defined in environment variables, .env, or .env.local.'
    );
    console.error(
      'Please add GEMINI_API_KEY=your_api_key to a .env.local file in the project root.'
    );
    process.exit(1);
  }

  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
  }

  // Load existing scenarios
  let scenarios = [];
  if (fs.existsSync(SCENARIOS_FILE)) {
    try {
      scenarios = JSON.parse(fs.readFileSync(SCENARIOS_FILE, 'utf8'));
      console.log(`Loaded ${scenarios.length} existing scenarios from ${SCENARIOS_FILE}`);
    } catch {
      console.warn(`Could not parse ${SCENARIOS_FILE}. Initializing empty dataset.`);
    }
  } else if (fs.existsSync(SEED_FILE)) {
    try {
      scenarios = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
      console.log(`Loaded ${scenarios.length} seed scenarios from ${SEED_FILE}`);
    } catch {
      console.warn(`Could not parse seed file. Initializing empty dataset.`);
    }
  }

  // Generate for each archetype
  for (const archetype of ARCHETYPES) {
    // Count existing for this archetype
    const archetypeScenarios = scenarios.filter((s) => s.archetype === archetype);
    let currentCount = archetypeScenarios.length;
    console.log(
      `\nArchetype: "${archetype}" (Current count: ${currentCount}/${SCENARIOS_PER_ARCHETYPE})`
    );

    while (currentCount < SCENARIOS_PER_ARCHETYPE) {
      const needed = SCENARIOS_PER_ARCHETYPE - currentCount;
      const generateCount = Math.min(needed, BATCH_SIZE);
      console.log(`Generating batch of ${generateCount} for "${archetype}"...`);

      const existingTitles = scenarios.filter((s) => s.archetype === archetype).map((s) => s.title);

      try {
        const newBatch = await generateBatch(apiKey, archetype, generateCount, existingTitles);

        // Post-process batch to assign clean IDs and the archetype name
        for (const scenario of newBatch) {
          // Format ID as scenario_XXX based on length
          const idNum = String(scenarios.length + 1).padStart(3, '0');
          scenario.id = `scenario_${idNum}`;
          scenario.archetype = archetype;

          scenarios.push(scenario);
        }

        // Save progress immediately
        fs.writeFileSync(SCENARIOS_FILE, JSON.stringify(scenarios, null, 2), 'utf8');
        currentCount += newBatch.length;
        console.log(
          `Successfully added ${newBatch.length} scenarios. Total now: ${scenarios.length}/220`
        );

        // Sleep to avoid rate limits (10 seconds on free tier is safe)
        console.log('Sleeping 10s to respect API rate limits...');
        await sleep(10000);
      } catch (err) {
        console.error(`Failed to generate batch: ${err.message}`);
        console.log('Waiting 20s before next retry...');
        await sleep(20000);
      }
    }
  }

  console.log('\n=== SUCCESS ===');
  console.log(`Completed scenario dataset generation. Total scenarios: ${scenarios.length}`);
  console.log(`Dataset saved to: ${SCENARIOS_FILE}`);
}

main().catch((err) => {
  console.error('Fatal uncaught error during script execution:', err);
  process.exit(1);
});
