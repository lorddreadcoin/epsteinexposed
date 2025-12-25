'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { SourceBadges } from './components/ui/SourceBadges';
import { Footer } from './components/layout/Footer';
import { ColorLegend } from './components/graph/ColorLegend';
import UnredactedBanner from './components/UnredactedBanner';
import './styles/design-system.css';

// Dynamic imports for heavy components - improves initial load
const InvestigationChat = dynamic(
  () => import('./components/chat/InvestigationChat').then(mod => mod.InvestigationChat),
  { ssr: false }
);

const OnboardingModal = dynamic(
  () => import('./components/onboarding/OnboardingModal').then(mod => mod.OnboardingModal),
  { ssr: false }
);

const CommandPalette = dynamic(
  () => import('./components/command/CommandPalette').then(mod => mod.CommandPalette),
  { ssr: false }
);

const KeyboardShortcuts = dynamic(
  () => import('./components/ui/KeyboardShortcuts').then(mod => mod.KeyboardShortcuts),
  { ssr: false }
);

const TimelineView = dynamic(
  () => import('./components/timeline/TimelineView').then(mod => mod.TimelineView),
  { ssr: false }
);

const MobileNav = dynamic(
  () => import('./components/mobile/MobileNav').then(mod => mod.MobileNav),
  { ssr: false }
);

const SearchPanel = dynamic(
  () => import('./components/search/SearchPanel').then(mod => mod.SearchPanel),
  { ssr: false }
);

// Import hook separately (can't be dynamic)
import { useKeyboardShortcuts } from './components/ui/KeyboardShortcuts';

