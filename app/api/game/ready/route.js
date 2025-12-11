import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import pusher from '@/lib/pusher';
import { startNewRound } from '@/lib/gameLogic';

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

    // Get player and mark as ready
    const player = game.getPlayer(playerId);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    player.ready = true;
    game.players.set(playerId, player);
    await game.save();

    // Get all players for response
    const allPlayers = game.getAllPlayers().map(p => ({
      id: p.id,
      nickname: p.nickname,
      ready: p.ready || false,
      score: p.score || 0,
    }));

    console.log(`🔵 [DEBUG] Player ${player.nickname} marked ready. Ready: ${allPlayers.filter(p => p.ready).length}/${allPlayers.length}`);

    // Check if all players are ready
    const allReady = allPlayers.every(p => p.ready);
    
    // Broadcast player ready status
    await pusher.trigger(`game-${gameCode}`, 'player:ready', {
      playerId,
      nickname: player.nickname,
      allReady,
      players: allPlayers,
    });

    // If all players are ready and we're in WAITING_FOR_READY phase, start next round
    if (allReady && game.roundPhase === 'WAITING_FOR_READY') {
      console.log('🟢 [DEBUG] All players ready, starting next round...');
      
      // Reset all players' ready status for next round
      game.getAllPlayers().forEach(p => {
        p.ready = false;
        game.players.set(p.id, p);
      });
      
      // Check if we've completed all rounds
      if (game.roundNumber >= game.maxRounds) {
        // End game
        game.gameActive = false;
        await game.save();
        await pusher.trigger(`game-${game.gameCode}`, 'game:end', {
          finalScores: game.getAllPlayers().map(p => ({
            id: p.id,
            nickname: p.nickname,
            score: p.score || 0,
          })).sort((a, b) => (b.score || 0) - (a.score || 0)),
        });
      } else {
        // Start next round
        await startNewRound(game);
        await game.save();
      }
    }

    return NextResponse.json({
      success: true,
      allReady,
      players: allPlayers,
    });
  } catch (error) {
    console.error('Error marking player ready:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark player ready' },
      { status: 500 }
    );
  }
}
