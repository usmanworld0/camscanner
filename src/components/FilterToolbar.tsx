'use client';

import React from 'react';
import { ScanMode } from '@/types';
import { Image, FileText, Sparkles, Wand2, Contrast } from 'lucide-react';
import { motion } from 'framer-motion';

interface FilterToolbarProps {
  currentMode: ScanMode;
  onSelectMode: (mode: ScanMode) => void;
}

interface FilterOption {
  mode: ScanMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const filterOptions: FilterOption[] = [
  {
    mode: 'original',
    label: 'Original',
    description: 'No filters',
    icon: Image,
  },
  {
    mode: 'bw',
    label: 'B&W Scan',
    description: 'Crisp shadow-free text',
    icon: FileText,
  },
  {
    mode: 'enhanced',
    label: 'Enhanced',
    description: 'Boost contrast',
    icon: Sparkles,
  },
  {
    mode: 'magic',
    label: 'Magic Color',
    description: 'Vivid color pop',
    icon: Wand2,
  },
  {
    mode: 'highcontrast',
    label: 'High Contrast',
    description: 'Heavy threshold',
    icon: Contrast,
  },
];

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  currentMode,
  onSelectMode,
}) => {
  return (
    <div className="w-full py-2 px-1 overflow-x-auto scrollbar-thin">
      <div className="flex gap-3 justify-start md:justify-center min-w-max px-1">
        {filterOptions.map((opt) => {
          const isActive = currentMode === opt.mode;
          const Icon = opt.icon;

          return (
            <button
              key={opt.mode}
              onClick={() => onSelectMode(opt.mode)}
              className="relative focus:outline-none cursor-pointer"
            >
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative px-4 py-3.5 rounded-xl flex flex-col items-center justify-center border text-center transition-all duration-200 w-28 h-22
                  ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
              >
                {/* Mode Icon */}
                <div
                  className={`p-2 rounded-lg border mb-1.5 flex items-center justify-center
                    ${
                      isActive
                        ? 'bg-blue-100/50 border-blue-200 text-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-550'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Mode Label */}
                <span className={`text-[11px] font-bold tracking-wide ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                  {opt.label}
                </span>

                {/* Subtext */}
                <span className="text-[9px] text-slate-400 font-medium mt-0.5 max-w-[90px] truncate">
                  {opt.description}
                </span>

                {/* Active Indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeFilterIndicator"
                    className="absolute -bottom-1 left-1/3 right-1/3 h-0.5 bg-blue-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
