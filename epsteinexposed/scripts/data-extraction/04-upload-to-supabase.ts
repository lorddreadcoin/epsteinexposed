/**
 * Step 4: Upload Extracted Entities to Supabase
 * 
 * Uploads all extracted entities and connections to Supabase
 * Creates unified data source for graph and AI
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const ENTITIES_DIR = './data/entities';
const BATCH_SIZE = 100;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface EntityRecord {
  name: string;
  type: string;
  document_ids: string[];
  document_count: number;
  connection_count: number;
  context?: string;
  source_url?: string;
}

interface ConnectionRecord {
  entity_a_name: string;
  entity_b_name: string;
  relationship: string;
  document_ids: string[];
  strength: number;
  context?: string;
}

interface DocumentRecord {
  id: string;
  title: string;
  source_url: string;
  page_count?: number;
  entity_count: number;
  processed_at: string;
}

// Normalize entity names for deduplication
function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,\-'"`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(mr|mrs|ms|dr|prof|sir)\b\.?\s*/gi, '')
    .trim();
}

async function main() {
  console.log('='.repeat(60));
  console.log('EPSTEIN FILES - SUPABASE UPLOAD');
  console.log('='.repeat(60));

  // Load all entity files
  let entityFiles: string[];
  try {
    entityFiles = (await fs.readdir(ENTITIES_DIR)).filter((f: string) => f.endsWith('.json'));
  } catch {
    console.error(`❌ No entity files found in ${ENTITIES_DIR}`);
    process.exit(1);
  }

  console.log(`📄 Found ${entityFiles.length} entity files to upload`);

  // Aggregate all entities and connections
  const entityMap = new Map<string, EntityRecord>();
  const connectionMap = new Map<string, ConnectionRecord>();
  const documents: DocumentRecord[] = [];

  console.log('\n📊 Aggregating entities and connections...');

  for (const file of entityFiles) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(ENTITIES_DIR, file), 'utf-8'));
      const docId = data.documentId;

      // Track document
      documents.push({
        id: docId,
        title: data.documentTitle || docId,
        source_url: data.sourceUrl || `https://journaliststudio.google.com/pinpoint/document/${docId}`,
        entity_count: 
          (data.entities?.people?.length || 0) +
          (data.entities?.locations?.length || 0) +
          (data.entities?.organizations?.length || 0),
        processed_at: data.extractedAt || new Date().toISOString(),
      });

      // Process people
      for (const person of data.entities?.people || []) {
        const key = normalizeEntityName(person.name);
        if (!key || key.length < 2) continue;

        const existing = entityMap.get(key);
        if (existing) {
          existing.document_ids.push(docId);
          existing.document_count = existing.document_ids.length;
          if (person.context && !existing.context?.includes(person.context)) {
            existing.context = (existing.context || '') + ' | ' + person.context;
          }
        } else {
          entityMap.set(key, {
            name: person.name,
            type: 'person',
            document_ids: [docId],
            document_count: 1,
            connection_count: 0,
            context: person.role || person.context,
            source_url: data.sourceUrl,
          });
        }
      }

      // Process locations
      for (const location of data.entities?.locations || []) {
        const key = normalizeEntityName(location.name);
        if (!key || key.length < 2) continue;

        const existing = entityMap.get(key);
        if (existing) {
          existing.document_ids.push(docId);
          existing.document_count = existing.document_ids.length;
        } else {
          entityMap.set(key, {
            name: location.name,
            type: 'location',
            document_ids: [docId],
            document_count: 1,
            connection_count: 0,
            context: location.type || location.context,
          });
        }
      }

      // Process organizations
      for (const org of data.entities?.organizations || []) {
        const key = normalizeEntityName(org.name);
        if (!key || key.length < 2) continue;

        const existing = entityMap.get(key);
        if (existing) {
          existing.document_ids.push(docId);
          existing.document_count = existing.document_ids.length;
        } else {
          entityMap.set(key, {
            name: org.name,
            type: 'organization',
            document_ids: [docId],
            document_count: 1,
            connection_count: 0,
            context: org.type,
          });
        }
      }

      // Process connections
      for (const conn of data.connections || []) {
        const keyA = normalizeEntityName(conn.entityA);
        const keyB = normalizeEntityName(conn.entityB);
        if (!keyA || !keyB || keyA === keyB) continue;

        const connKey = [keyA, keyB].sort().join('::');
        const existing = connectionMap.get(connKey);

        if (existing) {
          existing.document_ids.push(docId);
          existing.strength = existing.document_ids.length;
        } else {
          connectionMap.set(connKey, {
            entity_a_name: conn.entityA,
            entity_b_name: conn.entityB,
            relationship: conn.relationship || 'co_occurrence',
            document_ids: [docId],
            strength: 1,
            context: conn.context,
          });
        }
      }

    } catch (error) {
      console.error(`   ⚠️ Error processing ${file}:`, error);
    }
  }

  // Update connection counts on entities
  for (const conn of connectionMap.values()) {
    const keyA = normalizeEntityName(conn.entity_a_name);
    const keyB = normalizeEntityName(conn.entity_b_name);
    
    const entityA = entityMap.get(keyA);
    const entityB = entityMap.get(keyB);
    
    if (entityA) entityA.connection_count++;
    if (entityB) entityB.connection_count++;
  }

  console.log(`\n📊 Aggregation complete:`);
  console.log(`   📄 Documents: ${documents.length}`);
  console.log(`   👤 Entities: ${entityMap.size}`);
  console.log(`   🔗 Connections: ${connectionMap.size}`);

  // Upload documents
  console.log('\n📤 Uploading documents...');
  const docBatches = [];
  const docArray = Array.from(documents);
  for (let i = 0; i < docArray.length; i += BATCH_SIZE) {
    docBatches.push(docArray.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < docBatches.length; i++) {
    const { error } = await supabase
      .from('documents')
      .upsert(docBatches[i], { onConflict: 'id' });
    
    if (error) {
      console.error(`   ⚠️ Document batch ${i + 1} error:`, error.message);
    } else {
      console.log(`   ✅ Document batch ${i + 1}/${docBatches.length}`);
    }
  }

  // Upload entities
  console.log('\n📤 Uploading entities...');
  const entityArray = Array.from(entityMap.values()).map(e => ({
    name: e.name,
    type: e.type,
    document_count: e.document_count,
    connection_count: e.connection_count,
    context: e.context?.substring(0, 500),
  }));

  const entityBatches = [];
  for (let i = 0; i < entityArray.length; i += BATCH_SIZE) {
    entityBatches.push(entityArray.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < entityBatches.length; i++) {
    const { error } = await supabase
      .from('entities')
      .upsert(entityBatches[i], { onConflict: 'name,type' });
    
    if (error) {
      console.error(`   ⚠️ Entity batch ${i + 1} error:`, error.message);
    } else {
      console.log(`   ✅ Entity batch ${i + 1}/${entityBatches.length}`);
    }
  }

  // Upload connections
  console.log('\n📤 Uploading connections...');
  const connectionArray = Array.from(connectionMap.values()).map(c => ({
    entity_a_name: c.entity_a_name,
    entity_b_name: c.entity_b_name,
    relationship: c.relationship,
    strength: c.strength,
    context: c.context?.substring(0, 500),
  }));

  const connBatches = [];
  for (let i = 0; i < connectionArray.length; i += BATCH_SIZE) {
    connBatches.push(connectionArray.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < connBatches.length; i++) {
    const { error } = await supabase
      .from('connections')
      .upsert(connBatches[i], { onConflict: 'entity_a_name,entity_b_name' });
    
    if (error) {
      console.error(`   ⚠️ Connection batch ${i + 1} error:`, error.message);
    } else {
      console.log(`   ✅ Connection batch ${i + 1}/${connBatches.length}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`📄 Documents uploaded: ${documents.length}`);
  console.log(`👤 Entities uploaded: ${entityMap.size}`);
  console.log(`🔗 Connections uploaded: ${connectionMap.size}`);
}

main().catch(console.error);
