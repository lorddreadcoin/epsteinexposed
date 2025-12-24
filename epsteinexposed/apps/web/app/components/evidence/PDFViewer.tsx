'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PDFViewerProps {
  documentId: string;
  filename: string;
  highlightEntities?: string[];
  onClose: () => void;
}

export function PDFViewer({ documentId, filename, highlightEntities = [], onClose }: PDFViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const pdfUrl = `http://localhost:3001/pdf/${encodeURIComponent(documentId)}`;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col"
      >
        {/* Toolbar */}
        <div className="bg-gray-900 border-b border-gray-800 p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <div>
              <h3 className="text-white font-medium text-sm">{filename}</h3>
              <div className="text-xs text-gray-500">Document ID: {documentId}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Highlighting info */}
            {highlightEntities.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Highlighting:</span>
                {highlightEntities.slice(0, 3).map((entity, i) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                    {entity}
                  </span>
                ))}
                {highlightEntities.length > 3 && (
                  <span className="text-gray-500">+{highlightEntities.length - 3}</span>
                )}
              </div>
            )}
            
            {/* Zoom controls */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                className="text-gray-400 hover:text-white p-1"
                disabled={zoom <= 50}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-sm text-gray-300 min-w-[3rem] text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                className="text-gray-400 hover:text-white p-1"
                disabled={zoom >= 200}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            {/* Download */}
            <a
              href={pdfUrl}
              download={filename}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* PDF Content */}
        <div className="flex-1 bg-gray-950 overflow-auto flex items-start justify-center p-4">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="text-gray-400">Loading document...</div>
              </div>
            </div>
          )}
          
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <div className="text-gray-400 mb-2">Unable to load PDF</div>
                <div className="text-xs text-gray-600 mb-4">
                  The document may not be available for direct viewing
                </div>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded text-sm hover:bg-amber-500/30 transition inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className="bg-white rounded shadow-2xl transition-transform"
              style={{ 
                width: `${zoom}%`,
                height: '100%',
                minHeight: '800px',
                maxWidth: '1200px',
              }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-900 border-t border-gray-800 p-2 flex items-center justify-between text-xs text-gray-500">
          <div>
            Source: Epstein Files Database
          </div>
          <div className="flex items-center gap-4">
            <span>Press ESC to close</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
