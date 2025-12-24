# WINDSURF SURGICAL FIX - EPSTEIN EXPOSED
# Execute these tasks IN ORDER. Each task is self-contained.

---

## 🔴 TASK 1: FIX DOCUMENT CLICK HANDLER (CRITICAL)

**Problem:** Orange "documents" text collapses section instead of opening document viewer

**File:** `apps/web/app/components/graph/EntityDetailPanel.tsx`

**Find this pattern:**
```typescript
// Look for something like this - text that just toggles state
<span 
  className="text-orange-500 cursor-pointer"
  onClick={() => setExpanded(!expanded)}
>
  {doc.filename || 'documents'}
</span>
```

**Replace with:**
```typescript
<button
  onClick={(e) => {
    e.stopPropagation(); // Prevent collapse
    onViewDocument(doc.id);
  }}
  className="text-orange-500 hover:text-orange-300 underline cursor-pointer 
             transition-colors font-mono text-sm"
>
  📄 {doc.filename || `Document ${doc.id}`}
</button>
```

**Also ensure the component accepts the prop:**
```typescript
interface EntityDetailPanelProps {
  entity: any;
  onClose: () => void;
  onViewDocument: (docId: string) => void; // ADD THIS IF MISSING
}
```

---

## 🔴 TASK 2: DEDUPLICATE CONNECTIONS (CRITICAL)

**Problem:** Same entity pairs appearing multiple times

**File:** `apps/api/src/services/entity-data-loader.service.ts`

**Find the function that loads/aggregates connections. Add this deduplication:**

```typescript
// Add this helper function at the top of the file
function deduplicateConnections(connections: any[]): any[] {
  const connectionMap = new Map<string, any>();
  
  for (const conn of connections) {
    // Create consistent key regardless of order
    const entities = [conn.entity1, conn.entity2].sort();
    const key = `${entities[0]}|||${entities[1]}`;
    
    if (connectionMap.has(key)) {
      const existing = connectionMap.get(key)!;
      existing.documentCount = (existing.documentCount || 0) + (conn.documentCount || 1);
      existing.documents = [...new Set([
        ...(existing.documents || []),
        ...(conn.documents || [])
      ])];
      existing.strength = Math.max(existing.strength || 0, conn.strength || 0);
    } else {
      connectionMap.set(key, { ...conn });
    }
  }
  
  return Array.from(connectionMap.values());
}

// Then wrap your existing connection loading:
// OLD: return rawConnections;
// NEW: return deduplicateConnections(rawConnections);
```

---

## 🔴 TASK 3: SLOW DOWN 3D GRAPH ANIMATIONS (CRITICAL)

**Problem:** Graph is erratic and too fast

**File:** `apps/web/app/components/graph/Graph3DCore.tsx`

**Find `<OrbitControls` and update:**

```typescript
<OrbitControls
  enableDamping={true}
  dampingFactor={0.03}        // Lower = smoother (was probably 0.05 or default)
  rotateSpeed={0.25}          // Slower rotation
  zoomSpeed={0.4}             // Slower zoom
  panSpeed={0.25}             // Slower pan
  minDistance={10}
  maxDistance={150}
  enablePan={true}
  makeDefault
/>
```

**Also add smooth node transitions. Find where nodes are rendered and add lerping:**

```typescript
// Inside your node component or EntityNode function
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function EntityNode({ node, ... }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPosition = useRef(new THREE.Vector3(...node.position));
  
  // Update target when node position changes
  useEffect(() => {
    targetPosition.current.set(...node.position);
  }, [node.position]);
  
  // Smooth interpolation every frame
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPosition.current, 0.05); // Smooth movement
    }
  });
  
  return (
    <mesh ref={meshRef} position={node.position}>
      {/* ... rest of node */}
    </mesh>
  );
}
```

---

## 🟡 TASK 4: CREATE INVESTIGATION CHAT PANEL

**Problem:** No chat interface for users to query documents

