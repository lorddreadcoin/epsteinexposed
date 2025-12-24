# WINDSURF DIRECTIVE: EPSTEIN EXPOSED PLATFORM OVERHAUL

## 🎯 MISSION
Transform the current buggy prototype into a production-grade investigation platform. Every feature must be:
- **Source-grounded** (ONLY references the 11,622 DOJ PDFs)
- **Traceable** (every claim links to source documents)
- **Interactive** (users drive discovery, not passive consumption)

---

## 📁 PROJECT STRUCTURE
```
epsteinexposed/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── graph/      # 3D visualization (React Three Fiber)
│   │   │   │   ├── chat/       # NEW: Investigation chat panel
│   │   │   │   ├── document/   # PDF viewer + annotations
│   │   │   │   └── ui/         # shadcn components
│   │   │   └── lib/
│   │   ├── DataSet 8/          # DOJ document datasets
│   │   └── public/
│   ├── api/                    # tRPC backend
│   │   ├── data/
│   │   │   └── entities/       # Extracted JSON files (96K+ entities)
│   │   ├── routers/
│   │   └── services/
│   └── workers/                # Background processing
├── packages/
│   └── shared/                 # Shared types/utils
└── docker-compose.yml
```

---

## 🔴 CRITICAL BUGS TO FIX (PRIORITY 1)

### Bug 1: Orange "documents" text not clickable
**Location:** `apps/web/app/components/graph/EntityDetailPanel.tsx` or similar
**Problem:** Text shows "View Documents" but click handler only toggles collapse state
**Fix:**
```typescript
// WRONG - just toggles state
<span onClick={() => setExpanded(!expanded)}>
  documents
</span>

// CORRECT - navigates to document viewer
<button 
  onClick={() => onViewDocument(doc.id)}
  className="text-orange-500 hover:text-orange-400 underline cursor-pointer"
>
  {doc.filename}
</button>
```

### Bug 2: Duplicate connection mentions
**Location:** `apps/api/src/services/entity-data-loader.service.ts`
**Problem:** Same entity pairs appearing multiple times in connection list
**Fix:**
```typescript
// Add deduplication when aggregating connections
const connectionMap = new Map<string, Connection>();

for (const conn of rawConnections) {
  const key = [conn.entity1, conn.entity2].sort().join('|');
  
  if (connectionMap.has(key)) {
    // Merge document counts
    const existing = connectionMap.get(key)!;
    existing.documentCount += conn.documentCount;
    existing.documents = [...new Set([...existing.documents, ...conn.documents])];
  } else {
    connectionMap.set(key, conn);
  }
}

return Array.from(connectionMap.values());
```

### Bug 3: 3D graph too fast/erratic
**Location:** `apps/web/app/components/graph/Graph3DCore.tsx`
**Fix:**
```typescript
// Add damping to camera controls
<OrbitControls 
  enableDamping={true}
  dampingFactor={0.05}    // Smooth camera movement
  rotateSpeed={0.3}       // Slower rotation
  zoomSpeed={0.5}         // Slower zoom
  panSpeed={0.3}          // Slower pan
/>

// Add animation smoothing to nodes
useFrame((state, delta) => {
  // Lerp position changes instead of instant
  meshRef.current.position.lerp(targetPosition, 0.05);
});
```

---

## 🟡 NEW FEATURES TO BUILD (PRIORITY 2)

### Feature 1: Investigation Chat Panel (Bottom Split Pane)

**Design Spec:**
- Split pane layout: Graph (70-75%) | Chat (25-30%)
- Chat panel is collapsible (click to minimize)
- Clean, readable text without scrolling for main content
- "Techy" aesthetic - monospace hints, subtle animations

