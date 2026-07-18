/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Target directory and files
const DATA_DIR = path.join(__dirname, '..', 'data');
const SCENARIOS_FILE = path.join(DATA_DIR, 'scenarios.json');
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const SEED_FILE = path.join(DATA_DIR, 'seed_scenarios.json');

// FINAL RUN ARCHETYPES (8 Streamlined Categories)
const ARCHETYPES = [
  'Life-Threatening Emergency',      // Urgent life/death calls (includes automated sensors/alarms)
  'Low-Priority / Non-Emergency',    // Civil complaints, noise, and absurd customer complaints
  'Prank / Hoax Call',               // Malicious, fake, or childish calls that should be dismissed
  'Ambiguous / Code Call',           // Duress calls using pizza order codes or domestic violence signals
  'Psychological / Delusional Call', // Psychiatric crises requiring de-escalation/medical
  'Communication Barrier',           // Stroke, non-English, or touch-tone checks
  'Pocket Dial / Open Line',         // Open mic lines where player must listen to background events
  'Animal Chaos'                     // Bears, cows, and dangerous wildlife needing animal control
];

const SCENARIOS_PER_ARCHETYPE = 15;
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

You must return a JSON object with a single key "scenarios" containing the array of generated scenarios. Each scenario in the array must strictly match the following JSON Schema structure.

CRITICAL STRUCTURAL EXAMPLE:
{
  "title": "Child Trapped in Freezer",
  "description": "A panicked child calls 911 saying their younger sibling is locked inside a chest freezer. The freezer is old and the latch may be jammed.",
  "difficulty": "Hard",
  "states": [
    "initial",
    "attempting_rescue",
    "freezer_opened",
    "victim_safe"
  ],
  "initial_variations": [
    "My little brother is stuck in the freezer! He went inside to hide and the lid locked. Please help!",
    "Oh no, oh no! My sister is trapped in the chest freezer in the garage. I can hear her crying but I can't open it!",
    "Emergency! A child is locked in a freezer. I'm {caller_name}, my sibling {victim_name} is inside. Please send someone!",
    "I need help! My friend {victim_name} got trapped in a freezer in the basement. I can't get the latch open. It's getting cold!"
  ],
  "slots": {
    "address_location": [
      "123 Oak Street",
      "456 Maple Avenue"
    ],
    "caller_name": [
      "Timmy",
      "Sophie"
    ],
    "victim_name": [
      "Benny",
      "Lily"
    ],
    "ambient_audio": [
      "muffled crying from inside",
      "a humming motor"
    ],
    "specific_details": [
      "The freezer is unplugged",
      "I tried using a screwdriver"
    ]
  },
  "intents": {
    "ASK_LOCATION": {
      "score_delta": 50,
      "transitions": {},
      "responses": {
        "initial": [
          "We're at {address_location}. The freezer is in the garage.",
          "At {address_location}. The freezer is in the basement."
        ],
        "attempting_rescue": [
          "Still at {address_location}. I'm trying to open it."
        ],
        "freezer_opened": [
          "I got it open! We're at {address_location}."
        ],
        "victim_safe": [
          "She's out! We're at {address_location}. She's shivering but okay."
        ]
      }
    },
    "ASK_DETAILS": {
      "score_delta": 30,
      "transitions": {},
      "responses": {
        "initial": [
          "It's a big chest freezer. I can hear {ambient_audio}. {specific_details}."
        ],
        "attempting_rescue": [
          "I'm trying to pry it open with a crowbar. {ambient_audio}."
        ],
        "freezer_opened": [
          "I managed to break the latch. He's out but very cold."
        ],
        "victim_safe": [
          "He's wrapped in blankets now. Breathing fine."
        ]
      }
    },
    "ASK_CALLER_STATUS": {
      "score_delta": 20,
      "transitions": {
        "initial": "attempting_rescue",
        "attempting_rescue": "freezer_opened"
      },
      "responses": {
        "initial": [
          "I'm scared, I don't know what to do."
        ],
        "attempting_rescue": [
          "I'm hitting the latch with a hammer."
        ],
        "freezer_opened": [
          "I got it open! I'm helping him out."
        ],
        "victim_safe": [
          "I'm holding my sibling, keeping them warm."
        ]
      }
    }
  },
  "dispatch_outcomes": {
    "SEND_POLICE": { "status": "SUCCESS", "score_delta": 100, "message": "Police arrive and use a crowbar to open the freezer." },
    "SEND_FIRE": { "status": "SUCCESS", "score_delta": 200, "message": "Firefighters use hydraulic tools." },
    "SEND_MEDICAL": { "status": "SUCCESS", "score_delta": 250, "message": "Medics treat the child." },
    "ANIMAL_CONTROL": { "status": "MINOR_ERROR", "score_delta": 0, "message": "Animal control is confused." },
    "DISMISS": { "status": "CRITICAL_FAILURE", "score_delta": -300, "message": "Dismiss as a prank." }
  }
}

