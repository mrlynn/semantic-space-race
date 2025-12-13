import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PlayerStats from '@/models/PlayerStats';

/**
 * GET /api/leaderboard
 * Fetch historical/all-time leaderboard
 * Query params:
 *   - limit: number of players to return (default: 50)
 *   - sortBy: 'totalScore' | 'averageScore' | 'gamesWon' (default: 'totalScore')
 */
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'totalScore';
    
    // Validate sortBy
    const validSortFields = ['totalScore', 'averageScore', 'gamesWon', 'bestScore'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'totalScore';
    
    // Fetch leaderboard sorted by specified field
    // Show players who have earned any points (not just completed games)
    // This allows players from active games to appear in the leaderboard
    const leaderboard = await PlayerStats.find({ totalScore: { $gt: 0 } })
      .sort({ [sortField]: -1 })
      .limit(limit)
      .select('nickname totalGames totalScore gamesWon averageScore bestScore lastPlayed')
      .lean();
    
    return NextResponse.json({
      success: true,
      leaderboard: leaderboard.map((player, index) => ({
        rank: index + 1,
        nickname: player.nickname,
        totalGames: player.totalGames,
        totalScore: player.totalScore,
        gamesWon: player.gamesWon,
        averageScore: Math.round(player.averageScore * 100) / 100, // Round to 2 decimals
        bestScore: player.bestScore,
        lastPlayed: player.lastPlayed,
      })),
      sortBy: sortField,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}


