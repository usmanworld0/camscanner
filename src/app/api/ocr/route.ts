import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';

export async function POST(req: NextRequest) {
  try {
    const { image, lang = 'eng' } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image data (base64 string) is required' },
        { status: 400 }
      );
    }

    // Create a worker per-request and terminate after recognition to avoid leaking resources
    const worker = (createWorker as any)({
      logger: (m: any) => console.log(`OCR Progress: ${m.status} - ${Math.round((m.progress || 0) * 100)}%`),
    });

    await worker.load();
    await worker.loadLanguage(lang);
    await worker.initialize(lang);

    const { data } = await worker.recognize(image);
    const text = data.text;
    const confidence = data.confidence;

    await worker.terminate();

    return NextResponse.json({
      success: true,
      text,
      confidence,
    });
  } catch (error: any) {
    console.error('Error during backend OCR processing:', error);
    return NextResponse.json(
      { error: 'OCR processing failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
