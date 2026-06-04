'use client';

import React, { useState } from 'react';
import { ScanPage } from '@/types';
import { jsPDF } from 'jspdf';
import { FileDown, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface PDFExportButtonProps {
  pages: ScanPage[];
  fileName?: string;
}

interface PdfImage {
  dataUrl: string;
  width: number;
  height: number;
}

export const PDFExportButton: React.FC<PDFExportButtonProps> = ({
  pages,
  fileName = 'scanned-document',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [exportMode, setExportMode] = useState<'client' | 'backend'>('client');

  const getPageImageSrc = (page: ScanPage) => page.processedSrc || page.croppedSrc || page.originalSrc;

  const loadImageForPdf = (src: string): Promise<PdfImage> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not prepare image for PDF export'));
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.92),
          width: canvas.width,
          height: canvas.height,
        });
      };

      img.onerror = () => reject(new Error('Could not load a page image for PDF export'));
      img.src = src;
    });
  };

  const preparePdfImages = () => Promise.all(pages.map((page) => loadImageForPdf(getPageImageSrc(page))));

  const exportClientSide = async () => {
    setIsExporting(true);
    try {
      const pdfImages = await preparePdfImages();
      const [firstImage] = pdfImages;
      if (!firstImage) return;

      const pdf = new jsPDF({
        orientation: firstImage.height > firstImage.width ? 'p' : 'l',
        unit: 'px',
        format: [firstImage.width, firstImage.height],
        compress: true,
      });

      pdfImages.forEach((image, i) => {
        if (i > 0) {
          pdf.addPage([image.width, image.height], image.height > image.width ? 'p' : 'l');
        }

        pdf.addImage(image.dataUrl, 'JPEG', 0, 0, image.width, image.height, undefined, 'FAST');
      });

      pdf.save(`${fileName}.pdf`);
      setIsExported(true);
      setTimeout(() => setIsExported(false), 3000);
    } catch (error) {
      console.error('Client PDF export failed:', error);
      alert('Local PDF compilation failed. Trying server-side fallback...');
      await exportBackendSide();
    } finally {
      setIsExporting(false);
    }
  };

  const exportBackendSide = async () => {
    setIsExporting(true);
    try {
      const imagesBase64 = (await preparePdfImages()).map((image) => image.dataUrl);

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: imagesBase64 }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF on server');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setIsExported(true);
      setTimeout(() => setIsExported(false), 3000);
    } catch (error: any) {
      console.error('Backend PDF export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (pages.length === 0) return;
    if (exportMode === 'client') {
      exportClientSide();
    } else {
      exportBackendSide();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Mode Toggle Button */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500 w-full max-w-xs justify-between">
        <button
          onClick={() => setExportMode('client')}
          className={`flex-1 py-1 rounded transition-all cursor-pointer ${
            exportMode === 'client' ? 'bg-white text-blue-600 border border-slate-200 shadow-sm font-bold' : 'hover:text-slate-800 border border-transparent'
          }`}
        >
          Browser Compile
        </button>
        <button
          onClick={() => setExportMode('backend')}
          className={`flex-1 py-1 rounded transition-all cursor-pointer ${
            exportMode === 'backend' ? 'bg-white text-blue-600 border border-slate-200 shadow-sm font-bold' : 'hover:text-slate-800 border border-transparent'
          }`}
        >
          Server Compile
        </button>
      </div>

      {/* Main Download Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleExport}
        disabled={isExporting || pages.length === 0}
        className={`w-full max-w-xs flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg font-bold text-xs select-none transition-all duration-200 cursor-pointer shadow-sm
          ${
            pages.length === 0
              ? 'bg-slate-100 border border-slate-200 text-slate-350 cursor-not-allowed'
              : isExported
              ? 'bg-blue-50 border border-blue-200 text-blue-700'
              : 'bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white'
          }`}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Compiling PDF Document...
          </>
        ) : isExported ? (
          <>
            <Check className="w-4 h-4" />
            PDF Exported Successfully!
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            <span>Export PDF ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})</span>
          </>
        )}
      </motion.button>
    </div>
  );
};
