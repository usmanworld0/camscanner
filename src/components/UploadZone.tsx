'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useScan } from '@/store/ScanContext';
import { Upload, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export interface UploadedScan {
  id: string;
  originalSrc: string;
}

// Helper to resize image client-side to maximum of 1600px width/height to optimize memory & performance
const resizeImage = (dataUrl: string, maxDim: number = 1600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      if (img.width <= maxDim && img.height <= maxDim) {
        resolve(dataUrl);
        return;
      }

      const scale = Math.min(maxDim / img.width, maxDim / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
  });
};

interface UploadZoneProps {
  onUploadComplete?: (uploads: UploadedScan[]) => void | Promise<void>;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
  const { addPage } = useScan();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File): Promise<UploadedScan | null> => {
      if (!file.type.startsWith('image/')) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const result = reader.result as string;
          if (!result) {
            resolve(null);
            return;
          }

          try {
            const optimizedResult = await resizeImage(result, 1800);
            const newPageId = addPage(optimizedResult);
            resolve({ id: newPageId, originalSrc: optimizedResult });
          } catch (error) {
            console.error('Image optimization failed, falling back to original:', error);
            const newPageId = addPage(result);
            resolve({ id: newPageId, originalSrc: result });
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    },
    [addPage]
  );

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        alert('Please upload image files (PNG, JPG, JPEG, WEBP).');
        return;
      }

      setIsLoading(true);
      try {
        const uploads: UploadedScan[] = [];
        for (const file of imageFiles) {
          const upload = await processFile(file);
          if (upload) uploads.push(upload);
        }

        if (uploads.length > 0 && onUploadComplete) {
          requestAnimationFrame(() => {
            void onUploadComplete(uploads);
          });
        }
      } finally {
        setIsLoading(false);
      };
    },
    [onUploadComplete, processFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void processFiles(e.target.files);
      }
      e.target.value = ''; // Reset input to allow selecting the same file again
    },
    [processFiles]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={(e) => {
          // Prevent triggering if an inner action button was clicked.
          if ((e.target as HTMLElement).closest('[data-upload-action]')) return;
          fileInputRef.current?.click();
        }}
        className={`relative overflow-hidden rounded-2xl p-12 border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center min-h-[350px] cursor-pointer shadow-sm
          ${
            isDragActive
              ? 'border-blue-600 bg-blue-50/30 scale-[1.01]'
              : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'
          }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <input
          type="file"
          ref={cameraInputRef}
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Importing page images...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-5">
            {/* Simple neat icon wrapper */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 group-hover:text-blue-600 transition-colors">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800">
                Import document pages
              </h3>
              <p className="text-slate-500 text-xs max-w-sm">
                Drop one image or a batch of pages. The scanner accepts PNG, JPG, JPEG, and WEBP captures.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 w-full justify-center">
              <button
                type="button"
                data-upload-action="gallery"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-250 transition-all cursor-pointer text-xs shadow-sm"
              >
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Browse Gallery
              </button>

              <button
                type="button"
                data-upload-action="camera"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold border border-blue-500 transition-all cursor-pointer text-xs shadow-sm"
              >
                <Camera className="w-4 h-4" />
                Capture Document
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
