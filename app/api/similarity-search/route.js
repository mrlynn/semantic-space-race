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

    console.log('Similarity search request:', { wordId, limit });

    await connectDB();

    // Find the source word - try multiple methods to handle different ID formats
    let sourceWord = null;
    
    // Try 1: Direct findById (handles both ObjectId and string)
    try {
      sourceWord = await WordNode.findById(wordId).lean();
    } catch (e) {
      console.log('🔵 [DEBUG] findById failed, trying other methods:', e.message);
    }
    
    // Try 2: findOne with _id as string
    if (!sourceWord) {
      try {
        sourceWord = await WordNode.findOne({ _id: wordId }).lean();
      } catch (e) {
        console.log('🔵 [DEBUG] findOne with string _id failed:', e.message);
      }
    }
    
    // Try 3: Convert to ObjectId if it's a valid ObjectId string
    if (!sourceWord && mongoose.Types.ObjectId.isValid(wordId)) {
      try {
        const objectId = new mongoose.Types.ObjectId(wordId);
        sourceWord = await WordNode.findById(objectId).lean();
      } catch (e) {
        console.log('🔵 [DEBUG] ObjectId conversion failed:', e.message);
      }
    }
    
    if (!sourceWord) {
      console.error('🔴 [DEBUG] Word not found for wordId:', wordId, 'Type:', typeof wordId);
      return NextResponse.json(
        { success: false, error: `Word not found for wordId: ${wordId}` },
        { status: 404 }
      );
    }

    console.log('🟢 [DEBUG] Source word found:', sourceWord.label, sourceWord._id, 'Has embedding:', !!sourceWord.embedding, 'Embedding length:', sourceWord.embedding?.length || 0);

    // Use MongoDB Vector Search if available, otherwise calculate similarity for all words
    let similarWords = [];

    let useVectorSearch = false;
    try {
      // Try vector search first
      const vectorSearchResults = await WordNode.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: sourceWord.embedding,
            numCandidates: 100,
            limit: limit + 1, // +1 to exclude the source word
          },
        },
        {
          $project: {
            _id: 1,
            label: 1,
            position: 1,
            embedding: 1,
          },
        },
      ]);

      console.log(`🟡 [DEBUG] Vector search returned ${vectorSearchResults.length} raw results`);

      // Filter out the source word and calculate similarity
      const sourceWordIdStr = sourceWord._id.toString();
      similarWords = vectorSearchResults
        .filter(word => word._id.toString() !== sourceWordIdStr)
        .slice(0, limit)
        .map(word => ({
          wordId: word._id.toString(),
          label: word.label,
          similarity: cosineSimilarity(sourceWord.embedding, word.embedding),
        }));

      // If vector search returned results, mark it as successful
      if (vectorSearchResults.length > 0) {
        useVectorSearch = true;
        console.log(`🟢 [DEBUG] Vector search returned ${similarWords.length} similar words`);
      } else {
        console.log(`🟡 [DEBUG] Vector search returned 0 results - index may not exist, falling back to cosine similarity`);
      }
    } catch (vectorError) {
      console.warn('🟡 [DEBUG] Vector search error, using fallback:', vectorError.message);
    }

    // If vector search didn't return results (either error or empty), use fallback
    if (!useVectorSearch) {
      // Fallback: calculate similarity for all words
      console.log('🟡 [DEBUG] Using cosine similarity fallback for all words');

      const allWords = await WordNode.find({ _id: { $ne: wordId } })
        .select('_id label position embedding')
        .lean();

      const sourceWordIdStr = sourceWord._id.toString();
      
      if (allWords.length > 0 && sourceWord.embedding && sourceWord.embedding.length > 0) {
        similarWords = allWords
          .filter(word => 
            word._id.toString() !== sourceWordIdStr && 
            word.embedding && 
            word.embedding.length > 0
          )
          .map(word => ({
            wordId: word._id.toString(),
            label: word.label,
            similarity: cosineSimilarity(sourceWord.embedding, word.embedding),
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
        
        console.log(`Fallback search returned ${similarWords.length} similar words using embeddings`);
      } else {
        // Ultimate fallback: use position-based similarity
        similarWords = allWords
          .filter(word => 
            word._id.toString() !== sourceWordIdStr && 
            word.position && 
            word.position.length === 3
          )
          .map(word => ({
            wordId: word._id.toString(),
            label: word.label,
            similarity: distanceSimilarity(sourceWord.position, word.position),
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
        
        console.log(`Position-based fallback returned ${similarWords.length} similar words`);
      }
    }

    console.log(`🟢 [DEBUG] Returning ${similarWords.length} similar words`);
    return NextResponse.json({ success: true, results: similarWords });
  } catch (error) {
    console.error('Error in similarity search:', error);
    return NextResponse.json(
      { success: false, error: `Failed to perform similarity search: ${error.message}` },
      { status: 500 }
    );
  }
}

