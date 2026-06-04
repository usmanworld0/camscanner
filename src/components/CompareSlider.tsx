'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface CompareSliderProps {
  originalSrc: string;
  processedSrc: string;
  originalLabel?: string;
  processedLabel?: string;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({
  originalSrc,
  processedSrc,
  originalLabel = 'Before',
  processedLabel = 'Scanify',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0..100)
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      setContainerWidth(containerRef.current?.getBoundingClientRect().width || 0);
    };

    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    handleMove(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className="relative w-full max-w-2xl mx-auto h-[450px] rounded-xl overflow-hidden border border-slate-200 select-none touch-none bg-slate-100 group"
    >
      {/* Original Image (Background) */}
      <img
        src={originalSrc}
        alt="Original Scan"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none p-2"
      />
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-white text-xs font-semibold uppercase tracking-wider z-20">
        {originalLabel}
      </div>

      {/* Processed Image (Foreground) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={processedSrc}
          alt="Processed Scan"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none p-2"
          style={{ width: containerWidth || '100%' }}
        />
      </div>

      <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-blue-600 border border-blue-500 text-white text-xs font-semibold uppercase tracking-wider z-20 flex items-center gap-1.5">
        <SlidersHorizontal className="w-3 h-3" />
        {processedLabel}
      </div>

      {/* Sliding Handler Bar */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-blue-600 cursor-ew-resize z-30"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900 border-2 border-blue-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <div className="flex gap-0.5 items-center">
            <span className="w-0.5 h-2.5 bg-blue-400/70 rounded-full" />
            <span className="w-0.5 h-3 bg-blue-400 rounded-full" />
            <span className="w-0.5 h-2.5 bg-blue-400/70 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
