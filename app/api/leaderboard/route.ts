import { NextResponse } from 'next/server';
import { getLeaderboard, submitScore } from '@/lib/redis';

export async function GET() {
  try {
    const data = await getLeaderboard();
    return NextResponse.json({ leaderboard: data });
  } catch (error: unknown) {
    console.error('Leaderboard GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load leaderboard.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, score } = await req.json();

    if (!name || score === undefined) {
      return NextResponse.json({ error: 'Missing name or score parameters.' }, { status: 400 });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore)) {
      return NextResponse.json({ error: 'Score must be a number.' }, { status: 400 });
    }

    // Submit score
    await submitScore(name, numericScore);

    // Fetch updated leaderboard
    const updatedLeaderboard = await getLeaderboard();

    return NextResponse.json({
      success: true,
      leaderboard: updatedLeaderboard
    });
  } catch (error: unknown) {
    console.error('Leaderboard POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit score.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
