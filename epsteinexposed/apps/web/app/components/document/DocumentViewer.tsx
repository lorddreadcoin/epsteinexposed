'use client';

import { useState, useEffect } from 'react';

interface DocumentViewerProps {
  documentId: string;
  highlightEntities?: string[];
  onClose: () => void;
}

export function DocumentViewer({ documentId, highlightEntities = [], onClose }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  
  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) throw new Error('Document not found');
        const data = await response.json();
        setPdfUrl(data.url);
        setTotalPages(data.pageCount || 1);
      } catch (err) {
        console.error('Failed to load document:', err);
        setPdfUrl(`/documents/${documentId}.pdf`);
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [documentId]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowRight': setCurrentPage(p => Math.min(p + 1, totalPages)); break;
        case 'ArrowLeft': setCurrentPage(p => Math.max(p - 1, 1)); break;
        case '+': case '=': setZoom(z => Math.min(z + 25, 200)); break;
        case '-': setZoom(z => Math.max(z - 25, 50)); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, totalPages]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="h-14 bg-[#12121a] border-b border-[#ffffff15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-[#00d4ff]">DOC-{documentId}</span>
          {highlightEntities.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#606070]">Highlighting:</span>
              <div className="flex gap-1">
                {highlightEntities.slice(0, 3).map((entity, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#ffb800]/20 text-[#ffb800] text-xs rounded font-mono">{entity}</span>
                ))}
                {highlightEntities.length > 3 && <span className="text-xs text-[#606070]">+{highlightEntities.length - 3} more</span>}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#1a1a24] rounded border border-[#ffffff15]">
            <button onClick={() => setZoom(z => Math.max(z - 25, 50))} className="p-1.5 hover:bg-[#ffffff10] transition-colors" title="Zoom out (-)">
              <svg className="w-4 h-4 text-[#a0a0b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <span className="px-2 text-xs text-[#a0a0b0] font-mono min-w-[48px] text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 25, 200))} className="p-1.5 hover:bg-[#ffffff10] transition-colors" title="Zoom in (+)">
              <svg className="w-4 h-4 text-[#a0a0b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-1 bg-[#1a1a24] rounded border border-[#ffffff15]">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage <= 1} className="p-1.5 hover:bg-[#ffffff10] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Previous page (←)">
              <svg className="w-4 h-4 text-[#a0a0b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-2 text-xs text-[#a0a0b0] font-mono min-w-[64px] text-center">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages} className="p-1.5 hover:bg-[#ffffff10] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Next page (→)">
              <svg className="w-4 h-4 text-[#a0a0b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          {pdfUrl && (
            <a href={pdfUrl} download={`epstein-doc-${documentId}.pdf`} className="p-2 hover:bg-[#ffffff10] rounded transition-colors" title="Download PDF">
              <svg className="w-4 h-4 text-[#a0a0b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          )}
          <button onClick={onClose} className="p-2 hover:bg-[#ff3366]/20 rounded transition-colors group" title="Close (Esc)">
            <svg className="w-4 h-4 text-[#a0a0b0] group-hover:text-[#ff3366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex items-start justify-center p-8">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#606070] font-mono text-sm">Loading document...</p>
          </div>
        ) : pdfUrl ? (
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}>
            <iframe src={`${pdfUrl}#page=${currentPage}&toolbar=0`} className="w-[850px] h-[1100px] bg-white shadow-2xl rounded" title={`Document ${documentId}`} />
          </div>
        ) : (
          <div className="text-center">
            <p className="text-[#ff3366] font-mono mb-4">Document URL not available</p>
            <button onClick={onClose} className="px-4 py-2 bg-[#ffffff10] text-white rounded hover:bg-[#ffffff20] transition-colors">Close</button>
          </div>
        )}
      </div>
      
      <div className="h-10 bg-[#12121a] border-t border-[#ffffff15] px-4 flex items-center justify-center">
        <p className="text-[#606070] font-mono text-xs">
          <span className="text-[#00d4ff]">Esc</span> close • 
          <span className="text-[#00d4ff] ml-3">←/→</span> pages • 
          <span className="text-[#00d4ff] ml-3">+/-</span> zoom • 
          <span className="text-[#ffb800] ml-3">Ctrl+F</span> search in PDF
        </p>
      </div>
    </div>
  );
}

export default DocumentViewer;
