'use client';

import React from 'react';
import { useScan } from '@/store/ScanContext';
import { FileText, Calendar, Trash2, ArrowUpRight, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScanHistoryProps {
  onLoadSession?: () => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({ onLoadSession }) => {
  const { history, loadSession, deleteSession } = useScan();

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleLoad = (session: any) => {
    loadSession(session);
    if (onLoadSession) {
      onLoadSession();
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 rounded-2xl bg-white border border-slate-200 shadow-sm max-w-xl mx-auto">
        <div className="p-3.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400">
          <FolderOpen className="w-6 h-6 text-blue-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-slate-800 font-semibold text-sm">No saved scans found</h3>
          <p className="text-slate-400 text-xs max-w-xs">
            Documents you scan and save will appear here for fast retrieval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <FolderOpen className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Your Saved Documents</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {history.map((session) => (
            <motion.div
              key={session.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 p-4 flex gap-4 transition-all duration-200 group shadow-sm"
            >
              {/* First Page Image Preview */}
              <div className="w-16 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 relative shadow-inner">
                {session.pages[0]?.processedSrc ? (
                  <img
                    src={session.pages[0].processedSrc}
                    alt={session.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-350">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                {/* Pages count chip */}
                <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-slate-900/80 text-[8px] font-bold text-white border border-slate-700">
                  {session.pages.length} P
                </div>
              </div>

              {/* Session Meta Details */}
              <div className="flex flex-col justify-between flex-grow min-w-0">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-650 transition-colors">
                    {session.title}
                  </h4>
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                    <Calendar className="w-3 h-3 text-slate-450" />
                    <span>{formatDate(session.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleLoad(session)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100/75 border border-blue-200 text-blue-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Open
                    <ArrowUpRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => deleteSession(session.id)}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shadow-sm"
                    title="Delete Scan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
