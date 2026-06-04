'use client';

import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { FileText, Copy, Download, Loader2, AlertCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface OCRPanelProps {
  imageSrc: string;
  ocrText: string | null;
  ocrConfidence: number | null;
  onOCRComplete: (text: string, confidence: number) => void;
}

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

  const runOCR = async () => {
    setIsRunning(true);
    setError(null);
    setProgress(0);
    setStatusText('Loading OCR engine...');

    try {
      const result = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setStatusText('Extracting text (OCR)...');
            setProgress(Math.round(m.progress * 100));
          } else {
            setStatusText(m.status.charAt(0).toUpperCase() + m.status.slice(1) + '...');
          }
        },
      });

      const text = result.data.text;
      const confidence = result.data.confidence;

      onOCRComplete(text, confidence);
      setEditedText(text);
      setIsRunning(false);
    } catch (err: unknown) {
      console.error('OCR Error:', err);
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
