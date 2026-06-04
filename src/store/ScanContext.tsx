'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ScanPage, ScanSession } from '@/types';

interface HistoryState {
  pages: ScanPage[];
  activePageId: string | null;
}

interface ScanContextType {
  pages: ScanPage[];
  activePageId: string | null;
  activePage: ScanPage | null;
  history: ScanSession[];
  
  // Actions
  addPage: (originalSrc: string) => string;
  updatePage: (id: string, updates: Partial<ScanPage>) => void;
  removePage: (id: string) => void;
  duplicatePage: (id: string) => void;
  movePage: (id: string, direction: 'up' | 'down') => void;
  setActivePageId: (id: string | null) => void;
  
  // Undo/Redo edits
  saveToUndoStack: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // History session management
  saveCurrentSession: (title: string) => void;
  deleteSession: (id: string) => void;
  loadSession: (session: ScanSession) => void;
  clearSession: () => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const ScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanSession[]>([]);

  // Undo/Redo Stacks
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  // Load history from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('scanify_history');
      if (stored) {
        try {
          const parsedHistory = JSON.parse(stored);
          queueMicrotask(() => setHistory(parsedHistory));
        } catch (e) {
          console.error('Failed to parse scanner history:', e);
        }
      }
    }
  }, []);

  // Save history to local storage when it changes
  const saveHistoryToLocalStorage = (newHistory: ScanSession[]) => {
    setHistory(newHistory);
    if (typeof window !== 'undefined') {
      localStorage.setItem('scanify_history', JSON.stringify(newHistory));
    }
  };

  const activePage = pages.find((p) => p.id === activePageId) || null;

  const saveToUndoStack = () => {
    setUndoStack((prev) => [...prev, { pages: JSON.parse(JSON.stringify(pages)), activePageId }]);
    setRedoStack([]); // Clear redo when a new action is saved
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, { pages: JSON.parse(JSON.stringify(pages)), activePageId }]);
    setPages(previous.pages);
    setActivePageId(previous.activePageId);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, { pages: JSON.parse(JSON.stringify(pages)), activePageId }]);
    setPages(next.pages);
    setActivePageId(next.activePageId);
  };

  const addPage = (originalSrc: string): string => {
    saveToUndoStack();
    const id = Math.random().toString(36).substring(7);
    const newPage: ScanPage = {
      id,
      originalSrc,
      croppedSrc: null,
      processedSrc: null,
      filterMode: 'magic',
      ocrText: null,
      ocrConfidence: null,
      points: null,
      rotation: 0,
      sourceWidth: null,
      sourceHeight: null,
    };
    setPages((prev) => [...prev, newPage]);
    setActivePageId(id);
    return id;
  };

  const updatePage = (id: string, updates: Partial<ScanPage>) => {
    saveToUndoStack();
    setPages((prev) =>
      prev.map((page) => (page.id === id ? { ...page, ...updates } : page))
    );
  };

  const removePage = (id: string) => {
    saveToUndoStack();
    setPages((prev) => {
      const filtered = prev.filter((page) => page.id !== id);
      if (activePageId === id) {
        setActivePageId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  };

  const duplicatePage = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    saveToUndoStack();
    const copyId = Math.random().toString(36).substring(7);
    const copy: ScanPage = {
      ...JSON.parse(JSON.stringify(page)),
      id: copyId,
      ocrText: page.ocrText,
      ocrConfidence: page.ocrConfidence,
    };
    const index = pages.findIndex((p) => p.id === id);
    const nextPages = [...pages];
    nextPages.splice(index + 1, 0, copy);
    setPages(nextPages);
    setActivePageId(copyId);
  };

  const movePage = (id: string, direction: 'up' | 'down') => {
    const index = pages.findIndex((p) => p.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    saveToUndoStack();
    const nextPages = [...pages];
    const [page] = nextPages.splice(index, 1);
    nextPages.splice(targetIndex, 0, page);
    setPages(nextPages);
  };

  const saveCurrentSession = (title: string) => {
    if (pages.length === 0) return;
    const newSession: ScanSession = {
      id: Math.random().toString(36).substring(7),
      title: title || `Scan - ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      pages: pages.map((p) => ({
        id: p.id,
        processedSrc: p.processedSrc || p.croppedSrc || p.originalSrc,
        ocrText: p.ocrText,
        filterMode: p.filterMode,
        sourceWidth: p.sourceWidth,
        sourceHeight: p.sourceHeight,
      })),
    };
    const newHistory = [newSession, ...history];
    saveHistoryToLocalStorage(newHistory);
  };

  const deleteSession = (id: string) => {
    const newHistory = history.filter((session) => session.id !== id);
    saveHistoryToLocalStorage(newHistory);
  };

  const loadSession = (session: ScanSession) => {
    saveToUndoStack();
    // Reconstruct pages structure from history
    const restoredPages: ScanPage[] = session.pages.map((p) => ({
      id: p.id,
      originalSrc: p.processedSrc, // We only store the final processed image in history to save space
      croppedSrc: p.processedSrc,
      processedSrc: p.processedSrc,
      filterMode: p.filterMode || 'original',
      ocrText: p.ocrText,
      ocrConfidence: 100,
      points: null,
      rotation: 0,
      sourceWidth: p.sourceWidth || null,
      sourceHeight: p.sourceHeight || null,
    }));
    setPages(restoredPages);
    setActivePageId(restoredPages[0]?.id || null);
  };

  const clearSession = () => {
    saveToUndoStack();
    setPages([]);
    setActivePageId(null);
  };

  return (
    <ScanContext.Provider
      value={{
        pages,
        activePageId,
        activePage,
        history,
        addPage,
        updatePage,
        removePage,
        duplicatePage,
        movePage,
        setActivePageId,
        saveToUndoStack,
        undo,
        redo,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        saveCurrentSession,
        deleteSession,
        loadSession,
        clearSession,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
};
