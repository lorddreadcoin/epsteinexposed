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

interface EvidencePanelProps {
  entityName: string;
  entityType: string;
  onClose: () => void;
  onViewDocument: (doc: DocumentReference) => void;
}

export function EvidencePanel({ entityName, entityType, onClose, onViewDocument }: EvidencePanelProps) {
  const [documents, setDocuments] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/documents/entity?name=${encodeURIComponent(entityName)}`
      );
      const data = await response.json();
      
      if (data.result?.data) {
        setDocuments(data.result.data);
      } else {
        setError('No documents found');
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, [entityName]);
  
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
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">{entityName}</h2>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    entityType === 'person' ? 'bg-amber-500/20 text-amber-400' :
                    entityType === 'location' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {entityType}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">
                  {loading ? 'Loading...' : `Found in ${documents.length} documents`}
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
                No documents found for this entity
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  SOURCE DOCUMENTS ({documents.length})
                </h3>
                
                {documents.slice(0, 50).map((doc, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors cursor-pointer group"
                    onClick={() => onViewDocument(doc)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium truncate">{doc.filename}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">{doc.pageCount} pages</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{doc.dataset}</div>
                        
                        {doc.mentions && doc.mentions.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {doc.mentions.slice(0, 5).map((mention, j) => (
                              <span
                                key={j}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  mention.type === 'person' ? 'bg-amber-500/10 text-amber-400' :
                                  'bg-blue-500/10 text-blue-400'
                                }`}
                              >
                                {mention.entity}
                              </span>
                            ))}
                            {doc.mentions.length > 5 && (
                              <span className="text-xs text-gray-500">
                                +{doc.mentions.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-amber-500 text-sm flex items-center gap-1">
                          View PDF
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {documents.length > 50 && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    Showing 50 of {documents.length} documents
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-800 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Click any document to view the original PDF
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
