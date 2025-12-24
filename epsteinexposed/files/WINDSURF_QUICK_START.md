# 🚀 WINDSURF IMPLEMENTATION GUIDE - QUICK START

## TL;DR - Copy These Into Windsurf

Open Windsurf, paste each section as a prompt, and let it implement.

---

## PROMPT 1: Fix Critical Bugs

```
I need you to fix these critical bugs in the Epstein Exposed platform:

1. **Orange "documents" text not clickable**: The orange text showing document counts just collapses the panel instead of opening PDFs. Wire up actual onClick handlers that open the DocumentViewer modal with the correct documentId.

2. **Duplicate connection mentions**: Same entity connections are showing multiple times. Add deduplication using a Set() with unique keys (entity1-entity2 sorted alphabetically).

3. **3D graph too fast/erratic**: Add spring physics with damping factor 0.05, throttle animation updates to 30fps, and add smooth lerp transitions for camera movement.

Files to modify:
- apps/web/app/components/graph/Graph3DCore.tsx
- apps/web/app/components/panels/EntityDetailPanel.tsx  
- apps/web/app/components/anomaly/AnomalyStream.tsx

For the graph, use react-spring or THREE.MathUtils.lerp for smooth animations. Add a useFrame hook that only updates positions at 30fps intervals.
```

---

## PROMPT 2: New Design System (Arkham/Bubblemaps Style)

```
Create a new design system for Epstein Exposed with an Arkham Intelligence / Bubblemaps aesthetic:

1. Create apps/web/app/styles/design-system.css with:
   - Dark theme: bg-primary #0a0a0f, bg-secondary #12121a
   - Accent colors: cyan #00d4ff, amber #ffb800, red #ff3366
   - Typography: JetBrains Mono for display, Inter for body
   - Glow effects for selected nodes
   - Terminal-style loading animations

2. Update Graph3DCore with:
   - Glowing sphere nodes with emissive materials
   - Node size based on documentCount (logarithmic scale)
   - Outer glow sphere with transparent material
   - Smooth hover animations using useFrame with lerp
   - Color coding by entity type (person=cyan, location=amber, org=red)

3. Add CTRL+Click multi-select:
   - Track selected nodes in a Set
   - Show selection ring around multi-selected nodes
   - Display "Analyze Connection" button when 2+ nodes selected

Reference the WINDSURF_MASTER_DIRECTIVE.md for complete implementation.
```

---

## PROMPT 3: Investigation Chat Panel

```
Create a collapsible Investigation Chat panel at the bottom of the screen (25% height):

1. Create apps/web/app/components/chat/InvestigationChat.tsx with:
   - Fixed at bottom, expands up on click
   - Header bar showing "INVESTIGATION ASSISTANT"
   - Messages area with user/assistant bubbles
   - Input field with send button
   - Discovery prompt cards for connection analysis

2. When entities are selected in the graph:
   - Show prompt: "Analyze connection between X and Y? [Analyze] [Skip]"
   - Click Analyze → calls /api/chat/analyze-connection
   - Response shows with clickable document citations

3. Chat with Claude API:
   - Temperature 0 for factual accuracy
   - System prompt restricts to ONLY citing uploaded documents
   - No hallucination allowed
   - Every claim must have [DOC-xxx] citation

4. Citations are clickable → open DocumentViewer modal

Reference WINDSURF_API_BACKEND.md for the chat API route implementation.
```

---

## PROMPT 4: Document-Grounded Chat API

```
Create the backend chat API with document-grounded responses:

1. Create apps/api/src/routes/chat.ts with endpoints:
   - POST /investigate - General document search + Claude response
   - POST /analyze-connection - Analyze specific entity connections
   - POST /search-public - Fallback web search (only if user requests)

2. Create apps/api/src/services/document-search.service.ts:
   - Build inverted index: entity → Set<documentIds>
   - searchDocuments(terms, options) - Find relevant docs
   - findSharedDocuments(entities) - Docs with ALL entities
   - findPairwiseConnections(entities) - Docs with any 2

3. Claude API integration:
   - Use claude-sonnet-4-20250514 model
   - Temperature 0 (no creativity, pure facts)
   - System prompt explicitly forbids hallucination
   - Must cite [DOC-xxx] for every claim

4. Response format:
   {
     response: string,
     citations: [{ documentId, documentName, excerpt }],
     noDocumentResults: boolean,
     documentsSearched: number
   }

Reference WINDSURF_API_BACKEND.md for complete implementation.
```

---

## PROMPT 5: Memory & Caching Layer