**File:** `apps/web/app/components/chat/InvestigationChat.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Send, Loader2, FileText } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

interface Citation {
  documentId: string;
  documentName: string;
  excerpt: string;
  page?: number;
}

export function InvestigationChat({ 
  selectedEntities,
  onViewDocument 
}: { 
  selectedEntities: string[];
  onViewDocument: (docId: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [suggestedQuery, setSuggestedQuery] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-suggest when entities are selected
  useEffect(() => {
    if (selectedEntities.length === 2) {
      setSuggestedQuery(
        `What connections exist between ${selectedEntities[0]} and ${selectedEntities[1]}?`
      );
    } else if (selectedEntities.length === 1) {
      setSuggestedQuery(
        `What do we know about ${selectedEntities[0]} from the documents?`
      );
    } else {
      setSuggestedQuery(null);
    }
  }, [selectedEntities]);

  const sendMessage = async (content: string) => {
    setIsLoading(true);
    setInput('');
    setSuggestedQuery(null);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          selectedEntities,
          conversationHistory: messages.slice(-10), // Last 10 for context
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        citations: data.citations,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCollapsed) {
    return (
      <div 
        className="fixed bottom-0 left-0 right-0 h-12 bg-zinc-900 border-t border-zinc-700 
                   flex items-center justify-between px-4 cursor-pointer hover:bg-zinc-800"
        onClick={() => setIsCollapsed(false)}
      >
        <span className="text-zinc-400 font-mono text-sm">
          INVESTIGATION TERMINAL
        </span>
        <ChevronUp className="w-5 h-5 text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-t border-zinc-800">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 cursor-pointer"
        onClick={() => setIsCollapsed(true)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-300 font-mono text-sm tracking-wider">
            INVESTIGATION TERMINAL
          </span>
        </div>
        <ChevronDown className="w-5 h-5 text-zinc-500" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 py-8">
            <p className="font-mono text-sm">
              &gt; SELECT ENTITIES IN GRAPH OR ASK A QUESTION
            </p>
            <p className="text-xs mt-2">
              CTRL+Click nodes to select • All responses sourced from DOJ documents
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}>
            <div className={`
              p-3 rounded-lg font-mono text-sm
              ${msg.role === 'user' 
                ? 'bg-blue-900/30 border border-blue-800 text-blue-100' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-200'}
            `}>
              {msg.role === 'assistant' && (
                <span className="text-green-500 mr-2">&gt;</span>
              )}
              {msg.content}
            </div>

            {/* Citations */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 space-y-1">
                {msg.citations.map((cite, i) => (
                  <button
                    key={i}
                    onClick={() => onViewDocument(cite.documentId)}
                    className="flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300 
                               font-mono px-2 py-1 bg-orange-950/20 rounded border border-orange-900/30
                               hover:bg-orange-950/40 transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    <span>{cite.documentName}</span>
                    {cite.page && <span className="text-zinc-500">p.{cite.page}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>ANALYZING DOCUMENTS...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Query */}
      {suggestedQuery && (
        <div className="px-4 py-2 bg-zinc-900/50">
          <button
            onClick={() => sendMessage(suggestedQuery)}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-200 
                       px-3 py-1.5 bg-zinc-800 rounded border border-zinc-700
                       hover:border-zinc-600 transition-colors"
          >
            &gt; {suggestedQuery}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && input.trim() && sendMessage(input)}
            placeholder="Ask about the documents..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 
                       text-zinc-200 font-mono text-sm placeholder:text-zinc-600
                       focus:outline-none focus:border-zinc-600"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700
                       rounded text-white transition-colors"
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

### Feature 2: Document-Grounded Claude API Integration

**File:** `apps/web/app/api/chat/investigate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { searchDocuments, getDocumentContent } from '@/lib/document-search';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { message, selectedEntities, conversationHistory } = await req.json();

  // Step 1: Search our document corpus for relevant content
  const searchTerms = [
    ...selectedEntities,
    ...extractKeyTerms(message),
  ];

  const relevantDocs = await searchDocuments(searchTerms, { limit: 20 });
  
  // Step 2: Build context from ONLY our documents
  const documentContext = relevantDocs.map(doc => ({
    id: doc.id,
    name: doc.filename,
    excerpt: doc.relevantExcerpt,
    page: doc.page,
  }));

  const contextText = documentContext
    .map(d => `[Document: ${d.name}${d.page ? `, Page ${d.page}` : ''}]\n${d.excerpt}`)
    .join('\n\n---\n\n');

  // Step 3: Call Claude with strict document-only instructions
  const systemPrompt = `You are an investigation assistant analyzing the Jeffrey Epstein DOJ document release.

CRITICAL RULES:
1. ONLY use information from the provided document excerpts
2. NEVER make claims not supported by the documents
3. ALWAYS cite which document supports each claim
4. If information is not in the documents, say "This information is not found in the available documents"
5. Be precise and factual - no speculation

When citing documents, format as: [Source: document_name.pdf, p.X]

Available document excerpts:
${contextText}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    temperature: 0, // Zero temperature for factual accuracy
    system: systemPrompt,
    messages: [
      ...conversationHistory.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ],
  });

  // Step 4: Extract citations from response
  const responseText = response.content[0].type === 'text' 
    ? response.content[0].text 
    : '';

  const citations = extractCitations(responseText, documentContext);

  return NextResponse.json({
    response: responseText,
    citations,
    documentsSearched: relevantDocs.length,
  });
}

function extractKeyTerms(message: string): string[] {
  // Extract proper nouns, names, locations from the query
  const words = message.split(/\s+/);
  return words.filter(w => 
    w.length > 3 && 
    (w[0] === w[0].toUpperCase() || /\d{4}/.test(w))
  );
}

function extractCitations(text: string, docs: any[]): any[] {
  const citations: any[] = [];
  const citationPattern = /\[Source: ([^\]]+)\]/g;
  
  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    const citedName = match[1].split(',')[0].trim();
    const doc = docs.find(d => d.name.includes(citedName));
    if (doc) {
      citations.push({
        documentId: doc.id,
        documentName: doc.name,
        excerpt: doc.excerpt.substring(0, 100) + '...',
        page: doc.page,
      });
    }
  }
  
  return citations;
}
```

---

### Feature 3: Enhanced 3D Graph with CTRL+Click Selection

**File:** `apps/web/app/components/graph/Graph3DCore.tsx` (updates)

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Node {
  id: string;
  label: string;
  type: 'person' | 'location' | 'date' | 'organization';
  position: [number, number, number];
  documentCount: number;
}

// Bubble styling inspired by bubblemaps.io / arkham.intel
const NODE_COLORS = {
  person: {
    base: '#3B82F6',      // Blue
    glow: '#60A5FA',
    selected: '#93C5FD',
  },
  location: {
    base: '#10B981',      // Green
    glow: '#34D399',
    selected: '#6EE7B7',
  },
  date: {
    base: '#F59E0B',      // Amber
    glow: '#FBBF24',
    selected: '#FCD34D',
  },
  organization: {
    base: '#8B5CF6',      // Purple
    glow: '#A78BFA',
    selected: '#C4B5FD',
  },
};

function EntityNode({ 
  node, 
  isSelected, 
  isHighlighted,
  onClick,
  onCtrlClick,
}: {
  node: Node;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: (node: Node) => void;
  onCtrlClick: (node: Node) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const colors = NODE_COLORS[node.type];
  const baseSize = Math.min(0.3 + (node.documentCount / 100) * 0.5, 1.0);
  
  // Smooth pulsing animation
  useFrame((state) => {
    if (meshRef.current) {
      const pulse = isSelected || hovered 
        ? 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
        : 1;
      meshRef.current.scale.setScalar(baseSize * pulse);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(baseSize * 1.5);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 
        isSelected ? 0.4 : hovered ? 0.2 : 0.1;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      onCtrlClick(node);
    } else {
      onClick(node);
    }
  };

  return (
    <group position={node.position}>
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={0.1}
        />
      </mesh>
      
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={isSelected ? colors.selected : colors.base}
          emissive={colors.glow}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0.1}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      {/* Label */}
      {(hovered || isSelected) && (
        <Text
          position={[0, baseSize + 0.3, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/fonts/mono.woff"
        >
          {node.label}
        </Text>
      )}
      
      {/* Document count badge */}
      {(hovered || isSelected) && (
        <Text
          position={[0, baseSize + 0.1, 0]}
          fontSize={0.12}
          color="#9CA3AF"
          anchorX="center"
          anchorY="middle"
        >
          {node.documentCount} docs
        </Text>
      )}
    </group>
  );
}

export function Graph3DCore({
  onEntitySelect,
  onConnectionAnalyze,
}: {
  onEntitySelect: (entity: Node) => void;
  onConnectionAnalyze: (entities: Node[]) => void;
}) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [showAnalyzePrompt, setShowAnalyzePrompt] = useState(false);

  const handleNodeClick = (node: Node) => {
    setSelectedNodes([node]);
    onEntitySelect(node);
  };

  const handleCtrlClick = (node: Node) => {
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
  };

  const handleAnalyzeConnection = () => {
    setShowAnalyzePrompt(false);
    onConnectionAnalyze(selectedNodes);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} />
        
        {nodes.map((node) => (
          <EntityNode
            key={node.id}
            node={node}
            isSelected={selectedNodes.some(n => n.id === node.id)}
            isHighlighted={false}
            onClick={handleNodeClick}
            onCtrlClick={handleCtrlClick}
          />
        ))}

        {edges.map((edge, i) => (
          <ConnectionLine key={i} from={edge.from} to={edge.to} nodes={nodes} />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.3}
          zoomSpeed={0.5}
          panSpeed={0.3}
          minDistance={10}
          maxDistance={100}
        />
      </Canvas>

      {/* Selection indicator */}
      {selectedNodes.length > 0 && (
        <div className="absolute top-4 left-4 bg-zinc-900/90 border border-zinc-700 rounded-lg p-3">
          <div className="text-xs text-zinc-400 font-mono mb-2">SELECTED ENTITIES</div>
          <div className="space-y-1">
            {selectedNodes.map(node => (
              <div key={node.id} className="flex items-center gap-2 text-sm text-zinc-200">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: NODE_COLORS[node.type].base }}
                />
                {node.label}
              </div>
            ))}
          </div>
          {selectedNodes.length >= 2 && (
            <div className="text-xs text-zinc-500 mt-2">
              Press ANALYZE or select more
            </div>
          )}
        </div>
      )}

      {/* Analyze Connection Prompt */}
      {showAnalyzePrompt && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                        bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-2xl">
          <h3 className="text-lg font-mono text-zinc-200 mb-4">
            ANALYZE CONNECTION?
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Find connections between {selectedNodes.length} entities in the documents
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleAnalyzeConnection}
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

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 text-xs font-mono text-zinc-500">
        CLICK: Select entity • CTRL+CLICK: Multi-select • SCROLL: Zoom • DRAG: Rotate
      </div>
    </div>
  );
}
```

---

### Feature 4: Discovery Queue System

**File:** `apps/web/app/components/discovery/DiscoveryQueue.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Sparkles, AlertTriangle, Users, FileText } from 'lucide-react';

interface Discovery {
  id: string;
  type: 'connection' | 'anomaly' | 'cluster' | 'timeline';
  title: string;
  description: string;
  entities: string[];
  documentCount: number;
  significance: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export function DiscoveryQueue({
  onExplore,
  onViewDocument,
}: {
  onExplore: (discovery: Discovery) => void;
  onViewDocument: (docId: string) => void;
}) {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoMode, setIsAutoMode] = useState(false);

  const currentDiscovery = discoveries[currentIndex];

  const handleNext = () => {
    if (currentIndex < discoveries.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleExplore = () => {
    if (currentDiscovery) {
      onExplore(currentDiscovery);
    }
  };

  const significanceColors = {
    high: 'border-red-500 bg-red-950/20',
    medium: 'border-yellow-500 bg-yellow-950/20',
    low: 'border-blue-500 bg-blue-950/20',
  };

  const significanceIcons = {
    high: <AlertTriangle className="w-4 h-4 text-red-500" />,
    medium: <Sparkles className="w-4 h-4 text-yellow-500" />,
    low: <Users className="w-4 h-4 text-blue-500" />,
  };

  if (!currentDiscovery) {
    return (
      <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="text-center text-zinc-500 font-mono text-sm">
          <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p>NO DISCOVERIES IN QUEUE</p>
          <p className="text-xs mt-1">Select entities or run analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${significanceColors[currentDiscovery.significance]}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {significanceIcons[currentDiscovery.significance]}
          <span className="text-xs font-mono text-zinc-400">
            DISCOVERY {currentIndex + 1} / {discoveries.length}
          </span>
        </div>
        <span className="text-xs font-mono text-zinc-500 uppercase">
          {currentDiscovery.type}
        </span>
      </div>

      {/* Content */}
      <h4 className="text-zinc-200 font-medium mb-2">{currentDiscovery.title}</h4>
      <p className="text-sm text-zinc-400 mb-3">{currentDiscovery.description}</p>

      {/* Entities involved */}
      <div className="flex flex-wrap gap-1 mb-3">
        {currentDiscovery.entities.slice(0, 5).map((entity, i) => (
          <span
            key={i}
            className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300 font-mono"
          >
            {entity}
          </span>
        ))}
        {currentDiscovery.entities.length > 5 && (
          <span className="px-2 py-0.5 text-xs text-zinc-500">
            +{currentDiscovery.entities.length - 5} more
          </span>
        )}
      </div>

      {/* Document count */}
      <div className="flex items-center gap-1 text-xs text-zinc-500 mb-4">
        <FileText className="w-3 h-3" />
        <span>{currentDiscovery.documentCount} supporting documents</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleExplore}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded
                     font-mono text-sm transition-colors flex items-center justify-center gap-2"
        >
          EXPLORE
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= discoveries.length - 1}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 
                     disabled:text-zinc-600 text-zinc-200 rounded font-mono text-sm 
                     transition-colors"
        >
          SKIP
        </button>
      </div>
    </div>
  );
}
```

---

### Feature 5: Document Popup Viewer

**File:** `apps/web/app/components/document/DocumentPopup.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch PDF URL from our document store
    fetch(`/api/documents/${documentId}`)
      .then(r => r.json())
      .then(data => {
        setPdfUrl(data.url);
        setTotalPages(data.pageCount || 1);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load document:', err);
        setLoading(false);
      });
  }, [documentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-[90vw] h-[90vh] bg-zinc-900 rounded-lg border border-zinc-700 
                      flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <h3 className="text-zinc-200 font-mono text-sm truncate max-w-[400px]">
              {documentName}
            </h3>
            {highlightTerms.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500">Highlighting:</span>
                {highlightTerms.map((term, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 
                                          text-xs rounded font-mono">
                    {term}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <button
              onClick={() => setZoom(z => Math.max(50, z - 25))}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-zinc-400 font-mono w-12 text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(200, z + 25))}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-zinc-700 mx-2" />

            {/* Page navigation */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-zinc-700 disabled:opacity-50 rounded text-zinc-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-zinc-400 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-zinc-700 disabled:opacity-50 rounded text-zinc-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-zinc-700 mx-2" />

            {/* Download */}
            <a
              href={pdfUrl || '#'}
              download
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-zinc-950 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-zinc-500 font-mono text-sm">
                LOADING DOCUMENT...
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#page=${currentPage}&zoom=${zoom}`}
              className="w-full h-full rounded border border-zinc-800"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400 font-mono text-sm">
                DOCUMENT NOT FOUND
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

## 🧠 HUGGINGFACE INTEGRATION (MEMORY/CACHING)

**File:** `apps/api/src/services/memory-cache.service.ts`

```typescript
import { HfInference } from '@huggingface/inference';
import Redis from 'ioredis';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const redis = new Redis(process.env.REDIS_URL);

interface QueryResult {
  response: string;
  citations: any[];
  embedding: number[];
}

export class MemoryCacheService {
  private embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
  
  // Generate embedding for a query
  async getQueryEmbedding(query: string): Promise<number[]> {
    const result = await hf.featureExtraction({
      model: this.embeddingModel,
      inputs: query,
    });
    return result as number[];
  }

  // Store query result with embedding
  async cacheQueryResult(query: string, result: QueryResult): Promise<void> {
    const embedding = await this.getQueryEmbedding(query);
    const key = `query:${this.hashQuery(query)}`;
    
    await redis.set(key, JSON.stringify({
      query,
      embedding,
      result,
      timestamp: Date.now(),
    }), 'EX', 86400 * 7); // 7 day expiry
  }

  // Find similar cached queries
  async findSimilarQuery(query: string, threshold = 0.85): Promise<QueryResult | null> {
    const queryEmbedding = await this.getQueryEmbedding(query);
    
    // Scan cached queries
    const keys = await redis.keys('query:*');
    let bestMatch: { similarity: number; result: QueryResult } | null = null;
    
    for (const key of keys) {
      const cached = await redis.get(key);
      if (!cached) continue;
      
      const { embedding, result } = JSON.parse(cached);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      
      if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { similarity, result };
      }
    }
    
    return bestMatch?.result || null;
  }

  // Cosine similarity calculation
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private hashQuery(query: string): string {
    return Buffer.from(query.toLowerCase().trim()).toString('base64').slice(0, 32);
  }
}
```

---

## 📐 MAIN LAYOUT UPDATE

**File:** `apps/web/app/page.tsx` or `apps/web/app/layout.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Graph3DCore } from '@/components/graph/Graph3DCore';
import { InvestigationChat } from '@/components/chat/InvestigationChat';
import { DiscoveryQueue } from '@/components/discovery/DiscoveryQueue';
import { DocumentPopup } from '@/components/document/DocumentPopup';

export default function HomePage() {
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [viewingDocument, setViewingDocument] = useState<{id: string; name: string} | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top: 3D Graph (70-75%) */}
      <div className={`flex-1 ${chatCollapsed ? 'h-[calc(100vh-48px)]' : 'h-[70vh]'} transition-all duration-300`}>
        <Graph3DCore
          onEntitySelect={(entity) => setSelectedEntities([entity.label])}
          onConnectionAnalyze={(entities) => setSelectedEntities(entities.map(e => e.label))}
        />
      </div>

      {/* Discovery sidebar (optional - can be toggled) */}
      <div className="absolute top-4 right-4 w-80">
        <DiscoveryQueue
          onExplore={(discovery) => setSelectedEntities(discovery.entities)}
          onViewDocument={(docId) => setViewingDocument({ id: docId, name: 'Document' })}
        />
      </div>

      {/* Bottom: Chat Panel (25-30%) */}
      <div className={`${chatCollapsed ? 'h-12' : 'h-[30vh]'} transition-all duration-300`}>
        <InvestigationChat
          selectedEntities={selectedEntities}
          onViewDocument={(docId) => setViewingDocument({ id: docId, name: 'Document' })}
        />
      </div>

      {/* Document Popup */}
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

## 🔧 ENVIRONMENT VARIABLES NEEDED

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
HUGGINGFACE_API_KEY=hf_...
REDIS_URL=redis://localhost:6379

# Optional: For production
DATABASE_URL=postgresql://...
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
```

---

## 📋 WINDSURF EXECUTION ORDER

1. **Fix orange document links** - Make them actually navigate to documents
2. **Add deduplication to entity loader** - Remove duplicate connections
3. **Slow down 3D animations** - Add damping to OrbitControls
4. **Build InvestigationChat component** - Bottom split pane
5. **Build Claude API route** - Document-grounded responses only
6. **Update Graph3DCore with CTRL+click** - Multi-select for connection analysis
7. **Build DocumentPopup** - Modal PDF viewer
8. **Build DiscoveryQueue** - Next discovery system
9. **Add HuggingFace memory caching** - Faster repeated queries
10. **Wire up main layout** - Split pane graph + chat

---

## 🎨 DESIGN NOTES

**Color Palette (Dark/Techy):**
- Background: `zinc-950` (#09090b)
- Cards: `zinc-900` (#18181b)
- Borders: `zinc-800` (#27272a)
- Text Primary: `zinc-200` (#e4e4e7)
- Text Secondary: `zinc-400` (#a1a1aa)
- Accent Blue: `blue-600` (#2563eb)
- Accent Orange: `orange-500` (#f97316)
- Success: `green-500` (#22c55e)
- Warning: `yellow-500` (#eab308)
- Error: `red-500` (#ef4444)

**Typography:**
- Headings: System sans-serif
- Body: System sans-serif
- Code/Terminal: `font-mono` (JetBrains Mono or similar)

**Animations:**
- All transitions: `300ms` ease
- Hover states: Subtle glow/scale
- Loading states: Pulse animation
- Graph nodes: Smooth lerp (0.05 factor)

---

## 🚨 CRITICAL REMINDERS

1. **NEVER HALLUCINATE** - Claude must ONLY cite documents in your corpus
2. **ALWAYS PROVIDE RECEIPTS** - Every claim needs a clickable document link
3. **DEDUPLICATE EVERYTHING** - No duplicate entities, connections, or discoveries
4. **SMOOTH UX** - No jarring animations, no instant state changes
5. **ACCESSIBLE** - Keyboard navigation, screen reader friendly
6. **PERFORMANT** - Virtualize large lists, lazy load documents
