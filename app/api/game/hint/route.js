import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import { generateHint } from '@/lib/openai';

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

    // Handle phase transition timing issue: if we're in TARGET_REVEAL but the time has passed,
    // automatically transition to SEARCH phase (this handles cases where client-side transition
    // happened before server-side setTimeout fired)
    if (game.roundPhase === 'TARGET_REVEAL' && game.phaseEndsAt && Date.now() >= game.phaseEndsAt) {
      console.log('🔵 [HINT] Auto-transitioning from TARGET_REVEAL to SEARCH (phaseEndsAt passed)');
      game.startSearchPhase();
      await game.save();
    }

    if (!game.gameActive || game.roundPhase !== 'SEARCH') {
      return NextResponse.json(
        { success: false, error: `Game is not in search phase (current phase: ${game.roundPhase})` },
        { status: 400 }
      );
    }

    if (!game.currentTarget || !game.currentTarget.label) {
      return NextResponse.json(
        { success: false, error: 'Target word not found' },
        { status: 400 }
      );
    }

    if (!game.currentDefinition) {
      return NextResponse.json(
        { success: false, error: 'Original definition not found' },
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

    // Check if player is out of tokens
    if (game.isPlayerOut(playerId)) {
      return NextResponse.json(
        { success: false, error: 'You are out of tokens for this round' },
        { status: 400 }
      );
    }

    // Check if player already used hint this round
    if (player.hintUsed) {
      return NextResponse.json(
        { success: false, error: 'Hint already used this round' },
        { status: 400 }
      );
    }

    // Deduct tokens for getting a hint (5 tokens)
    const tokenDeduction = game.deductTokens(playerId, 5);
    if (!tokenDeduction.success) {
      return NextResponse.json(
        { success: false, error: tokenDeduction.error, tokens: tokenDeduction.tokens },
        { status: 400 }
      );
    }

    console.log('🔵 [DEBUG] Hint API called, target:', game.currentTarget?.label);

    // Generate an AI-powered hint (additional clue)
    let hintText = '';
    try {
      hintText = await generateHint(game.currentTarget.label, game.currentDefinition);
      console.log(`🟢 [DEBUG] Hint generated: "${hintText}"`);
    } catch (hintError) {
      console.error('🔴 [DEBUG] Failed to generate hint:', hintError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate hint. Please try again.' },
        { status: 500 }
      );
    }

    // Deduct points for using hint (3 points)
    const hintPenalty = 3;
    game.updatePlayerScore(playerId, -hintPenalty);
    
    // Mark hint as used for this round
    player.hintUsed = true;
    game.players.set(playerId, player);
    
    await game.save();

    // Emit token update event
    const updatedPlayer = game.getPlayer(playerId);
    await pusher.trigger(`game-${game.gameCode}`, 'player:tokens-updated', {
      playerId,
      tokens: updatedPlayer.tokens,
      tokensOut: updatedPlayer.tokensOut,
    });

    // If player ran out of tokens, emit player:out event
    if (tokenDeduction.tokensOut) {
      await pusher.trigger(`game-${game.gameCode}`, 'player:out', {
        playerId,
        nickname: player.nickname,
      });
    }

    return NextResponse.json({
      success: true,
      hint: hintText,
      penalty: hintPenalty,
      newScore: updatedPlayer.score,
      tokens: updatedPlayer.tokens,
      tokensOut: updatedPlayer.tokensOut,
    });
  } catch (error) {
    console.error('Error getting hint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get hint' },
      { status: 500 }
    );
  }
}

