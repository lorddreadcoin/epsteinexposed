# WINDSURF TASK QUEUE - EXECUTE IN ORDER

## PHASE 1: CRITICAL BUG FIXES (DO FIRST)

### Task 1.1: Fix Document Click Handler
```
FIND: apps/web/app/components/graph/EntityDetailPanel.tsx (or similar)
LOOK FOR: Orange "documents" text that only toggles state
CHANGE: Make it call onViewDocument(doc.id) instead of just toggling

Example fix:
- OLD: onClick={() => setExpanded(!expanded)}
- NEW: onClick={() => onViewDocument(doc.id)}
```

### Task 1.2: Add Connection Deduplication
```
FIND: apps/api/src/services/entity-data-loader.service.ts
ADD: Deduplication logic when loading connections

const connectionMap = new Map();
for (const conn of rawConnections) {
  const key = [conn.entity1, conn.entity2].sort().join('|');
  if (connectionMap.has(key)) {
    connectionMap.get(key).documentCount += conn.documentCount;
  } else {
    connectionMap.set(key, conn);
  }
}
return Array.from(connectionMap.values());
```

### Task 1.3: Slow Down 3D Graph
```
FIND: apps/web/app/components/graph/Graph3DCore.tsx
FIND: <OrbitControls /> component
ADD: These props:
  enableDamping={true}
  dampingFactor={0.05}
  rotateSpeed={0.3}
  zoomSpeed={0.5}
  panSpeed={0.3}
```

---

## PHASE 2: BUILD CHAT INFRASTRUCTURE

### Task 2.1: Create Chat Component
```
CREATE: apps/web/app/components/chat/InvestigationChat.tsx
USE: Code from WINDSURF_DIRECTIVE_EPSTEIN_EXPOSED.md Feature 1
```

### Task 2.2: Create Claude API Route
```
CREATE: apps/web/app/api/chat/investigate/route.ts
USE: Code from WINDSURF_DIRECTIVE_EPSTEIN_EXPOSED.md Feature 2
IMPORTANT: Temperature MUST be 0 for no hallucination
```

### Task 2.3: Create Document Search Utility
```
CREATE: apps/web/lib/document-search.ts

export async function searchDocuments(terms: string[], options?: { limit?: number }) {
  // Search through entities JSON files
  // Return documents containing any of the terms
  // Include excerpt and page number if available
}

export async function getDocumentContent(docId: string) {
  // Return full document content for context
}
```

---

## PHASE 3: ENHANCED 3D INTERACTIONS

### Task 3.1: Update Graph3DCore with CTRL+Click
```
FIND: apps/web/app/components/graph/Graph3DCore.tsx
ADD: Multi-select functionality
- Track selectedNodes array
- On CTRL+Click, add/remove from selection
- When 2+ selected, show "Analyze Connection?" prompt
```

### Task 3.2: Better Node Visuals (Bubblemaps Style)
```
UPDATE: Node component in Graph3DCore.tsx
ADD:
- Glow effect mesh behind main sphere
- Size based on document count
- Smooth pulse animation when selected
- Color coding by entity type (person=blue, location=green, etc.)
```

### Task 3.3: Add Connection Lines
```
ADD: ConnectionLine component
- Draw lines between connected nodes
- Line opacity based on connection strength
- Animate on hover
```

---

## PHASE 4: DOCUMENT VIEWER

### Task 4.1: Create Document Popup Component
```
CREATE: apps/web/app/components/document/DocumentPopup.tsx
USE: Code from WINDSURF_DIRECTIVE_EPSTEIN_EXPOSED.md Feature 5
```

### Task 4.2: Create Document API Route
```
CREATE: apps/web/app/api/documents/[id]/route.ts

export async function GET(req, { params }) {
  const { id } = params;
  // Look up document in entities data
  // Return URL to PDF and metadata
}
```

### Task 4.3: Setup PDF Serving
```
ENSURE: PDFs in apps/web/DataSet 8/ are accessible
OPTION A: Static file serving via Next.js public folder
OPTION B: API route that streams PDF files
```

---

## PHASE 5: DISCOVERY SYSTEM

### Task 5.1: Create Discovery Queue Component
```
CREATE: apps/web/app/components/discovery/DiscoveryQueue.tsx
USE: Code from WINDSURF_DIRECTIVE_EPSTEIN_EXPOSED.md Feature 4
```

### Task 5.2: Create Discovery API
```
CREATE: apps/api/src/routers/discovery.router.ts

- getNextDiscovery: Returns highest priority unviewed discovery
- getDiscoveryQueue: Returns list of pending discoveries
- markDiscoveryViewed: User has seen this discovery
```

### Task 5.3: Discovery Generation Service
```
CREATE: apps/api/src/services/discovery-generator.service.ts

Algorithms to run:
1. Network Clusters - Find tightly connected entity groups
2. Co-occurrence - Who appears together suspiciously often
3. Timeline Anomalies - Events that don't make sense chronologically
4. Redaction Patterns - Same names redacted together
5. Location Hotspots - Places with unusual activity
```

---

## PHASE 6: MAIN LAYOUT ASSEMBLY

### Task 6.1: Update Main Page Layout
```
FIND: apps/web/app/page.tsx
UPDATE: Split pane layout
- Graph takes 70% (or 100% when chat collapsed)
- Chat takes 30% at bottom
- Discovery queue positioned top-right
- Document popup renders when viewingDocument is set
```

### Task 6.2: Wire Up State Management
```
ADD: Global state for:
- selectedEntities: string[]
- viewingDocument: { id, name } | null
- chatMessages: Message[]
- discoveryQueue: Discovery[]
```

---

## PHASE 7: MEMORY/CACHING (PERFORMANCE)

### Task 7.1: Add Redis for Caching
```
INSTALL: ioredis
CREATE: apps/api/src/services/cache.service.ts
```

### Task 7.2: Add HuggingFace Embeddings
```
INSTALL: @huggingface/inference
CREATE: apps/api/src/services/memory-cache.service.ts
USE: Code from WINDSURF_DIRECTIVE_EPSTEIN_EXPOSED.md
```

### Task 7.3: Implement Query Caching
```
UPDATE: apps/web/app/api/chat/investigate/route.ts
BEFORE calling Claude:
1. Check if similar query exists in cache
2. If yes and similarity > 0.85, return cached result
3. If no, call Claude, then cache the result
```

---

## ENVIRONMENT SETUP

### Required .env.local
```
ANTHROPIC_API_KEY=sk-ant-...
HUGGINGFACE_API_KEY=hf_...
REDIS_URL=redis://localhost:6379
```

### Required npm packages
```
npm install @anthropic-ai/sdk @huggingface/inference ioredis
```

---

## TESTING CHECKLIST

After each phase, verify:

[ ] Phase 1: 
    - Orange docs are clickable and open viewer
    - No duplicate connections in list
    - Graph rotates smoothly without jitter

[ ] Phase 2:
    - Chat panel shows at bottom
    - Can send message and get response
    - Response only cites actual documents

[ ] Phase 3:
    - CTRL+Click selects multiple nodes
    - "Analyze Connection?" prompt appears
    - Nodes have glow effects and proper colors

[ ] Phase 4:
    - Clicking document opens popup
    - PDF renders correctly
    - Can navigate pages and zoom

[ ] Phase 5:
    - Discovery queue shows findings
    - "Next" button works
    - "Explore" navigates to relevant entities

[ ] Phase 6:
    - Layout is clean 70/30 split
    - All components communicate
    - No console errors

[ ] Phase 7:
    - Repeated queries return faster
    - Cache hit rate logged
    - Memory persists across sessions
