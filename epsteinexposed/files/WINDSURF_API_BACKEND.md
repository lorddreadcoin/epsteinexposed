# 🔌 WINDSURF DIRECTIVE: API & BACKEND SERVICES

## API Route: Document-Grounded Chat

**File: `apps/api/src/routes/chat.ts`**

```typescript
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { DocumentSearchService } from '../services/document-search.service';
import { EntityIndexService } from '../services/entity-index.service';

const router = Router();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const documentSearch = new DocumentSearchService();
const entityIndex = new EntityIndexService();

interface ChatRequest {
  message: string;
  context: {
    selectedEntities?: string[];
    conversationHistory?: Array<{ role: string; content: string }>;
    useWebSearch?: boolean;
  };
}

interface Citation {
  documentId: string;
  documentName: string;
  excerpt: string;
  page?: number;
}

router.post('/investigate', async (req, res) => {
  try {
    const { message, context } = req.body as ChatRequest;
    
    // Step 1: Search documents for relevant content
    console.log('[CHAT] Searching documents for:', message);
    const searchTerms = [
      message,
      ...(context.selectedEntities || []),
    ].filter(Boolean);
    
    const relevantDocs = await documentSearch.searchDocuments(searchTerms, {
      limit: 20,
      minRelevance: 0.3,
    });
    
    console.log(`[CHAT] Found ${relevantDocs.length} relevant documents`);
    
    // Step 2: Build context from documents
    const documentContext = relevantDocs.map(doc => ({
      id: doc.id,
      name: doc.filename,
      content: doc.excerpt,
      entities: doc.entities,
    }));
    
    // Step 3: Build system prompt - DOCUMENT-GROUNDED ONLY
    const systemPrompt = `You are an investigative research assistant analyzing the Jeffrey Epstein DOJ document releases.

CRITICAL RULES:
1. You may ONLY cite information that exists in the provided documents
2. NEVER hallucinate or make up information
3. NEVER reference external sources unless explicitly told to search the web
4. Every claim must be traceable to a specific document
5. If information is not in the documents, say "This information is not found in the available documents."
6. Use a professional, factual tone - no sensationalism
7. When citing documents, use the format: [DOC-{id}]

AVAILABLE DOCUMENTS FOR THIS QUERY:
${documentContext.map(doc => `
---
Document ID: ${doc.id}
Filename: ${doc.name}
Entities mentioned: ${doc.entities.join(', ')}
Content excerpt:
${doc.content}
---
`).join('\n')}

${context.selectedEntities?.length ? `
ENTITIES BEING ANALYZED:
${context.selectedEntities.join(', ')}

Focus your analysis on connections and mentions of these specific entities.
` : ''}

Respond in a clear, structured format. Always cite specific documents when making claims.`;

    // Step 4: Call Claude API with temperature 0 for factual accuracy
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0, // No creativity - pure factual retrieval
      system: systemPrompt,
      messages: [
        ...(context.conversationHistory || []).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ],
    });
    
    // Step 5: Extract citations from response
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    // Parse document references [DOC-xxx] from response
    const docRefs = responseText.match(/\[DOC-([^\]]+)\]/g) || [];
    const citations: Citation[] = docRefs.map(ref => {
      const docId = ref.replace(/\[DOC-|\]/g, '');
      const doc = documentContext.find(d => d.id === docId);
      return doc ? {
        documentId: doc.id,
        documentName: doc.name,
        excerpt: doc.content.slice(0, 200),
      } : null;
    }).filter(Boolean) as Citation[];
    
    // Step 6: Check if we found useful info
    const noDocumentResults = relevantDocs.length === 0 || 
      responseText.toLowerCase().includes('not found in the available documents');
    
    res.json({
      response: responseText,
      citations,
      noDocumentResults,
      documentsSearched: relevantDocs.length,
    });
    
  } catch (error) {
    console.error('[CHAT] Error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Endpoint for connection analysis (when CTRL+clicking two nodes)
router.post('/analyze-connection', async (req, res) => {
  try {
    const { entities } = req.body as { entities: string[] };
    
    if (entities.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 entities to analyze connection' });
    }
    
    console.log(`[CONNECTION] Analyzing: ${entities.join(' <-> ')}`);
    
    // Find documents that contain ALL selected entities
    const sharedDocs = await documentSearch.findSharedDocuments(entities);
    
    // Find documents that mention entity pairs
    const pairwiseDocs = await documentSearch.findPairwiseConnections(entities);
    
    // Build analysis context
    const documentContext = [...sharedDocs, ...pairwiseDocs]
      .slice(0, 15) // Limit context size
      .map(doc => ({
        id: doc.id,
        name: doc.filename,
        content: doc.excerpt,
        mentionedEntities: doc.entities.filter((e: string) => 
          entities.some(selected => e.toLowerCase().includes(selected.toLowerCase()))
        ),
      }));
    
    const systemPrompt = `You are analyzing connections between specific individuals/entities in the Epstein DOJ documents.

