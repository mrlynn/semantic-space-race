import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import { startNewRound } from '@/lib/gameLogic';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to manually advance to the next round
 * This is a fallback for when server-side setTimeout fails in serverless environments
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { gameCode, playerId } = body;

    if (!gameCode || !playerId) {
      return NextResponse.json(
        { success: false, error: 'gameCode and playerId are required' },
        { status: 400 }
      );
    }

    const game = await getGame(gameCode);
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    if (!game.gameActive) {
      return NextResponse.json(
        { success: false, error: 'Game is not active' },
        { status: 400 }
      );
    }

    // Only allow advancing if we're in END phase or WAITING_FOR_READY phase
    if (game.roundPhase !== 'END' && game.roundPhase !== 'WAITING_FOR_READY') {
      return NextResponse.json(
        { success: false, error: `Cannot advance round from phase: ${game.roundPhase}` },
        { status: 400 }
      );
    }

    // Check if we've completed all rounds
    if (game.roundNumber >= game.maxRounds) {
      // End game
      game.gameActive = false;
      await game.save();
      return NextResponse.json({
        success: true,
        gameEnded: true,
        message: 'Game complete - all rounds finished',
      });
    }

    // Start next round
    console.log('🟢 [ADVANCE ROUND] Starting next round:', game.roundNumber + 1);
    await startNewRound(game);
    await game.save();

    return NextResponse.json({
      success: true,
      roundNumber: game.roundNumber,
      message: 'Next round started',
    });
  } catch (error) {
    console.error('🔴 [ADVANCE ROUND] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to advance round' },
      { status: 500 }
    );
  }
}


