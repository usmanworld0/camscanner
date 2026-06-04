'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScan } from '@/store/ScanContext';
import { loadOpenCV } from '@/lib/cv-loader';
import { detectDocumentCorners } from '@/utils/opencvFilters';
import { UploadZone, UploadedScan } from '@/components/UploadZone';
import { Cpu, AlertCircle, FolderOpen, ArrowRight, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ScannerPage() {
  const router = useRouter();
  const { pages, updatePage, setActivePageId } = useScan();
  const [cvReady, setCvReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
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

  const detectPointsFromImage = async (originalSrc: string) => {
    await new Promise<void>((resolve) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }
      requestAnimationFrame(() => resolve());
    });

    return new Promise<{
      points: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
      width: number;
      height: number;
    }>((resolve, reject) => {
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
          
          // Downscale further for OpenCV corner detection to be lightning-fast (max 800px)
          const maxCVOffset = 800;
          let cvScale = 1;
          let cvCanvas = canvas;
          if (img.width > maxCVOffset || img.height > maxCVOffset) {
            cvScale = Math.min(maxCVOffset / img.width, maxCVOffset / img.height);
            cvCanvas = document.createElement('canvas');
            cvCanvas.width = img.width * cvScale;
            cvCanvas.height = img.height * cvScale;
            const cvCtx = cvCanvas.getContext('2d');
            if (cvCtx) {
              cvCtx.drawImage(canvas, 0, 0, cvCanvas.width, cvCanvas.height);
            } else {
              cvCanvas = canvas;
              cvScale = 1;
            }
          }

          const corners = detectDocumentCorners(cvInstance, cvCanvas);
          
          // Map back from downscaled canvas coordinates to 0..1 normalized range
          detectedPoints = corners.map((p) => ({
            x: (p.x / cvScale) / img.width,
            y: (p.y / cvScale) / img.height,
          })) as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
        } else {
          detectedPoints = [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
          ] as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
        }

        resolve({
          points: detectedPoints,
          width: img.width,
          height: img.height,
        });
      } catch (err: any) {
        console.error('Edge detection failed, using default crop:', err);
        resolve({
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 },
          ],
          width: img.width,
          height: img.height,
        });
      }
    };
    img.onerror = () => {
        reject(new Error('Failed to load document structure'));
      };
    });
  };

  const handleUploadComplete = async (uploads: UploadedScan[]) => {
    setIsProcessing(true);
    setProcessingCount(uploads.length);
    setError(null);

    try {
      for (const upload of uploads) {
        const detection = await detectPointsFromImage(upload.originalSrc);
        updatePage(upload.id, {
          points: detection.points,
          rotation: 0,
          sourceWidth: detection.width,
          sourceHeight: detection.height,
        });
      }

      if (uploads[0]) {
        setActivePageId(uploads[0].id);
      }
      router.push('/editor');
    } catch (err: any) {
      setError(err.message || 'Failed to prepare document pages');
    } finally {
      setIsProcessing(false);
      setProcessingCount(0);
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
          <span>{cvReady ? 'OpenCV boundary detection ready' : 'Initializing boundary detection'}</span>
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Capture Workspace</h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
          Import page images, estimate document borders, then refine the crop and enhancement pipeline.
        </p>
      </div>

      {isProcessing ? (
        <div className="clean-panel p-10 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-4 min-h-[300px] w-full max-w-2xl text-center shadow-sm">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-t-blue-600 border-slate-100 animate-spin" />
            <Gauge className="absolute w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-slate-800 font-semibold">Estimating Document Corners</h3>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              Preparing {processingCount} {processingCount === 1 ? 'page' : 'pages'} for perspective correction.
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
