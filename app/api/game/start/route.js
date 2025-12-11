import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import connectDB from '@/lib/mongodb';
import WordNode from '@/models/WordNode';
import { startNewRound } from '@/lib/gameLogic';
import pusher from '@/lib/pusher';

export async function POST(request) {
  try {
    const body = await request.json();
    const { gameCode, playerId } = body;

    console.log('Start game request:', { gameCode, playerId });

    if (!gameCode || !playerId) {
      return NextResponse.json(
        { success: false, error: 'gameCode and playerId are required' },
        { status: 400 }
      );
    }

    const game = await getGame(gameCode);
    if (!game) {
      console.error('Game not found:', gameCode);
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if player is the host
    if (game.hostId !== playerId) {
      return NextResponse.json(
        { success: false, error: 'Only the host can start the game' },
        { status: 403 }
      );
    }

    // Allow restart if game ended or is in a bad state
    if (game.gameActive && game.roundPhase !== 'END' && game.roundPhase !== 'TUTORIAL') {
      return NextResponse.json(
        { success: false, error: 'Game is already active' },
        { status: 400 }
      );
    }

    // Reset game state if it was previously active but ended
    if (game.gameActive && (game.roundPhase === 'END' || game.isGameComplete())) {
      console.log('Resetting game state for restart...');
      game.gameActive = false;
      game.roundNumber = 0;
      game.roundPhase = 'TUTORIAL';
      game.roundWinner = null;
      game.roundWinnerNickname = null;
      game.currentTarget = null;
      game.currentDefinition = '';
      await game.save();
    }
    
    // Always reset player scores and ready status when starting a new game
    // This ensures scores start at 0 for every new game and players are not stuck in ready state
    game.getAllPlayers().forEach(player => {
      player.score = 0;
      player.ready = false; // Reset ready status for new game
      // Update the player in the map to ensure changes persist
      game.players.set(player.id, player);
    });

    // Load words filtered by topic if not already loaded
    if (game.wordNodes.length === 0) {
      console.log(`Loading words from database for topic: ${game.topic || 'general-database'}...`);
      await connectDB();
      const filter = { topic: game.topic || 'general-database' };
      const words = await WordNode.find(filter).select('_id label position embedding topic').lean();
      console.log(`Loaded ${words.length} words for topic: ${game.topic || 'general-database'}`);
      game.wordNodes = words.map(word => ({
        id: word._id.toString(),
        label: word.label,
        position: word.position,
        embedding: word.embedding,
      }));
    }

    if (game.wordNodes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No words found in database. Please seed the database first.' },
        { status: 400 }
      );
    }

    // Start the game
    console.log('Starting game...');
    game.gameActive = true;
    await game.save(); // Save before starting round
    
    // Emit game:start event to notify all players the game is starting
    // This ensures all players transition from lobby to game view
    await pusher.trigger(`game-${game.gameCode}`, 'game:start', {
      gameActive: true,
      roundNumber: 0, // Will be updated by startNewRound
      players: game.getAllPlayers().map(p => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score || 0,
        ready: false, // Reset ready status
      })),
    });
    
    await startNewRound(game);
    await game.save(); // Save after starting round
    console.log('Game started successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start game' },
      { status: 500 }
    );
  }
}


