'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Point } from '@/types';
import { motion } from 'framer-motion';

interface CropOverlayProps {
  imageSrc: string;
  points: [Point, Point, Point, Point]; // [TL, TR, BR, BL] in normalized (0..1) coordinates
  onChange: (points: [Point, Point, Point, Point]) => void;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({
  imageSrc,
  points,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  const [activeHandle, setActiveHandle] = useState<number | null>(null);

  // Update image dimensions when loaded or window resizes
  const updateDimensions = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      setContainerDims({
        width: containerRect?.width || 0,
        height: containerRect?.height || 0,
      });
      
      setImgDims({
        width: rect.width,
        height: rect.height,
        left: rect.left - (containerRect?.left || 0),
        top: rect.top - (containerRect?.top || 0),
      });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleImageLoad = () => {
    setTimeout(updateDimensions, 100);
  };

  const toPx = (p: Point) => {
    return {
      x: imgDims.left + p.x * imgDims.width,
      y: imgDims.top + p.y * imgDims.height,
    };
  };

  const toNormalized = (x: number, y: number) => {
    if (imgDims.width === 0 || imgDims.height === 0) return { x: 0, y: 0 };
    
    const xClamped = Math.max(0, Math.min(imgDims.width, x - imgDims.left));
    const yClamped = Math.max(0, Math.min(imgDims.height, y - imgDims.top));

    return {
      x: xClamped / imgDims.width,
      y: yClamped / imgDims.height,
    };
  };

  const handleStart = (index: number) => {
    setActiveHandle(index);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (activeHandle === null || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const xPx = clientX - containerRect.left;
    const yPx = clientY - containerRect.top;

    const normalizedPoint = toNormalized(xPx, yPx);

    const newPoints = [...points] as [Point, Point, Point, Point];
    newPoints[activeHandle] = normalizedPoint;
    onChange(newPoints);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeHandle === null) return;
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setActiveHandle(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeHandle === null) return;
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    if (activeHandle !== null) {
      const handleGlobalMouseUp = () => setActiveHandle(null);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchend', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('touchend', handleGlobalMouseUp);
      };
    }
  }, [activeHandle]);

  const pxPoints = points.map(toPx);
  const [tl, tr, br, bl] = pxPoints;

  const cropPath = `M ${tl.x} ${tl.y} L ${tr.x} ${tr.y} L ${br.x} ${br.y} L ${bl.x} ${bl.y} Z`;
  
  const outerMaskPath = `
    M 0 0 
    H ${containerDims.width} 
    V ${containerDims.height} 
    H 0 Z 
    ${cropPath}
  `;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      className="relative select-none touch-none w-full max-h-[60vh] flex items-center justify-center bg-slate-100 rounded-xl p-4 overflow-hidden border border-slate-200"
    >
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Crop Source"
        onLoad={handleImageLoad}
        className="max-w-full max-h-[55vh] object-contain rounded shadow-lg pointer-events-none"
      />

      {imgDims.width > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Outside Mask */}
          <path
            d={outerMaskPath}
            fill="rgba(15, 23, 42, 0.45)"
            fillRule="evenodd"
            className="transition-all duration-75"
          />

          {/* Clean blue Crop border outline */}
          <path
            d={cropPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeDasharray="4 2"
            className="transition-all duration-75"
          />

          {/* Bounding guides */}
          <line x1={(tl.x + bl.x) / 2} y1={(tl.y + bl.y) / 2} x2={(tr.x + br.x) / 2} y2={(tr.y + br.y) / 2} stroke="rgba(37, 99, 235, 0.2)" strokeWidth="1" />
          <line x1={(tl.x + tr.x) / 2} y1={(tl.y + tr.y) / 2} x2={(bl.x + br.x) / 2} y2={(bl.y + br.y) / 2} stroke="rgba(37, 99, 235, 0.2)" strokeWidth="1" />
        </svg>
      )}

      {/* Render Drag Handles */}
      {imgDims.width > 0 &&
        pxPoints.map((pt, idx) => {
          const isDragging = activeHandle === idx;
          return (
            <div
              key={idx}
              onMouseDown={() => handleStart(idx)}
              onTouchStart={() => handleStart(idx)}
              className="absolute cursor-pointer flex items-center justify-center p-4 -translate-x-1/2 -translate-y-1/2 select-none touch-none"
              style={{ left: pt.x, top: pt.y }}
            >
              <motion.div
                animate={{
                  scale: isDragging ? 1.25 : 1,
                  borderColor: isDragging ? '#3b82f6' : '#2563eb',
                }}
                className={`w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center shadow-md transition-colors`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${isDragging ? 'bg-blue-600 scale-110' : 'bg-blue-600'}`} />
              </motion.div>
            </div>
          );
        })}

      {/* Magnifying precision zoom glass */}
      {activeHandle !== null && (
        <div
          className="absolute top-4 left-4 p-2 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center z-50 pointer-events-none shadow-md"
        >
          <div className="w-24 h-24 overflow-hidden rounded border border-blue-200 relative">
            <div
              className="absolute w-[400%] h-[400%]"
              style={{
                backgroundImage: `url(${imageSrc})`,
                backgroundSize: '100% 100%',
                backgroundPosition: `${points[activeHandle].x * 100}% ${points[activeHandle].y * 100}%`,
                transform: 'translate(-37.5%, -37.5%) scale(1.5)',
              }}
            />
            {/* Precision dot crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shadow-sm" />
            </div>
          </div>
          <span className="text-[10px] text-blue-600 font-bold mt-1.5 tracking-wider uppercase">
            Precision View
          </span>
        </div>
      )}
    </div>
  );
};