ENTITIES TO ANALYZE:
${entities.join(', ')}

DOCUMENTS WHERE THESE ENTITIES APPEAR TOGETHER:
${documentContext.map(doc => `
---
Document: ${doc.name} [DOC-${doc.id}]
Mentioned entities: ${doc.mentionedEntities.join(', ')}
Content: ${doc.content}
---
`).join('\n')}

ANALYSIS INSTRUCTIONS:
1. Identify the nature of the connection (professional, social, travel, financial, etc.)
2. List specific document evidence for each connection type
3. Note any timeline patterns (dates they appear together)
4. Highlight any unusual patterns or discrepancies
5. Be factual - only state what the documents show

Format your response as:
## CONNECTION SUMMARY
[Brief overview]

## EVIDENCE
[Specific document citations]

## PATTERNS
[Any notable patterns or anomalies]

## DOCUMENTS TO REVIEW
[List of most relevant document IDs]`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        { 
          role: 'user', 
          content: `Analyze the documented connections between: ${entities.join(' and ')}` 
        },
      ],
    });
    
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    // Extract citations
    const docRefs = responseText.match(/\[DOC-([^\]]+)\]/g) || [];
    const citations = docRefs.map(ref => {
      const docId = ref.replace(/\[DOC-|\]/g, '');
      const doc = documentContext.find(d => d.id === docId);
      return doc ? {
        documentId: doc.id,
        documentName: doc.name,
        excerpt: doc.content.slice(0, 200),
      } : null;
    }).filter(Boolean);
    
    res.json({
      entities,
      sharedDocumentCount: sharedDocs.length,
      analysis: responseText,
      citations,
      documentsAnalyzed: documentContext.length,
    });
    
  } catch (error) {
    console.error('[CONNECTION] Error:', error);
    res.status(500).json({ error: 'Failed to analyze connection' });
  }
});

// Web search fallback endpoint
router.post('/search-public', async (req, res) => {
  try {
    const { query, entities } = req.body;
    
    // This would integrate with a web search API
    // For now, we'll just acknowledge the request
    console.log(`[PUBLIC SEARCH] Query: ${query}, Entities: ${entities}`);
    
    // TODO: Integrate with web search (Brave API, Google, etc.)
    // Only called when user explicitly requests public info
    
    res.json({
      message: 'Public search not yet implemented - this is for Phase 2',
      suggestion: 'Focus on document-grounded analysis first',
    });
    
  } catch (error) {
    console.error('[PUBLIC SEARCH] Error:', error);
    res.status(500).json({ error: 'Failed to perform public search' });
  }
});

export default router;
```

---

## Document Search Service

