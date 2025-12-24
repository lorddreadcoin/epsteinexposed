import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface EntityPerson { name: string; role?: string; }
interface EntityLocation { name: string; type?: string; }
interface EntityOrg { name: string; }
interface DocumentData {
  entities?: {
    people?: EntityPerson[];
    locations?: EntityLocation[];
    organizations?: EntityOrg[];
  };
}

interface SearchResult {
  id: string;
  name: string;
  type: string;
  occurrences: number;
  documentIds: string[];
}

// Cache for entity index
let entityIndex: Map<string, { type: string; docs: Set<string> }> | null = null;

async function buildIndex() {
  if (entityIndex) return entityIndex;
  
  entityIndex = new Map();
  
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
      // Try next
    }
  }

  if (!entitiesPath) return entityIndex;

  try {
    const files = await fs.readdir(entitiesPath);
    const jsonFiles = files.filter(f => f.endsWith('.json')).slice(0, 2000);
    
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(entitiesPath, file), 'utf-8');
        const data: DocumentData = JSON.parse(content);
        const docId = file.replace('.json', '');
        
        for (const person of data.entities?.people || []) {
          if (!person.name) continue;
          const key = person.name.toLowerCase();
          if (!entityIndex.has(key)) {
            entityIndex.set(key, { type: 'person', docs: new Set() });
          }
          entityIndex.get(key)!.docs.add(docId);
        }
        
        for (const loc of data.entities?.locations || []) {
          if (!loc.name) continue;
          const key = loc.name.toLowerCase();
          if (!entityIndex.has(key)) {
            entityIndex.set(key, { type: 'location', docs: new Set() });
          }
          entityIndex.get(key)!.docs.add(docId);
        }
        
        for (const org of data.entities?.organizations || []) {
          if (!org.name) continue;
          const key = org.name.toLowerCase();
          if (!entityIndex.has(key)) {
            entityIndex.set(key, { type: 'organization', docs: new Set() });
          }
          entityIndex.get(key)!.docs.add(docId);
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // Return empty
  }
  
  return entityIndex;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query')?.toLowerCase() || '';
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  
  if (!query) {
    return NextResponse.json({ result: { data: [] } });
  }
  
  const index = await buildIndex();
  const results: SearchResult[] = [];
  
  for (const [name, data] of index.entries()) {
    if (name.includes(query)) {
      results.push({
        id: name.replace(/\s+/g, '_'),
        name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        type: data.type,
        occurrences: data.docs.size,
        documentIds: Array.from(data.docs).slice(0, 10),
      });
    }
  }
  
  results.sort((a, b) => b.occurrences - a.occurrences);
  
  return NextResponse.json({ result: { data: results.slice(0, limit) } });
}
