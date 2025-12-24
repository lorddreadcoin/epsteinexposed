# 🧠 WINDSURF DIRECTIVE: INTELLIGENT MEMORY & HUGGINGFACE INTEGRATION

## Overview

This directive implements:
1. **Query Memory Cache** - Store AI responses so repeat queries are instant
2. **Entity Embedding Index** - Vector similarity for smart entity matching
3. **Connection Memory** - Pre-computed relationship strengths
4. **HuggingFace Integration** - Free inference for embeddings

---

## Memory Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MEMORY LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐                    │
│  │   QUERY CACHE        │  │   EMBEDDING INDEX    │                    │
│  │   (Redis/SQLite)     │  │   (HuggingFace)      │                    │
│  │                      │  │                      │                    │
│  │  hash(query) → {     │  │  entity → vector     │                    │
│  │    response,         │  │  search(vec) → top10 │                    │
│  │    citations,        │  │                      │                    │
│  │    timestamp         │  │  "Bill Clinton" ≈    │                    │
│  │  }                   │  │  "William Clinton"   │                    │
│  └──────────────────────┘  └──────────────────────┘                    │
│                                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐                    │
│  │  CONNECTION CACHE    │  │  DISCOVERY QUEUE     │                    │
│  │                      │  │                      │                    │
│  │  (A,B) → {           │  │  Pre-computed        │                    │
│  │    sharedDocs: 47,   │  │  high-significance   │                    │
│  │    analysis: "...",  │  │  findings for        │                    │
│  │    computed: date    │  │  "Next Discovery"    │                    │
│  │  }                   │  │  feature             │                    │
│  └──────────────────────┘  └──────────────────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Query Cache Service

**File: `apps/api/src/services/query-cache.service.ts`**

```typescript
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

interface CachedResponse {
  query: string;
  queryHash: string;
  response: string;
  citations: any[];
  entities: string[];
  timestamp: number;
  hitCount: number;
}

export class QueryCacheService {
  private cachePath: string;
  private cache: Map<string, CachedResponse> = new Map();
  private maxCacheSize = 10000; // Max entries
  private cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  constructor() {
    this.cachePath = path.join(__dirname, '../../data/cache/query-cache.json');
  }
  
  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const entries = JSON.parse(data);
      
      // Load into memory, filter expired
      const now = Date.now();
      for (const entry of entries) {
        if (now - entry.timestamp < this.cacheExpiry) {
          this.cache.set(entry.queryHash, entry);
        }
      }
      
      console.log(`[CACHE] Loaded ${this.cache.size} cached queries`);
    } catch (error) {
      console.log('[CACHE] No existing cache, starting fresh');
    }
  }
  
  // Generate consistent hash for query + context
  private hashQuery(query: string, entities: string[] = []): string {
    const normalized = [
      query.toLowerCase().trim(),
      ...entities.map(e => e.toLowerCase().trim()).sort(),
    ].join('|');
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }
  
  // Check if we have a cached response
  async get(query: string, entities: string[] = []): Promise<CachedResponse | null> {
    const hash = this.hashQuery(query, entities);
    const cached = this.cache.get(hash);
    
    if (cached) {
      // Update hit count
      cached.hitCount++;
      console.log(`[CACHE] HIT for query hash ${hash.slice(0, 8)}... (${cached.hitCount} hits)`);
      return cached;
    }
    
    return null;
  }
  
  // Store a response
  async set(
    query: string, 
    response: string, 
    citations: any[], 
    entities: string[] = []
  ): Promise<void> {
    const hash = this.hashQuery(query, entities);
    
    const entry: CachedResponse = {
      query,
      queryHash: hash,
      response,
      citations,
      entities,
      timestamp: Date.now(),
      hitCount: 0,
    };
    
    this.cache.set(hash, entry);
    
    // Evict old entries if over limit
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldEntries();
    }
    
    // Persist to disk (debounced in production)
    await this.persist();
    
    console.log(`[CACHE] Stored query hash ${hash.slice(0, 8)}...`);
  }
  
  // Evict least recently used entries
  private evictOldEntries(): void {
    const entries = [...this.cache.entries()];
    
    // Sort by timestamp + hitCount (keep popular/recent)
    entries.sort((a, b) => {
      const scoreA = a[1].timestamp + (a[1].hitCount * 1000000);
      const scoreB = b[1].timestamp + (b[1].hitCount * 1000000);
      return scoreA - scoreB;
    });
    
    // Remove bottom 10%
    const toRemove = Math.floor(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`[CACHE] Evicted ${toRemove} old entries`);
  }
  
  // Save to disk
  private async persist(): Promise<void> {
    const entries = [...this.cache.values()];
    
    await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify(entries, null, 2));
  }
  
  // Get cache stats
  getStats(): { size: number; hitRate: number; topQueries: string[] } {
    const entries = [...this.cache.values()];
    const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);
    
    const topQueries = entries
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10)
      .map(e => e.query);
    
    return {
      size: this.cache.size,
      hitRate: entries.length ? totalHits / entries.length : 0,
      topQueries,
    };
  }
}
```