**Create new file:** `apps/web/app/components/chat/InvestigationChat.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { docId: string; docName: string; excerpt: string }[];
  timestamp: Date;
}

interface InvestigationChatProps {
  selectedEntities: string[];
  onViewDocument: (docId: string) => void;
}

export function InvestigationChat({ selectedEntities, onViewDocument }: InvestigationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [suggestedQuery, setSuggestedQuery] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate suggestion when entities selected
  useEffect(() => {
    if (selectedEntities.length >= 2) {
      setSuggestedQuery(`What connections exist between ${selectedEntities[0]} and ${selectedEntities[1]}?`);
    } else if (selectedEntities.length === 1) {
      setSuggestedQuery(`What do we know about ${selectedEntities[0]}?`);
    } else {
      setSuggestedQuery(null);
    }
  }, [selectedEntities]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    setIsLoading(true);
    setInput('');
    setSuggestedQuery(null);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/chat/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          selectedEntities,
          history: messages.slice(-6),
        }),
      });

      const data = await response.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        citations: data.citations,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'ERROR: Failed to process request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Collapsed state
  if (isCollapsed) {
    return (
      <div 
        onClick={() => setIsCollapsed(false)}
        className="h-12 bg-zinc-900 border-t border-zinc-700 flex items-center justify-between 
                   px-4 cursor-pointer hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-400 font-mono text-sm tracking-wider">
            INVESTIGATION TERMINAL
          </span>
        </div>
        <ChevronUp className="w-5 h-5 text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-t border-zinc-800">
      {/* Header */}
      <div 
        onClick={() => setIsCollapsed(true)}
        className="flex items-center justify-between px-4 py-2 bg-zinc-900 
                   border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-300 font-mono text-sm tracking-wider">
            INVESTIGATION TERMINAL
          </span>
          {selectedEntities.length > 0 && (
            <span className="text-xs text-zinc-500 ml-2">
              [{selectedEntities.length} entities selected]
            </span>
          )}
        </div>
        <ChevronDown className="w-5 h-5 text-zinc-500" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 py-6">
            <p className="font-mono text-sm mb-2">
              &gt; READY TO INVESTIGATE
            </p>
            <p className="text-xs text-zinc-600">
              CTRL+Click nodes to select • Ask questions about the documents
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === 'user' ? 'ml-8' : 'mr-8'}>
            <div className={`
              p-3 rounded-lg font-mono text-sm leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-blue-900/30 border border-blue-800/50 text-blue-100' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-200'}
            `}>
              {msg.role === 'assistant' && (
                <span className="text-green-500 mr-2">&gt;</span>
              )}
              {msg.content}
            </div>

            {/* Citations */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.citations.map((cite, i) => (
                  <button
                    key={i}
                    onClick={() => onViewDocument(cite.docId)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 
                               bg-orange-950/30 border border-orange-800/40 rounded
                               text-orange-400 hover:text-orange-300 hover:bg-orange-950/50
                               font-mono text-xs transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    {cite.docName}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-sm mr-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="animate-pulse">ANALYZING DOCUMENTS...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Query */}
      {suggestedQuery && !isLoading && (
        <div className="px-4 py-2 border-t border-zinc-800/50 bg-zinc-900/30">
          <button
            onClick={() => sendMessage(suggestedQuery)}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-200 
                       px-3 py-1.5 bg-zinc-800/50 rounded border border-zinc-700/50
                       hover:border-zinc-600 hover:bg-zinc-800 transition-all"
          >
            <span className="text-green-500 mr-1">&gt;</span>
            {suggestedQuery}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask about the documents..."
            disabled={isLoading}
            className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded px-3 py-2 
                       text-zinc-200 font-mono text-sm placeholder:text-zinc-600
                       focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30
                       disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700
                       disabled:cursor-not-allowed rounded text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🟡 TASK 5: CREATE CLAUDE API ROUTE (DOCUMENT-GROUNDED)

**Create new file:** `apps/web/app/api/chat/investigate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Path to your extracted entity JSON files
const ENTITIES_PATH = path.join(process.cwd(), '../api/data/entities');

