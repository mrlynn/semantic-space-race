import { NextResponse } from 'next/server';
import { createGame, getGame } from '@/lib/gameStateDB';
import { generateGameCode } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { nickname } = await request.json();

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json(
        { success: false, error: 'nickname is required' },
        { status: 400 }
      );
    }

    // Generate unique game code
    let gameCode;
    let attempts = 0;
    do {
      gameCode = generateGameCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate unique game code' },
          { status: 500 }
        );
      }
    } while (await getGame(gameCode)); // Check if code already exists

    const hostId = uuidv4();
    const game = await createGame(gameCode, hostId);

    // Add host as first player
    game.addPlayer({
      id: hostId,
      nickname,
      ready: false,
      score: 0,
    });

    // Save to database
    await game.save();

    return NextResponse.json({
      success: true,
      gameCode,
      playerId: hostId,
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