---

## 2. HuggingFace Embedding Service

**File: `apps/api/src/services/huggingface-embeddings.service.ts`**

```typescript
import { HfInference } from '@huggingface/inference';
import fs from 'fs/promises';
import path from 'path';

interface EntityEmbedding {
  entity: string;
  type: 'person' | 'location' | 'organization';
  vector: number[];
  documentCount: number;
}

export class HuggingFaceEmbeddingsService {
  private hf: HfInference;
  private embeddings: Map<string, EntityEmbedding> = new Map();
  private embeddingsPath: string;
  private model = 'sentence-transformers/all-MiniLM-L6-v2'; // Fast, good quality
  
  constructor(apiToken: string) {
    this.hf = new HfInference(apiToken);
    this.embeddingsPath = path.join(__dirname, '../../data/cache/entity-embeddings.json');
  }
  
  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.embeddingsPath, 'utf-8');
      const entries = JSON.parse(data);
      
      for (const entry of entries) {
        this.embeddings.set(entry.entity.toLowerCase(), entry);
      }
      
      console.log(`[EMBEDDINGS] Loaded ${this.embeddings.size} entity embeddings`);
    } catch (error) {
      console.log('[EMBEDDINGS] No existing embeddings, will compute on demand');
    }
  }
  
  // Generate embedding for text
  async embed(text: string): Promise<number[]> {
    try {
      const result = await this.hf.featureExtraction({
        model: this.model,
        inputs: text,
      });
      
      // Result is array of numbers
      return result as number[];
    } catch (error) {
      console.error('[EMBEDDINGS] Failed to generate embedding:', error);
      throw error;
    }
  }
  
  // Get or create embedding for entity
  async getEntityEmbedding(entity: string, type: string, docCount: number): Promise<EntityEmbedding> {
    const normalized = entity.toLowerCase();
    
    if (this.embeddings.has(normalized)) {
      return this.embeddings.get(normalized)!;
    }
    
    // Generate new embedding
    const vector = await this.embed(entity);
    
    const embedding: EntityEmbedding = {
      entity,
      type: type as EntityEmbedding['type'],
      vector,
      documentCount: docCount,
    };
    
    this.embeddings.set(normalized, embedding);
    
    // Persist periodically
    if (this.embeddings.size % 100 === 0) {
      await this.persist();
    }
    
    return embedding;
  }
  
  // Find similar entities using cosine similarity
  async findSimilar(query: string, limit = 10): Promise<Array<{ entity: string; similarity: number }>> {
    const queryEmbedding = await this.embed(query);
    
    const similarities: Array<{ entity: string; similarity: number }> = [];
    
    for (const [name, embedding] of this.embeddings.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding.vector);
      similarities.push({ entity: name, similarity });
    }
    
    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, limit);
  }
  
  // Cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
  
  // Batch embed all entities (run once to pre-compute)
  async batchEmbedEntities(entities: Array<{ name: string; type: string; docCount: number }>): Promise<void> {
    console.log(`[EMBEDDINGS] Batch embedding ${entities.length} entities...`);
    
    // Process in batches of 50 to avoid rate limits
    const batchSize = 50;
    
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(e => this.getEntityEmbedding(e.name, e.type, e.docCount))
      );
      
      console.log(`[EMBEDDINGS] Processed ${Math.min(i + batchSize, entities.length)}/${entities.length}`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await this.persist();
    console.log('[EMBEDDINGS] Batch embedding complete');
  }
  
  // Save embeddings to disk
  private async persist(): Promise<void> {
    const entries = [...this.embeddings.values()];
    
    await fs.mkdir(path.dirname(this.embeddingsPath), { recursive: true });
    await fs.writeFile(this.embeddingsPath, JSON.stringify(entries));
    
    console.log(`[EMBEDDINGS] Persisted ${entries.length} embeddings`);
  }
}
```

