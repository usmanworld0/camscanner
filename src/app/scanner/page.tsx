'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, FolderOpen, Gauge } from 'lucide-react';
import { UploadZone, UploadedScan } from '@/components/UploadZone';
import { useScan } from '@/store/ScanContext';
import { Point } from '@/types';

const DEFAULT_POINTS: [Point, Point, Point, Point] = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
];

const loadImageSize = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => reject(new Error('Could not prepare the uploaded image.'));
    img.src = src;
  });
};

export default function ScannerPage() {
  const router = useRouter();
  const { updatePage, setActivePageId } = useScan();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = async (uploads: UploadedScan[]) => {
    if (uploads.length === 0) return;

    setIsProcessing(true);
    setProcessingCount(uploads.length);
    setError(null);

    try {
      for (const upload of uploads) {
        const size = await loadImageSize(upload.originalSrc);
        updatePage(upload.id, {
          points: DEFAULT_POINTS,
          rotation: 0,
          sourceWidth: size.width,
          sourceHeight: size.height,
        });
      }

      setActivePageId(uploads[0].id);
      router.push('/editor');
    } catch (err) {
      console.error('Image preparation failed:', err);
      setActivePageId(uploads[0].id);
      setError(err instanceof Error ? err.message : 'Could not prepare the uploaded image.');
      router.push('/editor');
    } finally {
      setIsProcessing(false);
      setProcessingCount(0);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
          <Gauge className="w-3.5 h-3.5" />
          <span>Stable browser upload mode</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Capture Workspace</h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
          Import document images, adjust the crop manually, enhance the page, then export.
        </p>
      </div>

      {isProcessing ? (
        <div className="clean-panel p-10 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-4 min-h-[300px] w-full max-w-2xl text-center shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-t-blue-600 border-slate-100 animate-spin" />
            <Gauge className="absolute w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-slate-800 font-semibold">Preparing Upload</h3>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              Preparing {processingCount} {processingCount === 1 ? 'page' : 'pages'} for the editor.
            </p>
          </div>
        </div>
      ) : (
        <UploadZone onUploadComplete={handleUploadComplete} />
      )}

      {!isProcessing && (
        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-2xl">
          <Link
            href="/history"
            className="flex items-center justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-all group flex-1 cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Saved Library</h4>
                <p className="text-[10px] text-slate-400 font-medium">Browse saved document scans</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-350 group-hover:translate-x-0.5 group-hover:text-blue-600 transition-all" />
          </Link>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium max-w-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