**File: `apps/api/src/services/document-search.service.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';

interface DocumentResult {
  id: string;
  filename: string;
  excerpt: string;
  entities: string[];
  relevanceScore: number;
  page?: number;
}

interface SearchOptions {
  limit?: number;
  minRelevance?: number;
}

export class DocumentSearchService {
  private entitiesPath: string;
  private indexCache: Map<string, any> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private initialized = false;
  
  constructor() {
    this.entitiesPath = path.join(__dirname, '../../data/entities');
  }
  
  // Initialize inverted index for fast lookups
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('[SEARCH] Building inverted index...');
    const startTime = Date.now();
    
    try {
      const files = await fs.readdir(this.entitiesPath);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.entitiesPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        const docId = file.replace('.json', '');
        this.indexCache.set(docId, data);
        
        // Build inverted index: entity -> documents
        const entities = [
          ...(data.people || []),
          ...(data.locations || []),
          ...(data.organizations || []),
        ];
        
        for (const entity of entities) {
          const normalized = entity.toLowerCase().trim();
          if (!this.invertedIndex.has(normalized)) {
            this.invertedIndex.set(normalized, new Set());
          }
          this.invertedIndex.get(normalized)!.add(docId);
        }
      }
      
      console.log(`[SEARCH] Index built in ${Date.now() - startTime}ms`);
      console.log(`[SEARCH] Indexed ${this.indexCache.size} documents, ${this.invertedIndex.size} unique entities`);
      
      this.initialized = true;
    } catch (error) {
      console.error('[SEARCH] Failed to build index:', error);
    }
  }
  
  // Search documents by keywords/entities
  async searchDocuments(terms: string[], options: SearchOptions = {}): Promise<DocumentResult[]> {
    await this.initialize();
    
    const { limit = 20, minRelevance = 0.1 } = options;
    const results: DocumentResult[] = [];
    const matchedDocs = new Map<string, number>();
    
    // Find documents matching any term
    for (const term of terms) {
      const normalized = term.toLowerCase().trim();
      
      // Exact match
      if (this.invertedIndex.has(normalized)) {
        for (const docId of this.invertedIndex.get(normalized)!) {
          matchedDocs.set(docId, (matchedDocs.get(docId) || 0) + 2);
        }
      }
      
      // Partial match
      for (const [entity, docs] of this.invertedIndex.entries()) {
        if (entity.includes(normalized) || normalized.includes(entity)) {
          for (const docId of docs) {
            matchedDocs.set(docId, (matchedDocs.get(docId) || 0) + 1);
          }
        }
      }
    }
    
    // Convert to results with relevance scores
    const maxScore = Math.max(...matchedDocs.values(), 1);
    
    for (const [docId, score] of matchedDocs.entries()) {
      const relevanceScore = score / maxScore;
      if (relevanceScore < minRelevance) continue;
      
      const docData = this.indexCache.get(docId);
      if (!docData) continue;
      
      results.push({
        id: docId,
        filename: docData.filename || `${docId}.pdf`,
        excerpt: docData.text?.slice(0, 500) || '',
        entities: [
          ...(docData.people || []),
          ...(docData.locations || []),
        ].slice(0, 10),
        relevanceScore,
      });
    }
    
    // Sort by relevance and limit
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }
  
  // Find documents where multiple entities appear together
  async findSharedDocuments(entities: string[]): Promise<DocumentResult[]> {
    await this.initialize();
    
    const normalizedEntities = entities.map(e => e.toLowerCase().trim());
    const results: DocumentResult[] = [];
    
    // Find intersection of document sets
    let sharedDocs: Set<string> | null = null;
    
    for (const entity of normalizedEntities) {
      // Find all docs mentioning this entity (exact or partial)
      const docsForEntity = new Set<string>();
      
      for (const [indexed, docs] of this.invertedIndex.entries()) {
        if (indexed.includes(entity) || entity.includes(indexed)) {
          for (const doc of docs) {
            docsForEntity.add(doc);
          }
        }
      }
      
      if (sharedDocs === null) {
        sharedDocs = docsForEntity;
      } else {
        // Intersection
        sharedDocs = new Set([...sharedDocs].filter(d => docsForEntity.has(d)));
      }
    }
    
    // Convert to results
    for (const docId of sharedDocs || []) {
      const docData = this.indexCache.get(docId);
      if (!docData) continue;
      
      results.push({
        id: docId,
        filename: docData.filename || `${docId}.pdf`,
        excerpt: docData.text?.slice(0, 500) || '',
        entities: [
          ...(docData.people || []),
          ...(docData.locations || []),
        ],
        relevanceScore: 1.0, // Perfect match - all entities present
      });
    }
    
    return results;
  }
  
  // Find pairwise connections (docs with any 2 of the entities)
  async findPairwiseConnections(entities: string[]): Promise<DocumentResult[]> {
    await this.initialize();
    
    const results: DocumentResult[] = [];
    const seen = new Set<string>();
    
    // For each pair of entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const pair = [entities[i], entities[j]];
        const sharedDocs = await this.findSharedDocuments(pair);
        
        for (const doc of sharedDocs) {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            results.push({
              ...doc,
              relevanceScore: 0.8, // Slightly lower than all-entities match
            });
          }
        }
      }
    }
    
    return results;
  }
  
  // Get document by ID
  async getDocument(docId: string): Promise<any> {
    await this.initialize();
    return this.indexCache.get(docId) || null;
  }
  
  // Get entity statistics
  async getEntityStats(entityName: string): Promise<{
    documentCount: number;
    documents: string[];
    coOccurrences: Array<{ entity: string; count: number }>;
  }> {
    await this.initialize();
    
    const normalized = entityName.toLowerCase().trim();
    const docs = this.invertedIndex.get(normalized) || new Set();
    const coOccurrences = new Map<string, number>();
    
    // Find co-occurring entities
    for (const docId of docs) {
      const docData = this.indexCache.get(docId);
      if (!docData) continue;
      
      const docEntities = [
        ...(docData.people || []),
        ...(docData.locations || []),
        ...(docData.organizations || []),
      ];
      
      for (const entity of docEntities) {
        if (entity.toLowerCase() !== normalized) {
          coOccurrences.set(entity, (coOccurrences.get(entity) || 0) + 1);
        }
      }
    }
    
    // Sort co-occurrences by frequency
    const sortedCoOccurrences = [...coOccurrences.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([entity, count]) => ({ entity, count }));
    
    return {
      documentCount: docs.size,
      documents: [...docs],
      coOccurrences: sortedCoOccurrences,
    };
  }
}
```

