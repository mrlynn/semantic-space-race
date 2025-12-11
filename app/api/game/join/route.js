import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { gameCode, nickname } = await request.json();

    if (!gameCode || !nickname) {
      return NextResponse.json(
        { success: false, error: 'gameCode and nickname are required' },
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

    if (game.gameActive) {
      return NextResponse.json(
        { success: false, error: 'Game is already in progress' },
        { status: 400 }
      );
    }

    const playerId = uuidv4();
    game.addPlayer({
      id: playerId,
      nickname,
      ready: false,
      score: 0,
    });

    await game.save();

    return NextResponse.json({
      success: true,
      playerId,
      gameCode,
    });
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join game' },
      { status: 500 }
    );
  }
}

