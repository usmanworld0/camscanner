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

export const PDFExportButton: React.FC<PDFExportButtonProps> = ({
  pages,
  fileName = 'scanned-document',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [exportMode, setExportMode] = useState<'client' | 'backend'>('client');

  const exportClientSide = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        compress: true,
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const imageSrc = page.processedSrc || page.croppedSrc || page.originalSrc;

        const img = new Image();
        img.src = imageSrc;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const width = img.width;
        const height = img.height;

        if (i > 0) {
          pdf.addPage([width, height], height > width ? 'p' : 'l');
        } else {
          pdf.deletePage(1);
          pdf.addPage([width, height], height > width ? 'p' : 'l');
        }

        pdf.addImage(imageSrc, 'JPEG', 0, 0, width, height, undefined, 'FAST');
      }

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
      const imagesBase64 = pages.map(
        (page) => page.processedSrc || page.croppedSrc || page.originalSrc
      );

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
      link.click();
      URL.revokeObjectURL(url);

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