---

## 3. Connection Memory Service

**File: `apps/api/src/services/connection-memory.service.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';

interface ConnectionAnalysis {
  entity1: string;
  entity2: string;
  sharedDocuments: number;
  analysis: string;
  citations: any[];
  significance: 'high' | 'medium' | 'low';
  computedAt: number;
}

export class ConnectionMemoryService {
  private connections: Map<string, ConnectionAnalysis> = new Map();
  private cachePath: string;
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  constructor() {
    this.cachePath = path.join(__dirname, '../../data/cache/connection-memory.json');
  }
  
  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const entries = JSON.parse(data);
      
      const now = Date.now();
      for (const entry of entries) {
        if (now - entry.computedAt < this.maxAge) {
          const key = this.makeKey(entry.entity1, entry.entity2);
          this.connections.set(key, entry);
        }
      }
      
      console.log(`[CONN-MEMORY] Loaded ${this.connections.size} cached connections`);
    } catch (error) {
      console.log('[CONN-MEMORY] No existing cache');
    }
  }
  
  // Create consistent key regardless of entity order
  private makeKey(entity1: string, entity2: string): string {
    const sorted = [entity1.toLowerCase(), entity2.toLowerCase()].sort();
    return `${sorted[0]}|||${sorted[1]}`;
  }
  
  // Get cached connection analysis
  async get(entity1: string, entity2: string): Promise<ConnectionAnalysis | null> {
    const key = this.makeKey(entity1, entity2);
    const cached = this.connections.get(key);
    
    if (cached && Date.now() - cached.computedAt < this.maxAge) {
      console.log(`[CONN-MEMORY] HIT for ${entity1} <-> ${entity2}`);
      return cached;
    }
    
    return null;
  }
  
  // Store connection analysis
  async set(analysis: ConnectionAnalysis): Promise<void> {
    const key = this.makeKey(analysis.entity1, analysis.entity2);
    this.connections.set(key, analysis);
    
    await this.persist();
    console.log(`[CONN-MEMORY] Stored ${analysis.entity1} <-> ${analysis.entity2}`);
  }
  
  // Get top connections by significance
  getTopConnections(limit = 50): ConnectionAnalysis[] {
    const all = [...this.connections.values()];
    
    // Sort by significance and document count
    all.sort((a, b) => {
      const sigOrder = { high: 3, medium: 2, low: 1 };
      const sigDiff = sigOrder[b.significance] - sigOrder[a.significance];
      if (sigDiff !== 0) return sigDiff;
      return b.sharedDocuments - a.sharedDocuments;
    });
    
    return all.slice(0, limit);
  }
  
  private async persist(): Promise<void> {
    const entries = [...this.connections.values()];
    
    await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify(entries, null, 2));
  }
}
```

---

## 4. Discovery Queue Service

