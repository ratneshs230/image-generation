import { NextRequest, NextResponse } from 'next/server';
import { geminiApi } from '@/lib/gemini-api';
import { moderateContent } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, currentImage } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check content moderation
    const moderation = moderateContent(prompt);
    if (!moderation.safe) {
      return NextResponse.json(
        { error: moderation.reason || 'Content not allowed' },
        { status: 400 }
      );
    }

    let imageData: string;

    if (currentImage) {
      // Edit existing image
      imageData = await geminiApi.editImage(currentImage, prompt);
    } else {
      // Generate new image
      imageData = await geminiApi.generateImage(prompt);
    }

    return NextResponse.json({ imageData });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