CRITICAL RULES:
1. "states": Must be either an array of string state names (like ["initial", "attempting_rescue", "freezer_opened", "victim_safe"]) or an object mapping state names to descriptions.
2. "initial_variations": Exactly 3-4 distinct phrasing variations representing the starting call introduction.
   - **CRITICAL RESTRICTION**: The initial variations MUST NEVER contain references to location/address slots (like "{address_location}") or threat detail slots (like "{specific_details}"). The caller must start in a state of panic or call introduction, forcing the dispatcher to ask for this info.
   - **HYDRATION REQUIREMENT**: At least two of the "initial_variations" MUST contain other slot placeholders, such as {caller_name}, {victim_relation}, {victim_name}, or {ambient_audio} (but remember, NEVER include {address_location} or {specific_details} in these variations).
   - **NO HARDCODING**: Never hardcode caller/victim names or relationships in the initial variations that are already choices in the slots. Always use the slot placeholders! E.g. do not write "Mr. Johnson" or "Jake" literally in the variation if they are option values in your "caller_name" or "victim_name" slot arrays; use "{caller_name}" or "{victim_name}" instead.
3. "slots": Must include at least caller_name, address_location, and specific_details as arrays of strings. Custom slots (like victim_name, relation) are allowed.
4. "intents": For each intent (ASK_LOCATION, ASK_DETAILS, and at least 2-3 others), define "score_delta", transitions, and a "responses" map covering EVERY state defined in your "states" block. Response texts should use slot variables like {address_location} or {caller_name} inside curly braces.
5. "dispatch_outcomes": Must define outcomes for all 5: SEND_POLICE, SEND_FIRE, SEND_MEDICAL, ANIMAL_CONTROL, DISMISS. Each must have "status" ("SUCCESS" | "MINOR_ERROR" | "CRITICAL_FAILURE"), "score_delta", and "message".
6. "description": A short, one-sentence summary of the underlying situation (not shown to the player, used for backend metadata).
7. Match the archetype closely:
   - Life-Threatening Emergency: Real urgent life-and-death cases. SEND_MEDICAL, SEND_POLICE, or SEND_FIRE is SUCCESS, DISMISS is critical failure.
   - Low-Priority: Noise complaints, minor civil matters. DISMISS or minor dispatch is correct.
   - Prank / Hoax: Callers making up absurd stuff. DISMISS is SUCCESS, sending units is CRITICAL_FAILURE.
   - Ambiguous / Code Call: Domestic violence victims pretending to order pizza. Police or investigation dispatch is SUCCESS, DISMISS is critical failure.
   - Psychological: Caller seeing monsters or having panic attacks. Police or psychiatric medical is correct.
   - Communication Barrier: Non-English, stroke victims, or touch-tone. Check breathing or locations via touch tones.
   - Animal Chaos: Dangerous bear on loose or cow blocking major highway. ANIMAL_CONTROL is SUCCESS.
   - Pocket Dial: Background noises of domestic violence, car crashes, or just a TV. Police is SUCCESS.
   - Automated: Smartwatch detection, fire panels. Dispatch is SUCCESS.
   - Suspicious / Probing: Robbers checking police response. Dispatching police is SUCCESS.
   - Absurd Entitlement: Customer complaint about wrong food, weather. DISMISS is SUCCESS, sending police is CRITICAL_FAILURE.`;

  const requestBody = {
    model: 'deepseek-v4-pro',
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

      for (const scenario of scenariosArray) {
        validateScenarioStructure(scenario);
      }

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

function validateScenarioStructure(scenario) {
  if (!scenario || typeof scenario !== 'object') {
    throw new Error('Scenario must be an object.');
  }
  if (typeof scenario.title !== 'string' || !scenario.title.trim()) {
    throw new Error('Scenario title must be a non-empty string.');
  }
  if (typeof scenario.description !== 'string' || !scenario.description.trim()) {
    throw new Error('Scenario description must be a non-empty string.');
  }
  if (!['Easy', 'Medium', 'Hard'].includes(scenario.difficulty)) {
    throw new Error(`Scenario difficulty must be 'Easy', 'Medium', or 'Hard'. Found: ${scenario.difficulty}`);
  }
  if (!scenario.states || (typeof scenario.states !== 'object' && !Array.isArray(scenario.states))) {
    throw new Error('Scenario states must be an object or array.');
  }
  
  const stateKeys = Array.isArray(scenario.states) ? scenario.states : Object.keys(scenario.states);
  if (stateKeys.length === 0 || !stateKeys.includes('initial')) {
    throw new Error('Scenario states must include at least the "initial" state.');
  }
  
  if (!scenario.slots || typeof scenario.slots !== 'object') {
    throw new Error('Scenario slots must be an object.');
  }
  const coreSlots = ['caller_name', 'address_location', 'specific_details'];
  for (const slot of coreSlots) {
    if (!Array.isArray(scenario.slots[slot]) || scenario.slots[slot].length === 0) {
      throw new Error(`Scenario slots must contain a non-empty array for "${slot}".`);
    }
  }

  if (!Array.isArray(scenario.initial_variations) || scenario.initial_variations.length === 0) {
    throw new Error('Scenario initial_variations must be a non-empty array.');
  }
  for (const variation of scenario.initial_variations) {
    if (variation.includes('{address_location}') || variation.includes('{specific_details}')) {
      throw new Error(`Rogue slot leaked into initial_variations of scenario "${scenario.title}": "${variation}"`);
    }
  }

  // Ensure at least one initial variation has a slot placeholder
  const allowedSlots = ['{caller_name}', '{victim_name}', '{victim_relation}', '{ambient_audio}'];
  const hasHydrateableSlot = scenario.initial_variations.some(variation => {
    return allowedSlots.some(slot => variation.includes(slot));
  });
  if (!hasHydrateableSlot) {
    throw new Error(`Scenario "${scenario.title}" must have at least one initial_variation containing a slot placeholder (e.g. {caller_name}, {victim_name}, {victim_relation}, or {ambient_audio}) to enable dynamic hydration.`);
  }

  // Prevent hardcoding of caller names or victim names in the initial variations
  const callerNamesList = scenario.slots.caller_name || [];
  const victimNamesList = scenario.slots.victim_name || [];
  for (const variation of scenario.initial_variations) {
    for (const name of callerNamesList) {
      if (name && variation.includes(name)) {
        throw new Error(`Scenario "${scenario.title}" has hardcoded caller name "${name}" in initial_variations. Use the {caller_name} placeholder instead.`);
      }
    }
    for (const name of victimNamesList) {
      if (name && variation.includes(name)) {
        throw new Error(`Scenario "${scenario.title}" has hardcoded victim name "${name}" in initial_variations. Use the {victim_name} placeholder instead.`);
      }
    }
  }

  if (!scenario.intents || typeof scenario.intents !== 'object') {
    throw new Error('Scenario intents must be an object.');
  }
  for (const intentKey in scenario.intents) {
    const intent = scenario.intents[intentKey];
    if (typeof intent.score_delta !== 'number') {
      throw new Error(`Scenario intent "${intentKey}" must have a numeric score_delta.`);
    }
    for (const st of stateKeys) {
      if (!intent.responses || !intent.responses[st]) {
        throw new Error(`Scenario intent "${intentKey}" response is missing mapping for state "${st}".`);
      }
    }
  }
  
  if (!scenario.dispatch_outcomes || typeof scenario.dispatch_outcomes !== 'object') {
    throw new Error('Scenario dispatch_outcomes must be an object.');
  }
  const requiredDispatches = ['SEND_POLICE', 'SEND_FIRE', 'SEND_MEDICAL', 'ANIMAL_CONTROL', 'DISMISS'];
  for (const dispatch of requiredDispatches) {
    const outcome = scenario.dispatch_outcomes[dispatch];
    if (!outcome || !['SUCCESS', 'MINOR_ERROR', 'CRITICAL_FAILURE'].includes(outcome.status)) {
      throw new Error(`Scenario dispatch outcome "${dispatch}" has invalid format.`);
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