**File: `apps/api/src/services/discovery-queue.service.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';

interface Discovery {
  id: string;
  type: 'connection' | 'anomaly' | 'pattern' | 'cluster';
  title: string;
  summary: string;
  entities: string[];
  documentIds: string[];
  significance: number; // 0-100
  discoveredAt: number;
  viewed: boolean;
}

export class DiscoveryQueueService {
  private discoveries: Discovery[] = [];
  private queuePath: string;
  
  constructor() {
    this.queuePath = path.join(__dirname, '../../data/cache/discovery-queue.json');
  }
  
  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.queuePath, 'utf-8');
      this.discoveries = JSON.parse(data);
      console.log(`[DISCOVERY] Loaded ${this.discoveries.length} discoveries`);
    } catch (error) {
      console.log('[DISCOVERY] Starting with empty queue');
    }
  }
  
  // Add a new discovery
  async addDiscovery(discovery: Omit<Discovery, 'id' | 'discoveredAt' | 'viewed'>): Promise<Discovery> {
    const newDiscovery: Discovery = {
      ...discovery,
      id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      discoveredAt: Date.now(),
      viewed: false,
    };
    
    // Insert in order by significance
    const insertIndex = this.discoveries.findIndex(d => d.significance < newDiscovery.significance);
    if (insertIndex === -1) {
      this.discoveries.push(newDiscovery);
    } else {
      this.discoveries.splice(insertIndex, 0, newDiscovery);
    }
    
    await this.persist();
    return newDiscovery;
  }
  
  // Get next unviewed discovery
  getNextDiscovery(): Discovery | null {
    return this.discoveries.find(d => !d.viewed) || null;
  }
  
  // Mark discovery as viewed
  async markViewed(discoveryId: string): Promise<void> {
    const discovery = this.discoveries.find(d => d.id === discoveryId);
    if (discovery) {
      discovery.viewed = true;
      await this.persist();
    }
  }
  
  // Get all discoveries
  getAllDiscoveries(options: { 
    unviewedOnly?: boolean; 
    type?: Discovery['type'];
    limit?: number;
  } = {}): Discovery[] {
    let results = this.discoveries;
    
    if (options.unviewedOnly) {
      results = results.filter(d => !d.viewed);
    }
    
    if (options.type) {
      results = results.filter(d => d.type === options.type);
    }
    
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }
  
  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.queuePath), { recursive: true });
    await fs.writeFile(this.queuePath, JSON.stringify(this.discoveries, null, 2));
  }
}
```

---

## 5. Updated Chat Route with Memory

**File: `apps/api/src/routes/chat-with-memory.ts`**

```typescript
import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { QueryCacheService } from '../services/query-cache.service';
import { ConnectionMemoryService } from '../services/connection-memory.service';
import { DocumentSearchService } from '../services/document-search.service';
import { HuggingFaceEmbeddingsService } from '../services/huggingface-embeddings.service';

const router = Router();

// Initialize services
const queryCache = new QueryCacheService();
const connectionMemory = new ConnectionMemoryService();
const documentSearch = new DocumentSearchService();
const hfEmbeddings = new HuggingFaceEmbeddingsService(process.env.HF_TOKEN!);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize on startup
(async () => {
  await queryCache.initialize();
  await connectionMemory.initialize();
  await documentSearch.initialize();
  await hfEmbeddings.initialize();
})();

router.post('/investigate', async (req, res) => {
  try {
    const { message, context } = req.body;
    const entities = context.selectedEntities || [];
    
    // Step 1: Check query cache first
    const cached = await queryCache.get(message, entities);
    if (cached) {
      return res.json({
        response: cached.response,
        citations: cached.citations,
        fromCache: true,
        cacheHits: cached.hitCount,
      });
    }
    
    // Step 2: If analyzing connection, check connection memory
    if (entities.length >= 2) {
      const cachedConnection = await connectionMemory.get(entities[0], entities[1]);
      if (cachedConnection) {
        return res.json({
          response: cachedConnection.analysis,
          citations: cachedConnection.citations,
          sharedDocuments: cachedConnection.sharedDocuments,
          fromConnectionCache: true,
        });
      }
    }
    
    // Step 3: Use embeddings to find similar entities (fuzzy matching)
    const expandedEntities = [...entities];
    for (const entity of entities) {
      const similar = await hfEmbeddings.findSimilar(entity, 3);
      for (const match of similar) {
        if (match.similarity > 0.8 && !expandedEntities.includes(match.entity)) {
          expandedEntities.push(match.entity);
        }
      }
    }
    
    // Step 4: Search documents with expanded entities
    const relevantDocs = await documentSearch.searchDocuments(
      [message, ...expandedEntities],
      { limit: 20 }
    );
    
    // Step 5: Build context and call Claude
    const documentContext = relevantDocs.map(doc => ({
      id: doc.id,
      name: doc.filename,
      content: doc.excerpt,
      entities: doc.entities,
    }));
    
    const systemPrompt = buildSystemPrompt(documentContext, entities);
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
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
    
    // Step 6: Cache the response
    await queryCache.set(message, responseText, citations, entities);
    
    // Step 7: If connection analysis, cache that too
    if (entities.length >= 2) {
      await connectionMemory.set({
        entity1: entities[0],
        entity2: entities[1],
        sharedDocuments: relevantDocs.filter(d => 
          entities.every(e => d.entities.some((de: string) => 
            de.toLowerCase().includes(e.toLowerCase())
          ))
        ).length,
        analysis: responseText,
        citations,
        significance: classifySignificance(relevantDocs.length, responseText),
        computedAt: Date.now(),
      });
    }
    
    res.json({
      response: responseText,
      citations,
      documentsSearched: relevantDocs.length,
      entitiesExpanded: expandedEntities.length > entities.length,
    });
    
  } catch (error) {
    console.error('[CHAT] Error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Cache stats endpoint
router.get('/cache-stats', async (req, res) => {
  res.json({
    queryCache: queryCache.getStats(),
    connectionCache: connectionMemory.getTopConnections(10).length,
  });
});

function buildSystemPrompt(docs: any[], entities: string[]): string {
  return `You are an investigative research assistant analyzing the Jeffrey Epstein DOJ document releases.

