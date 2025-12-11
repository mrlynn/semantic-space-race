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

    if (!game.gameActive || game.roundPhase !== 'SEARCH') {
      return NextResponse.json(
        { success: false, error: 'Game is not in search phase' },
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

    // Check if player already used hint this round
    if (player.hintUsed) {
      return NextResponse.json(
        { success: false, error: 'Hint already used this round' },
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

    return NextResponse.json({
      success: true,
      hint: hintText,
      penalty: hintPenalty,
      newScore: game.getPlayer(playerId).score,
    });
  } catch (error) {
    console.error('Error getting hint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get hint' },
      { status: 500 }
    );
  }
}

