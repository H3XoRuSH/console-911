import fs from 'fs';
import path from 'path';
import { Scenario, HydratedCallSession, hydrateScenario } from './hydration';

const DATA_DIR = path.join(process.cwd(), 'data');
const SCENARIOS_DIR = path.join(DATA_DIR, 'scenarios');
const SEED_FILE = path.join(DATA_DIR, 'seed_scenarios.json');

/**
 * Loads all scenarios from the local dataset.
 * Falls back to seed scenarios if the scenarios directory is empty or missing.
 */
export function loadAllScenarios(): Scenario[] {
  if (fs.existsSync(SCENARIOS_DIR)) {
    try {
      const files = fs.readdirSync(SCENARIOS_DIR);
      const scenarios: Scenario[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(SCENARIOS_DIR, file);
          const rawData = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(rawData);
          if (Array.isArray(parsed)) {
            scenarios.push(...parsed);
          } else {
            scenarios.push(parsed);
          }
        }
      }
      if (scenarios.length > 0) {
        return scenarios;
      }
    } catch (error) {
      console.error('Error loading scenarios from scenarios directory:', error);
    }
  }

  // Fallback to seed file
  if (fs.existsSync(SEED_FILE)) {
    try {
      const rawData = fs.readFileSync(SEED_FILE, 'utf8');
      return JSON.parse(rawData) as Scenario[];
    } catch (error) {
      console.error('Error loading seed scenarios:', error);
    }
  }

  return [];
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