CRITICAL RULES:
1. ONLY cite information from the provided documents
2. NEVER hallucinate or make up information
3. Every claim must reference a specific document [DOC-xxx]
4. If information is not found, say so clearly
5. Use factual, professional tone

DOCUMENTS:
${docs.map(d => `
[DOC-${d.id}] ${d.name}
Entities: ${d.entities.slice(0, 10).join(', ')}
Content: ${d.content}
`).join('\n---\n')}

${entities.length ? `FOCUS ON: ${entities.join(', ')}` : ''}`;
}

function classifySignificance(docCount: number, analysis: string): 'high' | 'medium' | 'low' {
  if (docCount > 20 || analysis.toLowerCase().includes('significant')) return 'high';
  if (docCount > 5) return 'medium';
  return 'low';
}

export default router;
```

---

## Environment Variables Needed

```env
# .env
ANTHROPIC_API_KEY=your-claude-api-key
HF_TOKEN=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
```

---

## Installation Commands

```bash
# Install HuggingFace SDK
npm install @huggingface/inference

# Create cache directories
mkdir -p apps/api/data/cache
```

---

## Pre-computation Script (Run Once)

**File: `apps/api/scripts/build-embeddings.ts`**

```typescript
import { HuggingFaceEmbeddingsService } from '../src/services/huggingface-embeddings.service';
import { DocumentSearchService } from '../src/services/document-search.service';

async function main() {
  const hf = new HuggingFaceEmbeddingsService(process.env.HF_TOKEN!);
  const docs = new DocumentSearchService();
  
  await docs.initialize();
  
  // Get all unique entities
  const entities: Array<{ name: string; type: string; docCount: number }> = [];
  
  // This would iterate through your entity index
  // For now, placeholder:
  console.log('Building embeddings for all entities...');
  
  await hf.batchEmbedEntities(entities);
  
  console.log('Done!');
}

main().catch(console.error);
```

---

## Performance Expectations

After implementing memory layer:

| Query Type | First Request | Cached Request |
|------------|---------------|----------------|
| Simple search | 2-4 seconds | **< 50ms** |
| Connection analysis | 5-10 seconds | **< 100ms** |
| Entity similarity | 500ms | **< 20ms** |

**Storage Requirements:**
- Query cache: ~50-100MB for 10K queries
- Embeddings: ~200MB for 96K entities
- Connection cache: ~20MB for top 1000 connections

This makes the platform **instant for repeat users** while maintaining accuracy.
