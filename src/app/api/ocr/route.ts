import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

export async function POST(req: NextRequest) {
  try {
    const { image, lang = 'eng' } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image data (base64 string) is required' },
        { status: 400 }
      );
    }

    // Run Tesseract OCR on the server side
    const result = await Tesseract.recognize(image, lang, {
      logger: (m) => console.log(`OCR Progress: ${m.status} - ${Math.round(m.progress * 100)}%`),
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

    return NextResponse.json({
      success: true,
      text,
      confidence,
    });
  } catch (error: any) {
    console.error('Error during backend OCR processing:', error);
    return NextResponse.json(
      { error: 'OCR processing failed', details: error.message },
      { status: 500 }
    );
  }
}
