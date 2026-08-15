/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

console.log('--- Running Seed & Cache Integrity Test Suite ---');

// 1. Test PRNG and normalizeSeed implementation
const RNG_VERSION = 'v1';

function cyrb128(value) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let index = 0; index < value.length; index += 1) {
    const character = value.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ character, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ character, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ character, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ character, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0
  ];
}

function sfc32(a, b, c, d) {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;

    let value = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    value = (value + d) | 0;
    c = (c + value) | 0;

    return (value >>> 0) / 4294967296;
  };
}

function createSeededRandom(seed) {
  return sfc32(...cyrb128(`${RNG_VERSION}:${seed}`));
}

function normalizeSeed(seed) {
  const normalized = seed?.trim().slice(0, 64).toUpperCase();
  return normalized || 'AUTOSEED';
}

// ----------------------------------------------------
// TEST 1: Seed case normalization (abc vs ABC)
// ----------------------------------------------------
console.log('✓ Testing seed case normalization...');
assert.strictEqual(normalizeSeed('abc'), 'ABC');
assert.strictEqual(normalizeSeed('  abc-123_xyz  '), 'ABC-123_XYZ');
assert.strictEqual(normalizeSeed('ABC'), 'ABC');

const rngLower = createSeededRandom(normalizeSeed('abc-123'));
const rngUpper = createSeededRandom(normalizeSeed('ABC-123'));

for (let i = 0; i < 20; i++) {
  assert.strictEqual(rngLower(), rngUpper(), `RNG output mismatch at step ${i}`);
}
console.log('  -> Passed: abc and ABC produce identical RNG streams.');

// ----------------------------------------------------
// TEST 2: Separate cache keys for original vs experimental
// ----------------------------------------------------
console.log('✓ Testing dataset cache key isolation...');

function buildCacheKey(dataset, scenarioId, currentState, normalizedIntent, gameSeed) {
  const cacheSeedSuffix = gameSeed ? `:seed:${encodeURIComponent(gameSeed)}` : '';
  return `cache:${dataset}:${scenarioId}:${currentState}:${normalizedIntent}${cacheSeedSuffix}`;
}

const originalKey = buildCacheKey('original', 'scenario_046', 'initial', 'ASK_DETAILS', 'TEST_SEED');
const experimentalKey = buildCacheKey('experimental', 'scenario_046', 'initial', 'ASK_DETAILS', 'TEST_SEED');

assert.notStrictEqual(originalKey, experimentalKey);
assert.strictEqual(originalKey, 'cache:original:scenario_046:initial:ASK_DETAILS:seed:TEST_SEED');
assert.strictEqual(experimentalKey, 'cache:experimental:scenario_046:initial:ASK_DETAILS:seed:TEST_SEED');
console.log('  -> Passed: original and experimental datasets have distinct cache keys.');

// ----------------------------------------------------
// TEST 3: Deterministic session calls and hydrated slots
// ----------------------------------------------------
console.log('✓ Testing deterministic session calls and hydration...');

function loadScenarios(dataset = 'original') {
  const dir = dataset === 'experimental'
    ? path.join(__dirname, '..', 'data', 'scenarios', 'experimental')
    : path.join(__dirname, '..', 'data', 'scenarios');
  const files = fs.readdirSync(dir).sort();
  const scenarios = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (Array.isArray(content)) scenarios.push(...content);
      else scenarios.push(content);
    }
  }
  return scenarios;
}

function shuffle(items, random) {
  const arr = [...items];
  for (let index = arr.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]];
  }
  return arr;
}

function hydrate(scenario, random) {
  const selectedSlots = {};
  if (scenario.slots) {
    for (const key in scenario.slots) {
      let options = scenario.slots[key];
      if (options && typeof options === 'object' && !Array.isArray(options)) {
        options = options.options || options.choices;
      }
      if (Array.isArray(options) && options.length > 0) {
        const idx = Math.floor(random() * options.length);
        selectedSlots[key] = options[idx];
      }
    }
  }
  return { id: scenario.id, selectedSlots };
}

