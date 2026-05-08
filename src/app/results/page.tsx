'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useScan } from '@/store/ScanContext';
import { OCRPanel } from '@/components/OCRPanel';
import { PDFExportButton } from '@/components/PDFExportButton';
import { ImagePreview } from '@/components/ImagePreview';
import { Check, Save, ArrowLeft, ArrowRight, Plus, Loader2 } from 'lucide-react';

export default function ResultsPage() {
  const router = useRouter();
  const {
    pages,
    activePage,
    activePageId,
    setActivePageId,
    updatePage,
    saveCurrentSession,
    clearSession,
  } = useScan();

  const [documentTitle, setDocumentTitle] = useState('Scanned Document');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Auto-redirect if no pages uploaded
  useEffect(() => {
    if (pages.length === 0) {
      router.push('/scanner');
    }
  }, [pages, router]);

  const handleOCRComplete = (text: string, confidence: number) => {
    if (!activePage) return;
    updatePage(activePage.id, {
      ocrText: text,
      ocrConfidence: confidence,
    });
  };

  const handleSaveSession = () => {
    setIsSaving(true);
    saveCurrentSession(documentTitle);
    
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    }, 1000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to clear current scanner workspace?')) {
      clearSession();
      router.push('/scanner');
    }
  };

  if (pages.length === 0 || !activePage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm">Preparing results workspace...</p>
      </div>
    );
  }

  const srcToRender = activePage.processedSrc || activePage.croppedSrc || activePage.originalSrc;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col space-y-6">
      {/* Page Title & Name Form */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-slate-800">Results &amp; Export</h1>
          <p className="text-slate-500 text-xs">
            Compile document scans, transcribe text, and export final PDF files.
          </p>
        </div>

        {/* Document Title Input */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500 w-full md:w-52 transition-colors shadow-sm"
            placeholder="Name your scan..."
          />
          <button
            onClick={handleSaveSession}
            disabled={isSaving}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 cursor-pointer shadow-sm
              ${
                isSaved
                  ? 'bg-blue-50 border border-blue-200 text-blue-700'
                  : 'bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white'
              }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaved ? 'Saved Locally!' : 'Save Scan'}</span>
          </button>
        </div>
      </div>

      {/* Main Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Image Preview & Page Reordering Thumbnails) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="clean-panel p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider px-1 mb-3">
              Scan Preview ({pages.findIndex(p => p.id === activePageId) + 1} of {pages.length})
            </h3>
            
            <ImagePreview 
              page={activePage} 
              onRecrop={() => router.push('/editor')}
            />
          </div>

          {/* Multi-Page Carousel strip */}
          <div className="clean-panel p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Multi-Page Library ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
              </h3>
              
              <button
                onClick={() => router.push('/scanner')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                Add Page
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto py-1 scrollbar-thin">
              {pages.map((p, idx) => {
                const isActive = p.id === activePageId;
                const thumbSrc = p.processedSrc || p.croppedSrc || p.originalSrc;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePageId(p.id)}
                    className="relative focus:outline-none flex-shrink-0 cursor-pointer"
                  >
                    <div
                      className={`w-14 h-18 rounded-lg overflow-hidden border bg-slate-50 relative shadow-sm transition-all duration-200
                        ${isActive ? 'border-blue-600 scale-102 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-350'}`}
                    >
                      <img
                        src={thumbSrc}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 w-4 h-4 rounded bg-slate-900/80 backdrop-blur-sm border border-slate-700 flex items-center justify-center text-[9px] font-bold text-white">
                        {idx + 1}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (OCR Panels & Merge Compilation Options) */}
        <div className="lg:col-span-5 space-y-6">
          {/* PDF compilation options */}
          <div className="clean-panel p-6 rounded-2xl bg-white border border-slate-200 flex flex-col space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">
              Export PDF Document
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed font-normal">
              Merge all scan pages in your library into a single structured, high-density PDF file.
            </p>
            <PDFExportButton pages={pages} fileName={documentTitle.replace(/\s+/g, '-').toLowerCase()} />
          </div>

          {/* OCR Panel extraction block */}
          <OCRPanel
            imageSrc={srcToRender}
            ocrText={activePage.ocrText}
            ocrConfidence={activePage.ocrConfidence}
            onOCRComplete={handleOCRComplete}
          />

          {/* Finish Scan Pack block */}
          <div className="flex justify-between items-center px-2">
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-650 transition-colors font-semibold cursor-pointer"
            >
              Clear Workspace
            </button>
            <Link
              href="/history"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-all font-semibold cursor-pointer group"
            >
              Open Saved Library
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
