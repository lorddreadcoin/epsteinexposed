# WINDSURF SURGICAL FIXES - EPSTEIN EXPOSED

Based on analysis of: https://github.com/lorddreadcoin/epsteinexposed

---

## 🔴 BUG #1: "View Documents" Button Does Nothing

**File:** `apps/web/app/components/dashboard/AnomalyStream.tsx`
**Lines:** 161-166

**CURRENT CODE (BROKEN):**
```tsx
<button className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
  View Documents
</button>
<button className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
  Related Entities
</button>
```

**FIXED CODE:**
```tsx
<button 
  className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs hover:bg-amber-500/30"
  onClick={(e) => {
    e.stopPropagation();
    // Emit event to open document viewer
    window.dispatchEvent(new CustomEvent('viewDocuments', { 
      detail: { 
        documents: anomaly.documents,
        entities: anomaly.entities,
        title: anomaly.title 
      }
    }));
  }}
>
  View Documents ({anomaly.documents?.length || 0})
</button>
<button 
  className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs hover:bg-gray-700"
  onClick={(e) => {
    e.stopPropagation();
    // Emit event to highlight entities in graph
    window.dispatchEvent(new CustomEvent('highlightEntities', { 
      detail: { entities: anomaly.entities }
    }));
  }}
>
  Related Entities ({anomaly.entities?.length || 0})
</button>
```

---

## 🔴 BUG #2: Whole Card Triggers Collapse (Blocks Button Clicks)

**File:** `apps/web/app/components/dashboard/AnomalyStream.tsx`
**Lines:** 118-121

**CURRENT CODE (BROKEN):**
```tsx
<div 
  className="p-4 cursor-pointer hover:bg-gray-900/50 transition-colors"
  onClick={() => toggleExpand(anomaly.id)}
>
```

**FIXED CODE:**
Move the onClick to just the expand button, not the whole div:
```tsx
<div className="p-4 hover:bg-gray-900/50 transition-colors">
  {/* ... content ... */}
  <button 
    className="flex items-center gap-1 text-xs text-amber-500 mt-2 hover:text-amber-400 cursor-pointer"
    onClick={() => toggleExpand(anomaly.id)}
  >
    <svg 
      className={`w-3 h-3 transition-transform ${anomaly.expanded ? 'rotate-180' : ''}`}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
    {anomaly.expanded ? 'Collapse' : 'Expand'}
  </button>
```

---

## 🟡 BUG #3: Discovery Duplicates

**File:** `apps/api/src/services/graph-builder.service.ts`
**Lines:** 279-311

**PROBLEM:** `findCoOccurrenceAnomalies()` can create duplicate discoveries for similar connections

**FIX:** Add deduplication by tracking seen entity pairs:

```typescript
async findCoOccurrenceAnomalies(): Promise<Discovery[]> {
  console.log('🔍 Finding co-occurrence anomalies...');
  
  const connections = await this.entityLoader.getStrongestConnections(100);
  const anomalies: Discovery[] = [];
  const seenPairs = new Set<string>(); // ADD THIS
  
  for (const conn of connections.slice(0, 10)) {
    if (conn.strength >= 5) {
      // ADD: Check for duplicate pairs
      const pairKey = [conn.from, conn.to].sort().join('|');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      
      const discovery: Discovery = {
        id: `discovery_cooccur_${pairKey.replace(/\|/g, '_')}`, // Deterministic ID
        // ... rest of discovery
      };
      
      anomalies.push(discovery);
      this.discoveries.push(discovery);
    }
  }
  
  console.log(`✅ Found ${anomalies.length} co-occurrence anomalies`);
  return anomalies;
}
```

Also add to line 323-327:
```typescript
async runAllDiscoveries(): Promise<Discovery[]> {
  console.log('🚀 Running all discovery algorithms...');
  
  this.discoveries = [];
  const seenIds = new Set<string>(); // ADD deduplication tracking
  
  await this.findNetworkClusters();
  await this.findGeographicPatterns();
  await this.findCoOccurrenceAnomalies();
  
  // ADD: Deduplicate discoveries
  this.discoveries = this.discoveries.filter(d => {
    if (seenIds.has(d.id)) return false;
    seenIds.add(d.id);
    return true;
  });
  
  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  this.discoveries.sort((a, b) => 
    severityOrder[a.severity] - severityOrder[b.severity]
  );
  
  console.log(`✅ Total unique discoveries: ${this.discoveries.length}`);
  return this.discoveries;
}
```

