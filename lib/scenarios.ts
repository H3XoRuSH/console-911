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
export function loadAllScenarios(dataset: string = 'original'): Scenario[] {
  const targetDir = dataset === 'experimental'
    ? path.join(SCENARIOS_DIR, 'experimental')
    : SCENARIOS_DIR;

  if (fs.existsSync(targetDir)) {
    try {
      const files = fs.readdirSync(targetDir);
      const scenarios: Scenario[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(targetDir, file);
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
      console.error(`Error loading scenarios from directory ${targetDir}:`, error);
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
 * Allows scenarios with the same archetype to appear in the same shift.
 */
export function selectSessionScenarios(count: number = 5, dataset: string = 'original'): HydratedCallSession[] {
  const allScenarios = loadAllScenarios(dataset);
  if (allScenarios.length === 0) {
    return [];
  }

  // Shuffle scenarios
  const shuffled = [...allScenarios].sort(() => Math.random() - 0.5);

  // Select the first count scenarios from the shuffled list
  const selectedScenarios = shuffled.slice(0, count);

  // Hydrate each selected scenario for the session
  return selectedScenarios.map((s) => hydrateScenario(s));
}

/**
 * Selects session scenarios starting with a list of user-selected IDs,
 * and fills the remaining slots with randomized scenarios up to the target count.
 */
export function selectSessionScenariosWithSelection(
  selectedIds: string[],
  count: number = 5,
  dataset: string = 'original'
): HydratedCallSession[] {
  const allScenarios = loadAllScenarios(dataset);
  if (allScenarios.length === 0) {
    return [];
  }

  const selectedScenarios: Scenario[] = [];
  selectedIds.slice(0, count).forEach((id) => {
    const found = allScenarios.find((s) => s.id === id);
    if (found) {
      selectedScenarios.push(found);
    }
  });

  if (selectedScenarios.length < count) {
    const selectedSet = new Set(selectedScenarios.map((s) => s.id));
    const remaining = allScenarios.filter((s) => !selectedSet.has(s.id));
    const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5);
    selectedScenarios.push(...shuffledRemaining.slice(0, count - selectedScenarios.length));
  }

  return selectedScenarios.map((s) => hydrateScenario(s));
}