interface EntityFile {
  documentId: string;
  filename: string;
  people?: { name: string; context?: string }[];
  locations?: { name: string; context?: string }[];
  dates?: { date: string; context?: string }[];
  rawText?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, selectedEntities, history } = await req.json();

    // Step 1: Search entity JSON files for relevant content
    const relevantDocs = await searchEntityFiles(message, selectedEntities);
    
    if (relevantDocs.length === 0) {
      return NextResponse.json({
        response: "I couldn't find relevant information in the documents. Try selecting specific entities in the graph or rephrase your question.",
        citations: [],
      });
    }

    // Step 2: Build context from ONLY our documents
    const contextChunks = relevantDocs.slice(0, 15).map(doc => 
      `[DOCUMENT: ${doc.filename}]\n${doc.excerpt}`
    ).join('\n\n---\n\n');

    // Step 3: Call Claude with STRICT document-only instructions
    const systemPrompt = `You are an investigation assistant analyzing the Jeffrey Epstein DOJ document release.

CRITICAL RULES - FOLLOW EXACTLY:
1. ONLY use information from the document excerpts provided below
2. NEVER make claims not directly supported by these documents
3. NEVER hallucinate or invent information
4. If asked about something not in the documents, say "This information is not found in the available documents"
5. Always cite which document supports each claim using format: [Source: filename]
6. Be factual and precise - no speculation

DOCUMENT EXCERPTS:
${contextChunks}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0, // ZERO temperature for factual accuracy
      system: systemPrompt,
      messages: [
        ...history.map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    });

    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // Step 4: Extract citations from response
    const citations = extractCitations(responseText, relevantDocs);

    return NextResponse.json({
      response: responseText,
      citations,
      documentsSearched: relevantDocs.length,
    });

  } catch (error) {
    console.error('Investigation API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function searchEntityFiles(
  query: string, 
  selectedEntities: string[]
): Promise<{ filename: string; docId: string; excerpt: string }[]> {
  const results: { filename: string; docId: string; excerpt: string; score: number }[] = [];
  const searchTerms = [
    ...selectedEntities.map(e => e.toLowerCase()),
    ...query.toLowerCase().split(/\s+/).filter(w => w.length > 3),
  ];

  try {
    const files = await fs.readdir(ENTITIES_PATH);
    
    for (const file of files.slice(0, 500)) { // Limit for performance
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(ENTITIES_PATH, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data: EntityFile = JSON.parse(content);
      
      // Score based on term matches
      let score = 0;
      const textToSearch = JSON.stringify(data).toLowerCase();
      
      for (const term of searchTerms) {
        if (textToSearch.includes(term)) {
          score += term.length > 5 ? 3 : 1; // Longer terms = higher weight
        }
      }
      
      if (score > 0) {
        // Build excerpt from entity data
        const excerptParts: string[] = [];
        
        if (data.people?.length) {
          excerptParts.push(`People mentioned: ${data.people.map(p => p.name).join(', ')}`);
        }
        if (data.locations?.length) {
          excerptParts.push(`Locations: ${data.locations.map(l => l.name).join(', ')}`);
        }
        if (data.dates?.length) {
          excerptParts.push(`Dates: ${data.dates.map(d => d.date).join(', ')}`);
        }
        if (data.rawText) {
          excerptParts.push(`Content: ${data.rawText.substring(0, 300)}...`);
        }
        
        results.push({
          filename: data.filename || file,
          docId: data.documentId || file.replace('.json', ''),
          excerpt: excerptParts.join('\n'),
          score,
        });
      }
    }
    
    // Sort by score, return top matches
    return results.sort((a, b) => b.score - a.score).slice(0, 20);
    
  } catch (error) {
    console.error('Error searching entity files:', error);
    return [];
  }
}

function extractCitations(
  text: string, 
  docs: { filename: string; docId: string }[]
): { docId: string; docName: string; excerpt: string }[] {
  const citations: { docId: string; docName: string; excerpt: string }[] = [];
  const citationPattern = /\[Source:\s*([^\]]+)\]/gi;
  
  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    const citedName = match[1].trim();
    const doc = docs.find(d => 
      d.filename.toLowerCase().includes(citedName.toLowerCase()) ||
      citedName.toLowerCase().includes(d.filename.toLowerCase().replace('.json', ''))
    );
    
    if (doc && !citations.find(c => c.docId === doc.docId)) {
      citations.push({
        docId: doc.docId,
        docName: doc.filename,
        excerpt: '',
      });
    }
  }
  
  return citations;
}
```

---

## 🟡 TASK 6: ADD CTRL+CLICK MULTI-SELECT TO GRAPH

