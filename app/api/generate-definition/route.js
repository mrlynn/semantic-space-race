import { NextResponse } from 'next/server';
import { generateDefinition } from '@/lib/openai';

export async function POST(request) {
  try {
    const { wordLabel } = await request.json();

    if (!wordLabel || typeof wordLabel !== 'string') {
      return NextResponse.json(
        { success: false, error: 'wordLabel is required' },
        { status: 400 }
      );
    }

    const definition = await generateDefinition(wordLabel);

    return NextResponse.json({ success: true, definition });
  } catch (error) {
    console.error('Error generating definition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate definition' },
      { status: 500 }
    );
  }
}

