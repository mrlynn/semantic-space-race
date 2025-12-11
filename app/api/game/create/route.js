import { NextResponse } from 'next/server';
import { createGame, getGame } from '@/lib/gameStateDB';
import { generateGameCode } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import pusher from '@/lib/pusher';

export async function POST(request) {
  try {
    const { nickname, topic = 'general-database' } = await request.json();

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
    const game = await createGame(gameCode, hostId, topic);

    // Add host as first player
    game.addPlayer({
      id: hostId,
      nickname,
      ready: false,
      score: 0,
    });

    // Save to database
    await game.save();

    // Get all players
    const allPlayers = game.getAllPlayers().map(p => ({
      id: p.id,
      nickname: p.nickname,
      ready: p.ready || false,
      score: p.score || 0,
    }));

    console.log(`🔵 [DEBUG] Game created: ${gameCode} by ${nickname} (${hostId}). Players: ${allPlayers.length}`);

    // Broadcast initial lobby state
    try {
      await pusher.trigger(`game-${gameCode}`, 'lobby:state', {
        players: allPlayers,
        gameActive: game.gameActive,
        roundNumber: game.roundNumber,
        maxRounds: game.maxRounds,
        gameCode: game.gameCode,
        topic: game.topic,
      });
      console.log(`🟢 [DEBUG] Broadcasted initial lobby:state event for game ${gameCode}`);
    } catch (pusherError) {
      console.error('🔴 [DEBUG] Failed to broadcast initial lobby:state event:', pusherError);
    }

    return NextResponse.json({
      success: true,
      gameCode,
      playerId: hostId,
      topic: game.topic,
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

