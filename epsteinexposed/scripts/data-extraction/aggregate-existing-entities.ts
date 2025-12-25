/**
 * Aggregate Existing Entities
 * 
 * Reads all entity JSON files from apps/api/data/entities/
 * Cleans up OCR artifacts and normalizes names
 * Uploads aggregated data to Supabase
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENTITIES_DIR = '../../apps/api/data/entities';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Clean up OCR artifacts from names
function cleanName(name: string): string {
  return name
    .replace(/\n/g, ' ')           // Remove newlines
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .replace(/[^\w\s\-'.]/g, '')   // Remove special chars except common name chars
    .replace(/^\s+|\s+$/g, '')     // Trim
    .replace(/^[^a-zA-Z]+/, '')    // Remove leading non-letters
    .replace(/[^a-zA-Z]+$/, '')    // Remove trailing non-letters
    .trim();
}

// Check if name looks like a valid person name
function isValidPersonName(name: string): boolean {
  const cleaned = cleanName(name);
  if (cleaned.length < 3) return false;
  if (cleaned.length > 50) return false;
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(cleaned)) return false;
  
  // Skip obvious OCR garbage
  const garbagePatterns = [
    /^[A-Z]{1,2}\s+[A-Z]{1,2}$/,  // Like "Of Df"
    /^\d+$/,                       // Just numbers
    /^[^a-zA-Z]*$/,                // No letters
    /aircraft/i,                   // Document text
    /model/i,
    /flight/i,
    /page/i,
    /total/i,
    /forward/i,
    /endorsement/i,
    /procedure/i,
    /arrival/i,
    /departure/i,
    /landing/i,
    /redact/i,
  ];
  
  for (const pattern of garbagePatterns) {
    if (pattern.test(cleaned)) return false;
  }
  
  // Should have at least 2 word characters
  const words = cleaned.split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return false;
  
  return true;
}

// Known high-profile names to prioritize
const HIGH_PROFILE_NAMES = [
  'donald trump', 'bill clinton', 'prince andrew', 'ghislaine maxwell',
  'jeffrey epstein', 'alan dershowitz', 'bill gates', 'les wexner',
  'virginia giuffre', 'jean luc brunel', 'sarah kellen', 'nadia marcinkova',
  'eva dubin', 'glenn dubin', 'marvin minsky', 'stephen hawking',
  'kevin spacey', 'chris tucker', 'naomi campbell', 'courtney love',
  'elon musk', 'larry summers', 'ehud barak', 'woody allen',
  'harvey weinstein', 'leon black', 'mortimer zuckerman', 'tom pritzker',
  'reid hoffman', 'sergey brin', 'mark zuckerberg', 'john podesta',
];

function isHighProfile(name: string): boolean {
  const lower = cleanName(name).toLowerCase();
  return HIGH_PROFILE_NAMES.some(hp => lower.includes(hp) || hp.includes(lower));
}

interface AggregatedEntity {
  name: string;
  type: string;
  documentIds: string[];
  documentCount: number;
  connectionCount: number;
  isHighProfile: boolean;
  contexts: string[];
}

async function main() {
  console.log('='.repeat(60));
  console.log('AGGREGATE EXISTING ENTITIES');
  console.log('='.repeat(60));

  // Get all entity files
  const absoluteDir = path.resolve(__dirname, ENTITIES_DIR);
  console.log(`📁 Reading from: ${absoluteDir}`);
  
  let files: string[];
  try {
    files = (await fs.readdir(absoluteDir)).filter(f => f.endsWith('.json'));
  } catch (err) {
    console.error('❌ Could not read entities directory:', err);
    process.exit(1);
  }

  console.log(`📄 Found ${files.length} entity files`);

  // Aggregate entities
  const entityMap = new Map<string, AggregatedEntity>();
  let totalExtracted = 0;
  let validExtracted = 0;
  let documentsProcessed = 0;

  for (const file of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(absoluteDir, file), 'utf-8'));
      const docId = data.document?.id || file.replace('.json', '');
      documentsProcessed++;

      // Process people
      for (const person of data.entities?.people || []) {
        totalExtracted++;
        const rawName = person.name || '';
        
        if (!isValidPersonName(rawName)) continue;
        
        const cleanedName = cleanName(rawName);
        const key = cleanedName.toLowerCase();
        
        validExtracted++;
        
        const existing = entityMap.get(key);
        if (existing) {
          if (!existing.documentIds.includes(docId)) {
            existing.documentIds.push(docId);
            existing.documentCount = existing.documentIds.length;
          }
          if (person.context && existing.contexts.length < 5) {
            existing.contexts.push(person.context.substring(0, 100));
          }
        } else {
          entityMap.set(key, {
            name: cleanedName,
            type: 'person',
            documentIds: [docId],
            documentCount: 1,
            connectionCount: 0,
            isHighProfile: isHighProfile(cleanedName),
            contexts: person.context ? [person.context.substring(0, 100)] : [],
          });
        }
      }

      // Process locations
      for (const location of data.entities?.locations || []) {
        const rawName = location.name || '';
        const cleanedName = cleanName(rawName);
        if (cleanedName.length < 3 || cleanedName.length > 50) continue;
        
        const key = 'loc_' + cleanedName.toLowerCase();
        
        const existing = entityMap.get(key);
        if (existing) {
          if (!existing.documentIds.includes(docId)) {
            existing.documentIds.push(docId);
            existing.documentCount = existing.documentIds.length;
          }
        } else {
          entityMap.set(key, {
            name: cleanedName,
            type: 'location',
            documentIds: [docId],
            documentCount: 1,
            connectionCount: 0,
            isHighProfile: false,
            contexts: [],
          });
        }
      }

      if (documentsProcessed % 500 === 0) {
        console.log(`   Processed ${documentsProcessed}/${files.length} files, ${entityMap.size} unique entities`);
      }

    } catch (err) {
      // Skip invalid files
    }
  }

  console.log(`\n📊 Aggregation complete:`);
  console.log(`   Documents processed: ${documentsProcessed}`);
  console.log(`   Total entities extracted: ${totalExtracted}`);
  console.log(`   Valid entities after cleanup: ${validExtracted}`);
  console.log(`   Unique entities: ${entityMap.size}`);

  // Find high-profile entities
  const highProfileEntities = Array.from(entityMap.values())
    .filter(e => e.isHighProfile)
    .sort((a, b) => b.documentCount - a.documentCount);

  console.log(`\n👥 HIGH PROFILE ENTITIES FOUND:`);
  highProfileEntities.slice(0, 20).forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.name}: ${e.documentCount} documents`);
  });

  // Top entities by document count
  const topEntities = Array.from(entityMap.values())
    .sort((a, b) => b.documentCount - a.documentCount)
    .slice(0, 50);

  console.log(`\n📈 TOP 20 ENTITIES BY DOCUMENT COUNT:`);
  topEntities.slice(0, 20).forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.name} (${e.type}): ${e.documentCount} documents`);
  });

  // Upload to Supabase
  console.log(`\n📤 Uploading to Supabase...`);
  
  const BATCH_SIZE = 100;
  const entities = Array.from(entityMap.values()).map(e => ({
    name: e.name,
    type: e.type,
    document_count: e.documentCount,
    connection_count: e.connectionCount,
  }));

  let uploaded = 0;
  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE);
    
    const { error } = await supabase
      .from('entities')
      .upsert(batch, { onConflict: 'name,type', ignoreDuplicates: false });
    
    if (error) {
      console.error(`   ⚠️ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
    } else {
      uploaded += batch.length;
    }

    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`   Uploaded ${uploaded}/${entities.length} entities`);
    }
  }

  console.log(`\n✅ UPLOAD COMPLETE: ${uploaded} entities uploaded to Supabase`);
  
  // Verify by querying for Trump
  console.log(`\n🔍 Verifying data for "Donald Trump"...`);
  const { data: trumpData, error: trumpError } = await supabase
    .from('entities')
    .select('*')
    .ilike('name', '%trump%')
    .eq('type', 'person');
  
  if (trumpData && trumpData.length > 0) {
    console.log(`   Found ${trumpData.length} Trump-related entities:`);
    trumpData.forEach(t => {
      console.log(`   - ${t.name}: ${t.document_count} documents`);
    });
  } else {
    console.log(`   ⚠️ No Trump entities found. Error: ${trumpError?.message}`);
  }
}

main().catch(console.error);
