import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
async function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  } catch (err) {
    console.error('Failed to load .env.local:', err);
    process.exit(1);
  }
}

await loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function buildConnections() {
  console.log('🔗 Building connections from document co-occurrences...\n');
  
  // Find entities directory
  const possiblePaths = [
    path.join(process.cwd(), '..', 'api', 'data', 'entities'),
    path.join(process.cwd(), 'data', 'entities'),
    path.join(process.cwd(), '..', '..', 'apps', 'api', 'data', 'entities'),
  ];
  
  let entitiesPath: string | null = null;
  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      entitiesPath = p;
      console.log(`✅ Found entities at: ${p}`);
      break;
    } catch {
      // Try next path
    }
  }
  
  if (!entitiesPath) {
    console.error('❌ Could not find entities directory');
    process.exit(1);
  }
  
  // Map: documentId -> array of entity originalIds
  const docToEntities = new Map<string, string[]>();
  
  // Read all JSON files and extract document mentions
  const files = await fs.readdir(entitiesPath);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`📁 Scanning ${jsonFiles.length} entity files for document mentions...`);
  
  for (const file of jsonFiles) {
    try {
      const content = await fs.readFile(path.join(entitiesPath, file), 'utf-8');
      const data = JSON.parse(content);
      const entityId = file.replace('.json', '');
      
      // The JSON structure has a "document" object with "filename"
      // Each entity file represents entities extracted from ONE document
      // So the document ID is the filename itself
      let docId: string | null = null;
      
      if (data.document && data.document.filename) {
        docId = data.document.filename;
      } else {
        // Fallback: use the entity file name as document ID
        docId = entityId;
      }
      
      if (docId) {
        // Add this entity to the document's entity list
        if (!docToEntities.has(docId)) {
          docToEntities.set(docId, []);
        }
        
        // Add all entities from this document
        const entityNames: string[] = [];
        
        // Extract people
        if (data.entities?.people && Array.isArray(data.entities.people)) {
          for (const person of data.entities.people) {
            if (person.name) {
              entityNames.push(`person_${person.name.toLowerCase().replace(/\s+/g, '_')}`);
            }
          }
        }
        
        // Extract locations
        if (data.entities?.locations && Array.isArray(data.entities.locations)) {
          for (const loc of data.entities.locations) {
            if (loc.name) {
              entityNames.push(`location_${loc.name.toLowerCase().replace(/\s+/g, '_')}`);
            }
          }
        }
        
        // Extract organizations
        if (data.entities?.organizations && Array.isArray(data.entities.organizations)) {
          for (const org of data.entities.organizations) {
            if (org.name) {
              entityNames.push(`org_${org.name.toLowerCase().replace(/\s+/g, '_')}`);
            }
          }
        }
        
        // Add all entity names to this document
        docToEntities.get(docId)!.push(...entityNames);
      }
      
    } catch {
      // Skip files that can't be parsed
    }
  }
  
  console.log(`📄 Found ${docToEntities.size} documents with entity mentions\n`);
  
  // Get entity UUID mapping from Supabase (fetch ALL entities)
  console.log('📥 Fetching entity ID mappings from Supabase...');
  
  const oldIdToUuid = new Map<string, string>();
  const nameToUuid = new Map<string, string>();
  
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data: entities, error } = await supabase
      .from('entities')
      .select('id, name, metadata')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error fetching entities:', error);
      break;
    }
    
    if (!entities || entities.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const entity of entities) {
      // Map by original ID from metadata
      if (entity.metadata && typeof entity.metadata === 'object' && 'originalId' in entity.metadata) {
        oldIdToUuid.set(entity.metadata.originalId as string, entity.id);
      }
      
      // Also map by normalized name for matching
      const normalizedName = entity.name.toLowerCase().replace(/\s+/g, '_');
      nameToUuid.set(normalizedName, entity.id);
      nameToUuid.set(`person_${normalizedName}`, entity.id);
      nameToUuid.set(`location_${normalizedName}`, entity.id);
      nameToUuid.set(`org_${normalizedName}`, entity.id);
    }
    
    page++;
    process.stdout.write(`\r  Fetched: ${oldIdToUuid.size} entities`);
  }
  
  console.log(`\n✅ Mapped ${oldIdToUuid.size} entities by ID, ${nameToUuid.size} by name\n`);
  
  // Build connections from co-occurrences
  console.log('🔗 Building connections...');
  const connectionStrength = new Map<string, number>();
  
  for (const [, entityIds] of docToEntities) {
    // Create connections between all entities in the same document
    for (let i = 0; i < entityIds.length; i++) {
      for (let j = i + 1; j < entityIds.length; j++) {
        const entityId1 = entityIds[i];
        const entityId2 = entityIds[j];
        
        if (!entityId1 || !entityId2) continue;
        
        // Try to find UUIDs using name-based mapping
        const uuid1 = nameToUuid.get(entityId1);
        const uuid2 = nameToUuid.get(entityId2);
        
        if (uuid1 && uuid2 && uuid1 !== uuid2) {
          // Create consistent key (sorted to avoid duplicates)
          const key = [uuid1, uuid2].sort().join('|');
          connectionStrength.set(key, (connectionStrength.get(key) || 0) + 1);
        }
      }
    }
  }
  
  console.log(`📊 Found ${connectionStrength.size} unique connections\n`);
  
  // Insert connections in batches
  console.log('📤 Inserting connections into Supabase...');
  const connections: Array<{
    entity_a_id: string;
    entity_b_id: string;
    strength: number;
    connection_type: string;
  }> = [];
  let inserted = 0;
  
  for (const [key, strength] of connectionStrength) {
    const [uuid1, uuid2] = key.split('|');
    if (uuid1 && uuid2) {
      connections.push({
        entity_a_id: uuid1,
        entity_b_id: uuid2,
        strength: strength,
        connection_type: 'co_occurrence'
      });
    }
    
    if (connections.length >= 500) {
      const { error } = await supabase
        .from('connections')
        .upsert(connections, { onConflict: 'entity_a_id,entity_b_id' });
      
      if (error) {
        console.error('Batch error:', error.message);
      } else {
        inserted += connections.length;
        process.stdout.write(`\r  Inserted: ${inserted} connections`);
      }
      connections.length = 0;
    }
  }
  
  // Insert remaining
  if (connections.length > 0) {
    const { error } = await supabase
      .from('connections')
      .upsert(connections, { onConflict: 'entity_a_id,entity_b_id' });
    if (!error) inserted += connections.length;
  }
  
  console.log(`\n\n✅ COMPLETE: Inserted ${inserted} connections into Supabase!`);
}

buildConnections().catch(console.error);
