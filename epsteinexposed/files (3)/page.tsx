'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { InvestigationChat } from './components/chat/InvestigationChat';

// Dynamic import for Graph3DCore to avoid SSR issues with Three.js
const Graph3DCore = dynamic(
  () => import('./components/graph/Graph3DCore').then(mod => mod.Graph3DCore),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="relative w-64 h-1 bg-[#1a1a24] rounded overflow-hidden mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent animate-pulse" />
          </div>
          <p className="font-mono text-[#00d4ff] text-sm">Loading 3D Engine...</p>
        </div>
      </div>
    )
  }
);

// Dynamic import for DocumentViewer
const DocumentViewer = dynamic(
  () => import('./components/document/DocumentViewer').then(mod => mod.DocumentViewer),
  { ssr: false }
);

interface ViewingDocument {
  id: string;
  highlightEntities: string[];
}

export default function Home() {
  // ==========================================================================
  // STATE
  // ==========================================================================
  
  // Chat panel state
  const [chatCollapsed, setChatCollapsed] = useState(false);
  
  // Entity selection state
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  
  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState<ViewingDocument | null>(null);
  
  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  // Handle single node selection from graph
  const handleNodeSelect = useCallback((node: any) => {
    setSelectedEntity(node);
    if (node) {
      setSelectedEntities([node.label]);
    } else {
      setSelectedEntities([]);
    }
  }, []);
  
  // Handle edge selection from graph
  const handleEdgeSelect = useCallback((edge: any) => {
    if (edge) {
      // When clicking an edge, select both connected entities
      setSelectedEntities([edge.from, edge.to]);
      setSelectedEntity(null);
    }
  }, []);
  
  // Handle CTRL+Click multi-select analysis request
  const handleAnalyzeConnection = useCallback((entities: string[]) => {
    console.log('[PAGE] Analyze connection requested for:', entities);
    
    // Set the selected entities - this will trigger the discovery prompt in chat
    setSelectedEntities(entities);
    
    // Clear single selection
    setSelectedEntity(null);
    
    // Expand chat panel if collapsed
    setChatCollapsed(false);
  }, []);
  
  // Handle document view request (from chat citations or entity panel)
  const handleViewDocument = useCallback((documentId: string) => {
    console.log('[PAGE] View document:', documentId);
    setViewingDocument({
      id: documentId,
      highlightEntities: selectedEntities,
    });
  }, [selectedEntities]);
  
  // Handle document viewer close
  const handleCloseDocument = useCallback(() => {
    setViewingDocument(null);
  }, []);
  
  // Toggle chat panel
  const handleToggleChat = useCallback(() => {
    setChatCollapsed(prev => !prev);
  }, []);
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return (
    <div className="h-screen w-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* ====================================================================
          HEADER
      ==================================================================== */}
      <header className="h-14 bg-[#12121a] border-b border-[#ffffff10] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-white">EPSTEIN</span>
            <span className="text-[#ff3366]">EXPOSED</span>
          </h1>
          
          {/* Stats badge */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-[#1a1a24] px-3 py-1.5 rounded border border-[#ffffff10]">
            <span className="text-[#00d4ff]">11,622</span>
            <span className="text-[#606070]">DOCUMENTS</span>
            <span className="text-[#ffffff20] mx-1">•</span>
            <span className="text-[#ffb800]">96,322</span>
            <span className="text-[#606070]">ENTITIES</span>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group">
            <svg className="w-5 h-5 text-[#606070] group-hover:text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {/* Auto-discover button */}
          <button className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group flex items-center gap-2">
            <svg className="w-5 h-5 text-[#606070] group-hover:text-[#ffb800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-[#606070] group-hover:text-[#ffb800] font-mono hidden lg:inline">
              DISCOVER
            </span>
          </button>
          
          {/* Stats button */}
          <button className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group">
            <svg className="w-5 h-5 text-[#606070] group-hover:text-[#00ff88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          
          {/* Settings button */}
          <button className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group">
            <svg className="w-5 h-5 text-[#606070] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {/* Help button */}
          <button className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group">
            <svg className="w-5 h-5 text-[#606070] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>
      
      {/* ====================================================================
          MAIN CONTENT
      ==================================================================== */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Graph area - takes remaining space above chat */}
        <div 
          className={`
            relative transition-all duration-300 ease-out
            ${chatCollapsed ? 'flex-1' : 'h-[75%]'}
          `}
        >
          <Graph3DCore
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
            onAnalyzeConnection={handleAnalyzeConnection}
          />
          
          {/* Entity detail sidebar - shows when single entity selected */}
          {selectedEntity && (
            <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-32px)] overflow-auto
                          bg-[#12121a]/95 backdrop-blur-sm border border-[#ffffff15] rounded-lg shadow-xl">
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{selectedEntity.label}</h3>
                    <p className="text-[#606070] text-xs font-mono capitalize">{selectedEntity.type}</p>
                  </div>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="p-1 hover:bg-[#ffffff10] rounded"
                  >
                    <svg className="w-4 h-4 text-[#606070]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#606070]">Documents</span>
                    <span className="text-[#00d4ff] font-mono">{selectedEntity.documentCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#606070]">Connections</span>
                    <span className="text-[#ffb800] font-mono">{selectedEntity.connections || 0}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedEntities([selectedEntity.label]);
                    setChatCollapsed(false);
                  }}
                  className="w-full mt-4 py-2 bg-[#00d4ff]/20 text-[#00d4ff] rounded font-mono text-sm
                           hover:bg-[#00d4ff]/30 transition-colors"
                >
                  Investigate in Chat
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Investigation Chat Panel */}
        <InvestigationChat
          selectedEntities={selectedEntities}
          onViewDocument={handleViewDocument}
          isCollapsed={chatCollapsed}
          onToggleCollapse={handleToggleChat}
        />
      </div>
      
      {/* ====================================================================
          DOCUMENT VIEWER MODAL
      ==================================================================== */}
      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument.id}
          highlightEntities={viewingDocument.highlightEntities}
          onClose={handleCloseDocument}
        />
      )}
    </div>
  );
}
