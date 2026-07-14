/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Target directory and files
const DATA_DIR = path.join(__dirname, '..', 'data');
const SCENARIOS_FILE = path.join(DATA_DIR, 'scenarios.json');
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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
  if (process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_API_KEY;
  }

  // Try reading .env or .env.local
  const envPaths = [path.join(__dirname, '..', '.env.local'), path.join(__dirname, '..', '.env')];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/DEEPSEEK_API_KEY\s*=\s*(.*)/);
      if (match && match[1]) {
        return match[1].trim().replace(/['"]/g, '');
      }
    }
  }

  return null;
}

// Helper to delay execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// OpenAPI schema definition for Gemini 2.0 / DeepSeek response
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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
          "Exactly 3 distinct phrasing variations for the caller's initial message (while in the 'initial' state). Must contain slot variables in curly braces."
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
      states: {
        type: 'OBJECT',
        description:
          'Key-value map of valid states for this scenario. Must define "initial" (the starting state) and at least 2-3 other logical states (e.g. "hiding", "evacuated", "confronting", "secured", etc.) based on the narrative flow.',
        additionalProperties: { type: 'STRING' }
      },
      intents: {
        type: 'OBJECT',
        description:
          'State-aware responses and transitions. Choose at least 3-4 intents from: ASK_LOCATION, ASK_DETAILS, ASK_CALLER_NAME, ASK_BREATHING, ASK_WEAPONS, TELL_CALM_DOWN, TELL_EVACUATE, TELL_STAY_PUT, TELL_FIRST_AID.',
        properties: {
          ASK_LOCATION: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: {
                type: 'OBJECT',
                description: 'Optional map of state transitions, e.g., {"initial": "evacuated"}'
              },
              responses: {
                type: 'OBJECT',
                description: 'Map of state keys to an array of hydrated dialogue strings.'
              }
            },
            required: ['score_delta', 'responses']
          },
          ASK_DETAILS: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: { type: 'OBJECT' },
              responses: { type: 'OBJECT' }
            },
            required: ['score_delta', 'responses']
          },
          ASK_CALLER_NAME: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: { type: 'OBJECT' },
              responses: { type: 'OBJECT' }
            },
            required: ['score_delta', 'responses']
          },
          ASK_BREATHING: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: { type: 'OBJECT' },
              responses: { type: 'OBJECT' }
            },
            required: ['score_delta', 'responses']
          },
          ASK_WEAPONS: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: { type: 'OBJECT' },
              responses: { type: 'OBJECT' }
            },
            required: ['score_delta', 'responses']
          },
          TELL_CALM_DOWN: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: { type: 'OBJECT' },
              responses: { type: 'OBJECT' }
            },
            required: ['score_delta', 'responses']
          },
          TELL_EVACUATE: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: { type: 'OBJECT' },
              responses: { type: 'OBJECT' }
            },
            required: ['score_delta', 'responses']
          },
          TELL_STAY_PUT: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: { type: 'OBJECT' },
              responses: { type: 'OBJECT' }
            },
            required: ['score_delta', 'responses']
          },
          TELL_FIRST_AID: {
            type: 'OBJECT',
            properties: {
              score_delta: { type: 'INTEGER' },
              transitions: { type: 'OBJECT' },
              responses: { type: 'OBJECT' }
            },
            required: ['score_delta', 'responses']
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
      'states',
      'intents',
      'dispatch_outcomes'
    ]
  }
};

