'use client';

import React from 'react';
import { ScanMode } from '@/types';
import { scanModeDescriptions, scanModeLabels } from '@/utils/scanMetrics';
import { Image, FileText, Contrast, Waves, Focus, Palette, CircleDot } from 'lucide-react';
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
    label: scanModeLabels.original,
    description: scanModeDescriptions.original,
    icon: Image,
  },
  {
    mode: 'grayscale',
    label: scanModeLabels.grayscale,
    description: scanModeDescriptions.grayscale,
    icon: CircleDot,
  },
  {
    mode: 'bw',
    label: scanModeLabels.bw,
    description: scanModeDescriptions.bw,
    icon: FileText,
  },
  {
    mode: 'enhanced',
    label: scanModeLabels.enhanced,
    description: scanModeDescriptions.enhanced,
    icon: Contrast,
  },
  {
    mode: 'denoise',
    label: scanModeLabels.denoise,
    description: scanModeDescriptions.denoise,
    icon: Waves,
  },
  {
    mode: 'sharpen',
    label: scanModeLabels.sharpen,
    description: scanModeDescriptions.sharpen,
    icon: Focus,
  },
  {
    mode: 'magic',
    label: scanModeLabels.magic,
    description: scanModeDescriptions.magic,
    icon: Palette,
  },
  {
    mode: 'highcontrast',
    label: scanModeLabels.highcontrast,
    description: scanModeDescriptions.highcontrast,
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
                className={`relative px-3 py-3 rounded-lg flex flex-col items-center justify-center border text-center transition-all duration-200 w-32 h-24
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
                <span className={`text-[11px] font-bold tracking-wide leading-tight ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                  {opt.label}
                </span>

                {/* Subtext */}
                <span className="text-[9px] text-slate-400 font-medium mt-0.5 max-w-[112px] leading-tight line-clamp-2">
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
