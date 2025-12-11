import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';

/**
 * Reset a game to initial state
 * Useful for debugging or restarting a game
 */
export async function POST(request) {
  try {
    const { gameCode, playerId } = await request.json();

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

    // Check if player is the host
    if (game.hostId !== playerId) {
      return NextResponse.json(
        { success: false, error: 'Only the host can reset the game' },
        { status: 403 }
      );
    }

    // Reset game state
    game.gameActive = false;
    game.roundNumber = 0;
    game.roundPhase = 'TUTORIAL';
    game.roundWinner = null;
    game.roundWinnerNickname = null;
    game.currentTarget = null;
    game.currentDefinition = '';
    game.phaseEndsAt = null;

    // Reset player scores
    game.getAllPlayers().forEach(player => {
      player.score = 0;
    });

    await game.save();

    return NextResponse.json({ success: true, message: 'Game reset successfully' });
  } catch (error) {
    console.error('Error resetting game:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset game' },
      { status: 500 }
    );
  }
}

