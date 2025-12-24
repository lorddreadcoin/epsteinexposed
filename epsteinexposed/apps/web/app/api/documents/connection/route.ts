import { NextRequest, NextResponse } from 'next/server';
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

interface DocumentReference {
  id: string;
  filename: string;
  path: string;
  pageCount: number;
  dataset: string;
  mentions: Array<{ entity: string; type: string; context?: string }>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entity1 = searchParams.get('entity1')?.toLowerCase() || '';
  const entity2 = searchParams.get('entity2')?.toLowerCase() || '';
  
  if (!entity1 || !entity2) {
    return NextResponse.json({ result: { data: [] } });
  }
  
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

  if (!entitiesPath) {
    return NextResponse.json({ result: { data: [] } });
  }

  const documents: DocumentReference[] = [];
  
  try {
    const files = await fs.readdir(entitiesPath);
    const jsonFiles = files.filter(f => f.endsWith('.json')).slice(0, 2000);
    
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(entitiesPath, file), 'utf-8');
        const data: DocumentData = JSON.parse(content);
        const docId = file.replace('.json', '');
        
        const allEntities: string[] = [
          ...(data.entities?.people?.map(p => p.name?.toLowerCase() || '') || []),
          ...(data.entities?.locations?.map(l => l.name?.toLowerCase() || '') || []),
          ...(data.entities?.organizations?.map(o => o.name?.toLowerCase() || '') || []),
        ];
        
        const hasEntity1 = allEntities.some(e => e.includes(entity1));
        const hasEntity2 = allEntities.some(e => e.includes(entity2));
        
        if (hasEntity1 && hasEntity2) {
          const mentions: Array<{ entity: string; type: string; context?: string }> = [];
          
          for (const person of data.entities?.people || []) {
            if (person.name?.toLowerCase().includes(entity1) || person.name?.toLowerCase().includes(entity2)) {
              mentions.push({ entity: person.name, type: 'person', context: person.context });
            }
          }
          
          documents.push({
            id: docId,
            filename: data.document?.filename || `${docId}.pdf`,
            path: `/documents/${docId}`,
            pageCount: 1,
            dataset: 'DOJ Release',
            mentions,
          });
        }
      } catch {
        // Skip
      }
    }
  } catch {
    // Return empty
  }
  
  return NextResponse.json({ result: { data: documents.slice(0, 50) } });
}