**File:** `apps/web/app/components/graph/Graph3DCore.tsx`

**Add these state variables at the top of the component:**
```typescript
const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
const [showAnalyzePrompt, setShowAnalyzePrompt] = useState(false);
```

**Update/add the click handler:**
```typescript
const handleNodeClick = (node: Node, event: any) => {
  event.stopPropagation();
  
  if (event.ctrlKey || event.metaKey) {
    // CTRL+Click: Multi-select mode
    setSelectedNodes(prev => {
      const exists = prev.find(n => n.id === node.id);
      if (exists) {
        return prev.filter(n => n.id !== node.id);
      }
      const newSelection = [...prev, node];
      if (newSelection.length >= 2) {
        setShowAnalyzePrompt(true);
      }
      return newSelection;
    });
  } else {
    // Regular click: Single select
    setSelectedNodes([node]);
    setSelectedNode(node);
    onEntitySelect?.(node);
  }
};
```

**Add the analyze prompt modal:**
```typescript
{showAnalyzePrompt && selectedNodes.length >= 2 && (
  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                  bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-2xl z-50">
    <h3 className="text-lg font-mono text-zinc-200 mb-3">
      ANALYZE CONNECTION?
    </h3>
    <p className="text-sm text-zinc-400 mb-4">
      {selectedNodes.length} entities selected
    </p>
    <div className="flex flex-wrap gap-1 mb-4">
      {selectedNodes.map(n => (
        <span key={n.id} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">
          {n.label}
        </span>
      ))}
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => {
          setShowAnalyzePrompt(false);
          onConnectionAnalyze?.(selectedNodes);
        }}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded
                   font-mono text-sm transition-colors"
      >
        ANALYZE
      </button>
      <button
        onClick={() => setShowAnalyzePrompt(false)}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded
                   font-mono text-sm transition-colors"
      >
        SELECT MORE
      </button>
      <button
        onClick={() => {
          setShowAnalyzePrompt(false);
          setSelectedNodes([]);
        }}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded
                   font-mono text-sm transition-colors"
      >
        CLEAR
      </button>
    </div>
  </div>
)}
```

**Add selection indicator:**
```typescript
{selectedNodes.length > 0 && (
  <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-700 
                  rounded-lg p-3 z-40">
    <div className="text-xs text-zinc-400 font-mono mb-2">
      SELECTED ({selectedNodes.length})
    </div>
    {selectedNodes.map(n => (
      <div key={n.id} className="text-sm text-zinc-200 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        {n.label}
      </div>
    ))}
  </div>
)}
```

---

## 🟡 TASK 7: UPDATE MAIN PAGE LAYOUT (SPLIT PANE)

**File:** `apps/web/app/page.tsx`

**Replace or update the layout:**
```typescript
'use client';

import { useState, useCallback } from 'react';
import { Graph3DCore } from '@/components/graph/Graph3DCore';
import { InvestigationChat } from '@/components/chat/InvestigationChat';
import { DocumentPopup } from '@/components/document/DocumentPopup';

export default function HomePage() {
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [viewingDocument, setViewingDocument] = useState<{id: string; name: string} | null>(null);

  const handleEntitySelect = useCallback((entity: any) => {
    setSelectedEntities([entity.label]);
  }, []);

  const handleConnectionAnalyze = useCallback((entities: any[]) => {
    setSelectedEntities(entities.map(e => e.label));
  }, []);

  const handleViewDocument = useCallback((docId: string) => {
    setViewingDocument({ id: docId, name: docId });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Main Graph Area - 70% */}
      <div className="flex-[7] min-h-0 relative">
        <Graph3DCore
          onEntitySelect={handleEntitySelect}
          onConnectionAnalyze={handleConnectionAnalyze}
        />
      </div>

      {/* Chat Panel - 30% */}
      <div className="flex-[3] min-h-0 border-t border-zinc-800">
        <InvestigationChat
          selectedEntities={selectedEntities}
          onViewDocument={handleViewDocument}
        />
      </div>

      {/* Document Popup (Modal) */}
      {viewingDocument && (
        <DocumentPopup
          documentId={viewingDocument.id}
          documentName={viewingDocument.name}
          highlightTerms={selectedEntities}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
```