```
Implement intelligent caching for instant repeat queries:

1. Create apps/api/src/services/query-cache.service.ts:
   - Hash query + entities → cached response
   - Store in memory + persist to JSON file
   - 7-day expiry, 10K max entries
   - Track hit count for popular queries

2. Create apps/api/src/services/connection-memory.service.ts:
   - Cache connection analyses by entity pair
   - Order-independent key (sorted alphabetically)
   - 24-hour expiry

3. Create apps/api/src/services/huggingface-embeddings.service.ts:
   - Use @huggingface/inference package
   - Model: sentence-transformers/all-MiniLM-L6-v2
   - Embed all 96K entities for fuzzy matching
   - findSimilar(query) → cosine similarity search

4. Update chat routes to:
   - Check cache before Claude API call
   - Cache responses after generation
   - Use embeddings for entity expansion (Bill Clinton ≈ William Clinton)

Environment variables needed:
- ANTHROPIC_API_KEY
- HF_TOKEN=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

Reference WINDSURF_MEMORY_HUGGINGFACE.md for complete implementation.
```

---

## PROMPT 6: Document Viewer Modal

```
Create a full-screen document viewer modal:

1. Create apps/web/app/components/document/DocumentViewer.tsx:
   - Full-screen overlay with dark backdrop
   - Header: document ID, zoom controls, page navigation, download, close
   - Display PDF in iframe or PDF.js canvas
   - Support highlighted entities (yellow background)

2. Features:
   - Zoom in/out with +/- buttons and keyboard
   - Page navigation with arrow keys
   - Ctrl+F to search within PDF
   - Download button to save PDF
   - ESC to close

3. Connect to backend:
   - GET /api/documents/:id → returns { url, pageCount }
   - Serve PDFs from apps/api/data/documents/

4. Wire into main layout:
   - Click any "View Document" → opens DocumentViewer
   - Pass highlightEntities from selected nodes
```

---

## PROMPT 7: Main Layout Integration

```
Update apps/web/app/page.tsx to integrate all components:

1. Layout structure:
   - Header (fixed, 56px): Logo + stats + toolbar
   - Graph area (75% when chat open, 100% when closed)
   - Chat panel (25%, collapsible to 48px header only)

2. State management:
   - selectedEntity: single node selection
   - selectedEntities: array for multi-select (CTRL+click)
   - viewingDocument: { id, highlightEntities } | null
   - chatCollapsed: boolean

3. Component wiring:
   - Graph3DCore → onNodeSelect, onEdgeSelect, onMultiSelect
   - InvestigationChat → selectedEntities, onViewDocument
   - DocumentViewer → documentId, highlightEntities, onClose

4. Keyboard shortcuts:
   - ESC: close document viewer or deselect
   - CTRL+Click: multi-select nodes
   - Arrow keys: navigate document pages
```

---

## File Structure After Implementation

```
apps/
├── web/
│   └── app/
│       ├── page.tsx                           # Main layout
│       ├── styles/
│       │   └── design-system.css              # Arkham theme
│       └── components/
│           ├── graph/
│           │   └── Graph3DCore.tsx            # 3D visualization
│           ├── chat/
│           │   └── InvestigationChat.tsx      # Bottom chat panel
│           ├── document/
│           │   └── DocumentViewer.tsx         # PDF viewer modal
│           ├── panels/
│           │   └── EntityDetailPanel.tsx      # Side panel
│           └── ui/
│               └── Toolbar.tsx                # Header toolbar
│
└── api/
    ├── src/
    │   ├── routes/
    │   │   ├── chat.ts                        # Chat endpoints
    │   │   └── documents.ts                   # Document serving
    │   └── services/
    │       ├── document-search.service.ts     # Inverted index
    │       ├── query-cache.service.ts         # Response caching
    │       ├── connection-memory.service.ts   # Connection cache
    │       └── huggingface-embeddings.service.ts  # Vector embeddings
    └── data/
        ├── entities/                          # 11,612 JSON files
        ├── documents/                         # PDF files
        └── cache/                             # Cache files
            ├── query-cache.json
            ├── entity-embeddings.json
            └── connection-memory.json
```

---

## Testing Checklist

After implementation, verify:

- [ ] Orange document text opens PDF viewer
- [ ] No duplicate connections in UI
- [ ] 3D graph has smooth animations (no jitter)
- [ ] CTRL+click selects multiple nodes
- [ ] "Analyze Connection" button appears with 2+ nodes
- [ ] Chat responses cite specific documents
- [ ] Document viewer shows PDFs correctly
- [ ] Repeat queries are instant (cached)
- [ ] Entity search finds similar names (embeddings)

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial page load | < 3 seconds |
| Graph render (96K entities) | < 1 second |
| First chat response | < 5 seconds |
| Cached chat response | < 100ms |
| Document viewer open | < 500ms |
| 3D animation framerate | 60fps |

---

## That's It!

Copy each prompt into Windsurf sequentially. Each builds on the previous. 

For full code details, reference:
- WINDSURF_MASTER_DIRECTIVE.md - Complete UI components
- WINDSURF_API_BACKEND.md - Backend services
- WINDSURF_MEMORY_HUGGINGFACE.md - Caching layer

🔥 Ship it.