const Graph3DCore = dynamic(
  () => import('./components/graph/Graph3DCore').then(mod => mod.Graph3DCore),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f] relative">
        {/* Skeleton nodes for visual feedback */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-[#00d4ff]/20 animate-pulse"
              style={{
                left: `${20 + (i % 4) * 20}%`,
                top: `${20 + Math.floor(i / 4) * 25}%`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
          {/* Skeleton connections */}
          <svg className="absolute inset-0 w-full h-full opacity-10">
            <line x1="25%" y1="25%" x2="45%" y2="35%" stroke="#00d4ff" strokeWidth="1" />
            <line x1="45%" y1="35%" x2="65%" y2="25%" stroke="#00d4ff" strokeWidth="1" />
            <line x1="65%" y1="25%" x2="75%" y2="50%" stroke="#00d4ff" strokeWidth="1" />
            <line x1="25%" y1="50%" x2="45%" y2="60%" stroke="#00d4ff" strokeWidth="1" />
          </svg>
        </div>
        <div className="text-center z-10 bg-[#0a0a0f]/80 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-2">EPSTEIN<span className="text-[#ff3366]">EXPOSED</span></h2>
          <p className="text-[#606070] text-sm mb-4">11,622 DOJ Documents Cross-Referenced</p>
          <div className="relative w-48 h-1 bg-[#1a1a24] rounded overflow-hidden mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent animate-pulse" />
          </div>
          <p className="font-mono text-[#00d4ff] text-xs mt-2">Initializing Network Graph...</p>
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
  name?: string;
  type: string;
  documentCount?: number;
  connections?: number;
  connectionCount?: number;
  connectedEntities?: string[]; // Names of connected entities
}

export default function Home() {
  const [chatCollapsed, setChatCollapsed] = useState(true); // Start collapsed
  const [selectedEntity, setSelectedEntity] = useState<NodeData | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [viewingDocument, setViewingDocument] = useState<ViewingDocument | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [autoInvestigate, setAutoInvestigate] = useState(false);
  
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
  
  const handleAnalyzeConnection = useCallback((entities: string[], _nodeData?: NodeData[]) => {
    console.log('[PAGE] Analyze connection requested for:', entities);
    setSelectedEntities(entities);
    setSelectedEntity(null);
    setChatCollapsed(false);
    
    // Auto-send investigation request to AI
    if (entities.length >= 2) {
      const message = `Investigate the connection between ${entities.join(' and ')}. Are they connected in the documents? If so, explain how they are related and cite specific documents.`;
      console.log('[PAGE] Auto-sending investigation:', message);
      // The InvestigationChat component will pick up selectedEntities
    }
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
    <div className="h-screen w-screen bg-[#0a0a0f] flex flex-col overflow-hidden pb-16 sm:pb-0">
      {/* Desktop Header - Hidden on Mobile */}
      <header className="hidden sm:flex h-14 bg-[#12121a] border-b border-[#ffffff10] px-6 items-center justify-between shrink-0">
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
      
      <div className="flex-1 flex flex-col min-h-0 pt-14 sm:pt-0">
        {/* Unredacted Files Banner - Hidden on Mobile (available in hamburger menu) */}
        <div className="hidden sm:block px-4 pt-2 shrink-0">
          <UnredactedBanner />
        </div>
        
        {/* Search Panel - Positioned under notification banner */}
        {showSearch && (
          <div className="px-4 pb-2 shrink-0 z-50">
            <SearchPanel />
          </div>
        )}
        
        <div className={`relative transition-all duration-300 ease-out ${chatCollapsed ? 'flex-1' : 'h-[75%]'} ${viewingDocument ? 'invisible' : ''} z-0`}>
          <Graph3DCore onNodeSelect={handleNodeSelect} onAnalyzeConnection={handleAnalyzeConnection} />
          
          {selectedEntity && (
            <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-32px)] overflow-auto bg-[#12121a]/95 backdrop-blur-sm border border-[#ffffff15] rounded-lg shadow-xl">
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{selectedEntity.label || selectedEntity.name}</h3>
                    <p className="text-[#606070] text-xs font-mono capitalize">{selectedEntity.type}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Refresh button */}
                    <button 
                      onClick={() => window.location.reload()} 
                      className="p-1 hover:bg-[#00d4ff]/20 rounded group"
                      title="Refresh graph"
                    >
                      <svg className="w-4 h-4 text-[#606070] group-hover:text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    {/* Close button */}
                    <button onClick={() => setSelectedEntity(null)} className="p-1 hover:bg-[#ffffff10] rounded">
                      <svg className="w-4 h-4 text-[#606070]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#606070]">Documents</span>
                    <span className="text-[#00d4ff] font-mono">{selectedEntity.documentCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#606070]">Connections</span>
                    <span className="text-[#ffb800] font-mono">{selectedEntity.connectedEntities?.length || selectedEntity.connections || selectedEntity.connectionCount || 0}</span>
                  </div>
                  
                  {/* Connected Entities - show who this entity is connected to */}
                  {selectedEntity.connectedEntities && selectedEntity.connectedEntities.length > 0 && (
                    <div className="pt-2 border-t border-[#ffffff10]">
                      <p className="text-[#606070] text-xs mb-2">CONNECTED TO</p>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {selectedEntity.connectedEntities.slice(0, 10).map((name, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#ffb800]/20 text-[#ffb800] text-xs rounded">
                            {name}
                          </span>
                        ))}
                        {selectedEntity.connectedEntities.length > 10 && (
                          <span className="px-2 py-0.5 bg-[#ffffff10] text-[#606070] text-xs rounded">
                            +{selectedEntity.connectedEntities.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
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
                  onClick={() => { 
                    // Only investigate the selected entity itself, not connections
                    setSelectedEntities([selectedEntity.label || selectedEntity.name || '']); 
                    setChatCollapsed(false); 
                    setAutoInvestigate(true);
                  }}
                  className="w-full mt-4 py-2 bg-[#00d4ff]/20 text-[#00d4ff] rounded font-mono text-sm hover:bg-[#00d4ff]/30 transition-colors"
                >
                  Investigate in Chat
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Color Legend for entity types */}
        <ColorLegend />
        
        <InvestigationChat
          selectedEntities={selectedEntities}
          onViewDocument={handleViewDocument}
          isCollapsed={chatCollapsed}
          onToggleCollapse={handleToggleChat}
          autoInvestigate={autoInvestigate}
          onAutoInvestigateComplete={() => setAutoInvestigate(false)}
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
        onOpenSearch={() => {}} 
        onViewDocument={handleViewDocument}
      />
      
      {/* Search Panel - triggered from header */}
      <SearchPanel />
      
      {/* Footer - Always visible with donations */}
      <Footer />
    </div>
  );
}