---

## 🟢 NEW FEATURE: Investigation Chat Panel

**CREATE FILE:** `apps/web/app/components/chat/InvestigationChat.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Send, Loader2, FileText, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Array<{
    documentId: string;
    documentName: string;
    excerpt?: string;
  }>;
  timestamp: Date;
}

interface InvestigationChatProps {
  selectedEntities: string[];
  onViewDocument: (docId: string, docName: string) => void;
  onHighlightEntity: (entityId: string) => void;
}

export function InvestigationChat({ 
  selectedEntities, 
  onViewDocument,
  onHighlightEntity 
}: InvestigationChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'INVESTIGATION TERMINAL READY. Select entities in the graph or ask questions about the documents.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Suggested query based on selected entities
  const suggestedQuery = selectedEntities.length === 2
    ? `What connects ${selectedEntities[0]} and ${selectedEntities[1]}?`
    : selectedEntities.length === 1
    ? `What do we know about ${selectedEntities[0]}?`
    : null;

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    setIsLoading(true);
    setInput('');

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
          webSearchEnabled,
          conversationHistory: messages.slice(-6),
        }),
      });

      if (!response.ok) throw new Error('API request failed');

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
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'ERROR: Failed to process query. Ensure API server is running on port 3001.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-0 left-0 right-0 h-10 bg-zinc-900 border-t border-zinc-700 
                   flex items-center justify-between px-4 hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-400 font-mono text-xs tracking-wider">
            INVESTIGATION TERMINAL
          </span>
        </div>
        <ChevronUp className="w-4 h-4 text-zinc-500" />
      </button>
    );
  }

  return (
    <div className="flex flex-col bg-zinc-950 border-t border-zinc-800 h-full">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 hover:bg-zinc-800"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-300 font-mono text-sm tracking-wider">
            INVESTIGATION TERMINAL
          </span>
          {selectedEntities.length > 0 && (
            <span className="text-xs text-amber-500 ml-2">
              {selectedEntities.length} entities selected
            </span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      </button>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === 'user' ? 'ml-8' : 'mr-8'}>
            <div className={`
              p-3 rounded-lg font-mono text-sm
              ${msg.role === 'user' 
                ? 'bg-blue-900/30 border border-blue-800 text-blue-100' 
                : msg.role === 'system'
                ? 'bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-xs'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-200'}
            `}>
              {msg.role === 'assistant' && (
                <span className="text-green-500 mr-2">&gt;</span>
              )}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>

            {/* Citations */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {msg.citations.map((cite, i) => (
                  <button
                    key={i}
                    onClick={() => onViewDocument(cite.documentId, cite.documentName)}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 
                               font-mono px-2 py-1 bg-orange-950/20 rounded border border-orange-900/30
                               hover:bg-orange-950/40 transition-colors"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{cite.documentName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 font-mono text-sm mr-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>ANALYZING DOCUMENTS...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Query */}
      {suggestedQuery && !isLoading && (
        <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800">
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

      {/* Input Area */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800">
        <div className="flex gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={webSearchEnabled}
              onChange={(e) => setWebSearchEnabled(e.target.checked)}
              className="w-3 h-3 rounded bg-zinc-700 border-zinc-600"
            />
            <span>Enable web search (if docs don't have answer)</span>
          </label>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask about the documents..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 
                       text-zinc-200 font-mono text-sm placeholder:text-zinc-600
                       focus:outline-none focus:border-zinc-500"
            disabled={isLoading}
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

## 🟢 NEW: Chat API Route

**CREATE FILE:** `apps/web/app/api/chat/investigate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// This route calls your tRPC API to search documents, then calls Claude
export async function POST(req: NextRequest) {
  try {
    const { message, selectedEntities, webSearchEnabled, conversationHistory } = await req.json();

    // Step 1: Search documents for relevant content
    const searchTerms = [
      ...selectedEntities,
      ...message.split(' ').filter((w: string) => w.length > 3),
    ].slice(0, 10);

    // Call your existing API to search entities
    const searchResponse = await fetch(
      `http://localhost:3001/trpc/graph.searchEntities?input=${encodeURIComponent(
        JSON.stringify({ query: searchTerms.join(' '), limit: 20 })
      )}`
    );
    const searchData = await searchResponse.json();
    const relevantEntities = searchData.result?.data || [];

    // Build context from found entities
    const documentContext = relevantEntities
      .slice(0, 10)
      .map((e: any) => `- ${e.name} (${e.type}): mentioned ${e.occurrences} times in ${e.documentIds?.length || 0} documents`)
      .join('\n');

    // Step 2: Call Claude API (or mock for now)
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    if (!ANTHROPIC_API_KEY) {
      // Return mock response if no API key
      return NextResponse.json({
        response: `Based on the documents, I found ${relevantEntities.length} relevant entities for your query about "${message}".\n\n${documentContext}\n\nNote: Configure ANTHROPIC_API_KEY for AI-powered analysis.`,
        citations: relevantEntities.slice(0, 3).map((e: any) => ({
          documentId: e.documentIds?.[0] || 'unknown',
          documentName: `${e.name}_mentions.json`,
        })),
      });
    }

    // Real Claude API call
    const systemPrompt = `You are an investigation assistant analyzing the Jeffrey Epstein DOJ document release.

CRITICAL RULES:
1. ONLY use information from the provided document excerpts
2. NEVER make claims not supported by the documents
3. If asked about something not in the documents, say "This information is not found in the available documents"
4. Be precise and factual - no speculation
5. Keep responses concise but informative

Available entities from documents:
${documentContext}

Selected entities to focus on: ${selectedEntities.join(', ') || 'None'}`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0, // Zero for factual accuracy
        system: systemPrompt,
        messages: [
          ...conversationHistory.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          { role: 'user', content: message },
        ],
      }),
    });

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || 'No response generated.';

    return NextResponse.json({
      response: responseText,
      citations: relevantEntities.slice(0, 5).map((e: any) => ({
        documentId: e.documentIds?.[0] || 'unknown',
        documentName: e.name,
        excerpt: `Mentioned ${e.occurrences} times`,
      })),
    });

  } catch (error) {
    console.error('Investigation chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process query', response: 'ERROR: Query processing failed.' },
      { status: 500 }
    );
  }
}
```

---

## 🟢 UPDATED: Main Page Layout with Chat

**UPDATE FILE:** `apps/web/app/page.tsx`

Replace contents with:

```typescript
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { InvestigationChat } from './components/chat/InvestigationChat';

