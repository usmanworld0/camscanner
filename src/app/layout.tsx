import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { ScanProvider } from '@/store/ScanContext';
import { Navigation } from '@/components/Navigation';

const outfitFont = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Scanify - Secure Web Document Scanner',
  description:
    'Full-stack document scanner app running fully in browser. Detect edges, crop, apply professional filters, run OCR, and compile multi-page PDF documents.',
  keywords: ['camscanner', 'document scanner', 'ocr', 'pdf builder', 'nextjs scanner'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfitFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans relative bg-slate-50 text-slate-800 overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-900">
        <ScanProvider>
          {/* Nav Header */}
          <Navigation />

          {/* Page Content Body */}
          <main className="flex-grow z-10">{children}</main>

          {/* Footer */}
          <footer className="z-10 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 font-medium">
            <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                &copy; {new Date().getFullYear()} Scanify. Local &amp; Secure Document Scanner.
              </div>
              <div className="flex gap-4">
                <a href="#" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-slate-800 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-slate-800 transition-colors">Support</a>
              </div>
            </div>
          </footer>
        </ScanProvider>
      </body>
    </html>
  );
}
