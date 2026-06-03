'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ScanHistory } from '@/components/ScanHistory';
import { Plus, Scan, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const router = useRouter();

  const handleLoadSessionComplete = () => {
    router.push('/results');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col space-y-8">
      {/* Page Title & CTA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-slate-800">Scanned Documents Library</h1>
          <p className="text-slate-500 text-xs">
            Review, re-load, export, or manage your locally archived document scans.
          </p>
        </div>

        <Link
          href="/scanner"
          className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:scale-102 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Scan Pack</span>
        </Link>
      </div>

      {/* History Grid Container */}
      <div className="w-full">
        <ScanHistory onLoadSession={handleLoadSessionComplete} />
      </div>

      {/* Premium Info Panel */}
      <div className="max-w-4xl mx-auto w-full pt-6">
        <div className="clean-panel p-5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5 text-left">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-blue-600">
              <Scan className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-850">Need to scan another document or invoice?</h4>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed max-w-md">
                Launch the secure capture interface to crop borders, straighten tilts, and compile clean PDFs.
              </p>
            </div>
          </div>
          <Link
            href="/scanner"
            className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold hover:scale-102 active:scale-98 transition-all cursor-pointer group flex-shrink-0 shadow-sm"
          >
            Open Scanner
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
