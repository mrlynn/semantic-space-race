import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WordNode from '@/models/WordNode';
import { cosineSimilarity, distanceSimilarity } from '@/lib/utils';
import mongoose from 'mongoose';

export async function POST(request) {
  try {
    const { wordId, limit = 5 } = await request.json();

    console.log('🔵 [DEBUG] Similarity search API called:', { wordId, wordIdType: typeof wordId, limit });

    if (!wordId) {
      console.error('🔴 [DEBUG] wordId missing, returning 400');
      return NextResponse.json(
        { success: false, error: 'wordId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Optimized: Find source word using a single query
    let sourceWord = null;
    try {
      // Try ObjectId first (most common case)
      if (mongoose.Types.ObjectId.isValid(wordId)) {
        sourceWord = await WordNode.findById(wordId).select('_id label embedding position').lean();
      }
      
      // If not found, try as string (fallback)
      if (!sourceWord) {
        sourceWord = await WordNode.findOne({ _id: wordId }).select('_id label embedding position').lean();
      }
    } catch (e) {
      console.log('🔵 [DEBUG] Error finding source word:', e.message);
    }
    
    if (!sourceWord) {
      console.error('🔴 [DEBUG] Word not found for wordId:', wordId);
      return NextResponse.json(
        { success: false, error: `Word not found for wordId: ${wordId}` },
        { status: 404 }
      );
    }

    if (!sourceWord.embedding || !Array.isArray(sourceWord.embedding) || sourceWord.embedding.length === 0) {
      console.error('🔴 [DEBUG] Source word has no embedding:', sourceWord.label);
      return NextResponse.json(
        { success: false, error: 'Source word has no embedding' },
        { status: 400 }
      );
    }

    console.log('🟢 [DEBUG] Source word found:', sourceWord.label, 'Embedding length:', sourceWord.embedding.length);

    // Use MongoDB Vector Search if available, otherwise use optimized fallback
    let similarWords = [];

    try {
      // Try vector search first - MongoDB vector search returns results sorted by similarity
      // We request limit + 10 to have enough candidates after filtering out the source word
      const vectorSearchResults = await WordNode.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: sourceWord.embedding,
            numCandidates: Math.min(100, limit * 20), // Scale numCandidates with limit
            limit: limit + 10, // Get extra results to filter out source word
          },
        },
        {
          $project: {
            _id: 1,
            label: 1,
            embedding: 1, // Include embedding to calculate exact similarity scores
          },
        },
      ]);

      if (vectorSearchResults.length > 0) {
        // Use multiple comparison methods to ensure we filter out the source word correctly
        const sourceWordId = sourceWord._id;
        const sourceWordIdStr = sourceWordId.toString();
        const sourceWordIdObj = sourceWordId instanceof mongoose.Types.ObjectId 
          ? sourceWordId 
          : new mongoose.Types.ObjectId(sourceWordIdStr);
        
        // Filter out source word using multiple comparison methods for robustness
        similarWords = vectorSearchResults
          .filter(word => {
            if (!word || !word._id) return false;
            const wordId = word._id;
            const wordIdStr = wordId.toString();
            
            // Multiple comparison methods to catch edge cases
            const isSameWord = 
              wordIdStr === sourceWordIdStr || // String comparison
              (wordId instanceof mongoose.Types.ObjectId && wordId.equals(sourceWordIdObj)) || // ObjectId comparison
              (sourceWordId instanceof mongoose.Types.ObjectId && sourceWordId.equals(wordId)); // Reverse ObjectId comparison
            
            if (isSameWord) {
              console.log(`🟡 [DEBUG] Filtered out source word from results: ${word.label || wordIdStr}`);
              return false;
            }
            return true;
          })
          .slice(0, limit)
          .map(word => {
            // Calculate exact cosine similarity using the embeddings from vector search results
            const similarity = word.embedding && 
                             Array.isArray(word.embedding) && 
                             word.embedding.length === sourceWord.embedding.length
              ? cosineSimilarity(sourceWord.embedding, word.embedding)
              : 0.5; // Fallback if embedding missing
            
            return {
              wordId: word._id.toString(),
              label: word.label,
              similarity,
            };
          })
          .sort((a, b) => b.similarity - a.similarity); // Re-sort by exact similarity

        console.log(`🟢 [DEBUG] Vector search returned ${similarWords.length} similar words (after filtering source word)`);
      } else {
        console.log(`🟡 [DEBUG] Vector search returned 0 results - index may not exist, using fallback`);
        throw new Error('No vector search results');
      }
    } catch (vectorError) {
      console.warn('🟡 [DEBUG] Vector search error, using optimized fallback:', vectorError.message);

      // Optimized fallback: Use a smarter approach
      // Instead of loading ALL words, we can use a sample-based approach or
      // use position-based similarity which is much faster
      
      console.log('🟡 [DEBUG] Using optimized position-based fallback');
      
      // Position-based similarity is much faster than calculating cosine similarity for all words
      // Load words with positions (much faster query)
      const allWords = await WordNode.find({ 
        _id: { $ne: sourceWord._id },
        position: { $exists: true, $ne: null }
      })
        .select('_id label position')
        .lean()
        .limit(1000); // Limit to first 1000 words for performance
      
      const sourceWordIdStr = sourceWord._id.toString();
      
      if (allWords.length > 0 && sourceWord.position && sourceWord.position.length === 3) {
        // Calculate position-based similarity (much faster than cosine similarity)
        // Double-check filtering to ensure source word is excluded
        const sourceWordIdStr = sourceWord._id.toString();
        similarWords = allWords
          .filter(word => {
            if (!word || !word._id) return false;
            const wordIdStr = word._id.toString();
            if (wordIdStr === sourceWordIdStr) {
              console.log(`🟡 [DEBUG] Filtered out source word from position-based fallback: ${word.label || wordIdStr}`);
              return false;
            }
            return word.position && word.position.length === 3;
          })
          .map(word => ({
            wordId: word._id.toString(),
            label: word.label,
            similarity: distanceSimilarity(sourceWord.position, word.position),
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
        
        console.log(`Position-based fallback returned ${similarWords.length} similar words`);
      } else {
        // Last resort: Use embedding-based similarity but limit to 500 words for performance
        console.log('🟡 [DEBUG] Using embedding-based fallback (limited to 500 words)');
        const limitedWords = await WordNode.find({ 
          _id: { $ne: sourceWord._id },
          embedding: { $exists: true, $ne: null }
        })
          .select('_id label embedding')
          .lean()
          .limit(500); // Limit to 500 words to keep it fast
        
        const sourceWordIdStr = sourceWord._id.toString();
        similarWords = limitedWords
          .filter(word => {
            if (!word || !word._id) return false;
            const wordIdStr = word._id.toString();
            if (wordIdStr === sourceWordIdStr) {
              console.log(`🟡 [DEBUG] Filtered out source word from embedding-based fallback: ${word.label || wordIdStr}`);
              return false;
            }
            return word.embedding && 
                   Array.isArray(word.embedding) && 
                   word.embedding.length === sourceWord.embedding.length;
          })
          .map(word => ({
            wordId: word._id.toString(),
            label: word.label,
            similarity: cosineSimilarity(sourceWord.embedding, word.embedding),
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
        
        console.log(`Embedding-based fallback returned ${similarWords.length} similar words`);
      }
    }

    console.log(`🟢 [DEBUG] Returning ${similarWords.length} similar words`);
    
    try {
      return NextResponse.json({ success: true, results: similarWords });
    } catch (responseError) {
      // Handle EPIPE errors when trying to send response
      if (responseError.code === 'EPIPE' || responseError.errno === -32) {
        console.warn('⚠️ [SIMILARITY SEARCH] Client disconnected before response could be sent (EPIPE)');
        return null;
      }
      throw responseError;
    }
  } catch (error) {
    // Handle EPIPE errors gracefully (client disconnected)
    if (error.code === 'EPIPE' || error.errno === -32) {
      console.warn('⚠️ [SIMILARITY SEARCH] Client disconnected (EPIPE)');
      return null;
    }
    
    console.error('Error in similarity search:', error);
    
    try {
      return NextResponse.json(
        { success: false, error: `Failed to perform similarity search: ${error.message}` },
        { status: 500 }
      );
    } catch (responseError) {
      // If response write fails (e.g., client disconnected), log and return null
      if (responseError.code === 'EPIPE' || responseError.errno === -32) {
        console.warn('⚠️ [SIMILARITY SEARCH] Failed to send error response (client disconnected)');
        return null;
      }
      throw responseError;
    }
  }
}

