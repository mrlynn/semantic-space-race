import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WordNode from '@/models/WordNode';

export async function GET() {
  try {
    await connectDB();
    
    const words = await WordNode.find({})
      .select('_id label position')
      .limit(10)
      .lean();
    
    // Analyze position distribution
    const positions = words.map(w => w.position);
    const xs = positions.map(p => p?.[0] || 0).filter(x => x !== undefined);
    const ys = positions.map(p => p?.[1] || 0).filter(y => y !== undefined);
    const zs = positions.map(p => p?.[2] || 0).filter(z => z !== undefined);
    
    const stats = {
      totalWords: words.length,
      sampleWords: words.map(w => ({
        label: w.label,
        position: w.position,
        positionType: Array.isArray(w.position) ? 'array' : typeof w.position,
        positionLength: Array.isArray(w.position) ? w.position.length : 'N/A',
      })),
      positionStats: {
        x: {
          min: xs.length > 0 ? Math.min(...xs) : null,
          max: xs.length > 0 ? Math.max(...xs) : null,
          avg: xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null,
        },
        y: {
          min: ys.length > 0 ? Math.min(...ys) : null,
          max: ys.length > 0 ? Math.max(...ys) : null,
          avg: ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : null,
        },
        z: {
          min: zs.length > 0 ? Math.min(...zs) : null,
          max: zs.length > 0 ? Math.max(...zs) : null,
          avg: zs.length > 0 ? zs.reduce((a, b) => a + b, 0) / zs.length : null,
        },
      },
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

