'use client';

import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import { FileText, Copy, Download, Loader2, AlertCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface OCRPanelProps {
  imageSrc: string;
  ocrText: string | null;
  ocrConfidence: number | null;
  onOCRComplete: (text: string, confidence: number) => void;
}

interface OcrVariant {
  name: string;
  src: string;
  psm: string;
}

interface OcrCandidate {
  text: string;
  confidence: number;
  variant: string;
}

const OCR_PSM = {
  AUTO: '3',
  SINGLE_BLOCK: '6',
  SPARSE_TEXT: '11',
};

export const OCRPanel: React.FC<OCRPanelProps> = ({
  imageSrc,
  ocrText,
  ocrConfidence,
  onOCRComplete,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [editedText, setEditedText] = useState(ocrText || '');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load image for OCR'));
      img.src = src;
    });
  };

  const createBaseCanvas = async (src: string) => {
    const img = await loadImageElement(src);
    const minOCRWidth = 1800;
    const maxOCRWidth = 2600;
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    const scale = Math.min(
      maxOCRWidth / naturalWidth,
      Math.max(1, minOCRWidth / naturalWidth)
    );

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not prepare OCR canvas');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas;
  };

  const cloneCanvas = (source: HTMLCanvasElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not clone OCR canvas');
    ctx.drawImage(source, 0, 0);
    return canvas;
  };

  const applyGrayscaleContrast = (canvas: HTMLCanvasElement, contrast = 1.35, brightness = 8) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const adjusted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128 + brightness));
      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const applyAdaptiveThreshold = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const gray = new Uint8Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    const integral = new Uint32Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y += 1) {
      let rowSum = 0;
      for (let x = 0; x < width; x += 1) {
        rowSum += gray[y * width + x];
        integral[(y + 1) * (width + 1) + (x + 1)] =
          integral[y * (width + 1) + (x + 1)] + rowSum;
      }
    }

    const radius = Math.max(18, Math.floor(Math.min(width, height) / 35));
    const offset = 9;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const x1 = Math.max(0, x - radius);
        const x2 = Math.min(width - 1, x + radius);
        const y1 = Math.max(0, y - radius);
        const y2 = Math.min(height - 1, y + radius);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum =
          integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
          integral[(y2 + 1) * (width + 1) + x1] -
          integral[y1 * (width + 1) + (x2 + 1)] +
          integral[y1 * (width + 1) + x1];
        const threshold = sum / count - offset;
        const value = gray[y * width + x] < threshold ? 0 : 255;
        const dataIndex = (y * width + x) * 4;
        data[dataIndex] = value;
        data[dataIndex + 1] = value;
        data[dataIndex + 2] = value;
        data[dataIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const createOCRVariants = async (src: string): Promise<OcrVariant[]> => {
    const baseCanvas = await createBaseCanvas(src);
    const normalized = applyGrayscaleContrast(cloneCanvas(baseCanvas), 1.4, 10);
    const soft = applyGrayscaleContrast(cloneCanvas(baseCanvas), 1.18, 6);
    const binary = applyAdaptiveThreshold(applyGrayscaleContrast(cloneCanvas(baseCanvas), 1.25, 4));

    return [
      {
        name: 'normalized-lstm-auto',
        src: normalized.toDataURL('image/png'),
        psm: OCR_PSM.AUTO,
      },
      {
        name: 'binary-lstm-block',
        src: binary.toDataURL('image/png'),
        psm: OCR_PSM.SINGLE_BLOCK,
      },
      {
        name: 'soft-lstm-sparse',
        src: soft.toDataURL('image/png'),
        psm: OCR_PSM.SPARSE_TEXT,
      },
    ];
  };

  const normalizeOCRText = (text: string) => {
    return text
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const scoreCandidate = (candidate: OcrCandidate) => {
    const usefulChars = candidate.text.replace(/\s/g, '').length;
    return candidate.confidence + Math.min(20, usefulChars / 15);
  };

  const runOCR = async () => {
    setIsRunning(true);
    setError(null);
    setProgress(0);
    setStatusText('Preparing OCR image...');

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      const variants = await createOCRVariants(imageSrc);
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          const engineProgress = Math.round((m.progress || 0) * 35);
          if (m.status === 'recognizing text') {
            setStatusText('Recognizing text with pretrained English model...');
            setProgress((prev) => Math.max(prev, 35 + engineProgress));
          } else {
            setStatusText(m.status.charAt(0).toUpperCase() + m.status.slice(1) + '...');
          }
        },
      });

      await worker.setParameters({
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
        tessedit_do_invert: '0',
      });

      const candidates: OcrCandidate[] = [];

      for (let index = 0; index < variants.length; index += 1) {
        const variant = variants[index];
        setStatusText(`Testing OCR pass ${index + 1} of ${variants.length}...`);
        setProgress(Math.round((index / variants.length) * 65));

        const result = await worker.recognize(variant.src, {
          tessedit_pageseg_mode: variant.psm,
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
        } as any);

        candidates.push({
          text: normalizeOCRText(result.data.text || ''),
          confidence: Number.isFinite(result.data.confidence) ? result.data.confidence : 0,
          variant: variant.name,
        });
      }

      await worker.terminate();
      worker = null;

      const best = candidates
        .filter((candidate) => candidate.text.length > 0)
        .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0] || {
        text: '',
        confidence: 0,
        variant: 'none',
      };

      console.log(`Selected OCR result from ${best.variant} at ${best.confidence.toFixed(1)}% confidence`);

      onOCRComplete(best.text, Math.round(best.confidence));
      setEditedText(best.text);
      setProgress(100);
      setStatusText('OCR complete.');
      setIsRunning(false);
    } catch (err: unknown) {
      console.error('OCR Error:', err);
      if (worker) {
        await worker.terminate().catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : 'Failed to extract text');
      setIsRunning(false);
    }
  };

  const handleCopy = async () => {
    if (!editedText) return;
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    if (!editedText) return;
    const blob = new Blob([editedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extracted-text-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl p-6 bg-white border border-slate-200 shadow-sm flex flex-col space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">OCR Text Recognition</h3>
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Language: <span className="text-blue-600">English (eng)</span>
        </div>
      </div>

      {/* Main Content Area */}
      {!ocrText && !isRunning ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="space-y-1">
            <p className="text-slate-700 font-semibold text-sm">Extract text from scan</p>
            <p className="text-slate-450 text-xs max-w-xs mx-auto">
              Runs OCR locally on the selected processed page. For best results, use adaptive binarization or contrast stretch first.
            </p>
          </div>
          <button
            onClick={runOCR}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Extract Text (OCR)
          </button>
        </div>
      ) : isRunning ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <span className="absolute text-[10px] font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="text-center space-y-1 w-full max-w-xs">
            <p className="text-slate-650 text-xs font-medium">{statusText}</p>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mx-auto border border-slate-100">
              <motion.div
                className="h-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status & Accuracy Meter */}
          {ocrConfidence !== null && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-150 text-xs font-medium">
              <span className="text-slate-500">Recognition Accuracy:</span>
              <div className="flex items-center gap-2.5">
                <div className="w-20 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${ocrConfidence > 85 ? 'bg-blue-600' : ocrConfidence > 65 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${ocrConfidence}%` }}
                  />
                </div>
                <span className={`font-bold ${ocrConfidence > 85 ? 'text-blue-600' : ocrConfidence > 65 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {ocrConfidence}%
                </span>
              </div>
            </div>
          )}

          {/* Editable text results */}
          <div className="relative">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-52 p-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 placeholder-slate-400 text-xs font-sans focus:outline-none focus:border-blue-500 resize-y transition-colors shadow-sm"
              placeholder="Extracted text will appear here. Edit it directly if needed."
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={runOCR}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Loader2 className="w-3.5 h-3.5" /> Re-run OCR
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!editedText}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-800 transition-all text-xs font-semibold cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                disabled={!editedText}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-800 transition-all text-xs font-semibold cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Download TXT
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Error: {error}</span>
        </div>
      )}
    </div>
  );
};
