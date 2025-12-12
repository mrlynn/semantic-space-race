import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import pusher from '@/lib/pusher';

export const maxDuration = 30;

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

    const player = game.getPlayer(playerId);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    // Remove player from game
    game.removePlayer(playerId);
    await game.save();

    // Emit player left event
    await pusher.trigger(`game-${gameCode}`, 'player:left', {
      playerId,
      nickname: player.nickname,
    });

    console.log(`👋 Player ${player.nickname} (${playerId}) left game ${gameCode}`);

    return NextResponse.json({
      success: true,
      message: 'Left game successfully',
    });
  } catch (error) {
    console.error('Error leaving game:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave game' },
      { status: 500 }
    );
  }
}

