'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScan } from '@/store/ScanContext';
import { loadOpenCV } from '@/lib/cv-loader';
import { detectDocumentCorners } from '@/utils/opencvFilters';
import { UploadZone } from '@/components/UploadZone';
import { Cpu, AlertCircle, Sparkles, FolderOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ScannerPage() {
  const router = useRouter();
  const { pages, updatePage } = useScan();
  const [cvReady, setCvReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load OpenCV.js in background on mount
  useEffect(() => {
    loadOpenCV()
      .then(() => {
        setCvReady(true);
        console.log('OpenCV.js successfully loaded on scanner page mount.');
      })
      .catch((err) => {
        console.error('Failed to load OpenCV.js:', err);
        setError('Manual cropping enabled. Border auto-detection is initializing.');
      });
  }, []);

  const handleUploadComplete = async (newPageId: string, originalSrc: string) => {
    setIsProcessing(true);
    setError(null);

    const img = new Image();
    img.src = originalSrc;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create canvas context');
        ctx.drawImage(img, 0, 0);

        let detectedPoints;

        if (typeof window !== 'undefined' && (window as any).cv && (window as any).cv.Mat) {
          const cvInstance = (window as any).cv;
          const corners = detectDocumentCorners(cvInstance, canvas);
          
          detectedPoints = corners.map((p) => ({
            x: p.x / img.width,
            y: p.y / img.height,
          })) as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
        } else {
          detectedPoints = [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
          ] as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
        }

        updatePage(newPageId, {
          points: detectedPoints,
          rotation: 0,
        });

        setIsProcessing(false);
        router.push('/editor');
      } catch (err: any) {
        console.error('Edge detection failed:', err);
        updatePage(newPageId, {
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
          ],
          rotation: 0,
        });
        setIsProcessing(false);
        router.push('/editor');
      }
    };
    img.onerror = () => {
      setError('Failed to load document structure');
      setIsProcessing(false);
    };
  };

  useEffect(() => {
    (window as any)._lastPages = pages;
  }, [pages]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center space-y-10">
      {/* Page Title */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{cvReady ? 'Border Auto-Detection Active' : 'Initializing Scanner...'}</span>
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Scanner Workspace</h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
          Upload an image, receipt, or screenshot. The crop utility will help isolate document boundaries.
        </p>
      </div>

      {isProcessing ? (
        <div className="clean-panel p-10 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-4 min-h-[300px] w-full max-w-2xl text-center shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-t-blue-600 border-slate-100 animate-spin" />
            <Sparkles className="absolute w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-slate-800 font-semibold">Detecting Edges</h3>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              Scanning coordinates to identify boundary corners and straighten skews.
            </p>
          </div>
        </div>
      ) : (
        <UploadZone onUploadComplete={handleUploadComplete} />
      )}

      {/* Helper Panel Links */}
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
