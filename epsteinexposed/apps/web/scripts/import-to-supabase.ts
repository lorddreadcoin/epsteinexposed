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

// Use service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface EntityData {
  name?: string;
  type?: string;
  aliases?: string[];
  mentions?: Array<{
    documentId: string;
    pageNumber?: number;
    context?: string;
  }>;
  connections?: Array<{
    entityId: string;
    entityName: string;
    strength: number;
    documentIds?: string[];
  }>;
  metadata?: Record<string, unknown>;
}

const BATCH_SIZE = 100;
let totalEntities = 0;
let totalConnections = 0;
const errors: string[] = [];

async function importEntities() {
  console.log('🚀 Starting Supabase import...\n');
  
  // Find the entities directory
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
    console.log('Searched:', possiblePaths);
    process.exit(1);
  }
  
  // Get all JSON files
  const files = await fs.readdir(entitiesPath);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  console.log(`📁 Found ${jsonFiles.length} entity files\n`);
  
  // Process in batches
  const entityBatch: Array<{
    name: string;
    type: string;
    aliases: string[];
    metadata: Record<string, unknown>;
    document_count: number;
    connection_count: number;
  }> = [];
  const connectionBatch: Array<{
    sourceOldId: string;
    targetOldId: string;
    strength: number;
    documentIds: string[];
  }> = [];
  const entityIdMap = new Map<string, string>(); // oldId -> newUUID
  
  // First pass: Insert all entities
  console.log('📥 Phase 1: Importing entities...');
  
  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    const filePath = path.join(entitiesPath, file);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data: EntityData = JSON.parse(content);
      const oldId = file.replace('.json', '');
      
      // Determine entity type
      let entityType = data.type || 'other';
      if (!['person', 'location', 'organization', 'date', 'flight', 'phone', 'email', 'other'].includes(entityType)) {
        entityType = 'other';
      }
      
      entityBatch.push({
        name: data.name || oldId,
        type: entityType,
        aliases: data.aliases || [],
        metadata: { originalId: oldId, ...data.metadata },
        document_count: data.mentions?.length || 0,
        connection_count: data.connections?.length || 0
      });
      
      // Store connections for later
      if (data.connections) {
        for (const conn of data.connections) {
          connectionBatch.push({
            sourceOldId: oldId,
            targetOldId: conn.entityId,
            strength: conn.strength || 1,
            documentIds: conn.documentIds || []
          });
        }
      }
      
      // Insert batch when full
      if (entityBatch.length >= BATCH_SIZE) {
        const { data: inserted, error } = await supabase
          .from('entities')
          .insert(entityBatch)
          .select('id, metadata');
        
        if (error) {
          errors.push(`Batch error at ${i}: ${error.message}`);
        } else if (inserted) {
          for (const entity of inserted) {
            const originalId = (entity.metadata as { originalId?: string })?.originalId;
            if (originalId) {
              entityIdMap.set(originalId, entity.id);
            }
          }
          totalEntities += inserted.length;
        }
        
        entityBatch.length = 0;
        process.stdout.write(`\r  Progress: ${i + 1}/${jsonFiles.length} files (${totalEntities} entities)`);
      }
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`File ${file}: ${errorMessage}`);
    }
  }
  
  // Insert remaining entities
  if (entityBatch.length > 0) {
    const { data: inserted, error } = await supabase
      .from('entities')
      .insert(entityBatch)
      .select('id, metadata');
    
    if (error) {
      errors.push(`Final batch error: ${error.message}`);
    } else if (inserted) {
      for (const entity of inserted) {
        const originalId = (entity.metadata as { originalId?: string })?.originalId;
        if (originalId) {
          entityIdMap.set(originalId, entity.id);
        }
      }
      totalEntities += inserted.length;
    }
  }
  
  console.log(`\n✅ Imported ${totalEntities} entities\n`);
  
  // Second pass: Insert connections
  console.log('🔗 Phase 2: Importing connections...');
  
  const connectionInserts: Array<{
    entity_a_id: string;
    entity_b_id: string;
    strength: number;
    connection_type: string;
  }> = [];
  const seenConnections = new Set<string>();
  
  for (const conn of connectionBatch) {
    const sourceId = entityIdMap.get(conn.sourceOldId);
    const targetId = entityIdMap.get(conn.targetOldId);
    
    if (sourceId && targetId && sourceId !== targetId) {
      // Create consistent key to avoid duplicates
      const key = [sourceId, targetId].sort().join('-');
      
      if (!seenConnections.has(key)) {
        seenConnections.add(key);
        connectionInserts.push({
          entity_a_id: sourceId,
          entity_b_id: targetId,
          strength: conn.strength,
          connection_type: 'co_occurrence'
        });
      }
    }
    
    // Insert batch
    if (connectionInserts.length >= BATCH_SIZE) {
      const { error } = await supabase
        .from('connections')
        .upsert(connectionInserts, { onConflict: 'entity_a_id,entity_b_id' });
      
      if (error) {
        errors.push(`Connection batch error: ${error.message}`);
      } else {
        totalConnections += connectionInserts.length;
      }
      
      connectionInserts.length = 0;
      process.stdout.write(`\r  Progress: ${totalConnections} connections`);
    }
  }
  
  // Insert remaining connections
  if (connectionInserts.length > 0) {
    const { error } = await supabase
      .from('connections')
      .upsert(connectionInserts, { onConflict: 'entity_a_id,entity_b_id' });
    
    if (!error) {
      totalConnections += connectionInserts.length;
    }
  }
  
  console.log(`\n✅ Imported ${totalConnections} connections\n`);
  
  // Summary
  console.log('═'.repeat(50));
  console.log('📊 IMPORT COMPLETE');
  console.log('═'.repeat(50));
  console.log(`  Entities:    ${totalEntities}`);
  console.log(`  Connections: ${totalConnections}`);
  console.log(`  Errors:      ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️ Errors (first 10):');
    errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
  }
}

importEntities().catch(console.error);
