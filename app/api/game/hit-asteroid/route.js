import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import pusher from '@/lib/pusher';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const body = await request.json();
    const { gameCode, playerId, asteroidId } = body;
    
    console.log('☄️ [HIT-ASTEROID API] Request received:', { gameCode, playerId, asteroidId });

    if (!gameCode || !playerId || !asteroidId) {
      console.error('☄️ [HIT-ASTEROID API] Missing required params:', { gameCode: !!gameCode, playerId: !!playerId, asteroidId: !!asteroidId });
      return NextResponse.json(
        { success: false, error: 'gameCode, playerId, and asteroidId are required' },
        { status: 400 }
      );
    }

    const game = await getGame(gameCode);
    if (!game) {
      console.error('☄️ [HIT-ASTEROID API] Game not found:', gameCode);
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }
    
    console.log('☄️ [HIT-ASTEROID API] Game found. Active asteroids:', game.badAsteroids?.length || 0);

    // Check if game is active and in search phase
    if (!game.gameActive) {
      return NextResponse.json(
        { success: false, error: 'Game is not active' },
        { status: 400 }
      );
    }

    if (game.roundPhase !== 'SEARCH') {
      return NextResponse.json(
        { success: false, error: `Game is not in search phase (current phase: ${game.roundPhase})` },
        { status: 400 }
      );
    }

    const player = game.getPlayer(playerId);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    // Get player before hit to check initial tokens
    const playerBefore = game.getPlayer(playerId);
    const tokensBefore = playerBefore ? (playerBefore.tokens || 15) : 15;

    // Hit the bad asteroid (deducts tokens)
    const hitResult = game.hitBadAsteroid(asteroidId, playerId);
    
    if (!hitResult.success) {
      console.error('☄️ [HIT-ASTEROID API] Failed to hit asteroid:', hitResult.error);
      return NextResponse.json(
        { success: false, error: hitResult.error },
        { status: 400 }
      );
    }

    // Save game state
    await game.save();

    // Get updated player to verify
    const updatedPlayer = game.getPlayer(playerId);
    const finalTokens = updatedPlayer ? (updatedPlayer.tokens !== undefined ? updatedPlayer.tokens : tokensBefore - hitResult.cost) : tokensBefore - hitResult.cost;

    // Emit asteroid hit event
    await pusher.trigger(`game-${game.gameCode}`, 'bad-asteroid:hit', {
      asteroidId,
      playerId,
      nickname: player.nickname,
      cost: hitResult.cost,
    });

    // Emit token update event
    await pusher.trigger(`game-${game.gameCode}`, 'player:tokens-updated', {
      playerId,
      tokens: finalTokens,
      tokensOut: updatedPlayer.tokensOut,
    });
    console.log(`☄️ [HIT-ASTEROID] Emitted player:tokens-updated event with tokens: ${finalTokens}`);

    // If player is now out, emit player:out event
    if (updatedPlayer.tokensOut && !playerBefore.tokensOut) {
      await pusher.trigger(`game-${game.gameCode}`, 'player:out', {
        playerId,
        nickname: player.nickname,
      });
    }

    console.log(`☄️ Bad Asteroid ${asteroidId} hit by ${player.nickname} in game ${gameCode}: -${hitResult.cost} tokens (${tokensBefore} -> ${finalTokens})`);

    return NextResponse.json({
      success: true,
      cost: hitResult.cost,
      tokens: finalTokens,
      tokensOut: updatedPlayer.tokensOut,
      tokensBefore: tokensBefore,
    });
  } catch (error) {
    console.error('Error hitting bad asteroid:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to hit bad asteroid' },
      { status: 500 }
    );
  }
}

