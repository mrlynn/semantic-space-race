import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import pusher from '@/lib/pusher';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request) {
  try {
    const body = await request.json();
    const { gameCode, playerId, gemId } = body;
    
    console.log('💎 [HIT-GEM API] Request received:', { gameCode, playerId, gemId, bodyKeys: Object.keys(body) });

    if (!gameCode || !playerId || !gemId) {
      console.error('💎 [HIT-GEM API] Missing required params:', { gameCode: !!gameCode, playerId: !!playerId, gemId: !!gemId });
      return NextResponse.json(
        { success: false, error: 'gameCode, playerId, and gemId are required' },
        { status: 400 }
      );
    }

    const game = await getGame(gameCode);
    if (!game) {
      console.error('💎 [HIT-GEM API] Game not found:', gameCode);
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }
    
    console.log('💎 [HIT-GEM API] Game found. Active gems:', game.vectorGems?.length || 0);
    if (game.vectorGems && game.vectorGems.length > 0) {
      console.log('💎 [HIT-GEM API] Available gem IDs:', game.vectorGems.map(g => g.id));
    }

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

    // Check if player is out of tokens (can't shoot if out)
    if (game.isPlayerOut(playerId)) {
      return NextResponse.json(
        { success: false, error: 'You are out of tokens for this round' },
        { status: 400 }
      );
    }

    // Get player before hit to check initial tokens
    const playerBefore = game.getPlayer(playerId);
    const tokensBefore = playerBefore ? (playerBefore.tokens || 15) : 15;

    // Try to hit the gem
    const hitResult = game.hitVectorGem(gemId, playerId);
    if (!hitResult.success) {
      console.error(`💎 [HIT-GEM] Failed to hit gem ${gemId}:`, hitResult.error);
      return NextResponse.json(
        { success: false, error: hitResult.error },
        { status: 400 }
      );
    }

    // Get player from hitResult which has the updated tokens
    const tokensAfter = hitResult.tokens;
    console.log(`💎 [HIT-GEM] hitResult.tokens: ${tokensAfter}, hitResult.reward: ${hitResult.reward}`);
    
    // Save game state
    console.log(`💎 [HIT-GEM] Saving game state after gem hit...`);
    await game.save();
    console.log(`💎 [HIT-GEM] Game state saved`);

    // Get updated player - fetch fresh from the Map after save to verify
    const updatedPlayer = game.getPlayer(playerId);
    if (!updatedPlayer) {
      console.error(`💎 [HIT-GEM] ERROR: Player ${playerId} not found after save!`);
      return NextResponse.json(
        { success: false, error: 'Player not found after update' },
        { status: 500 }
      );
    }
    
    // Use the tokens from hitResult (which is the source of truth) or fall back to updatedPlayer
    const finalTokens = tokensAfter !== undefined && tokensAfter !== null 
      ? tokensAfter 
      : (updatedPlayer.tokens !== undefined && updatedPlayer.tokens !== null 
          ? updatedPlayer.tokens 
          : 15);
    
    console.log(`💎 [HIT-GEM] Gem ${gemId} hit by ${player.nickname}: tokens ${tokensBefore} -> ${finalTokens} (+${hitResult.reward})`);
    console.log(`💎 [HIT-GEM] hitResult.tokens: ${hitResult.tokens}, updatedPlayer.tokens: ${updatedPlayer.tokens}, finalTokens: ${finalTokens}`);
    console.log(`💎 [HIT-GEM] Updated player object:`, {
      id: updatedPlayer.id,
      nickname: updatedPlayer.nickname,
      tokens: updatedPlayer.tokens,
      tokensOut: updatedPlayer.tokensOut,
    });

    // Emit gem hit event
    await pusher.trigger(`game-${game.gameCode}`, 'vector-gem:hit', {
      gemId,
      playerId,
      nickname: player.nickname,
      reward: hitResult.reward,
    });

    // Emit token update event - use finalTokens to ensure correct value
    await pusher.trigger(`game-${game.gameCode}`, 'player:tokens-updated', {
      playerId,
      tokens: finalTokens,
      tokensOut: updatedPlayer.tokensOut,
    });
    console.log(`💎 [HIT-GEM] Emitted player:tokens-updated event with tokens: ${finalTokens}`);

    // If player was out and is now back in, emit player:back-in event
    if (player.tokensOut && !updatedPlayer.tokensOut) {
      await pusher.trigger(`game-${game.gameCode}`, 'player:back-in', {
        playerId,
        nickname: player.nickname,
      });
    }

    console.log(`💎 Vector Gem ${gemId} hit by ${player.nickname} in game ${gameCode}: +${hitResult.reward} tokens (${tokensBefore} -> ${tokensAfter})`);

    return NextResponse.json({
      success: true,
      reward: hitResult.reward,
      tokens: finalTokens, // Use finalTokens from hitResult
      tokensOut: updatedPlayer.tokensOut,
      tokensBefore: tokensBefore, // For debugging
    });
  } catch (error) {
    console.error('Error hitting vector gem:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to hit vector gem' },
      { status: 500 }
    );
  }
}
