import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import { cosineSimilarity } from '@/lib/utils';
import pusher from '@/lib/pusher';
import { endRound, startNewRound } from '@/lib/gameLogic';
import connectDB from '@/lib/mongodb';
import WordNode from '@/models/WordNode';
import { generateEmbedding } from '@/lib/openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Vercel function timeout (max 60s for Pro, 10s for Hobby)

export async function POST(request) {
  // #region agent log
  const logData = { location: 'guess/route.js:10', message: 'POST /api/game/guess called', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' };
  console.log('🔵 [GUESS API] POST /api/game/guess called');
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('🔴 [GUESS API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const { gameCode, playerId, guess } = body;
    logData.data = { gameCode, playerId, guess, hasGameCode: !!gameCode, hasPlayerId: !!playerId, hasGuess: !!guess };
    console.log('🔵 [GUESS API] Request body:', { gameCode, playerId, guess: guess?.substring(0, 20) });
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }).catch(() => {});

    if (!gameCode || !playerId || !guess) {
      console.error('🔴 [GUESS API] Missing required parameters:', { gameCode: !!gameCode, playerId: !!playerId, guess: !!guess });
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'guess/route.js:15', message: 'Missing required parameters', data: { gameCode: !!gameCode, playerId: !!playerId, guess: !!guess }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => {});
      return NextResponse.json(
        { success: false, error: 'gameCode, playerId, and guess are required' },
        { status: 400 }
      );
    }

    console.log('🔵 [GUESS API] Getting game from database:', gameCode);
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'guess/route.js:21', message: 'Getting game from database', data: { gameCode }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => {});
    const game = await getGame(gameCode);
    if (!game) {
      console.error('🔴 [GUESS API] Game not found:', gameCode);
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'guess/route.js:23', message: 'Game not found', data: { gameCode }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => {});
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }
    console.log('🟢 [GUESS API] Game found, processing guess:', guess);

    // Check if game is active and in search phase
    // If in TARGET_REVEAL but enough time has passed, auto-transition to SEARCH
    if (!game.gameActive) {
      return NextResponse.json(
        { success: false, error: 'Game is not active' },
        { status: 400 }
      );
    }
    
    if (game.roundPhase === 'TARGET_REVEAL') {
      // Check if target reveal duration has passed
      const targetRevealDuration = game.targetRevealDuration || 3000; // Default 3 seconds
      let shouldTransition = false;
      
      if (game.phaseEndsAt) {
        // phaseEndsAt is when TARGET_REVEAL phase should end
        // If current time is past phaseEndsAt, transition to SEARCH
        shouldTransition = Date.now() >= game.phaseEndsAt;
        console.log('🔵 [GUESS API] Checking phase transition:', {
          phaseEndsAt: game.phaseEndsAt,
          now: Date.now(),
          timeRemaining: game.phaseEndsAt - Date.now(),
          shouldTransition
        });
      } else {
        // No phaseEndsAt set - check if round started recently
        // If round started more than targetRevealDuration ago, allow transition
        // We'll be lenient and allow it if we can't determine the exact time
        shouldTransition = true;
        console.log('🟡 [GUESS API] No phaseEndsAt set, allowing transition');
      }
      
      if (shouldTransition) {
        // Auto-transition to SEARCH phase
        console.log('🟡 [GUESS API] Auto-transitioning from TARGET_REVEAL to SEARCH (server-side timeout may have failed)');
        game.startSearchPhase();
        await game.save();
        // Emit phase change event
        await pusher.trigger(`game-${game.gameCode}`, 'round:phase-change', {
          phase: game.roundPhase,
          phaseEndsAt: game.phaseEndsAt,
          roundDuration: game.roundDuration,
        });
      } else {
        const timeRemaining = Math.ceil((game.phaseEndsAt - Date.now()) / 1000);
        return NextResponse.json(
          { success: false, error: `Game is still in target reveal phase (${timeRemaining}s remaining)` },
          { status: 400 }
        );
      }
    }
    
    if (game.roundPhase !== 'SEARCH') {
      return NextResponse.json(
        { success: false, error: `Game is not in search phase (current phase: ${game.roundPhase})` },
        { status: 400 }
      );
    }

    if (game.roundWinner) {
      return NextResponse.json(
        { success: false, error: 'Round already ended' },
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

    // Find the guessed word in the graph first
    let guessedWord = game.wordNodes.find(
      word => word.label.toLowerCase() === guess.toLowerCase()
    );
    let wordInGraph = !!guessedWord;

    // If not found in game.wordNodes, try to fetch from database
    if (!guessedWord) {
      console.log(`Word "${guess}" not found in game.wordNodes, checking database...`);
      await connectDB();
      const wordDoc = await WordNode.findOne({ 
        label: { $regex: new RegExp(`^${guess}$`, 'i') } 
      }).select('_id label position embedding').lean();
      
      if (wordDoc) {
        guessedWord = {
          id: wordDoc._id.toString(),
          label: wordDoc.label,
          position: wordDoc.position,
          embedding: wordDoc.embedding,
        };
        wordInGraph = true;
        console.log(`Found "${guess}" in database, using it for similarity calculation`);
      }
    }

    // If word not found in database, generate embedding for similarity calculation
    let guessEmbedding = null;
    if (!guessedWord) {
      console.log(`Word "${guess}" not found in database, generating embedding for similarity calculation...`);
      try {
        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
          console.error('🔴 [GUESS API] OPENAI_API_KEY not set in environment');
          return NextResponse.json({
            success: false,
            error: 'OpenAI API key not configured',
          }, { status: 500 });
        }
        guessEmbedding = await generateEmbedding(guess);
        console.log(`Generated embedding for "${guess}"`);
      } catch (error) {
        console.error(`🔴 [GUESS API] Error generating embedding for "${guess}":`, error);
        console.error(`🔴 [GUESS API] Error details:`, { message: error.message, stack: error.stack });
        return NextResponse.json({
          success: false,
          error: `Failed to generate embedding: ${error.message}`,
        }, { status: 500 });
      }
    } else {
      // Validate embeddings exist and are valid
      if (!guessedWord.embedding || !Array.isArray(guessedWord.embedding) || guessedWord.embedding.length === 0) {
        console.log(`Word "${guessedWord.label}" has no embedding, generating one...`);
        try {
          // Check if OpenAI API key is available
          if (!process.env.OPENAI_API_KEY) {
            console.error('🔴 [GUESS API] OPENAI_API_KEY not set in environment');
            return NextResponse.json({
              success: false,
              error: 'OpenAI API key not configured',
            }, { status: 500 });
          }
          guessEmbedding = await generateEmbedding(guessedWord.label);
          console.log(`Generated embedding for "${guessedWord.label}"`);
        } catch (error) {
          console.error(`🔴 [GUESS API] Error generating embedding for "${guessedWord.label}":`, error);
          console.error(`🔴 [GUESS API] Error details:`, { message: error.message, stack: error.stack });
          return NextResponse.json({
            success: false,
            error: `Failed to generate embedding: ${error.message}`,
          }, { status: 500 });
        }
      } else {
        guessEmbedding = guessedWord.embedding;
      }
    }

    if (!game.currentTarget || !game.currentTarget.embedding || !Array.isArray(game.currentTarget.embedding) || game.currentTarget.embedding.length === 0) {
      console.error('Current target has no valid embedding');
      return NextResponse.json({
        success: false,
        error: 'Target word has no embedding data',
      }, { status: 500 });
    }

    // Calculate similarity to target using embeddings
    let similarity = 0;
    try {
      similarity = cosineSimilarity(
        guessEmbedding,
        game.currentTarget.embedding
      );
      const guessLabel = guessedWord ? guessedWord.label : guess;
      console.log(`Similarity between "${guessLabel}" and "${game.currentTarget.label}": ${similarity.toFixed(4)}`);
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to calculate similarity',
      }, { status: 500 });
    }

    // Only mark as correct if word is in graph AND similarity is high enough
    const isCorrect = wordInGraph && (
      similarity >= 0.99 || 
      (guessedWord && guessedWord.label.toLowerCase() === game.currentTarget.label.toLowerCase())
    );

    if (isCorrect) {
      // Award points (10 points for correct text guess)
      game.updatePlayerScore(playerId, 10);
      game.roundWinner = playerId;
      game.roundWinnerNickname = player.nickname;
      
      // Save immediately to persist score
      await game.save();

      // Emit correct guess event with updated scores
      const updatedPlayer = game.getPlayer(playerId);
      await pusher.trigger(`game-${game.gameCode}`, 'player:correct-guess', {
        playerId,
        nickname: player.nickname,
        guess,
        target: game.currentTarget.label,
        score: updatedPlayer.score,
        players: game.getAllPlayers().map(p => ({
          id: p.id,
          nickname: p.nickname,
          score: p.score || 0,
        })),
      });

      // End the round (this will schedule the next round)
      await endRound(game, playerId, player.nickname);
    }

    const responseData = {
      success: true,
      correct: isCorrect,
      similarity,
      wordId: guessedWord?.id || null,
      label: guessedWord?.label || guess,
      position: guessedWord?.position || null,
      inGraph: wordInGraph, // Flag to indicate if word is in the graph
      message: wordInGraph 
        ? undefined 
        : 'Word not in graph, but similarity calculated',
    };
    console.log('🟢 [GUESS API] Returning response:', { 
      success: responseData.success, 
      similarity: responseData.similarity?.toFixed(4), 
      wordId: responseData.wordId, 
      inGraph: responseData.inGraph 
    });
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'guess/route.js:169', message: 'Returning success response', data: responseData, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => {});
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('🔴 [GUESS API] Error processing guess:', error);
    console.error('🔴 [GUESS API] Error stack:', error.stack);
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'guess/route.js:181', message: 'Exception in guess handler', data: { errorMessage: error.message, errorStack: error.stack }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => {});
    return NextResponse.json(
      { success: false, error: 'Failed to process guess' },
      { status: 500 }
    );
  }
}

