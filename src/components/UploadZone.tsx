'use client';

import React, { useCallback, useState } from 'react';
import { useScan } from '@/store/ScanContext';
import { Upload, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadZoneProps {
  onUploadComplete?: (id: string, originalSrc: string) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
  const { addPage } = useScan();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPG, JPEG)');
        return;
      }

      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result) {
          const newPageId = addPage(result);
          setIsLoading(false);
          if (onUploadComplete) {
            onUploadComplete(newPageId, result);
          }
        }
      };
      reader.onerror = () => {
        setIsLoading(false);
        alert('Failed to read image file');
      };
      reader.readAsDataURL(file);
    },
    [addPage, onUploadComplete]
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

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
      }
      e.target.value = ''; // Reset input to allow selecting the same file again
    },
    [processFile]
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
          // Prevent triggering if a button/label inside was already clicked
          if ((e.target as HTMLElement).closest('label')) return;
          const input = document.getElementById('file-upload') as HTMLInputElement;
          if (input) input.click();
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
          id="file-upload"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <input
          type="file"
          id="camera-upload"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Importing document...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-5">
            {/* Simple neat icon wrapper */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 group-hover:text-blue-600 transition-colors">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800">
                Upload your document
              </h3>
              <p className="text-slate-500 text-xs max-w-sm">
                Drag and drop your document image here, or use the options below. Supports PNG, JPG, and JPEG.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 w-full justify-center">
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-250 transition-all cursor-pointer text-xs shadow-sm"
              >
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Browse Gallery
              </label>

              <label
                htmlFor="camera-upload"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold border border-blue-500 transition-all cursor-pointer text-xs shadow-sm"
              >
                <Camera className="w-4 h-4" />
                Capture Document
              </label>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
