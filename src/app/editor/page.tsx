'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScan } from '@/store/ScanContext';
import { warpPerspective } from '@/utils/opencvFilters';
import { applyImageFilter } from '@/utils/imageFilters';
import { CropOverlay } from '@/components/CropOverlay';
import { FilterToolbar } from '@/components/FilterToolbar';
import { CompareSlider } from '@/components/CompareSlider';
import { Point, ScanMode } from '@/types';
import {
  getCropCoverage,
  getMegapixels,
  getQualityStatus,
  getSkewDegrees,
  scanModeLabels,
  formatResolution,
} from '@/utils/scanMetrics';
import { Crop, ArrowRight, ArrowLeft, Loader2, Undo, Redo, Check, Ruler, Activity } from 'lucide-react';

const MAX_SYNC_OPENCV_CROP_PIXELS = 1200 * 1200;

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
  const [localFilterMode, setLocalFilterMode] = useState<ScanMode>('magic');
  const [error, setError] = useState<string | null>(null);

  // Redirect to scanner if no active image is present
  useEffect(() => {
    if (!activePage) {
      router.push('/scanner');
    } else {
      queueMicrotask(() => {
        if (activePage.points) {
          setLocalPoints(activePage.points);
        } else {
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
      });
    }
  }, [activePage, router]);

  const getReadyCVInstance = () => {
    if (typeof window === 'undefined') return null;

    const cv = (window as any).cv;
    return cv && cv.Mat && cv.imread && cv.imshow ? cv : null;
  };

  const handlePointsChange = (newPoints: [Point, Point, Point, Point]) => {
    setLocalPoints(newPoints);
  };

  const loadImageElement = (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image structure'));
      img.src = src;
    });
  };

  const cropCanvasToSelection = (
    sourceCanvas: HTMLCanvasElement,
    corners: [Point, Point, Point, Point]
  ) => {
    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    const left = Math.max(0, Math.floor(Math.min(...xs)));
    const top = Math.max(0, Math.floor(Math.min(...ys)));
    const right = Math.min(sourceCanvas.width, Math.ceil(Math.max(...xs)));
    const bottom = Math.min(sourceCanvas.height, Math.ceil(Math.max(...ys)));
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    const destCanvas = document.createElement('canvas');
    destCanvas.width = width;
    destCanvas.height = height;
    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) throw new Error('Failed to create crop context');

    destCtx.drawImage(sourceCanvas, left, top, width, height, 0, 0, width, height);
    return destCanvas;
  };

  const createWarpInput = (
    sourceCanvas: HTMLCanvasElement,
    corners: [Point, Point, Point, Point]
  ) => {
    const sourcePixels = sourceCanvas.width * sourceCanvas.height;
    if (sourcePixels <= MAX_SYNC_OPENCV_CROP_PIXELS) {
      return { canvas: sourceCanvas, corners };
    }

    const scale = Math.sqrt(MAX_SYNC_OPENCV_CROP_PIXELS / sourcePixels);
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
    resizedCanvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
    const resizedCtx = resizedCanvas.getContext('2d');
    if (!resizedCtx) {
      return { canvas: sourceCanvas, corners };
    }

    resizedCtx.drawImage(sourceCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);

    return {
      canvas: resizedCanvas,
      corners: corners.map((point) => ({
        x: point.x * scale,
        y: point.y * scale,
      })) as [Point, Point, Point, Point],
    };
  };

  const handleConfirmCrop = async () => {
    if (!activePage || !localPoints) return false;
    setIsWarping(true);
    setError(null);

    try {
      const img = await loadImageElement(activePage.originalSrc);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create offscreen context');
      ctx.drawImage(img, 0, 0);

      const absoluteCorners = localPoints.map((p) => ({
        x: p.x * img.width,
        y: p.y * img.height,
      })) as [Point, Point, Point, Point];

      let cv: any | null = null;
      let warpedCanvas: HTMLCanvasElement;

      try {
        cv = getReadyCVInstance();
        if (!cv) {
          throw new Error('Using fast canvas crop path');
        }
        const warpInput = createWarpInput(canvas, absoluteCorners);
        warpedCanvas = warpPerspective(cv, warpInput.canvas, warpInput.corners);
      } catch (cvErr) {
        console.warn('OpenCV perspective warp unavailable; using canvas crop fallback:', cvErr);
        warpedCanvas = cropCanvasToSelection(canvas, absoluteCorners);
      }

      const croppedBase64 = warpedCanvas.toDataURL('image/jpeg', 0.9);
      const processedBase64 = croppedBase64;

      updatePage(activePage.id, {
        points: localPoints,
        croppedSrc: croppedBase64,
        processedSrc: processedBase64,
        filterMode: 'original',
        ocrText: null,
        ocrConfidence: null,
        sourceWidth: img.width,
        sourceHeight: img.height,
      });

      setLocalFilterMode('original');
      setCropMode(false);
      return true;
    } catch (err: any) {
      console.error('OpenCV load failed inside editor:', err);
      setError(err.message || 'Could not prepare the selected crop.');
      return false;
    } finally {
      setIsWarping(false);
    }
  };

  const handleSelectFilter = async (mode: ScanMode) => {
    if (!activePage || !activePage.croppedSrc) return;
    setLocalFilterMode(mode);

    try {
      const img = await loadImageElement(activePage.croppedSrc);
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
          ocrText: null,
          ocrConfidence: null,
        });
    } catch (err) {
      console.error('Failed to apply filter enhancement:', err);
      setError('Could not apply the selected filter.');
    }
  };

  const handleProceedToResults = () => {
    if (cropMode) {
      handleConfirmCrop().then((completed) => {
        if (completed) router.push('/results');
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

  const qualityStatus = getQualityStatus(activePage);
  const cropCoverage = getCropCoverage(localPoints);
  const skewDegrees = getSkewDegrees(localPoints);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Crop &amp; Enhance</h1>
          <p className="text-slate-500 text-xs mt-1">
            {cropMode
              ? 'Align the quadrilateral with the page boundary before perspective correction.'
              : 'Select an image-processing mode and compare it against the flattened crop.'}
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
                  Pipeline Step
                </h4>
                <p className="text-xs text-slate-650 leading-relaxed font-normal">
                  {cropMode
                    ? 'Corner selection defines the homography used for perspective transform. Keep handles on the true paper edges.'
                    : `Current mode: ${scanModeLabels[localFilterMode]}. Re-run OCR after changing enhancement modes.`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Ruler className="w-3 h-3" />
                    Resolution
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-700">{formatResolution(activePage)}</p>
                  <p className="text-[10px] text-slate-400">{getMegapixels(activePage)}</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Activity className="w-3 h-3" />
                    Quality
                  </div>
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      qualityStatus.tone === 'good'
                        ? 'text-emerald-700'
                        : qualityStatus.tone === 'warn'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {qualityStatus.label}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {cropCoverage !== null ? `${cropCoverage.toFixed(0)}% crop area` : 'Crop pending'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between gap-3">
                  <span>Estimated skew</span>
                  <span className="font-semibold text-slate-700">
                    {skewDegrees !== null ? `${skewDegrees.toFixed(1)} deg` : '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Active filter</span>
                  <span className="font-semibold text-slate-700">{scanModeLabels[localFilterMode]}</span>
                </div>
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
                disabled={isWarping}
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
