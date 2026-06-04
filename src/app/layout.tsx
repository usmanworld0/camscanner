import type { Metadata } from 'next';
import './globals.css';
import { ScanProvider } from '@/store/ScanContext';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'DIP Scanner - Document Image Processing Workbench',
  description:
    'Digital Image Processing project for document scanning: boundary detection, perspective correction, image enhancement, OCR, and PDF compilation.',
  keywords: ['digital image processing', 'document scanner', 'ocr', 'pdf builder', 'opencv scanner'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans relative bg-slate-50 text-slate-800 overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-900">
        <ScanProvider>
          {/* Nav Header */}
          <Navigation />

          {/* Page Content Body */}
          <main className="flex-grow z-10">{children}</main>

          {/* Footer */}
          <footer className="z-10 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 font-medium">
            <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>&copy; {new Date().getFullYear()} DIP Scanner. Document Image Processing Project.</div>
              <div className="flex gap-4">
                <span>OpenCV.js</span>
                <span>Tesseract OCR</span>
                <span>PDF Export</span>
              </div>
            </div>
          </footer>
        </ScanProvider>
      </body>
    </html>
  );
}
