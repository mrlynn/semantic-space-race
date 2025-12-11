import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import { cosineSimilarity } from '@/lib/utils';
import pusher from '@/lib/pusher';
import { endRound, startNewRound } from '@/lib/gameLogic';
import connectDB from '@/lib/mongodb';
import WordNode from '@/models/WordNode';
import { generateEmbedding } from '@/lib/openai';

export async function POST(request) {
  try {
    const { gameCode, playerId, guess } = await request.json();

    if (!gameCode || !playerId || !guess) {
      return NextResponse.json(
        { success: false, error: 'gameCode, playerId, and guess are required' },
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
        guessEmbedding = await generateEmbedding(guess);
        console.log(`Generated embedding for "${guess}"`);
      } catch (error) {
        console.error(`Error generating embedding for "${guess}":`, error);
        return NextResponse.json({
          success: false,
          error: 'Failed to generate embedding for guessed word',
        }, { status: 500 });
      }
    } else {
      // Validate embeddings exist and are valid
      if (!guessedWord.embedding || !Array.isArray(guessedWord.embedding) || guessedWord.embedding.length === 0) {
        console.log(`Word "${guessedWord.label}" has no embedding, generating one...`);
        try {
          guessEmbedding = await generateEmbedding(guessedWord.label);
          console.log(`Generated embedding for "${guessedWord.label}"`);
        } catch (error) {
          console.error(`Error generating embedding for "${guessedWord.label}":`, error);
          return NextResponse.json({
            success: false,
            error: 'Failed to generate embedding for word',
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error processing guess:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process guess' },
      { status: 500 }
    );
  }
}