---

## Document Viewer Component

**File: `apps/web/app/components/document/DocumentViewer.tsx`**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, Search, Loader2 } from 'lucide-react';

interface DocumentViewerProps {
  documentId: string;
  highlightEntities?: string[];
  onClose: () => void;
}

export function DocumentViewer({ documentId, highlightEntities = [], onClose }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch PDF URL
  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        
        if (!response.ok) {
          throw new Error('Document not found');
        }
        
        const data = await response.json();
        setPdfUrl(data.url);
        setTotalPages(data.pageCount || 1);
      } catch (err) {
        console.error('Failed to load document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(p + 1, totalPages));
      if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(p - 1, 1));
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 3));
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.5));
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, totalPages]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="h-14 bg-[#12121a] border-b border-[#ffffff15] px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-[#00d4ff]">
            DOC-{documentId}
          </span>
          {highlightEntities.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#606070]">Highlighting:</span>
              {highlightEntities.map((entity, i) => (
                <span key={i} className="px-2 py-0.5 bg-[#ffb800]/20 text-[#ffb800] text-xs rounded font-mono">
                  {entity}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606070]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in document..."
              className="w-48 pl-8 pr-3 py-1.5 bg-[#1a1a24] border border-[#ffffff15] rounded
                       text-sm text-white placeholder-[#606070] font-mono
                       focus:outline-none focus:border-[#00d4ff]/50"
            />
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#1a1a24] rounded border border-[#ffffff15]">
            <button
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              className="p-1.5 hover:bg-[#ffffff10]"
            >
              <ZoomOut className="w-4 h-4 text-[#a0a0b0]" />
            </button>
            <span className="px-2 text-xs text-[#a0a0b0] font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
              className="p-1.5 hover:bg-[#ffffff10]"
            >
              <ZoomIn className="w-4 h-4 text-[#a0a0b0]" />
            </button>
          </div>
          
          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-[#1a1a24] rounded border border-[#ffffff15]">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="p-1.5 hover:bg-[#ffffff10] disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 text-[#a0a0b0]" />
            </button>
            <span className="px-2 text-xs text-[#a0a0b0] font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1.5 hover:bg-[#ffffff10] disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4 text-[#a0a0b0]" />
            </button>
          </div>
          
          {/* Download */}
          <a
            href={pdfUrl || '#'}
            download
            className="p-2 hover:bg-[#ffffff10] rounded"
          >
            <Download className="w-4 h-4 text-[#a0a0b0]" />
          </a>
          
          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#ffffff10] rounded"
          >
            <X className="w-4 h-4 text-[#a0a0b0]" />
          </button>
        </div>
      </div>
      
      {/* Document content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-8"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#00d4ff]" />
            <p className="text-[#606070] font-mono text-sm">Loading document...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-[#ff3366] font-mono mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#ffffff10] text-white rounded hover:bg-[#ffffff20]"
            >
              Close
            </button>
          </div>
        ) : pdfUrl ? (
          <div 
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            className="transition-transform duration-200"
          >
            {/* Using iframe for PDF - could be replaced with PDF.js for more control */}
            <iframe
              src={`${pdfUrl}#page=${currentPage}`}
              className="w-[800px] h-[1000px] bg-white shadow-2xl"
              title={`Document ${documentId}`}
            />
          </div>
        ) : null}
      </div>
      
      {/* Footer with entity highlights legend */}
      {highlightEntities.length > 0 && (
        <div className="h-10 bg-[#12121a] border-t border-[#ffffff15] px-4 flex items-center gap-4">
          <span className="text-xs text-[#606070] font-mono">
            Use Ctrl+F to search for highlighted entities in the PDF
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## Updated Main Layout

**File: `apps/web/app/page.tsx`**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Graph3DCore } from './components/graph/Graph3DCore';
import { InvestigationChat } from './components/chat/InvestigationChat';
import { DocumentViewer } from './components/document/DocumentViewer';
import { EntityDetailPanel } from './components/panels/EntityDetailPanel';
import { Toolbar } from './components/ui/Toolbar';

export default function Home() {
  // UI State
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [viewingDocument, setViewingDocument] = useState<{
    id: string;
    highlightEntities: string[];
  } | null>(null);
  
  // Handle node selection
  const handleNodeSelect = useCallback((node: any) => {
    setSelectedEntity(node);
    setSelectedEntities(node ? [node.label] : []);
  }, []);
  
  // Handle edge selection
  const handleEdgeSelect = useCallback((edge: any) => {
    if (edge) {
      setSelectedEntities([edge.from, edge.to]);
    }
  }, []);
  
  // Handle multi-node selection (CTRL+click)
  const handleMultiSelect = useCallback((nodes: any[]) => {
    setSelectedEntities(nodes.map(n => n.label));
    setSelectedEntity(null); // Clear single selection
  }, []);
  
  // Handle document view request
  const handleViewDocument = useCallback((documentId: string) => {
    setViewingDocument({
      id: documentId,
      highlightEntities: selectedEntities,
    });
  }, [selectedEntities]);
  
  return (
    <div className="h-screen w-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-[#12121a] border-b border-[#ffffff10] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-tight">
            EPSTEIN<span className="text-[#ff3366]">EXPOSED</span>
          </h1>
          <span className="text-xs text-[#606070] font-mono bg-[#1a1a24] px-2 py-1 rounded">
            11,622 DOCUMENTS • 96,322 ENTITIES
          </span>
        </div>
        
        <Toolbar />
      </header>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Graph area (75% when chat open, 100% when closed) */}
        <div 
          className={`
            relative transition-all duration-300
            ${chatCollapsed ? 'flex-1' : 'h-[75%]'}
          `}
        >
          <Graph3DCore
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
            onMultiSelect={handleMultiSelect}
          />
          
          {/* Entity detail sidebar */}
          {selectedEntity && (
            <EntityDetailPanel
              entity={selectedEntity}
              onClose={() => setSelectedEntity(null)}
              onViewDocument={handleViewDocument}
            />
          )}
        </div>
        
        {/* Chat panel (25% of screen) */}
        <InvestigationChat
          selectedEntities={selectedEntities}
          onViewDocument={handleViewDocument}
          isCollapsed={chatCollapsed}
          onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
        />
      </div>
      
      {/* Document viewer modal */}
      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument.id}
          highlightEntities={viewingDocument.highlightEntities}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
```

---

## Toolbar Component

**File: `apps/web/app/components/ui/Toolbar.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Search, Zap, BarChart3, Settings, HelpCircle } from 'lucide-react';

export function Toolbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <div className="flex items-center gap-2">
      {/* Global Search */}
      <div className="relative">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities, documents..."
              className="w-64 px-3 py-1.5 bg-[#1a1a24] border border-[#ffffff15] rounded-lg
                       text-sm text-white placeholder-[#606070] font-mono
                       focus:outline-none focus:border-[#00d4ff]/50"
              autoFocus
              onBlur={() => {
                if (!searchQuery) setSearchOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  setSearchOpen(false);
                }
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group"
          >
            <Search className="w-5 h-5 text-[#606070] group-hover:text-[#00d4ff]" />
          </button>
        )}
      </div>
      
      {/* Auto-Discover Toggle */}
      <button
        className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group flex items-center gap-2"
        title="Auto-Discover Mode"
      >
        <Zap className="w-5 h-5 text-[#606070] group-hover:text-[#ffb800]" />
        <span className="text-xs text-[#606070] group-hover:text-[#ffb800] font-mono hidden lg:inline">
          DISCOVER
        </span>
      </button>
      
      {/* Stats */}
      <button
        className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group"
        title="Statistics"
      >
        <BarChart3 className="w-5 h-5 text-[#606070] group-hover:text-[#00ff88]" />
      </button>
      
      {/* Settings */}
      <button
        className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group"
        title="Settings"
      >
        <Settings className="w-5 h-5 text-[#606070] group-hover:text-white" />
      </button>
      
      {/* Help */}
      <button
        className="p-2 hover:bg-[#ffffff10] rounded-lg transition-colors group"
        title="Help & Keyboard Shortcuts"
      >
        <HelpCircle className="w-5 h-5 text-[#606070] group-hover:text-white" />
      </button>
    </div>
  );
}
```

This continues in the next directive file...
