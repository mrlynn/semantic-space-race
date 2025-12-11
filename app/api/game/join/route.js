import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import { v4 as uuidv4 } from 'uuid';
import pusher from '@/lib/pusher';

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

    // Allow joining even if game is active - players can join mid-game
    const playerId = uuidv4();
    game.addPlayer({
      id: playerId,
      nickname,
      ready: false,
      score: 0,
    });

    await game.save();

    // Get all players for response
    const allPlayers = game.getAllPlayers().map(p => ({
      id: p.id,
      nickname: p.nickname,
      ready: p.ready || false,
      score: p.score || 0,
    }));

    console.log(`🔵 [DEBUG] Player joined: ${nickname} (${playerId}) to game ${gameCode}. Total players: ${allPlayers.length}, Game active: ${game.gameActive}`);

    // Prepare response with current game state for joining player
    const responseData = {
      success: true,
      playerId,
      gameCode,
      players: allPlayers,
      gameActive: game.gameActive,
      roundNumber: game.roundNumber,
      maxRounds: game.maxRounds,
      topic: game.topic || 'general-database',
    };

    // If game is active, include current round information
    if (game.gameActive && game.currentTarget) {
      responseData.roundPhase = game.roundPhase;
      responseData.definition = game.currentDefinition;
      responseData.target = {
        id: game.currentTarget.id,
        label: game.currentTarget.label,
        position: game.currentTarget.position,
        // embedding is NOT included - too large
      };
      responseData.phaseEndsAt = game.phaseEndsAt;
      responseData.roundDuration = game.roundDuration;
    }

    // Broadcast lobby state update to all clients
    try {
      await pusher.trigger(`game-${gameCode}`, 'lobby:state', {
        players: allPlayers,
        gameActive: game.gameActive,
        roundNumber: game.roundNumber,
        maxRounds: game.maxRounds,
        gameCode: game.gameCode,
        topic: game.topic || 'general-database',
      });
      console.log(`🟢 [DEBUG] Broadcasted lobby:state event for game ${gameCode} with ${allPlayers.length} players`);
    } catch (pusherError) {
      console.error('🔴 [DEBUG] Failed to broadcast lobby:state event:', pusherError);
      // Continue anyway - the API response will still have the players
    }

    // If game is active, also send a round:start-like event to sync the joining player
    if (game.gameActive && game.currentTarget) {
      try {
        await pusher.trigger(`game-${gameCode}`, 'player:joined-active-game', {
          playerId,
          nickname,
          roundNumber: game.roundNumber,
          maxRounds: game.maxRounds,
          target: {
            id: game.currentTarget.id,
            label: game.currentTarget.label,
            position: game.currentTarget.position,
          },
          definition: game.currentDefinition,
          phase: game.roundPhase,
          phaseEndsAt: game.phaseEndsAt,
          roundDuration: game.roundDuration,
          players: allPlayers,
        });
        console.log(`🟢 [DEBUG] Broadcasted player:joined-active-game event for ${nickname}`);
      } catch (pusherError) {
        console.error('🔴 [DEBUG] Failed to broadcast player:joined-active-game event:', pusherError);
      }
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join game' },
      { status: 500 }
    );
  }
}

