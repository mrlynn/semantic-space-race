import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import { cosineSimilarity } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import WordNode from '@/models/WordNode';
import mongoose from 'mongoose';
import pusher from '@/lib/pusher';

/**
 * Reranker API Endpoint
 * 
 * Takes the current word lists (neighbors and related words) and applies a more sophisticated
 * reranking algorithm that considers multiple factors to highlight the most relevant words
 * for finding the target.
 * 
 * Cost: 4 tokens
 * Restrictions: Once per round per player
 */
export async function POST(request) {
  try {
    const { gameCode, playerId, neighbors = [], relatedWords = [], currentWordId, targetWordId } = await request.json();

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

    // Validate game phase
    if (!game.gameActive || game.roundPhase !== 'SEARCH') {
      return NextResponse.json(
        { success: false, error: `Game is not in search phase (current phase: ${game.roundPhase})` },
        { status: 400 }
      );
    }

    if (!game.currentTarget || !game.currentTarget.id) {
      return NextResponse.json(
        { success: false, error: 'Target word not found' },
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

    // Check if player already used reranker this round
    if (player.rerankerUsed) {
      return NextResponse.json(
        { success: false, error: 'Reranker already used this round' },
        { status: 400 }
      );
    }

    // Deduct tokens for reranking (4 tokens)
    const tokenDeduction = game.deductTokens(playerId, 4);
    if (!tokenDeduction.success) {
      return NextResponse.json(
        { success: false, error: tokenDeduction.error, tokens: tokenDeduction.tokens },
        { status: 400 }
      );
    }

    // Mark reranker as used
    player.rerankerUsed = true;
    game.players.set(playerId, player);
    await game.save();

    // Emit token update event
    const updatedPlayer = game.getPlayer(playerId);
    await pusher.trigger(`game-${game.gameCode}`, 'player:tokens-updated', {
      playerId,
      tokens: updatedPlayer.tokens,
      tokensOut: updatedPlayer.tokensOut,
    });

    // Load embeddings for target and current word
    await connectDB();
    
    const targetWord = await WordNode.findById(targetWordId || game.currentTarget.id)
      .select('_id label embedding').lean();
    
    if (!targetWord || !targetWord.embedding) {
      return NextResponse.json(
        { success: false, error: 'Target word embedding not available' },
        { status: 500 }
      );
    }

    let currentWord = null;
    if (currentWordId) {
      currentWord = await WordNode.findById(currentWordId)
        .select('_id label embedding').lean();
    }

    // Reranking algorithm
    const rerankWords = async (wordList, listType = 'neighbors') => {
      if (!wordList || wordList.length === 0) return [];

      // Fetch embeddings for all words in the list
      const wordIds = wordList.map(w => w.wordId || w.id || w._id).filter(Boolean);
      const wordsWithEmbeddings = await WordNode.find({
        _id: { $in: wordIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) }
      }).select('_id label embedding').lean();

      // Create a map for quick lookup
      const embeddingMap = new Map();
      wordsWithEmbeddings.forEach(w => {
        embeddingMap.set(w._id.toString(), w.embedding);
      });

      // Calculate reranked scores for each word
      const reranked = wordList.map(word => {
        const wordId = (word.wordId || word.id || word._id)?.toString();
        const embedding = embeddingMap.get(wordId);
        
        if (!embedding) {
          // If no embedding, keep original score
          return {
            ...word,
            reranked: false,
            rerankScore: word.similarity || 0,
          };
        }

        // Calculate similarity to target (70% weight)
        const targetSimilarity = cosineSimilarity(embedding, targetWord.embedding);
        
        // Calculate similarity to current word if available (20% weight)
        let currentSimilarity = 0;
        if (currentWord && currentWord.embedding) {
          currentSimilarity = cosineSimilarity(embedding, currentWord.embedding);
        }
        
        // Original similarity (10% weight) - for stability
        const originalSimilarity = word.similarity || 0;
        
        // Combined rerank score
        // For neighbors: balance between target similarity and path-finding (current similarity)
        // For related words: primarily target similarity
        let rerankScore;
        if (listType === 'neighbors') {
          // For neighbors, we want words that are both similar to target AND reachable from current
          rerankScore = (
            targetSimilarity * 0.6 +  // Target similarity (most important)
            currentSimilarity * 0.3 +  // Path-finding (reachability)
            originalSimilarity * 0.1   // Stability (original ranking)
          );
        } else {
          // For related words, focus primarily on target similarity
          rerankScore = (
            targetSimilarity * 0.8 +   // Target similarity (most important)
            originalSimilarity * 0.2    // Stability (original ranking)
          );
        }

        return {
          ...word,
          reranked: true,
          rerankScore,
          targetSimilarity, // Store for display
        };
      });

      // Sort by rerank score (highest first)
      reranked.sort((a, b) => b.rerankScore - a.rerankScore);

      // Mark top 3 as highly relevant
      reranked.forEach((word, index) => {
        word.highlyRelevant = index < 3;
      });

      return reranked;
    };

    // Rerank both lists
    const rerankedNeighbors = await rerankWords(neighbors, 'neighbors');
    const rerankedRelatedWords = await rerankWords(relatedWords, 'related');

    console.log(`🔄 [RERANKER] Reranked ${rerankedNeighbors.length} neighbors and ${rerankedRelatedWords.length} related words for player ${playerId}`);

    return NextResponse.json({
      success: true,
      rerankedNeighbors,
      rerankedRelatedWords,
      tokens: updatedPlayer.tokens,
    });

  } catch (error) {
    console.error('🔴 [RERANKER] Error in rerank API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to rerank words' },
      { status: 500 }
    );
  }
}
