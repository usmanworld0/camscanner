import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'An array of base64 images is required' },
        { status: 400 }
      );
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < images.length; i++) {
      const base64Img = images[i];
      if (!base64Img) continue;

      try {
        // Strip the base64 MIME prefix if present
        const cleanedBase64 = base64Img.replace(/^data:image\/\w+;base64,/, '');
        const imageBytes = Buffer.from(cleanedBase64, 'base64');

        // Embed the image (detect if JPEG or PNG)
        let embeddedImage;
        if (base64Img.includes('image/png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          // Default to JPEG since it's the standard for scanner apps
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }

        // Get dimensions of embedded image
        const { width, height } = embeddedImage;

        // Add a page with matching dimensions
        const page = pdfDoc.addPage([width, height]);

        // Draw the image to fit the page exactly
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      } catch (err: any) {
        console.error(`Error embedding image at index ${i}:`, err);
        // Continue to embed other pages even if one fails
      }
    }

    // Save the PDF document as bytes
    const pdfBytes = await pdfDoc.save();

    // Return the PDF document as a binary stream
    return new NextResponse(pdfBytes as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="scanned-document.pdf"',
      },
    });
  } catch (error: any) {
    console.error('Error during backend PDF generation:', error);
    return NextResponse.json(
      { error: 'PDF generation failed', details: error.message },
      { status: 500 }
    );
  }
}
