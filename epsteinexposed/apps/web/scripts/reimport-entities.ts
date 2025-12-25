import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
async function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
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
}

await loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reimportEntities() {
  console.log('🔄 Re-importing entities correctly...\n');
  
  // Clear existing data
  console.log('🗑️  Clearing existing entities and connections...');
  await supabase.from('connections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('entities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ Cleared\n');
  
  // Find entities directory
  const entitiesPath = path.join(process.cwd(), '..', 'api', 'data', 'entities');
  const files = await fs.readdir(entitiesPath);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`📁 Found ${jsonFiles.length} document files\n`);
  console.log('📥 Extracting entities from documents...\n');
  
  // Map to deduplicate entities: normalized_name -> entity data
  const entityMap = new Map<string, {
    name: string;
    type: string;
    documentIds: Set<string>;
  }>();
  
  // Process each document file
  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    
    try {
      const content = await fs.readFile(path.join(entitiesPath, file), 'utf-8');
      const data = JSON.parse(content);
      const docId = data.document?.filename || file.replace('.json', '');
      
      // Extract people
      if (data.entities?.people && Array.isArray(data.entities.people)) {
        for (const person of data.entities.people) {
          if (person.name && person.name.length > 1) {
            const normalized = person.name.toLowerCase().trim();
            if (!entityMap.has(normalized)) {
              entityMap.set(normalized, {
                name: person.name,
                type: 'person',
                documentIds: new Set()
              });
            }
            entityMap.get(normalized)!.documentIds.add(docId);
          }
        }
      }
      
      // Extract locations
      if (data.entities?.locations && Array.isArray(data.entities.locations)) {
        for (const loc of data.entities.locations) {
          if (loc.name && loc.name.length > 1) {
            const normalized = loc.name.toLowerCase().trim();
            if (!entityMap.has(normalized)) {
              entityMap.set(normalized, {
                name: loc.name,
                type: 'location',
                documentIds: new Set()
              });
            }
            entityMap.get(normalized)!.documentIds.add(docId);
          }
        }
      }
      
      // Extract organizations
      if (data.entities?.organizations && Array.isArray(data.entities.organizations)) {
        for (const org of data.entities.organizations) {
          if (org.name && org.name.length > 1) {
            const normalized = org.name.toLowerCase().trim();
            if (!entityMap.has(normalized)) {
              entityMap.set(normalized, {
                name: org.name,
                type: 'organization',
                documentIds: new Set()
              });
            }
            entityMap.get(normalized)!.documentIds.add(docId);
          }
        }
      }
      
      if ((i + 1) % 1000 === 0) {
        process.stdout.write(`\r  Processed: ${i + 1}/${jsonFiles.length} files (${entityMap.size} unique entities)`);
      }
      
    } catch {
      // Skip invalid files
    }
  }
  
  console.log(`\n✅ Extracted ${entityMap.size} unique entities\n`);
  
  // Insert entities in batches
  console.log('📤 Inserting entities into Supabase...');
  
  const entityBatch: Array<{
    name: string;
    type: string;
    document_count: number;
    metadata: { normalized_name: string };
  }> = [];
  
  let inserted = 0;
  
  for (const [normalized, entity] of entityMap) {
    entityBatch.push({
      name: entity.name,
      type: entity.type,
      document_count: entity.documentIds.size,
      metadata: { normalized_name: normalized }
    });
    
    if (entityBatch.length >= 500) {
      const { error } = await supabase.from('entities').insert(entityBatch);
      
      if (error) {
        console.error('Batch error:', error.message);
      } else {
        inserted += entityBatch.length;
        process.stdout.write(`\r  Inserted: ${inserted} entities`);
      }
      
      entityBatch.length = 0;
    }
  }
  
  // Insert remaining
  if (entityBatch.length > 0) {
    const { error } = await supabase.from('entities').insert(entityBatch);
    if (!error) inserted += entityBatch.length;
  }
  
  console.log(`\n✅ Inserted ${inserted} entities\n`);
  console.log('✅ COMPLETE - Now run: pnpm build:connections');
}

reimportEntities().catch(console.error);
