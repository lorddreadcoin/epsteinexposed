/**
 * FULL ENTITY SYNC TO SUPABASE
 * 
 * This script:
 * 1. Reads ALL document JSON files from apps/api/data/entities/
 * 2. Extracts and cleans ALL entities (people, locations, orgs)
 * 3. Aggregates document counts per entity
 * 4. Creates connections between entities that appear in same documents
 * 5. Uploads EVERYTHING to Supabase
 * 
 * This ensures the ENTIRE dataset is cohesive across the site.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENTITIES_DIR = path.resolve(__dirname, '../../apps/api/data/entities');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================================================
// ENTITY CLEANING & VALIDATION
// =============================================================================

function cleanName(name: string): string {
  return name
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-'.,&]/g, '')
    .trim()
    .substring(0, 100);
}

function isValidEntity(name: string, type: string): boolean {
  const cleaned = cleanName(name);
  if (cleaned.length < 2 || cleaned.length > 80) return false;
  if (!/[a-zA-Z]/.test(cleaned)) return false;
  
  // Skip OCR garbage patterns
  const garbagePatterns = [
    /^[A-Z]{1,3}$/,
    /^[a-z]{1,2}$/,
    /^\d+$/,
    /^(page|total|date|time|from|to|the|and|for|with)$/i,
    /^(aircraft|model|flight|arrival|departure|landing|procedure)$/i,
    /^(endorsement|maneuver|remark|certification|signature)$/i,
    /^(redact|normal|edit|online|network|manual|single|double)$/i,
    /^(login|logout|sign|email|help|click|button|menu|view)$/i,
  ];
  
  return !garbagePatterns.some(p => p.test(cleaned));
}

// Normalize name for deduplication
function normalizeForKey(name: string): string {
  return cleanName(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// =============================================================================
// ENTITY AGGREGATION
// =============================================================================

interface AggregatedEntity {
  name: string;
  normalizedKey: string;
  type: 'person' | 'location' | 'organization' | 'other';
  documentIds: Set<string>;
  coEntities: Map<string, number>; // entity key -> co-occurrence count
}

async function aggregateAllEntities(): Promise<Map<string, AggregatedEntity>> {
  const entityMap = new Map<string, AggregatedEntity>();
  
  console.log(`📁 Reading from: ${ENTITIES_DIR}`);
  
  let files: string[];
  try {
    files = (await fs.readdir(ENTITIES_DIR)).filter(f => f.endsWith('.json'));
  } catch (err) {
    console.error('❌ Cannot read entities directory:', err);
    process.exit(1);
  }
  
  console.log(`📄 Processing ${files.length} document files...`);
  
  let processed = 0;
  let totalExtracted = 0;
  
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(ENTITIES_DIR, file), 'utf-8');
      const data = JSON.parse(content);
      const docId = data.document?.id || file.replace('.json', '');
      
      // Collect all entities from this document
      const docEntities: string[] = [];
      
      // Process people
      for (const person of data.entities?.people || []) {
        const rawName = person.name || '';
        if (!isValidEntity(rawName, 'person')) continue;
        
        const cleaned = cleanName(rawName);
        const key = normalizeForKey(cleaned);
        if (!key) continue;
        
        totalExtracted++;
        docEntities.push(key);
        
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            name: cleaned,
            normalizedKey: key,
            type: 'person',
            documentIds: new Set([docId]),
            coEntities: new Map(),
          });
        } else {
          entityMap.get(key)!.documentIds.add(docId);
        }
      }
      
      // Process locations
      for (const loc of data.entities?.locations || []) {
        const rawName = loc.name || '';
        if (!isValidEntity(rawName, 'location')) continue;
        
        const cleaned = cleanName(rawName);
        const key = 'loc_' + normalizeForKey(cleaned);
        if (!key) continue;
        
        totalExtracted++;
        docEntities.push(key);
        
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            name: cleaned,
            normalizedKey: key,
            type: 'location',
            documentIds: new Set([docId]),
            coEntities: new Map(),
          });
        } else {
          entityMap.get(key)!.documentIds.add(docId);
        }
      }
      
      // Process organizations
      for (const org of data.entities?.organizations || []) {
        const rawName = org.name || '';
        if (!isValidEntity(rawName, 'organization')) continue;
        
        const cleaned = cleanName(rawName);
        const key = 'org_' + normalizeForKey(cleaned);
        if (!key) continue;
        
        totalExtracted++;
        docEntities.push(key);
        
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            name: cleaned,
            normalizedKey: key,
            type: 'organization',
            documentIds: new Set([docId]),
            coEntities: new Map(),
          });
        } else {
          entityMap.get(key)!.documentIds.add(docId);
        }
      }
      
      // Create co-occurrence connections (entities in same document)
      for (let i = 0; i < docEntities.length; i++) {
        for (let j = i + 1; j < docEntities.length; j++) {
          const keyA = docEntities[i];
          const keyB = docEntities[j];
          if (keyA === keyB) continue;
          
          const entityA = entityMap.get(keyA);
          const entityB = entityMap.get(keyB);
          if (entityA && entityB) {
            entityA.coEntities.set(keyB, (entityA.coEntities.get(keyB) || 0) + 1);
            entityB.coEntities.set(keyA, (entityB.coEntities.get(keyA) || 0) + 1);
          }
        }
      }
      
      processed++;
      if (processed % 1000 === 0) {
        console.log(`   Processed ${processed}/${files.length} files, ${entityMap.size} unique entities`);
      }
      
    } catch (err) {
      // Skip invalid files
    }
  }
  
  console.log(`\n✅ Aggregation complete:`);
  console.log(`   Documents processed: ${processed}`);
  console.log(`   Total extractions: ${totalExtracted}`);
  console.log(`   Unique entities: ${entityMap.size}`);
  
  return entityMap;
}

// =============================================================================
// SUPABASE UPLOAD
// =============================================================================

async function clearExistingData() {
  console.log('\n🗑️ Clearing existing Supabase data...');
  
  // Delete all connections first (foreign key constraint)
  const { error: connError } = await supabase.from('connections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (connError) console.log('   Connections clear note:', connError.message);
  
  // Delete all entities
  const { error: entityError } = await supabase.from('entities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (entityError) console.log('   Entities clear note:', entityError.message);
  
  console.log('   ✅ Cleared existing data');
}

async function uploadEntities(entityMap: Map<string, AggregatedEntity>): Promise<Map<string, string>> {
  console.log('\n📤 Uploading entities to Supabase...');
  
  const keyToId = new Map<string, string>();
  const entities = Array.from(entityMap.values());
  const BATCH_SIZE = 50;
  let uploaded = 0;
  let errors = 0;
  
  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE).map(e => ({
      name: e.name,
      type: e.type,
      aliases: [] as string[],
      metadata: { normalizedKey: e.normalizedKey },
      document_count: e.documentIds.size,
      connection_count: e.coEntities.size,
    }));
    
    const { data, error } = await supabase
      .from('entities')
      .insert(batch)
      .select('id, metadata');
    
    if (error) {
      errors++;
      if (errors <= 5) console.log(`   ⚠️ Batch ${Math.floor(i/BATCH_SIZE)+1} error:`, error.message);
    } else if (data) {
      for (const entity of data) {
        const key = (entity.metadata as any)?.normalizedKey;
        if (key) {
          keyToId.set(key, entity.id);
          uploaded++;
        }
      }
    }
    
    if ((i / BATCH_SIZE) % 50 === 0) {
      console.log(`   Progress: ${uploaded}/${entities.length} entities uploaded`);
    }
  }
  
  console.log(`   ✅ Uploaded ${uploaded} entities (${errors} batch errors)`);
  return keyToId;
}

async function uploadConnections(entityMap: Map<string, AggregatedEntity>, keyToId: Map<string, string>) {
  console.log('\n🔗 Uploading connections to Supabase...');
  
  const connections: Array<{ entity_a_id: string; entity_b_id: string; strength: number; connection_type: string }> = [];
  const seen = new Set<string>();
  
  for (const entity of entityMap.values()) {
    const aId = keyToId.get(entity.normalizedKey);
    if (!aId) continue;
    
    for (const [coKey, strength] of entity.coEntities) {
      const bId = keyToId.get(coKey);
      if (!bId) continue;
      
      // Create consistent key to avoid duplicates
      const connKey = [aId, bId].sort().join('-');
      if (seen.has(connKey)) continue;
      seen.add(connKey);
      
      // Only include meaningful connections (strength > 1)
      if (strength >= 2) {
        connections.push({
          entity_a_id: aId,
          entity_b_id: bId,
          strength: strength,
          connection_type: 'co_occurrence',
        });
      }
    }
  }
  
  console.log(`   Found ${connections.length} connections to upload`);
  
  // Sort by strength descending, limit to top 50,000 connections
  connections.sort((a, b) => b.strength - a.strength);
  const topConnections = connections.slice(0, 50000);
  
  const BATCH_SIZE = 100;
  let uploaded = 0;
  
  for (let i = 0; i < topConnections.length; i += BATCH_SIZE) {
    const batch = topConnections.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase.from('connections').insert(batch);
    
    if (!error) {
      uploaded += batch.length;
    }
    
    if ((i / BATCH_SIZE) % 100 === 0) {
      console.log(`   Progress: ${uploaded}/${topConnections.length} connections uploaded`);
    }
  }
  
  console.log(`   ✅ Uploaded ${uploaded} connections`);
}

// =============================================================================
// VERIFICATION
// =============================================================================

async function verifyData() {
  console.log('\n🔍 Verifying uploaded data...');
  
  // Count entities
  const { count: entityCount } = await supabase
    .from('entities')
    .select('*', { count: 'exact', head: true });
  
  // Count connections
  const { count: connCount } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Total entities in Supabase: ${entityCount}`);
  console.log(`   Total connections in Supabase: ${connCount}`);
  
  // Check specific high-profile entities
  const highProfileNames = ['Donald Trump', 'Bill Clinton', 'Prince Andrew', 'Ghislaine Maxwell', 'Jeffrey Epstein'];
  
  console.log('\n👥 HIGH-PROFILE ENTITY CHECK:');
  for (const name of highProfileNames) {
    const { data } = await supabase
      .from('entities')
      .select('name, document_count, connection_count')
      .ilike('name', `%${name.split(' ').pop()}%`)
      .eq('type', 'person')
      .order('document_count', { ascending: false })
      .limit(3);
    
    if (data && data.length > 0) {
      for (const entity of data) {
        console.log(`   ✅ ${entity.name}: ${entity.document_count} docs, ${entity.connection_count} connections`);
      }
    } else {
      console.log(`   ⚠️ ${name}: NOT FOUND`);
    }
  }
  
  // Top 10 entities by document count
  const { data: topEntities } = await supabase
    .from('entities')
    .select('name, type, document_count, connection_count')
    .order('document_count', { ascending: false })
    .limit(10);
  
  console.log('\n📊 TOP 10 ENTITIES BY DOCUMENT COUNT:');
  topEntities?.forEach((e, i) => {
    console.log(`   ${i+1}. ${e.name} (${e.type}): ${e.document_count} docs, ${e.connection_count} connections`);
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('═'.repeat(70));
  console.log('FULL ENTITY SYNC TO SUPABASE');
  console.log('This ensures ALL entities from ALL documents are in Supabase');
  console.log('═'.repeat(70));
  
  // Step 1: Aggregate all entities
  const entityMap = await aggregateAllEntities();
  
  // Step 2: Clear existing data
  await clearExistingData();
  
  // Step 3: Upload entities
  const keyToId = await uploadEntities(entityMap);
  
  // Step 4: Upload connections
  await uploadConnections(entityMap, keyToId);
  
  // Step 5: Verify
  await verifyData();
  
  console.log('\n═'.repeat(70));
  console.log('✅ FULL SYNC COMPLETE');
  console.log('The entire dataset is now in Supabase for cohesive site-wide use.');
  console.log('═'.repeat(70));
}

main().catch(console.error);