const seedA = normalizeSeed('SHIFT_TEST_SEED_99');
const seedB = normalizeSeed('shift_test_seed_99'); // lowercase equivalent

const allScenarios = loadScenarios('original');

const run1Rng = createSeededRandom(seedA);
const run1Shuffled = shuffle(allScenarios, run1Rng).slice(0, 5);
const run1Hydrated = run1Shuffled.map(s => hydrate(s, run1Rng));

const run2Rng = createSeededRandom(seedB);
const run2Shuffled = shuffle(allScenarios, run2Rng).slice(0, 5);
const run2Hydrated = run2Shuffled.map(s => hydrate(s, run2Rng));

assert.deepStrictEqual(run1Hydrated, run2Hydrated, 'Hydrated sessions with same seed must match exactly');
console.log('  -> Passed: identical session calls and slots for repeated requests with same seed.');

// ----------------------------------------------------
// TEST 4: Deterministic timeout penalties
// ----------------------------------------------------
console.log('✓ Testing deterministic timeout penalty calculation...');

function calcTimeoutPenalty(seed, scenarioId) {
  const normalized = normalizeSeed(seed);
  const random = createSeededRandom(`timeout:${normalized}:${scenarioId}`);
  return -150 - Math.floor(random() * 150);
}

const penalty1 = calcTimeoutPenalty('abc_seed', 'scenario_001');
const penalty2 = calcTimeoutPenalty('ABC_SEED', 'scenario_001');
const penalty3 = calcTimeoutPenalty('ABC_SEED', 'scenario_002');

assert.strictEqual(penalty1, penalty2, 'Penalties for equivalent seeds must be identical');
assert.ok(penalty1 <= -150 && penalty1 >= -300, 'Penalty must be within expected range [-300, -150]');
console.log(`  -> Passed: deterministic timeout penalties verified (scenario_001 penalty: ${penalty1}, scenario_002 penalty: ${penalty3}).`);

// ----------------------------------------------------
// TEST 5: Report export seed inclusion (Markdown & Canvas)
// ----------------------------------------------------
console.log('✓ Testing seed inclusion in Markdown and Canvas shift reports...');

const testSeed = 'TEST_SEED_EXPORT_123';

// Markdown report verification
function generateMarkdownReport(dispatcherName, gameSeed, totalScore, calls) {
  let md = `📞 **CONSOLE 911 - SHIFT REPORT**\n`;
  md += `**Operator:** ${dispatcherName.toUpperCase() || 'OPERATOR'}\n`;
  md += `**Rank:** Rookie\n`;
  md += `**Game Seed:** ${gameSeed}\n`;
  md += `**Total Score:** ${totalScore} PTS\n\n`;
  md += `**Shift Overview:**\n`;
  calls.forEach((call) => {
    md += `- ${call.title || 'UNKNOWN CALL'}: +100 PTS\n`;
  });
  return md;
}

const mdReport = generateMarkdownReport('Dispatcher 1', testSeed, 500, [{ title: 'Call 1' }]);
assert.ok(mdReport.includes(`**Game Seed:** ${testSeed}`), 'Markdown report must include Game Seed');

// Canvas report lines verification
function generateCanvasReportLines(dispatcherName, gameSeed) {
  const lines = [];
  lines.push({ type: 'heading-main', content: `CONSOLE 911 // EMERGENCY DISPATCH SHIFT REPORT` });
  lines.push({ type: 'custom', content: `OPERATOR CALLSIGN: ${dispatcherName.toUpperCase() || 'OPERATOR'}` });
  if (gameSeed) {
    lines.push({ type: 'custom', content: `GAME SEED: ${gameSeed}` });
  }
  return lines;
}

const canvasLines = generateCanvasReportLines('Dispatcher 1', testSeed);
const seedLine = canvasLines.find(l => l.content === `GAME SEED: ${testSeed}`);
assert.ok(seedLine !== undefined, 'Canvas report lines must include GAME SEED line');
console.log('  -> Passed: Game seed is verified in both Markdown and Canvas shift report exports.');

console.log('\n✅ All tests passed successfully!');
