'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Scan, Sparkles, Shield, Cpu, ChevronRight, FileCheck, ArrowRight, Zap } from 'lucide-react';
import { CompareSlider } from '@/components/CompareSlider';

// Simulated high-fidelity sample documents for before/after demo
const originalMockDoc = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="%23c4bfb1"/>
  <!-- Simulated document shadow -->
  <path d="M 0 0 L 600 200 L 600 800 L 0 800 Z" fill="rgba(0,0,0,0.18)" />
  <path d="M 300 0 C 450 300, 500 500, 600 800 L 600 0 Z" fill="rgba(0,0,0,0.12)" />
  <!-- Text lines -->
  <rect x="50" y="80" width="300" height="25" rx="5" fill="%234a473d" opacity="0.8"/>
  <rect x="50" y="130" width="500" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  <rect x="50" y="160" width="480" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  <rect x="50" y="190" width="510" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  <rect x="50" y="220" width="200" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  
  <rect x="50" y="280" width="220" height="20" rx="4" fill="%234a473d" opacity="0.8"/>
  <rect x="50" y="320" width="490" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  <rect x="50" y="350" width="500" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  <rect x="50" y="380" width="120" height="15" rx="3" fill="%234a473d" opacity="0.6"/>

  <rect x="50" y="440" width="280" height="25" rx="5" fill="%234a473d" opacity="0.8"/>
  <rect x="50" y="490" width="470" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  <rect x="50" y="520" width="510" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  <rect x="50" y="550" width="400" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  <rect x="50" y="580" width="450" height="15" rx="3" fill="%234a473d" opacity="0.6"/>
  
  <!-- Stamp signature shadow -->
  <circle cx="480" cy="680" r="45" fill="none" stroke="%239c3e3e" stroke-width="5" stroke-dasharray="10 5" opacity="0.6" />
  <text x="445" y="685" font-family="sans-serif" font-weight="bold" font-size="14" fill="%239c3e3e" opacity="0.6">APPROVED</text>
</svg>`;

const filteredMockDoc = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="%23ffffff"/>
  <!-- Pure crisp document lines -->
  <rect x="50" y="80" width="300" height="25" rx="5" fill="%23111827" />
  <rect x="50" y="130" width="500" height="15" rx="3" fill="%23374151" />
  <rect x="50" y="160" width="480" height="15" rx="3" fill="%23374151" />
  <rect x="50" y="190" width="510" height="15" rx="3" fill="%23374151" />
  <rect x="50" y="220" width="200" height="15" rx="3" fill="%23374151" />
  
  <rect x="50" y="280" width="220" height="20" rx="4" fill="%23111827" />
  <rect x="50" y="320" width="490" height="15" rx="3" fill="%23374151" />
  <rect x="50" y="350" width="500" height="15" rx="3" fill="%23374151" />
  <rect x="50" y="380" width="120" height="15" rx="3" fill="%23374151" />

  <rect x="50" y="440" width="280" height="25" rx="5" fill="%23111827" />
  <rect x="50" y="490" width="470" height="15" rx="3" fill="%23374151" />
  <rect x="50" y="520" width="510" height="15" rx="3" fill="%23374151" />
  <rect x="50" y="550" width="400" height="15" rx="3" fill="%23374151" />
  <rect x="50" y="580" width="450" height="15" rx="3" fill="%23374151" />
  
  <!-- Sharp vivid stamp -->
  <circle cx="480" cy="680" r="45" fill="none" stroke="%23dc2626" stroke-width="5" stroke-dasharray="10 5" />
  <text x="445" y="685" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23dc2626">APPROVED</text>
</svg>`;

const features = [
  {
    icon: Scan,
    title: 'Perspective Warping',
    description: 'Detects document borders and straightens skews instantly inside your browser.',
    badge: 'OpenCV Engine',
  },
  {
    icon: Sparkles,
    title: 'Image Correction',
    description: 'Removes shadows, binarizes text, and improves readability with precise scan filters.',
    badge: 'Pixel Filter',
  },
  {
    icon: Cpu,
    title: 'Text Extraction (OCR)',
    description: 'Extracts editable text structures directly from images without external uploads.',
    badge: 'Local OCR',
  },
  {
    icon: FileCheck,
    title: 'Multi-Page PDF Compiler',
    description: 'Compiles and merges multiple scanned pages into organized, high-density PDFs.',
    badge: 'PDF Compiler',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col space-y-20 py-12">
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Headline */}
        <div className="lg:col-span-7 space-y-6 text-left z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold"
          >
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Secure Web Document Scanner</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-slate-850"
          >
            Clean, Crisp Scans <br />
            <span className="text-blue-600">Right in Your Browser</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-650 text-base sm:text-lg max-w-xl font-normal leading-relaxed"
          >
            A lightweight, local-first utility for digitalizing papers. Crop boundaries, enhance readability, run instant text recognition, and compile documents into clean PDFs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 pt-2"
          >
            <Link
              href="/scanner"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all active:scale-98 cursor-pointer text-sm shadow-sm"
            >
              <span>Scan a Document</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/history"
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold transition-all active:scale-98 cursor-pointer text-sm shadow-sm"
            >
              <span>Saved Library</span>
            </Link>
          </motion.div>

          {/* Quick Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 max-w-md"
          >
            <div>
              <p className="text-xl font-bold text-slate-800">100% Offline</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Local Processing</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">Standard</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High Accuracy OCR</p>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">Private</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Cloud Tracking</p>
            </div>
          </motion.div>
        </div>

        {/* Right Slider Demonstration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-5 flex items-center justify-center z-10 w-full"
        >
          <div className="w-full relative clean-panel p-2 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
            <CompareSlider
              originalSrc={originalMockDoc}
              processedSrc={filteredMockDoc}
              originalLabel="Original Photo"
              processedLabel="Enhanced Scan"
            />
          </div>
        </motion.div>
      </section>

      {/* 2. VALUE PROPOSITIONS */}
      <section className="max-w-7xl mx-auto px-6 w-full space-y-10">
        <div className="text-center space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Engineered for Precision
          </h2>
          <p className="text-slate-550 text-xs sm:text-sm">
            A secure suite of web utilities that processes everything locally inside your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-all duration-200 flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 w-fit mb-5 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-base mb-1.5 group-hover:text-blue-600 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-slate-500 text-xs font-normal leading-relaxed">
                    {feat.description}
                  </p>
                </div>
                <div className="pt-4">
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500">
                    {feat.badge}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 3. SAFETY FIRST */}
      <section className="max-w-4xl mx-auto px-6 text-center">
        <div className="clean-panel p-8 sm:p-10 rounded-2xl bg-white border border-slate-200 flex flex-col items-center space-y-4 shadow-sm">
          <div className="p-3.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
            <Shield className="w-7 h-7" />
          </div>
          <div className="space-y-2 max-w-lg">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
              100% Private, Client-Side Scanning
            </h3>
            <p className="text-slate-550 text-xs sm:text-sm font-normal leading-relaxed">
              Unlike cloud services that parse and process your sensitive documents on remote servers, Scanify runs entirely inside your local sandbox. Edge detection, skew correction, and OCR extraction are executed directly on your machine. Your private data never leaves your browser.
            </p>
          </div>
          <Link
            href="/scanner"
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer group pt-2"
          >
            Open Document Workspace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
