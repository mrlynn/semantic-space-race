import { NextResponse } from 'next/server';
import { getAllGames } from '@/lib/gameStateDB';

export async function GET() {
  const games = await getAllGames();
  return NextResponse.json({
    totalGames: games.length,
    games: games.map(game => ({
      gameCode: game.gameCode,
      gameActive: game.gameActive,
      roundNumber: game.roundNumber,
      playerCount: game.getAllPlayers().length,
      wordCount: game.wordNodes.length,
    })),
  });
}

