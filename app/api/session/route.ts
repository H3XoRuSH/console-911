import { NextResponse } from 'next/server';
import { selectSessionScenarios } from '@/lib/scenarios';

export async function GET() {
  try {
    const sessionCalls = selectSessionScenarios(5);
    return NextResponse.json({ calls: sessionCalls });
  } catch (error: unknown) {
    console.error('Session GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize game session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