// Generate a batch of scenarios for a specific archetype
async function generateBatch(apiKey, archetype, count, existingTitles = []) {
  const url = `https://api.deepseek.com/chat/completions`;

  const prompt = `You are a creative writer and game design expert. Generate exactly ${count} distinct, highly creative, immersive, and text-based 911 dispatch game scenarios for the archetype: "${archetype}".
Each scenario must be unique, with realistic dialogues and outcomes.
Do NOT generate any of the following already existing titles for this archetype: ${JSON.stringify(existingTitles)}.

You must return a JSON object with a single key "scenarios" containing the array of generated scenarios. Each scenario in the array must follow the specified structure.

Make sure:
1. Define a "states" map for each scenario containing at least 3-4 logical states: "initial" (the starting state) and others appropriate for the scenario (e.g. "hiding", "evacuated", "confronting", "secured").
2. "initial_variations" contains exactly 3-4 phrasings representing different emotional states of the caller in the "initial" state.
3. The initial variations and intents MUST contain slot variables enclosed in curly braces like {caller_name}, {victim_relation}, {address_location}, {ambient_audio}, {specific_details}.
4. Define 3-5 distinct slots (e.g. caller_name, victim_relation, address_location, ambient_audio, specific_details) with 3-5 options each.
5. In "intents", define state-aware mapped responses for player queries (ASK_LOCATION, ASK_DETAILS, etc.). For each intent, specify the "score_delta", any state "transitions" (e.g. {"initial": "hiding"} if the instruction changes the caller's action/posture), and the "responses" mapped for each valid state name (e.g. {"initial": ["variations..."], "hiding": ["variations..."]}). Ensure every state defined in "states" has corresponding response variations.
6. In "dispatch_outcomes", define realistic statuses ("SUCCESS", "MINOR_ERROR", "CRITICAL_FAILURE"), score deltas, and descriptive feedback messages for ALL 5 dispatch types: SEND_POLICE, SEND_FIRE, SEND_MEDICAL, ANIMAL_CONTROL, DISMISS. Adjust the points properly:
   - Correct choice: +100 to +300 points
   - Minor errors: -50 to -150 points
   - Critical failures: -300 to -500 points
7. Match the archetype closely:
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
    model: 'deepseek-v4-flash',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 1.0
  };

  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const text = responseData.choices[0].message.content;

      const parsed = JSON.parse(text);
      const scenariosArray = Array.isArray(parsed) ? parsed : parsed.scenarios || [];
      return scenariosArray;
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

function getArchetypeFilename(archetype) {
  const slug = archetype
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return path.join(DATA_DIR, 'scenarios', `${slug}.json`);
}

// Main execution function
async function main() {
  console.log('=== CONSOLE 911 SCENARIO GENERATOR ===');
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(
      'CRITICAL ERROR: DEEPSEEK_API_KEY is not defined in environment variables, .env, or .env.local.'
    );
    console.error(
      'Please add DEEPSEEK_API_KEY=your_api_key to a .env.local file in the project root.'
    );
    process.exit(1);
  }

  // Create scenarios directory if it doesn't exist
  const scenariosDir = path.join(DATA_DIR, 'scenarios');
  if (!fs.existsSync(scenariosDir)) {
    fs.mkdirSync(scenariosDir, { recursive: true });
    console.log(`Created scenarios directory: ${scenariosDir}`);
  }

  // Migrate old scenarios.json if present
  if (fs.existsSync(SCENARIOS_FILE)) {
    try {
      console.log(
        `Found legacy scenarios.json. Migrating existing scenarios to separated files...`
      );
      const oldScenarios = JSON.parse(fs.readFileSync(SCENARIOS_FILE, 'utf8'));
      if (Array.isArray(oldScenarios)) {
        const grouped = {};
        for (const s of oldScenarios) {
          if (s.states) {
            if (!grouped[s.archetype]) {
              grouped[s.archetype] = [];
            }
            grouped[s.archetype].push(s);
          }
        }
        for (const arch of Object.keys(grouped)) {
          const file = getArchetypeFilename(arch);
          fs.writeFileSync(file, JSON.stringify(grouped[arch], null, 2), 'utf8');
          console.log(
            `Migrated ${grouped[arch].length} scenarios for "${arch}" to ${path.basename(file)}`
          );
        }
        const backupFile = SCENARIOS_FILE + '.bak';
        fs.renameSync(SCENARIOS_FILE, backupFile);
        console.log(`Renamed legacy scenarios.json to scenarios.json.bak`);
      }
    } catch (e) {
      console.error('Error during migration of legacy scenarios.json:', e);
    }
  }

  // Generate for each archetype
  for (const archetype of ARCHETYPES) {
    const file = getArchetypeFilename(archetype);
    let archetypeScenarios = [];
    if (fs.existsSync(file)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(parsed) && (parsed.length === 0 || parsed[0].states)) {
          archetypeScenarios = parsed;
          console.log(
            `Loaded ${archetypeScenarios.length} existing stateful scenarios from ${path.basename(file)}`
          );
        }
      } catch {
        console.warn(
          `Could not parse ${path.basename(file)}. Initializing empty list for "${archetype}".`
        );
      }
    }

    let currentCount = archetypeScenarios.length;
    console.log(
      `\nArchetype: "${archetype}" (Current count: ${currentCount}/${SCENARIOS_PER_ARCHETYPE})`
    );

    // Get all existing titles for deduplication (across all files in scenarios folder)
    const allTitles = [];
    if (fs.existsSync(scenariosDir)) {
      const files = fs.readdirSync(scenariosDir);
      for (const f of files) {
        if (f.endsWith('.json')) {
          try {
            const list = JSON.parse(fs.readFileSync(path.join(scenariosDir, f), 'utf8'));
            if (Array.isArray(list)) {
              allTitles.push(...list.map((s) => s.title));
            }
          } catch {}
        }
      }
    }

    // Determine current global scenario count for ID formatting
    let globalCount = 0;
    if (fs.existsSync(scenariosDir)) {
      const files = fs.readdirSync(scenariosDir);
      for (const f of files) {
        if (f.endsWith('.json')) {
          try {
            const list = JSON.parse(fs.readFileSync(path.join(scenariosDir, f), 'utf8'));
            if (Array.isArray(list)) {
              globalCount += list.length;
            }
          } catch {}
        }
      }
    }

    while (currentCount < SCENARIOS_PER_ARCHETYPE) {
      const needed = SCENARIOS_PER_ARCHETYPE - currentCount;
      const generateCount = Math.min(needed, BATCH_SIZE);
      console.log(`Generating batch of ${generateCount} for "${archetype}"...`);

      try {
        const newBatch = await generateBatch(apiKey, archetype, generateCount, allTitles);

        // Post-process batch to assign clean IDs and the archetype name
        for (const scenario of newBatch) {
          globalCount++;
          const idNum = String(globalCount).padStart(3, '0');
          scenario.id = `scenario_${idNum}`;
          scenario.archetype = archetype;

          archetypeScenarios.push(scenario);
          allTitles.push(scenario.title);
        }

        // Save progress immediately for this archetype file
        fs.writeFileSync(file, JSON.stringify(archetypeScenarios, null, 2), 'utf8');
        currentCount += newBatch.length;
        console.log(
          `Successfully added ${newBatch.length} scenarios. Total for "${archetype}": ${currentCount}/20`
        );
      } catch (err) {
        console.error(`Failed to generate batch: ${err.message}`);
        console.log('Waiting 20s before next retry...');
        await sleep(20000);
      }
    }
  }

  // Print global scenario count across all split files
  let finalGlobalCount = 0;
  if (fs.existsSync(scenariosDir)) {
    const files = fs.readdirSync(scenariosDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        try {
          const list = JSON.parse(fs.readFileSync(path.join(scenariosDir, f), 'utf8'));
          if (Array.isArray(list)) {
            finalGlobalCount += list.length;
          }
        } catch {}
      }
    }
  }

  console.log('\n=== SUCCESS ===');
  console.log(
    `Completed scenario dataset generation. Total scenarios across all files: ${finalGlobalCount}`
  );
}

main().catch((err) => {
  console.error('Fatal uncaught error during script execution:', err);
  process.exit(1);
});
