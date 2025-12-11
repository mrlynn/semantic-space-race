import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import connectDB from '@/lib/mongodb';
import PlayerStats from '@/models/PlayerStats';

/**
 * POST /api/game/update-stats
 * Manually update player stats for a completed game
 * This is a fallback endpoint in case the automatic update fails
 */
export async function POST(request) {
  try {
    const { gameCode } = await request.json();
    
    if (!gameCode) {
      return NextResponse.json(
        { success: false, error: 'gameCode is required' },
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

    // Only update stats if game is complete or inactive
    if (game.gameActive && game.roundNumber < game.maxRounds) {
      return NextResponse.json(
        { success: false, error: 'Game is still in progress' },
        { status: 400 }
      );
    }

    await connectDB();
    const players = game.getAllPlayers();
    const finalScores = players.map(p => ({
      nickname: p.nickname,
      score: p.score || 0,
    })).sort((a, b) => b.score - a.score);
    
    const winner = finalScores[0]; // Highest score
    
    // Update stats for each player
    for (const player of players) {
      const playerScore = player.score || 0;
      const isWinner = player.nickname === winner.nickname && winner.score > 0;
      
      // Find or create player stats
      let stats = await PlayerStats.findOne({ nickname: player.nickname });
      
      if (!stats) {
        stats = new PlayerStats({
          nickname: player.nickname,
          totalGames: 0,
          totalScore: 0,
          gamesWon: 0,
          averageScore: 0,
          bestScore: 0,
        });
      }
      
      // Update stats
      stats.totalGames += 1;
      stats.totalScore += playerScore;
      stats.bestScore = Math.max(stats.bestScore, playerScore);
      stats.averageScore = stats.totalScore / stats.totalGames;
      if (isWinner) {
        stats.gamesWon += 1;
      }
      stats.lastPlayed = new Date();
      
      await stats.save();
    }
    
    console.log(`✅ Manually updated player stats for ${players.length} players`);
    
    return NextResponse.json({
      success: true,
      message: `Updated stats for ${players.length} players`,
    });
  } catch (error) {
    console.error('❌ Error updating player stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update player stats' },
      { status: 500 }
    );
  }
}
