import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { image, mode = 'original', quality = 80 } = await req.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image data (base64 string) is required' },
        { status: 400 }
      );
    }

    // Decode base64 image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Dynamically import Jimp to avoid bundler ESM/CJS interop issues
    const jimpModule: any = await import('jimp');
    const JimpLib = jimpModule.default ?? jimpModule.Jimp ?? jimpModule;
    // Read image using Jimp
    const jimpImage: any = await JimpLib.read(buffer);

    // Apply backend processing based on filter mode
    switch (mode) {
      case 'bw':
        // Grayscale and high contrast binarization
        jimpImage.greyscale();
        jimpImage.contrast(0.7);
        // Custom binarization thresholding
        jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, (x: number, y: number, idx: number) => {
          const r = jimpImage.bitmap.data[idx];
          const g = jimpImage.bitmap.data[idx + 1];
          const b = jimpImage.bitmap.data[idx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const binary = gray > 128 ? 255 : 0;
          jimpImage.bitmap.data[idx] = binary;
          jimpImage.bitmap.data[idx + 1] = binary;
          jimpImage.bitmap.data[idx + 2] = binary;
        });
        break;

      case 'enhanced':
        jimpImage.contrast(0.4);
        jimpImage.brightness(0.05);
        break;

      case 'magic':
        // Color boost
        jimpImage.contrast(0.3);
        jimpImage.brightness(0.1);
        // We can do custom saturation boost by modifying pixels
        jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, (x: number, y: number, idx: number) => {
          const r = jimpImage.bitmap.data[idx];
          const g = jimpImage.bitmap.data[idx + 1];
          const b = jimpImage.bitmap.data[idx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          // Saturation boost factor of 1.5
          jimpImage.bitmap.data[idx] = Math.max(0, Math.min(255, gray + (r - gray) * 1.5));
          jimpImage.bitmap.data[idx + 1] = Math.max(0, Math.min(255, gray + (g - gray) * 1.5));
          jimpImage.bitmap.data[idx + 2] = Math.max(0, Math.min(255, gray + (b - gray) * 1.5));
        });
        break;

      case 'highcontrast':
        jimpImage.greyscale();
        jimpImage.contrast(0.9);
        break;

      case 'original':
      default:
        // No filter, keep original
        break;
    }

    // Compression optimization: set quality and return as buffer
    jimpImage.quality(quality);
    const processedBuffer = await jimpImage.getBufferAsync('image/jpeg');
    const processedBase64 = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      processedImage: processedBase64,
      width: jimpImage.bitmap.width,
      height: jimpImage.bitmap.height,
    });
  } catch (error: any) {
    console.error('Error during backend image processing:', error);
    return NextResponse.json(
      { error: 'Image processing failed', details: error.message },
      { status: 500 }
    );
  }
}
