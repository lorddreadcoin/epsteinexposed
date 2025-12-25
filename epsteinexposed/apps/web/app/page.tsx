'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { InvestigationChat } from './components/chat/InvestigationChat';
import { SourceBadges } from './components/ui/SourceBadges';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { CommandPalette } from './components/command/CommandPalette';
import { KeyboardShortcuts, useKeyboardShortcuts } from './components/ui/KeyboardShortcuts';
import { TimelineView } from './components/timeline/TimelineView';
import { MobileNav } from './components/mobile/MobileNav';
import { SearchPanel } from './components/search/SearchPanel';
import { Footer } from './components/layout/Footer';
import './styles/design-system.css';

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

const DocumentViewer = dynamic(
  () => import('./components/document/DocumentViewer').then(mod => mod.DocumentViewer),
  { ssr: false }
);

interface ViewingDocument {
  id: string;
  highlightEntities: string[];
}

interface NodeData {
  id: string;
  label: string;
  type: string;
  documentCount?: number;
  connections?: number;
}

export default function Home() {
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<NodeData | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [viewingDocument, setViewingDocument] = useState<ViewingDocument | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Keyboard shortcuts hook
  const shortcuts = useKeyboardShortcuts();
  
  const handleNodeSelect = useCallback((node: NodeData | null) => {
    setSelectedEntity(node);
    if (node) {
      setSelectedEntities([node.label]);
    } else {
      setSelectedEntities([]);
    }
  }, []);
  
  const handleAnalyzeConnection = useCallback((entities: string[]) => {
    console.log('[PAGE] Analyze connection requested for:', entities);
    setSelectedEntities(entities);
    setSelectedEntity(null);
    setChatCollapsed(false);
  }, []);
  
  const handleViewDocument = useCallback((documentId: string) => {
    console.log('[PAGE] View document:', documentId);
    setViewingDocument({
      id: documentId,
      highlightEntities: selectedEntities,
    });
  }, [selectedEntities]);
  
  const handleCloseDocument = useCallback(() => {
    setViewingDocument(null);
  }, []);
  
  const handleToggleChat = useCallback(() => {
    setChatCollapsed(prev => !prev);
  }, []);
  
  return (
    <div className="h-screen w-screen bg-[#0a0a0f] flex flex-col overflow-hidden pb-16">
      <header className="h-14 bg-[#12121a] border-b border-[#ffffff10] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Epstein Exposed" className="w-10 h-10 rounded-full" />
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-white">EPSTEIN</span>
            <span className="text-[#ff3366]">EXPOSED</span>
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-[#1a1a24] px-3 py-1.5 rounded border border-[#ffffff10]">
            <span className="text-[#00d4ff]">11,622</span>
            <span className="text-[#606070]">DOCUMENTS</span>
            <span className="text-[#ffffff20] mx-1">•</span>
            <span className="text-[#ffb800]">96,322</span>
            <span className="text-[#606070]">ENTITIES</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group"
            title="Search entities (Ctrl+K)"
          >
            <svg className="w-5 h-5 text-[#606070] group-hover:text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button 
            onClick={() => { setChatCollapsed(false); }}
            className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group flex items-center gap-2"
            title="Open Investigation Assistant"
          >
            <svg className="w-5 h-5 text-[#606070] group-hover:text-[#ffb800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-[#606070] group-hover:text-[#ffb800] font-mono hidden lg:inline">DISCOVER</span>
          </button>
          <button 
            onClick={() => shortcuts.open()}
            className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group"
            title="Help & Shortcuts (?)"
          >
            <svg className="w-5 h-5 text-[#606070] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col min-h-0">
        <div className={`relative transition-all duration-300 ease-out ${chatCollapsed ? 'flex-1' : 'h-[75%]'}`}>
          <Graph3DCore onNodeSelect={handleNodeSelect} onAnalyzeConnection={handleAnalyzeConnection} />
          
          {selectedEntity && (
            <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-32px)] overflow-auto bg-[#12121a]/95 backdrop-blur-sm border border-[#ffffff15] rounded-lg shadow-xl">
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{selectedEntity.label}</h3>
                    <p className="text-[#606070] text-xs font-mono capitalize">{selectedEntity.type}</p>
                  </div>
                  <button onClick={() => setSelectedEntity(null)} className="p-1 hover:bg-[#ffffff10] rounded">
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
                  
                  {/* Source Badges - shows which data sources this entity appears in */}
                  <div className="pt-2 border-t border-[#ffffff10]">
                    <p className="text-[#606070] text-xs mb-2">DATA SOURCES</p>
                    <SourceBadges
                      sources={{
                        blackBook: selectedEntity.type === 'person',
                        flightLogs: selectedEntity.type === 'person' && (selectedEntity.connections || 0) > 5,
                        dojDocs: (selectedEntity.documentCount || 0) > 0,
                      }}
                      dojDocCount={selectedEntity.documentCount}
                      size="sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedEntities([selectedEntity.label]); setChatCollapsed(false); }}
                  className="w-full mt-4 py-2 bg-[#00d4ff]/20 text-[#00d4ff] rounded font-mono text-sm hover:bg-[#00d4ff]/30 transition-colors"
                >
                  Investigate in Chat
                </button>
              </div>
            </div>
          )}
        </div>
        
        <InvestigationChat
          selectedEntities={selectedEntities}
          onViewDocument={handleViewDocument}
          isCollapsed={chatCollapsed}
          onToggleCollapse={handleToggleChat}
        />
      </div>
      
      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument.id}
          highlightEntities={viewingDocument.highlightEntities}
          onClose={handleCloseDocument}
        />
      )}
      
      {/* Gold Standard UI/UX Components */}
      <OnboardingModal />
      
      <CommandPalette
        onAnalyzeConnection={() => {
          if (selectedEntities.length >= 2) {
            handleAnalyzeConnection(selectedEntities);
          }
        }}
        onShowTimeline={() => setShowTimeline(true)}
        onShowShortcuts={shortcuts.open}
      />
      
      <KeyboardShortcuts isOpen={shortcuts.isOpen} onClose={shortcuts.close} />
      
      <TimelineView
        events={[]}
        isOpen={showTimeline}
        onClose={() => setShowTimeline(false)}
      />
      
      <MobileNav
        onOpenChat={() => setChatCollapsed(false)}
        onOpenHelp={shortcuts.open}
        activeTab={chatCollapsed ? 'graph' : 'chat'}
      />
      
      {/* Search Panel - triggered from header */}
      <SearchPanel />
      
      {/* Footer - Always visible with donations */}
      <Footer />
    </div>
  );
}
