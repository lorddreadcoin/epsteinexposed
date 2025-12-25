'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EntityIntelligencePopup } from './EntityIntelligencePopup';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  occurrences: number;
  documentIds: string[];
  context?: string;
}

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(searchQuery)}&limit=20`
      );
      const data = await response.json();
      
      if (data.result?.data) {
        setResults(data.result.data);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };
  
  return (
    <>
      {/* AI Chat Header Note - Points to search */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[65] flex items-center gap-2 text-xs text-cyan-400/80 animate-pulse">
        <span>💡 Search any entity below to chat with AI</span>
        <svg className="w-3 h-3 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* Search Toggle Button - Fixed position with high z-index */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-black/95 border-2 border-cyan-500/50 rounded-full px-5 py-2.5 flex items-center gap-3 hover:border-cyan-400 hover:bg-cyan-950/50 transition-all shadow-lg shadow-cyan-500/20 group"
      >
        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-gray-300">Search entities...</span>
        <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/30">AI Chat</span>
        <kbd className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">⌘K</kbd>
      </button>
      
      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-20"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* AI Chat Banner */}
              <div className="px-4 py-2 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 border-b border-cyan-500/20">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-cyan-400">✨</span>
                  <span className="text-gray-300">Click any result to open</span>
                  <span className="text-cyan-400 font-semibold">AI Intelligence Briefing</span>
                </div>
              </div>
              
              {/* Search Input */}
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder="Search 96,322 people, 4,296 locations, 51 flights..."
                    className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500"
                    autoFocus
                  />
                  {loading && (
                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>
              
              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {results.length > 0 ? (
                  <div className="p-2">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedEntity(result);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              result.type === 'person' ? 'bg-amber-500' :
                              result.type === 'location' ? 'bg-blue-500' :
                              result.type === 'flight' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`} />
                            <div>
                              <div className="text-white font-medium">{result.name}</div>
                              <div className="text-xs text-gray-500">
                                {result.type} • {result.occurrences} mentions • {result.documentIds?.length || 0} documents
                              </div>
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        {result.context && (
                          <div className="mt-2 text-xs text-gray-400 pl-6 line-clamp-1">
                            {result.context}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : query && !loading ? (
                  <div className="p-8 text-center text-gray-500">
                    No results found for &quot;{query}&quot;
                  </div>
                ) : !query ? (
                  <div className="p-6">
                    <div className="text-xs text-gray-500 mb-3">SUGGESTED SEARCHES</div>
                    <div className="space-y-2">
                      {['Jeffrey Epstein', 'Ghislaine Maxwell', 'Palm Beach', 'Little St. James', 'Bill Clinton'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setQuery(suggestion);
                            handleSearch(suggestion);
                          }}
                          className="block w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-800 rounded transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              
              {/* Footer */}
              <div className="p-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                <div>
                  <kbd className="bg-gray-800 px-1.5 py-0.5 rounded mr-1">↑↓</kbd>
                  to navigate
                  <kbd className="bg-gray-800 px-1.5 py-0.5 rounded mx-1">↵</kbd>
                  to select
                </div>
                <div>
                  <kbd className="bg-gray-800 px-1.5 py-0.5 rounded">esc</kbd>
                  to close
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Entity Intelligence Popup */}
      {selectedEntity && (
        <EntityIntelligencePopup
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </>
  );
}
