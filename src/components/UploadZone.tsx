'use client';

import React, { useCallback, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { useScan } from '@/store/ScanContext';

export interface UploadedScan {
  id: string;
  originalSrc: string;
}

interface UploadZoneProps {
  onUploadComplete?: (uploads: UploadedScan[]) => void | Promise<void>;
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Could not read image file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
};

const resizeImage = (dataUrl: string, maxDim = 1800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= maxDim && img.naturalHeight <= maxDim) {
        resolve(dataUrl);
        return;
      }

      const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
  const { addPage } = useScan();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        setError('Please select an image file.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const uploads: UploadedScan[] = [];

        for (const file of imageFiles) {
          const dataUrl = await readFileAsDataUrl(file);
          const originalSrc = await resizeImage(dataUrl);
          const id = addPage(originalSrc);
          uploads.push({ id, originalSrc });
        }

        if (uploads.length > 0) {
          await onUploadComplete?.(uploads);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setError(err instanceof Error ? err.message : 'Could not import the selected image.');
      } finally {
        setIsLoading(false);
      }
    },
    [addPage, onUploadComplete]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files;
      if (files && files.length > 0) {
        void processFiles(files);
      }
      event.currentTarget.value = '';
    },
    [processFiles]
  );

  const handleDrag = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(event.type === 'dragenter' || event.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);

      if (event.dataTransfer.files.length > 0) {
        void processFiles(event.dataTransfer.files);
      }
    },
    [processFiles]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-2xl p-8 sm:p-12 border-2 border-dashed transition-colors flex flex-col items-center justify-center min-h-[350px] bg-white shadow-sm
          ${isDragActive ? 'border-blue-600 bg-blue-50/40' : 'border-slate-300 hover:border-slate-400'}`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center space-y-3 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-600 text-sm font-semibold">Importing image...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-5 w-full">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-blue-600">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800">Import document pages</h3>
              <p className="text-slate-500 text-xs max-w-sm">
                Select images from gallery, capture with camera, or drop files here.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 w-full justify-center">
              <label className="relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors cursor-pointer text-xs shadow-sm">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Browse Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleInputChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Browse gallery images"
                />
              </label>

              <label className="relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold border border-blue-500 transition-colors cursor-pointer text-xs shadow-sm">
                <Camera className="w-4 h-4" />
                <span>Capture Document</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleInputChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Capture document image"
                />
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
