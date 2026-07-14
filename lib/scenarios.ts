import fs from 'fs';
import path from 'path';
import { Scenario, HydratedCallSession, hydrateScenario } from './hydration';

const DATA_DIR = path.join(process.cwd(), 'data');
const SCENARIOS_FILE = path.join(DATA_DIR, 'scenarios.json');
const SEED_FILE = path.join(DATA_DIR, 'seed_scenarios.json');

/**
 * Loads all scenarios from the local dataset.
 * Falls back to seed scenarios if the main file is empty or missing.
 */
export function loadAllScenarios(): Scenario[] {
  let filePath = SCENARIOS_FILE;
  if (!fs.existsSync(filePath)) {
    filePath = SEED_FILE;
  }

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(rawData) as Scenario[];
  } catch (error) {
    console.error('Error loading scenarios from disk:', error);
    return [];
  }
}

/**
 * Selects exactly N scenarios for a game session.
 * Ensures that no two scenarios share the same archetype.
 * If there are fewer than N archetypes available (e.g. out of the box with 3 seed scenarios),
 * it returns as many unique scenarios as possible.
 */
export function selectSessionScenarios(count: number = 5): HydratedCallSession[] {
  const allScenarios = loadAllScenarios();
  if (allScenarios.length === 0) {
    return [];
  }

  // Shuffle scenarios
  const shuffled = [...allScenarios].sort(() => Math.random() - 0.5);

  const selectedScenarios: Scenario[] = [];
  const selectedArchetypes = new Set<string>();

  // Try to pick unique archetypes first
  for (const scenario of shuffled) {
    if (!selectedArchetypes.has(scenario.archetype)) {
      selectedScenarios.push(scenario);
      selectedArchetypes.add(scenario.archetype);
      if (selectedScenarios.length >= count) {
        break;
      }
    }
  }

  // Fallback: If we couldn't get count scenarios because of archetype constraints,
  // fill the rest with any remaining unused scenarios.
  if (selectedScenarios.length < count) {
    for (const scenario of shuffled) {
      if (!selectedScenarios.some((s) => s.id === scenario.id)) {
        selectedScenarios.push(scenario);
        if (selectedScenarios.length >= count) {
          break;
        }
      }
    }
  }

  // Hydrate each selected scenario for the session
  return selectedScenarios.map((s) => hydrateScenario(s));
}
