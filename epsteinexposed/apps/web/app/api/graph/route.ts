import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface EntityPerson { name: string; role?: string; context?: string; }
interface EntityLocation { name: string; type?: string; }
interface EntityOrg { name: string; }
interface DocumentData {
  document?: { filename?: string; text?: string; };
  entities?: {
    people?: EntityPerson[];
    locations?: EntityLocation[];
    organizations?: EntityOrg[];
  };
}

interface GraphNode {
  id: string;
  label: string;
  type: 'person' | 'location' | 'organization' | 'date';
  documentCount: number;
  connections: number;
}

interface GraphEdge {
  from: string;
  to: string;
  strength: number;
}

// Cache for graph data
let graphCache: { nodes: GraphNode[]; edges: GraphEdge[] } | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function buildGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  // Return cache if valid
  if (graphCache && Date.now() - cacheTime < CACHE_TTL) {
    return graphCache;
  }

  const entityMap = new Map<string, { type: string; docs: Set<string>; connections: Set<string> }>();
  const edgeMap = new Map<string, number>();

  // Try multiple possible paths for the entities data
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'entities'),
    path.join(process.cwd(), '..', 'api', 'data', 'entities'),
    path.join(process.cwd(), 'public', 'data', 'entities'),
  ];

  let entitiesPath = '';
  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      entitiesPath = p;
      break;
    } catch {
      // Try next path
    }
  }

  if (!entitiesPath) {
    console.warn('[GRAPH] No entities directory found, returning empty graph');
    return { nodes: [], edges: [] };
  }

  try {
    const files = await fs.readdir(entitiesPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    // Process files (limit for performance)
    const filesToProcess = jsonFiles.slice(0, 2000);
    
    for (const file of filesToProcess) {
      try {
        const filePath = path.join(entitiesPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data: DocumentData = JSON.parse(content);
        const docId = file.replace('.json', '');
        
        const docEntities: string[] = [];
        
        // Extract people
        for (const person of data.entities?.people || []) {
          if (!person.name || person.name.length < 2) continue;
          const id = `person_${person.name.toLowerCase().replace(/\s+/g, '_')}`;
          docEntities.push(id);
          
          if (!entityMap.has(id)) {
            entityMap.set(id, { type: 'person', docs: new Set(), connections: new Set() });
          }
          entityMap.get(id)!.docs.add(docId);
        }
        
        // Extract locations
        for (const loc of data.entities?.locations || []) {
          if (!loc.name || loc.name.length < 2) continue;
          const id = `location_${loc.name.toLowerCase().replace(/\s+/g, '_')}`;
          docEntities.push(id);
          
          if (!entityMap.has(id)) {
            entityMap.set(id, { type: 'location', docs: new Set(), connections: new Set() });
          }
          entityMap.get(id)!.docs.add(docId);
        }
        
        // Extract organizations
        for (const org of data.entities?.organizations || []) {
          if (!org.name || org.name.length < 2) continue;
          const id = `org_${org.name.toLowerCase().replace(/\s+/g, '_')}`;
          docEntities.push(id);
          
          if (!entityMap.has(id)) {
            entityMap.set(id, { type: 'organization', docs: new Set(), connections: new Set() });
          }
          entityMap.get(id)!.docs.add(docId);
        }
        
        // Build connections (entities that appear in same document)
        for (let i = 0; i < docEntities.length; i++) {
          for (let j = i + 1; j < docEntities.length; j++) {
            const e1 = docEntities[i] as string;
            const e2 = docEntities[j] as string;
            if (!e1 || !e2) continue;
            
            const entity1Data = entityMap.get(e1);
            const entity2Data = entityMap.get(e2);
            if (entity1Data) entity1Data.connections.add(e2);
            if (entity2Data) entity2Data.connections.add(e1);
            
            const edgeKey = [e1, e2].sort().join('---');
            edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + 1);
          }
        }
      } catch {
        // Skip failed files
      }
    }
    
    // Convert to graph format
    const nodes: GraphNode[] = [];
    for (const [id, data] of entityMap.entries()) {
      // Only include entities with at least 2 documents or connections
      if (data.docs.size < 2 && data.connections.size < 2) continue;
      
      const label = id
        .replace(/^(person|location|org)_/, '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      
      nodes.push({
        id,
        label,
        type: data.type as GraphNode['type'],
        documentCount: data.docs.size,
        connections: data.connections.size,
      });
    }
    
    // Sort by importance and limit
    nodes.sort((a, b) => (b.documentCount + b.connections) - (a.documentCount + a.connections));
    const topNodes = nodes.slice(0, 200);
    const topNodeIds = new Set(topNodes.map(n => n.id));
    
    // Build edges for top nodes
    const edges: GraphEdge[] = [];
    for (const [key, strength] of edgeMap.entries()) {
      if (strength < 2) continue; // Min 2 shared documents
      const parts = key.split('---');
      const from = parts[0];
      const to = parts[1];
      if (from && to && topNodeIds.has(from) && topNodeIds.has(to)) {
        edges.push({ from, to, strength });
      }
    }
    
    graphCache = { nodes: topNodes, edges };
    cacheTime = Date.now();
    
    console.log(`[GRAPH] Built graph with ${topNodes.length} nodes, ${edges.length} edges`);
    return graphCache;
    
  } catch (error) {
    console.error('[GRAPH] Error building graph:', error);
    return { nodes: [], edges: [] };
  }
}

export async function GET() {
  try {
    const graph = await buildGraph();
    return NextResponse.json({ result: { data: graph } });
  } catch (error) {
    console.error('[GRAPH] API Error:', error);
    return NextResponse.json({ error: 'Failed to load graph' }, { status: 500 });
  }
}
