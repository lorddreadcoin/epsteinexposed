'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentViewerProps {
  documentId: string;
  onClose: () => void;
}

interface DocumentInfo {
  id: string;
  filename: string;
  path: string;
  pageCount: number;
  dataset: string;
  entities?: {
    people?: Array<{ name: string; context?: string }>;
    locations?: Array<{ name: string; type?: string }>;
    dates?: Array<{ date: string; event?: string }>;
  };
}

export function DocumentViewer({ documentId, onClose }: DocumentViewerProps) {
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'entities' | 'redactions'>('entities');
  
  useEffect(() => {
    // In a real implementation, fetch document details from API
    setDocumentInfo({
      id: documentId,
      filename: `${documentId}.pdf`,
      path: `/documents/${documentId}.pdf`,
      pageCount: Math.floor(Math.random() * 20) + 1,
      dataset: 'DataSet 8',
      entities: {
        people: [
          { name: 'Jeffrey Epstein', context: 'Primary subject' },
          { name: 'Ghislaine Maxwell', context: 'Associate' },
        ],
        locations: [
          { name: 'Palm Beach', type: 'city' },
          { name: 'Little St. James', type: 'island' },
        ],
        dates: [
          { date: '2001-06-15', event: 'Meeting referenced' },
        ],
      },
    });
    setLoading(false);
  }, [documentId]);
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-50 flex"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          className="ml-auto w-full max-w-4xl bg-gray-900 h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">{documentInfo?.filename || 'Loading...'}</h2>
              <div className="text-xs text-gray-500 mt-1">
                {documentInfo?.dataset} • {documentInfo?.pageCount} pages
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {(['entities', 'redactions', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-amber-500 border-b-2 border-amber-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeTab === 'entities' ? (
              <div className="space-y-6">
                {/* People */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">PEOPLE MENTIONED</h3>
                  <div className="space-y-2">
                    {documentInfo?.entities?.people?.map((person, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <span className="text-amber-500 text-sm">👤</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{person.name}</div>
                          {person.context && (
                            <div className="text-xs text-gray-500">{person.context}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Locations */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">LOCATIONS</h3>
                  <div className="space-y-2">
                    {documentInfo?.entities?.locations?.map((loc, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-blue-500 text-sm">📍</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{loc.name}</div>
                          {loc.type && (
                            <div className="text-xs text-gray-500">{loc.type}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Dates */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">DATES</h3>
                  <div className="space-y-2">
                    {documentInfo?.entities?.dates?.map((date, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <span className="text-green-500 text-sm">📅</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{date.date}</div>
                          {date.event && (
                            <div className="text-xs text-gray-500">{date.event}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'redactions' ? (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-red-400 font-semibold mb-2">⚠️ Redaction Analysis</h3>
                  <p className="text-sm text-gray-400">
                    This document contains redacted sections. Our AI is analyzing patterns
                    to attempt contextual reconstruction.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Redaction #1</span>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">47 chars</span>
                    </div>
                    <div className="bg-black rounded p-2 font-mono text-sm">
                      <span className="text-gray-600">...meeting with </span>
                      <span className="bg-red-500/30 text-red-300 px-1">████████████████████</span>
                      <span className="text-gray-600"> at the residence...</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <strong className="text-amber-400">AI Suggestion:</strong> Based on context and character count,
                      possible matches: &quot;[Name Redacted - High Profile]&quot;
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Redaction #2</span>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">23 chars</span>
                    </div>
                    <div className="bg-black rounded p-2 font-mono text-sm">
                      <span className="text-gray-600">...transferred $</span>
                      <span className="bg-red-500/30 text-red-300 px-1">███████████</span>
                      <span className="text-gray-600"> to account...</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <strong className="text-amber-400">AI Suggestion:</strong> Financial amount, 
                      pattern suggests 7-8 digit sum
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <div className="text-gray-400 mb-2">PDF Preview</div>
                  <div className="text-xs text-gray-600">
                    Document preview requires PDF hosting setup
                  </div>
                  <button className="mt-4 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 transition">
                    Download Original PDF
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-800 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Document ID: {documentId}
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition">
                Export Analysis
              </button>
              <button className="px-3 py-1.5 bg-amber-500 text-black rounded text-sm font-medium hover:bg-amber-400 transition">
                Flag for Review
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
