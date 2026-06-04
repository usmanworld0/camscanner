'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Camera,
  Crop,
  FileText,
  Gauge,
  Layers,
  Library,
  ScanLine,
  SlidersHorizontal,
} from 'lucide-react';
import { CompareSlider } from '@/components/CompareSlider';

const originalMockDoc = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="%23c7c0b2"/><path d="M 0 0 L 600 180 L 600 800 L 0 800 Z" fill="rgba(0,0,0,0.17)"/><path d="M 330 0 C 430 280, 500 510, 600 800 L 600 0 Z" fill="rgba(0,0,0,0.12)"/><rect x="54" y="70" width="280" height="24" rx="3" fill="%233d3b34" opacity="0.8"/><rect x="54" y="125" width="490" height="13" rx="2" fill="%233d3b34" opacity="0.58"/><rect x="54" y="153" width="440" height="13" rx="2" fill="%233d3b34" opacity="0.58"/><rect x="54" y="181" width="510" height="13" rx="2" fill="%233d3b34" opacity="0.58"/><rect x="54" y="240" width="210" height="19" rx="3" fill="%233d3b34" opacity="0.75"/><rect x="54" y="282" width="470" height="13" rx="2" fill="%233d3b34" opacity="0.58"/><rect x="54" y="310" width="505" height="13" rx="2" fill="%233d3b34" opacity="0.58"/><rect x="54" y="338" width="260" height="13" rx="2" fill="%233d3b34" opacity="0.58"/><rect x="54" y="430" width="280" height="22" rx="3" fill="%233d3b34" opacity="0.78"/><rect x="54" y="482" width="492" height="13" rx="2" fill="%233d3b34" opacity="0.58"/><rect x="54" y="510" width="440" height="13" rx="2" fill="%233d3b34" opacity="0.58"/><circle cx="470" cy="664" r="45" fill="none" stroke="%239c3e3e" stroke-width="5" stroke-dasharray="10 5" opacity="0.55"/></svg>`;

const processedMockDoc = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="%23ffffff"/><rect x="54" y="70" width="280" height="24" rx="3" fill="%23111827"/><rect x="54" y="125" width="490" height="13" rx="2" fill="%232f3a4a"/><rect x="54" y="153" width="440" height="13" rx="2" fill="%232f3a4a"/><rect x="54" y="181" width="510" height="13" rx="2" fill="%232f3a4a"/><rect x="54" y="240" width="210" height="19" rx="3" fill="%23111827"/><rect x="54" y="282" width="470" height="13" rx="2" fill="%232f3a4a"/><rect x="54" y="310" width="505" height="13" rx="2" fill="%232f3a4a"/><rect x="54" y="338" width="260" height="13" rx="2" fill="%232f3a4a"/><rect x="54" y="430" width="280" height="22" rx="3" fill="%23111827"/><rect x="54" y="482" width="492" height="13" rx="2" fill="%232f3a4a"/><rect x="54" y="510" width="440" height="13" rx="2" fill="%232f3a4a"/><circle cx="470" cy="664" r="45" fill="none" stroke="%23dc2626" stroke-width="5" stroke-dasharray="10 5"/></svg>`;

const pipeline = [
  { title: 'Capture', text: 'Import camera/gallery images and store page resolution.', icon: Camera },
  { title: 'Detect', text: 'Run contour detection to estimate document corners.', icon: ScanLine },
  { title: 'Correct', text: 'Apply homography-based perspective transform.', icon: Crop },
  { title: 'Enhance', text: 'Use grayscale, threshold, denoise, sharpen, or color normalization.', icon: SlidersHorizontal },
  { title: 'Recognize', text: 'Run local OCR only when text extraction is required.', icon: FileText },
  { title: 'Export', text: 'Reorder pages and compile a multi-page PDF.', icon: Layers },
];

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="clean-panel flex h-full flex-col justify-between rounded-xl p-6">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <Gauge className="h-3.5 w-3.5 text-blue-600" />
                Digital Image Processing Project
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Document scanning workbench
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  A local browser app for the full document-image pipeline: border detection,
                  perspective correction, enhancement, OCR, page ordering, history, and PDF export.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/scanner"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  Open Capture
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/history"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <Library className="h-4 w-4 text-blue-600" />
                  Saved Scans
                </Link>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-200 pt-5 text-xs">
              <div>
                <p className="font-bold text-slate-900">OpenCV.js</p>
                <p className="mt-1 text-slate-500">Contours and warp</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Tesseract</p>
                <p className="mt-1 text-slate-500">Local OCR</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">PDF Tools</p>
                <p className="mt-1 text-slate-500">Multi-page export</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <CompareSlider
            originalSrc={originalMockDoc}
            processedSrc={processedMockDoc}
            originalLabel="Phone capture"
            processedLabel="Processed scan"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pipeline.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="clean-panel rounded-xl p-5">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-blue-600">
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.text}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
