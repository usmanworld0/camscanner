'use client';

import React, { useState } from 'react';
import { ScanPage } from '@/types';
import { useScan } from '@/store/ScanContext';
import { ZoomIn, ZoomOut, RotateCw, Trash2, Crop } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImagePreviewProps {
  page: ScanPage;
  onRecrop?: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  page,
  onRecrop,
}) => {
  const { removePage, updatePage } = useScan();
  const [zoomScale, setZoomScale] = useState(1); // multiplier 1x to 3x

  const srcToRender = page.processedSrc || page.croppedSrc || page.originalSrc;

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(1, prev - 0.25));
  };

  const handleRotate = () => {
    const nextRotation = (page.rotation + 90) % 360;
    updatePage(page.id, { rotation: nextRotation });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this page?')) {
      removePage(page.id);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col space-y-4">
      {/* Floating Control Hub */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
        {/* Zoom scale display */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          Scale: <span className="text-blue-600">{Math.round(zoomScale * 100)}%</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={zoomScale <= 1}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-650 transition-all cursor-pointer shadow-sm"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={zoomScale >= 3}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none text-slate-650 transition-all cursor-pointer shadow-sm"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-slate-200" />

          {/* Manual Recrop */}
          {onRecrop && (
            <button
              onClick={onRecrop}
              className="p-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-650 hover:text-blue-600 transition-all cursor-pointer shadow-sm"
              title="Adjust Crop Corners"
            >
              <Crop className="w-4 h-4" />
            </button>
          )}

          {/* Rotate */}
          <button
            onClick={handleRotate}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-650 transition-all cursor-pointer shadow-sm"
            title="Rotate 90 degrees"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-slate-200" />

          {/* Delete Page */}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shadow-sm"
            title="Delete page"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Frame */}
      <div className="w-full h-[55vh] rounded-2xl overflow-auto flex items-center justify-center bg-slate-100 border border-slate-200 relative p-4 scrollbar-thin shadow-sm">
        <motion.div
          animate={{
            rotate: page.rotation,
            scale: zoomScale,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          className="relative max-w-full max-h-full flex items-center justify-center"
          style={{ originX: 0.5, originY: 0.5 }}
        >
          <img
            src={srcToRender}
            alt="Scanned Document Page"
            className="max-w-full max-h-[50vh] object-contain rounded shadow-lg pointer-events-none select-none border border-slate-200"
          />
        </motion.div>
      </div>
    </div>
  );
};
