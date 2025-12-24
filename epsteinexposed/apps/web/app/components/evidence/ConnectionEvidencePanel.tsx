'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentReference {
  id: string;
  filename: string;
  path: string;
  pageCount: number;
  dataset: string;
  mentions: Array<{
    entity: string;
    type: string;
    context?: string;
  }>;
}

interface ConnectionEvidencePanelProps {
  entity1: string;
  entity2: string;
  connectionStrength: number;
  onClose: () => void;
  onViewDocument: (doc: DocumentReference) => void;
}

export function ConnectionEvidencePanel({ 
  entity1, 
  entity2, 
  connectionStrength,
  onClose, 
  onViewDocument 
}: ConnectionEvidencePanelProps) {
  const [documents, setDocuments] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `http://localhost:3001/trpc/document.getConnectionDocuments?input=${encodeURIComponent(JSON.stringify({ entity1, entity2 }))}`
      );
      const data = await response.json();
      
      if (data.result?.data) {
        setDocuments(data.result.data);
      } else {
        setError('No evidence documents found');
      }
    } catch (err) {
      console.error('Failed to load connection documents:', err);
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, [entity1, entity2]);
  
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-4xl max-h-[85vh] bg-gray-900 border border-gray-800 rounded-lg flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-3">Connection Evidence</h2>
                <div className="flex items-center gap-3 text-lg">
                  <span className="text-amber-400 font-medium">{entity1}</span>
                  <span className="text-gray-500">↔</span>
                  <span className="text-amber-400 font-medium">{entity2}</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  {loading ? 'Loading evidence...' : `${documents.length} documents prove this connection`}
                </p>
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
            
            {/* Connection strength indicator */}
            <div className="mt-4 bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Connection Strength</span>
                <span className="text-amber-400 font-medium">{connectionStrength} co-occurrences</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all"
                  style={{ width: `${Math.min(connectionStrength * 5, 100)}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-gray-500">
                {error}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No evidence documents found for this connection
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  EVIDENCE DOCUMENTS ({documents.length})
                </h3>
                
                {documents.map((doc, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors cursor-pointer group border border-transparent hover:border-amber-500/30"
                    onClick={() => onViewDocument(doc)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-white font-medium truncate">{doc.filename}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2 ml-6">
                          {doc.dataset} • {doc.pageCount} pages
                        </div>
                        
                        <div className="ml-6 text-xs text-green-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Both &quot;{entity1}&quot; and &quot;{entity2}&quot; appear in this document
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-amber-500 text-sm flex items-center gap-1">
                          View Evidence
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-gray-900/50">
            <div className="text-xs text-gray-500">
              Each document contains both entities, proving the connection
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded text-sm hover:bg-amber-500/30 transition"
              >
                Export Evidence
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
