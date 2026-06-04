'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scan, FileCode, History, Home, Menu, X, ArrowRight, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/scanner', label: 'Scan', icon: Scan },
  { href: '/editor', label: 'Crop & Edit', icon: FileCode },
  { href: '/results', label: 'OCR & PDF', icon: FileText },
  { href: '/history', label: 'Library', icon: History },
];

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);
  const isOpen = menuOpenForPath === pathname;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 group-hover:border-blue-300 transition-colors">
            <Scan className="w-5 h-5 text-blue-600 group-hover:rotate-90 transition-transform duration-500" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-wide">
            DIP Scanner<span className="text-blue-600">.</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-50 border border-slate-200">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer
                  ${isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 bg-blue-100/50 border border-blue-200/50 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Button (Go to Scan page) */}
        <div className="hidden md:flex items-center">
          <Link
            href="/scanner"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-sm"
          >
            <span>Start Scan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
          onClick={() => setMenuOpenForPath((prev) => (prev === pathname ? null : pathname))}
          className="md:hidden p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  onClick={() => setMenuOpenForPath(null)}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all cursor-pointer
                    ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link
              href="/scanner"
              onClick={() => setMenuOpenForPath(null)}
              className="flex items-center justify-center gap-2 mt-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm cursor-pointer shadow-sm"
            >
              <span>Start Scan Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