// Dynamic import for 3D component (no SSR)
const Graph3DCore = dynamic(
  () => import('./components/graph/Graph3DCore').then(mod => ({ default: mod.Graph3DCore })),
  { ssr: false, loading: () => <div className="h-full bg-black flex items-center justify-center text-white">Loading 3D Graph...</div> }
);

export default function Home() {
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [viewingDocument, setViewingDocument] = useState<{ id: string; name: string } | null>(null);

  // Listen for events from AnomalyStream
  useEffect(() => {
    const handleViewDocs = (e: CustomEvent) => {
      console.log('View documents:', e.detail);
      // Could open a modal or set state
    };
    
    const handleHighlight = (e: CustomEvent) => {
      setSelectedEntities(e.detail.entities || []);
    };

    window.addEventListener('viewDocuments', handleViewDocs as EventListener);
    window.addEventListener('highlightEntities', handleHighlight as EventListener);

    return () => {
      window.removeEventListener('viewDocuments', handleViewDocs as EventListener);
      window.removeEventListener('highlightEntities', handleHighlight as EventListener);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* 3D Graph - 70% */}
      <div className="flex-1 min-h-0" style={{ height: '70vh' }}>
        <Graph3DCore />
      </div>

      {/* Chat Panel - 30% */}
      <div style={{ height: '30vh' }}>
        <InvestigationChat
          selectedEntities={selectedEntities}
          onViewDocument={(docId, docName) => {
            setViewingDocument({ id: docId, name: docName });
          }}
          onHighlightEntity={(entityId) => {
            setSelectedEntities(prev => 
              prev.includes(entityId) ? prev : [...prev, entityId]
            );
          }}
        />
      </div>
    </div>
  );
}
```

---

## 🟢 ADD: CTRL+Click Multi-Select to Graph

**UPDATE FILE:** `apps/web/app/components/graph/Graph3DCore.tsx`

Add these state variables around line 120:
```typescript
const [multiSelectedNodes, setMultiSelectedNodes] = useState<Set<string>>(new Set());
```

Update the `GraphNode` component's onClick handler (line 72):
```typescript
onClick={(e) => { 
  e.stopPropagation(); 
  if (e.ctrlKey || e.metaKey) {
    // Multi-select mode
    setMultiSelectedNodes(prev => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  } else {
    // Single select
    setMultiSelectedNodes(new Set());
    onClick(node);
  }
}}
```

Update `isSelected` prop usage to include multi-select:
```typescript
isSelected={selectedNode?.id === node.id || multiSelectedNodes.has(node.id)}
```

Add analyze connection button when 2+ nodes selected (after line 268):
```typescript
{multiSelectedNodes.size >= 2 && (
  <div className="absolute top-8 right-8 bg-black/95 border border-amber-500 rounded-lg p-4 z-20">
    <h3 className="text-white font-bold mb-2">
      {multiSelectedNodes.size} Entities Selected
    </h3>
    <p className="text-gray-400 text-sm mb-3">
      CTRL+Click more or analyze connection
    </p>
    <button
      onClick={() => {
        // Dispatch event for chat to pick up
        window.dispatchEvent(new CustomEvent('analyzeConnection', {
          detail: { entities: Array.from(multiSelectedNodes) }
        }));
      }}
      className="w-full px-4 py-2 bg-amber-500 text-black rounded font-bold hover:bg-amber-400"
    >
      ANALYZE CONNECTION
    </button>
    <button
      onClick={() => setMultiSelectedNodes(new Set())}
      className="w-full mt-2 px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
    >
      Clear Selection
    </button>
  </div>
)}
```

---

## 📁 ENVIRONMENT VARIABLES

Add to `.env.local` in `apps/web/`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

## 🎨 STYLING IMPROVEMENTS (Bubblemaps-Inspired)

**UPDATE:** `apps/web/app/components/graph/Graph3DCore.tsx` GraphNode component

Replace the meshBasicMaterial with this for better visuals:
```typescript
<meshStandardMaterial 
  color={color} 
  emissive={color}
  emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.4 : 0.2}
  metalness={0.2}
  roughness={0.8}
  transparent 
  opacity={isSelected ? 1 : 0.85} 
/>
```

Add a glow effect by adding a second larger sphere behind:
```typescript
{/* Glow */}
<mesh>
  <sphereGeometry args={[size * 1.5, 16, 16]} />
  <meshBasicMaterial 
    color={color} 
    transparent 
    opacity={isSelected ? 0.3 : isHovered ? 0.15 : 0.05} 
  />
</mesh>
```

---

## 📋 EXECUTION ORDER FOR WINDSURF

1. **Fix AnomalyStream.tsx** - Add onClick handlers to buttons
2. **Fix AnomalyStream.tsx** - Remove onClick from parent div, keep only on expand button
3. **Fix graph-builder.service.ts** - Add deduplication to discoveries
4. **Create** `apps/web/app/components/chat/InvestigationChat.tsx`
5. **Create** `apps/web/app/api/chat/investigate/route.ts`
6. **Update** `apps/web/app/page.tsx` with split layout
7. **Update** Graph3DCore with CTRL+Click multi-select
8. **Update** Graph3DCore with improved styling
9. **Add** `.env.local` with ANTHROPIC_API_KEY
10. **Test** full flow: Click entity → Chat suggests query → Get response with citations → Click citation → View document

---

## ✅ VERIFICATION CHECKLIST

After implementing, verify:

- [ ] "View Documents" button in AnomalyStream opens documents (not collapse)
- [ ] "Related Entities" button highlights entities in graph
- [ ] Expand/Collapse only triggers on the expand button click
- [ ] No duplicate discoveries in the Anomaly Stream
- [ ] Chat panel shows at bottom (30% height)
- [ ] Chat responds with document-grounded answers
- [ ] Citations in chat are clickable
- [ ] CTRL+Click selects multiple nodes in graph
- [ ] "ANALYZE CONNECTION" button appears with 2+ nodes selected
- [ ] Graph nodes have glow effect and smooth animations
