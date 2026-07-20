import { NextResponse } from 'next/server';
import {
  selectSessionScenarios,
  selectSessionScenariosWithSelection,
  loadAllScenarios
} from '@/lib/scenarios';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listAll = searchParams.get('list') === 'all';
    const dataset = searchParams.get('dataset') || 'original';
    const previewMode =
      process.env.PREVIEW_MODE === 'Y' || process.env.NEXT_PUBLIC_PREVIEW_MODE === 'Y';

    if (listAll && previewMode) {
      const allScenarios = loadAllScenarios(dataset).map((s) => ({
        id: s.id,
        title:
          s.title ||
          (s as unknown as { scenario_title?: string }).scenario_title ||
          'Unknown Incident',
        archetype: s.archetype
      }));
      return NextResponse.json({ scenarios: allScenarios });
    }

    const selectedIdsParam = searchParams.get('scenarios');
    const sessionCalls =
      selectedIdsParam && previewMode
        ? selectSessionScenariosWithSelection(selectedIdsParam.split(',').filter(Boolean), 5, dataset)
        : selectSessionScenarios(5, dataset);

    // Sanitize scenarios before sending them to the client to avoid leaking the scoring details
    const sanitizedCalls = sessionCalls.map((call) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { states, intents, dispatchOutcomes, title, archetype, ...sanitized } = call;
      return sanitized;
    });

    return NextResponse.json({ calls: sanitizedCalls, previewMode });
  } catch (error: unknown) {
    console.error('Session GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize game session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
