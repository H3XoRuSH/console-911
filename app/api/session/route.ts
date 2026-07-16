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
    const previewMode =
      process.env.PREVIEW_MODE === 'Y' || process.env.NEXT_PUBLIC_PREVIEW_MODE === 'Y';

    if (listAll && previewMode) {
      const allScenarios = loadAllScenarios().map((s) => ({
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
        ? selectSessionScenariosWithSelection(selectedIdsParam.split(',').filter(Boolean), 5)
        : selectSessionScenarios(5);

    return NextResponse.json({ calls: sessionCalls, previewMode });
  } catch (error: unknown) {
    console.error('Session GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize game session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