---

## 🟡 TASK 8: CREATE DOCUMENT POPUP COMPONENT

**Create new file:** `apps/web/app/components/document/DocumentPopup.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface DocumentPopupProps {
  documentId: string;
  documentName: string;
  highlightTerms?: string[];
  onClose: () => void;
}

export function DocumentPopup({
  documentId,
  documentName,
  highlightTerms = [],
  onClose,
}: DocumentPopupProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    // Construct PDF URL - adjust path based on your setup
    // Option 1: If PDFs are in public folder
    const url = `/documents/${documentId}.pdf`;
    
    // Option 2: If using API route
    // const url = `/api/documents/${documentId}`;
    
    setPdfUrl(url);
    setLoading(false);
  }, [documentId]);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div 
        className="w-[95vw] h-[95vh] bg-zinc-900 rounded-lg border border-zinc-700 
                   flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 
                        border-b border-zinc-700">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <h3 className="text-zinc-200 font-mono text-sm truncate">
              {documentName}
            </h3>
            
            {highlightTerms.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-zinc-500">Entities:</span>
                {highlightTerms.slice(0, 3).map((term, i) => (
                  <span 
                    key={i} 
                    className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 
                               text-xs rounded font-mono"
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Zoom controls */}
            <button
              onClick={() => setZoom(z => Math.max(50, z - 25))}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-zinc-400 font-mono w-12 text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(200, z + 25))}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-zinc-700 mx-2" />

            {/* Open in new tab */}
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Download */}
            {pdfUrl && (
              <a
                href={pdfUrl}
                download
                className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <div className="w-px h-6 bg-zinc-700 mx-2" />

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-zinc-950">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-zinc-500 font-mono text-sm animate-pulse">
                LOADING DOCUMENT...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400 font-mono text-sm text-center">
                <p>ERROR: {error}</p>
                <p className="text-zinc-500 text-xs mt-2">
                  Document ID: {documentId}
                </p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              style={{ 
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                width: `${10000 / zoom}%`,
                height: `${10000 / zoom}%`,
              }}
              title={documentName}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-zinc-500 font-mono text-sm">
                NO DOCUMENT AVAILABLE
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 🟢 TASK 9: ENVIRONMENT VARIABLES

**Add to `.env.local`:**
```bash
# Claude API (REQUIRED for chat)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: HuggingFace for embeddings/caching
HUGGINGFACE_API_KEY=hf_...

# Optional: Redis for query caching
REDIS_URL=redis://localhost:6379
```

---

## 🟢 TASK 10: INSTALL DEPENDENCIES

```bash
npm install @anthropic-ai/sdk lucide-react
# or
pnpm add @anthropic-ai/sdk lucide-react
```

---

## VERIFICATION CHECKLIST

After completing all tasks, verify:

- [ ] Orange document links open popup (not just collapse)
- [ ] No duplicate connections in entity lists
- [ ] Graph rotates smoothly without jitter
- [ ] CTRL+Click selects multiple nodes
- [ ] "Analyze Connection?" prompt appears with 2+ nodes
- [ ] Chat panel shows at bottom (30% height)
- [ ] Chat responds ONLY with document-sourced info
- [ ] Citations are clickable and open documents
- [ ] Document popup renders PDFs correctly
- [ ] ESC key closes document popup

---

## DESIGN TOKENS (Use These Colors)

```css
/* Backgrounds */
--bg-base: #09090b;     /* zinc-950 */
--bg-elevated: #18181b; /* zinc-900 */
--bg-hover: #27272a;    /* zinc-800 */

/* Text */
--text-primary: #e4e4e7;   /* zinc-200 */
--text-secondary: #a1a1aa; /* zinc-400 */
--text-muted: #71717a;     /* zinc-500 */

/* Accents */
--accent-blue: #2563eb;    /* blue-600 */
--accent-orange: #f97316;  /* orange-500 */
--accent-green: #22c55e;   /* green-500 */

/* Borders */
--border-default: #27272a; /* zinc-800 */
--border-subtle: #3f3f46;  /* zinc-700 */
```

---

## FONTS

```css
/* Use monospace for terminal/code feel */
font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
```
