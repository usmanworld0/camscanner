'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScan } from '@/store/ScanContext';
import { loadOpenCV } from '@/lib/cv-loader';
import { warpPerspective } from '@/utils/opencvFilters';
import { applyImageFilter } from '@/utils/imageFilters';
import { CropOverlay } from '@/components/CropOverlay';
import { FilterToolbar } from '@/components/FilterToolbar';
import { CompareSlider } from '@/components/CompareSlider';
import { Point, ScanMode } from '@/types';
import { Crop, ArrowRight, ArrowLeft, Loader2, Undo, Redo, Check } from 'lucide-react';

export default function EditorPage() {
  const router = useRouter();
  const {
    activePage,
    updatePage,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useScan();

  const [isWarping, setIsWarping] = useState(false);
  const [cropMode, setCropMode] = useState(true); // true = cropping, false = filter review
  const [localPoints, setLocalPoints] = useState<[Point, Point, Point, Point] | null>(null);
  const [localFilterMode, setLocalFilterMode] = useState<ScanMode>('original');
  const [error, setError] = useState<string | null>(null);

  // Redirect to scanner if no active image is present
  useEffect(() => {
    if (!activePage) {
      router.push('/scanner');
    } else {
      // Sync local state with active page
      if (activePage.points) {
        setLocalPoints(activePage.points);
      } else {
        // Default points
        setLocalPoints([
          { x: 0.15, y: 0.15 },
          { x: 0.85, y: 0.15 },
          { x: 0.85, y: 0.85 },
          { x: 0.15, y: 0.85 },
        ]);
      }
      setLocalFilterMode(activePage.filterMode || 'original');
      if (activePage.croppedSrc) {
        setCropMode(false);
      }
    }
  }, [activePage, router]);

  // Load OpenCV instance
  const getCVInstance = async () => {
    if (typeof window !== 'undefined' && (window as any).cv && (window as any).cv.Mat) {
      return (window as any).cv;
    }
    return await loadOpenCV();
  };

  const handlePointsChange = (newPoints: [Point, Point, Point, Point]) => {
    setLocalPoints(newPoints);
  };

  const handleConfirmCrop = async () => {
    if (!activePage || !localPoints) return;
    setIsWarping(true);
    setError(null);

    try {
      const cv = await getCVInstance();
      
      const img = new Image();
      img.src = activePage.originalSrc;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to create offscreen context');
          ctx.drawImage(img, 0, 0);

          // Convert normalized percentage points back to absolute image pixels
          const absoluteCorners = localPoints.map((p) => ({
            x: p.x * img.width,
            y: p.y * img.height,
          })) as [Point, Point, Point, Point];

          const warpedCanvas = warpPerspective(cv, canvas, absoluteCorners);
          const croppedBase64 = warpedCanvas.toDataURL('image/jpeg', 0.9);

          // Apply current filter to newly cropped canvas
          const processedBase64 = applyImageFilter(warpedCanvas, localFilterMode);

          // Update store with new assets
          updatePage(activePage.id, {
            points: localPoints,
            croppedSrc: croppedBase64,
            processedSrc: processedBase64,
            filterMode: localFilterMode,
          });

          setIsWarping(false);
          setCropMode(false); // Move to filter review step
        } catch (err: any) {
          console.error('Warp transform execution failed:', err);
          setError('Failed to warp perspective. Please check coordinate corners.');
          setIsWarping(false);
        }
      };
      img.onerror = () => {
        setError('Failed to load image structure');
        setIsWarping(false);
      };
    } catch (err: any) {
      console.error('OpenCV load failed inside editor:', err);
      setError('Could not run perspective warp. Initialization pending.');
      setIsWarping(false);
    }
  };

  const handleSelectFilter = (mode: ScanMode) => {
    if (!activePage || !activePage.croppedSrc) return;
    setLocalFilterMode(mode);

    const img = new Image();
    img.src = activePage.croppedSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const filteredBase64 = applyImageFilter(canvas, mode);
      updatePage(activePage.id, {
        filterMode: mode,
        processedSrc: filteredBase64,
      });
    };
  };

  const handleProceedToResults = () => {
    if (cropMode) {
      handleConfirmCrop().then(() => {
        router.push('/results');
      });
    } else {
      router.push('/results');
    }
  };

  if (!activePage || !localPoints) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Crop &amp; Edit</h1>
          <p className="text-slate-500 text-xs mt-1">
            {cropMode
              ? 'Adjust corner handles to align with document margins.'
              : 'Apply a visual scan filter to enhance text readability.'}
          </p>
        </div>

        {/* Undo/Redo & Page toggles */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-700 transition-all text-xs font-semibold cursor-pointer shadow-sm"
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-700 transition-all text-xs font-semibold cursor-pointer shadow-sm"
            title="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
            Redo
          </button>

          <span className="w-px h-5 bg-slate-200 hidden md:block" />

          {/* Mode Switch button (Recrop / Enhance) */}
          {!cropMode && (
            <button
              onClick={() => setCropMode(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-all text-xs font-semibold cursor-pointer shadow-sm"
            >
              <Crop className="w-3.5 h-3.5 text-blue-600" />
              Adjust Crop
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Screen (Left 8-columns) */}
        <div className="lg:col-span-8 space-y-6">
          {isWarping ? (
            <div className="clean-panel p-12 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-4 min-h-[450px] text-center shadow-sm">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <div className="space-y-1">
                <h3 className="text-slate-800 font-semibold">Straightening Document</h3>
                <p className="text-slate-400 text-xs">
                  Re-orienting perspectives and cropping layout borders...
                </p>
              </div>
            </div>
          ) : cropMode ? (
            <CropOverlay
              imageSrc={activePage.originalSrc}
              points={localPoints}
              onChange={handlePointsChange}
            />
          ) : (
            <CompareSlider
              originalSrc={activePage.croppedSrc || activePage.originalSrc}
              processedSrc={activePage.processedSrc || activePage.originalSrc}
              originalLabel="Original Flat Crop"
              processedLabel="Enhanced Scan"
            />
          )}

          {/* Filters dock when not cropping */}
          {!cropMode && !isWarping && (
            <div className="clean-panel p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider px-2 mb-2">
                Enhance Scan Filters
              </h3>
              <FilterToolbar currentMode={localFilterMode} onSelectMode={handleSelectFilter} />
            </div>
          )}
        </div>

        {/* Workspace Operations Dashboard (Right 4-columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="clean-panel p-6 rounded-2xl bg-white border border-slate-200 flex flex-col space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-850 tracking-wide border-b border-slate-100 pb-3">
              Operations Panel
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Current Step
                </h4>
                <p className="text-xs text-slate-650 leading-relaxed font-normal">
                  {cropMode
                    ? 'Position the four crop corner markers over the page edges. This alignment removes tilts and isolated background shapes.'
                    : 'Perspective flattened! Select a print correction filter below to adjust color levels or strip grey shadows.'}
                </p>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <span>Resolution:</span>
                <span className="font-semibold text-slate-600">Source Image Loaded</span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
              {cropMode ? (
                <button
                  onClick={handleConfirmCrop}
                  disabled={isWarping}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Lock &amp; Flatten Crop</span>
                </button>
              ) : (
                <button
                  onClick={() => setCropMode(true)}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <Crop className="w-4 h-4 text-blue-600" />
                  <span>Adjust Corners</span>
                </button>
              )}

              <button
                onClick={handleProceedToResults}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-50 hover:bg-blue-100/70 border border-blue-200 text-blue-700 font-bold transition-all cursor-pointer"
              >
                <span>Proceed to Export</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => router.push('/scanner')}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors pt-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Scanner
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
