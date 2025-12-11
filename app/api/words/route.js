import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WordNode from '@/models/WordNode';

export async function GET(request) {
  try {
    await connectDB();
    
    // Get topic from query parameter
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    
    // Build query filter
    const filter = {};
    if (topic && topic !== 'all') {
      filter.topic = topic;
    }
    
    const words = await WordNode.find(filter).select('_id label position embedding topic').lean();
    
    console.log(`Fetched ${words.length} words from database${topic ? ` (topic: ${topic})` : ' (all topics)'}`);
    
    // Convert _id to string and ensure position is array
    const formattedWords = words.map(word => {
      const pos = word.position;
      const isValidPos = Array.isArray(pos) && 
                        pos.length === 3 && 
                        pos.every(p => typeof p === 'number' && isFinite(p));
      
      if (!isValidPos) {
        console.warn(`Word "${word.label}" has invalid position:`, pos);
      }
      
      return {
        id: word._id.toString(),
        label: word.label,
        position: isValidPos ? pos : [0, 0, 0], // Fallback to origin if invalid
        embedding: word.embedding,
      };
    });
    
    const validPositions = formattedWords.filter(w => 
      w.position[0] !== 0 || w.position[1] !== 0 || w.position[2] !== 0
    );
    
    console.log(`Words with valid positions: ${validPositions.length}/${formattedWords.length}`);
    
    if (validPositions.length === 0 && formattedWords.length > 0) {
      console.error('WARNING: All words have position [0,0,0] or invalid positions!');
      console.log('Sample words:', formattedWords.slice(0, 3));
    } else if (validPositions.length > 0) {
      // Log position statistics
      const positions = validPositions.map(w => w.position);
      const xs = positions.map(p => p[0]);
      const ys = positions.map(p => p[1]);
      const zs = positions.map(p => p[2]);
      
      console.log('Position statistics:', {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
        minZ: Math.min(...zs),
        maxZ: Math.max(...zs),
        samplePositions: validPositions.slice(0, 3).map(w => ({ label: w.label, pos: w.position }))
      });
    }

    return NextResponse.json({ success: true, words: formattedWords });
  } catch (error) {
    console.error('Error fetching words:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch words' },
      { status: 500 }
    );
  }
}

