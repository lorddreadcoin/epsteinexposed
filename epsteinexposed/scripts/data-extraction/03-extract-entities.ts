/**
 * Step 3: Extract Entities using OpenRouter API
 * 
 * Uses GPT-4o-mini via OpenRouter to extract entities from document text.
 * Extracts: people, locations, organizations, dates, flights, phone numbers
 */

import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TEXT_DIR = './data/documents';
const ENTITIES_DIR = './data/entities';
const PROGRESS_FILE = './data/entity-extraction-progress.json';

// Rate limiting
const REQUESTS_PER_MINUTE = 20;
const DELAY_MS = (60 * 1000) / REQUESTS_PER_MINUTE;

interface ExtractedEntities {
  documentId: string;
  documentTitle: string;
  sourceUrl: string;
  extractedAt: string;
  entities: {
    people: Array<{ name: string; role?: string; context?: string }>;
    locations: Array<{ name: string; type?: string; context?: string }>;
    organizations: Array<{ name: string; type?: string }>;
    dates: Array<{ date: string; event?: string; context?: string }>;
    flights: Array<{ from?: string; to?: string; date?: string; passengers?: string[]; aircraft?: string }>;
    phoneNumbers: string[];
    emails: string[];
  };
  connections: Array<{
    entityA: string;
    entityB: string;
    relationship: string;
    context?: string;
  }>;
}

const EXTRACTION_PROMPT = `You are an expert entity extractor analyzing documents from the Jeffrey Epstein case files.

Extract ALL entities and connections from this document text. Be thorough - every name, date, location matters.

IMPORTANT ENTITIES TO FIND:
- People: Full names, nicknames, titles (especially politicians, celebrities, businesspeople)
- Locations: Addresses, cities, countries, properties (especially private islands, mansions)
- Organizations: Companies, foundations, government agencies
- Dates: Any dates mentioned (court dates, travel dates, events)
- Flights: Any flight information (Lolita Express, private jets)
- Phone numbers and emails

CONNECTIONS: Identify relationships between entities (e.g., "Trump flew with Epstein", "Maxwell recruited for Epstein")

Return ONLY valid JSON in this exact format:
{
  "entities": {
    "people": [{"name": "Full Name", "role": "role if known", "context": "brief context"}],
    "locations": [{"name": "Location Name", "type": "city/address/property", "context": "why mentioned"}],
    "organizations": [{"name": "Org Name", "type": "company/foundation/agency"}],
    "dates": [{"date": "YYYY-MM-DD or description", "event": "what happened", "context": "details"}],
    "flights": [{"from": "origin", "to": "destination", "date": "date", "passengers": ["names"], "aircraft": "type"}],
    "phoneNumbers": ["numbers found"],
    "emails": ["emails found"]
  },
  "connections": [
    {"entityA": "Name1", "entityB": "Name2", "relationship": "type of connection", "context": "details"}
  ]
}`;

async function ensureDirectory(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Directory exists
  }
}

async function loadProgress(): Promise<Set<string>> {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

async function saveProgress(processed: Set<string>) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify([...processed], null, 2));
}

async function extractEntities(text: string, documentId: string): Promise<any> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  // Truncate text if too long (GPT-4o-mini has 128k context but we'll be conservative)
  const maxChars = 50000;
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '...[truncated]' : text;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://epsteinexposed.netlify.app',
      'X-Title': 'Epstein Files Entity Extraction'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Document ID: ${documentId}\n\nDocument Text:\n${truncatedText}` }
      ],
      max_tokens: 4000,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  // Parse JSON from response
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error(`   ⚠️ Failed to parse JSON for ${documentId}:`, parseError);
    return { entities: { people: [], locations: [], organizations: [], dates: [], flights: [], phoneNumbers: [], emails: [] }, connections: [] };
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('EPSTEIN FILES - ENTITY EXTRACTION (OpenRouter GPT-4o-mini)');
  console.log('='.repeat(60));

  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set in environment');
    process.exit(1);
  }

  await ensureDirectory(ENTITIES_DIR);

  // Load document text files
  let textFiles: string[];
  try {
    textFiles = (await fs.readdir(TEXT_DIR)).filter(f => f.endsWith('.json'));
  } catch {
    console.error(`❌ No text files found in ${TEXT_DIR}`);
    console.log('   Run step 2 (extract-pdf-text) first');
    process.exit(1);
  }

  console.log(`📄 Found ${textFiles.length} documents to process`);

  // Load progress
  const processed = await loadProgress();
  console.log(`✅ Already processed: ${processed.size} documents`);

  const remaining = textFiles.filter(f => !processed.has(f.replace('.json', '')));
  console.log(`📋 Remaining: ${remaining.length} documents`);

  let successCount = 0;
  let errorCount = 0;
  let totalEntities = 0;
  let totalConnections = 0;

  for (let i = 0; i < remaining.length; i++) {
    const file = remaining[i];
    const docId = file.replace('.json', '');

    try {
      console.log(`\n[${i + 1}/${remaining.length}] Processing: ${docId}`);

      // Load document text
      const docData = JSON.parse(await fs.readFile(path.join(TEXT_DIR, file), 'utf-8'));
      const text = docData.text || '';

      if (!text || text.length < 50) {
        console.log('   ⏭️ Skipping: insufficient text');
        processed.add(docId);
        continue;
      }

      // Extract entities
      const extracted = await extractEntities(text, docId);

      // Build full result
      const result: ExtractedEntities = {
        documentId: docId,
        documentTitle: docData.title || docId,
        sourceUrl: docData.sourceUrl || '',
        extractedAt: new Date().toISOString(),
        entities: {
          people: extracted.entities?.people || [],
          locations: extracted.entities?.locations || [],
          organizations: extracted.entities?.organizations || [],
          dates: extracted.entities?.dates || [],
          flights: extracted.entities?.flights || [],
          phoneNumbers: extracted.entities?.phoneNumbers || [],
          emails: extracted.entities?.emails || [],
        },
        connections: extracted.connections || [],
      };

      // Count entities
      const entityCount = 
        result.entities.people.length +
        result.entities.locations.length +
        result.entities.organizations.length +
        result.entities.dates.length +
        result.entities.flights.length;

      totalEntities += entityCount;
      totalConnections += result.connections.length;

      console.log(`   ✅ Extracted: ${entityCount} entities, ${result.connections.length} connections`);
      console.log(`   👥 People: ${result.entities.people.slice(0, 3).map(p => p.name).join(', ')}${result.entities.people.length > 3 ? '...' : ''}`);

      // Save result
      await fs.writeFile(
        path.join(ENTITIES_DIR, `${docId}.json`),
        JSON.stringify(result, null, 2)
      );

      processed.add(docId);
      successCount++;

      // Save progress every 10 documents
      if (successCount % 10 === 0) {
        await saveProgress(processed);
        console.log(`   💾 Progress saved (${processed.size} total)`);
      }

      // Rate limiting
      await sleep(DELAY_MS);

    } catch (error) {
      console.error(`   ❌ Error processing ${docId}:`, error);
      errorCount++;
      
      // Still mark as processed to avoid infinite retries
      if (errorCount > 5) {
        processed.add(docId);
      }
    }
  }

  // Final save
  await saveProgress(processed);

  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total entities extracted: ${totalEntities}`);
  console.log(`🔗 Total connections found: ${totalConnections}`);
  console.log(`📁 Results saved to: ${ENTITIES_DIR}`);
}

main().catch(console.error);
