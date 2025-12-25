'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Search, MessageSquare, FileText, 
  Network, Heart, Mail, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';

interface MobileNavProps {
  onOpenSearch?: () => void;
  onOpenChat?: () => void;
  onViewDocument?: (docId: string) => void;
}

export function MobileNav({
  onOpenSearch,
  onOpenChat,
  onViewDocument,
}: MobileNavProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showUnredacted, setShowUnredacted] = useState(false);

  const unredactedFiles = [
    { id: 'giuffre-maxwell', name: 'Giuffre vs Maxwell (943 Pages)', pages: 943, source: 'Court Filing' },
    { id: 'black-book-full', name: 'Epstein Black Book (Full)', pages: 97, source: 'Public Record' },
    { id: 'little-black-book', name: 'Little Black Book', pages: 73, source: 'Archive.org' },
    { id: 'flight-logs', name: 'Flight Logs (Complete)', pages: 221, source: 'DocumentCloud' },
  ];
  
  return (
    <>
      {/* Mobile Header with Hamburger - Only on Mobile */}
      <div className="fixed top-0 left-0 right-0 z-[70] bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-[#ffffff10] sm:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              <span className="text-red-500">EPSTEIN</span>
              <span className="text-white">EXPOSED</span>
            </span>
          </div>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-white hover:bg-white/10 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Quick Actions - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 z-[70] bg-[#12121a]/95 backdrop-blur-sm border-t border-[#ffffff10] sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={onOpenSearch}
            className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-[#00d4ff] active:bg-white/5"
          >
            <Search className="w-5 h-5" />
            <span className="text-[9px] font-medium">AI Search</span>
          </button>
          <button
            onClick={onOpenChat}
            className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-purple-400 active:bg-white/5"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-medium">Assistant</span>
          </button>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full gap-0.5 text-gray-400 active:bg-white/5"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
      
      {/* Full-screen Drawer Menu */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-[80] sm:hidden"
              onClick={() => setIsDrawerOpen(false)}
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[#0d0d12] border-l border-[#ffffff15] z-[85] sm:hidden overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#ffffff10] sticky top-0 bg-[#0d0d12]">
                <h2 className="text-lg font-bold text-white">Navigation</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Menu Items */}
              <div className="p-4 space-y-2">
                {/* Graph */}
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                >
                  <Network className="w-5 h-5" />
                  <div className="text-left">
                    <span className="font-medium block">BubbleMaps Connection Graph</span>
                    <span className="text-xs text-cyan-400/60">Explore 33,824 entities</span>
                  </div>
                </button>

                {/* Search AI */}
                <button
                  onClick={() => {
                    onOpenSearch?.();
                    setIsDrawerOpen(false);
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400"
                >
                  <Search className="w-5 h-5" />
                  <div className="text-left">
                    <span className="font-medium block">Search Entities AI Agent</span>
                    <span className="text-xs text-purple-400/60">Chat with AI about anyone</span>
                  </div>
                </button>

                {/* AI Assistant */}
                <button
                  onClick={() => {
                    onOpenChat?.();
                    setIsDrawerOpen(false);
                  }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400"
                >
                  <MessageSquare className="w-5 h-5" />
                  <div className="text-left">
                    <span className="font-medium block">Investigation Assistant</span>
                    <span className="text-xs text-green-400/60">AI-powered document analysis</span>
                  </div>
                </button>

                {/* Unredacted Files Dropdown */}
                <div className="border border-red-500/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowUnredacted(!showUnredacted)}
                    className="flex items-center justify-between w-full p-3 bg-red-500/10 text-red-400"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5" />
                      <div className="text-left">
                        <span className="font-medium block">Unredacted Files Viewer</span>
                        <span className="text-xs text-red-400/60">DOJ Public Records</span>
                      </div>
                    </div>
                    {showUnredacted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  <AnimatePresence>
                    {showUnredacted && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#0a0a0f] border-t border-red-500/20"
                      >
                        {unredactedFiles.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => {
                              onViewDocument?.(file.id);
                              setIsDrawerOpen(false);
                            }}
                            className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 border-b border-[#ffffff08] last:border-0"
                          >
                            <div>
                              <span className="text-sm text-white block">{file.name}</span>
                              <span className="text-xs text-gray-500">{file.source}</span>
                            </div>
                            <span className="text-xs text-red-400">{file.pages}p</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* DOJ Files Link */}
                <a
                  href="https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400"
                >
                  <ExternalLink className="w-5 h-5" />
                  <div className="text-left">
                    <span className="font-medium block">DOJ Files PDF Links</span>
                    <span className="text-xs text-blue-400/60">Official justice.gov documents</span>
                  </div>
                </a>
              </div>

              {/* Donate Section */}
              <div className="p-4 border-t border-[#ffffff10]">
                <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <Heart className="w-4 h-4" />
                    <span className="font-medium text-sm">Support This Project</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Donate to Danks of Vatra Labs AI Company and support Epstein victims.
                  </p>
                  <div className="flex gap-2">
                    <a href="https://venmo.com/code?user_id=1936415466192896380" target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-[#3D95CE]/20 text-[#3D95CE] text-xs text-center rounded">Venmo</a>
                    <a href="https://cash.app/$dankstervision" target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-[#00D632]/20 text-[#00D632] text-xs text-center rounded">CashApp</a>
                  </div>
                </div>
              </div>

              {/* Victims Contact Section */}
              <div className="p-4 border-t border-[#ffffff10]">
                <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30">
                  <div className="flex items-center gap-2 text-pink-400 mb-2">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium text-sm">For Epstein Victims</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    If you are a victim of Jeffrey Epstein, please reach out through your legal team:
                  </p>
                  <a 
                    href="mailto:danksonloc@gmail.com" 
                    className="text-sm text-pink-400 hover:text-pink-300 break-all"
                  >
                    danksonloc@gmail.com
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#ffffff10]">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Built by Danks of Vatra Labs AI Company</p>
                  <p className="text-[10px] text-gray-600 mt-1">11,622 documents • 33,824 entities</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
