'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['/'], description: 'Quick search' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal / Deselect' },
    ],
  },
  {
    title: 'Graph Interaction',
    shortcuts: [
      { keys: ['Click'], description: 'Select entity' },
      { keys: ['Ctrl', 'Click'], description: 'Multi-select entities' },
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['Drag'], description: 'Rotate view' },
      { keys: ['Right-click', 'Drag'], description: 'Pan view' },
    ],
  },
  {
    title: 'Investigation',
    shortcuts: [
      { keys: ['Enter'], description: 'Send chat message' },
      { keys: ['Shift', 'Enter'], description: 'New line in chat' },
      { keys: ['↑'], description: 'Previous message' },
    ],
  },
  {
    title: 'Document Viewer',
    shortcuts: [
      { keys: ['Esc'], description: 'Close document' },
      { keys: ['+'], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['←'], description: 'Previous page' },
      { keys: ['→'], description: 'Next page' },
    ],
  },
];

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                       w-full max-w-2xl max-h-[80vh] overflow-auto
                       bg-[#12121a] border border-[#ffffff15] rounded-xl shadow-2xl z-50"
          >
            <div className="sticky top-0 bg-[#12121a] border-b border-[#ffffff10] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-[#00d4ff]" />
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#606070] hover:text-white rounded-lg hover:bg-[#ffffff10] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {SHORTCUT_GROUPS.map(group => (
                <div key={group.title}>
                  <h3 className="text-sm font-medium text-[#a0a0b0] mb-3 uppercase tracking-wider">
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#0a0a0f]/50"
                      >
                        <span className="text-sm text-[#a0a0b0]">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, j) => (
                            <span key={j}>
                              <kbd className="px-2 py-1 bg-[#1a1a24] border border-[#ffffff15] rounded text-xs text-white font-mono">
                                {key}
                              </kbd>
                              {j < shortcut.keys.length - 1 && (
                                <span className="text-[#606070] mx-1">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-6 py-4 border-t border-[#ffffff10] text-center">
              <p className="text-xs text-[#606070]">
                Press <kbd className="px-1.5 py-0.5 bg-[#1a1a24] rounded text-[10px]">?</kbd> anytime to show this dialog
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsOpen(true);
      }
      
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
