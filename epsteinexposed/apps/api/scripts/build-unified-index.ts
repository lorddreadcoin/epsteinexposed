import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../data/entities');
const OUTPUT_PATH = path.join(__dirname, '../data/unified-entity-index.json');

interface UnifiedEntity {
  id: string;
  name: string;
  normalizedName: string;
  type: 'person' | 'organization' | 'location' | 'date';
  sources: {
    blackBook: boolean;
    flightLogs: boolean;
    dojDocs: boolean;
  };
  dojDocumentCount: number;
  flightCount: number;
  blackBookEntry: boolean;
  blackBookCircled: boolean;
  phones?: string[];
  emails?: string[];
  addresses?: string[];
  flightDestinations?: string[];
  topCoPassengers?: Array<{ name: string; count: number }>;
  significanceScore: number;
}

interface BlackBookContact {
  id: string;
  name: string;
  normalizedName: string;
  phones: string[];
  emails: string[];
  addresses: string[];
  circled: boolean;
}

interface FlightPassenger {
  id: string;
  name: string;
  normalizedName: string;
  flightCount: number;
  destinations: string[];
  coPassengers: Record<string, number>;
}

interface DOJEntity {
  id: string;
  name: string;
  type: string;
  documentIds: string[];
  occurrences: number;
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

async function loadJSON<T>(filename: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    console.log(`⚠️  Could not load ${filename} - skipping`);
    return [];
  }
}

async function scanDOJEntities(): Promise<Map<string, { count: number; type: string }>> {
  const entityMap = new Map<string, { count: number; type: string }>();
  
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json') && 
      !f.includes('black-book') && 
      !f.includes('flight') && 
      !f.includes('unified') &&
      !f.includes('lookup'));
    
    console.log(`   Scanning ${jsonFiles.length} DOJ entity files...`);
    
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        
        // Handle different entity file formats
        if (data.entities?.people) {
          for (const person of data.entities.people) {
            if (person.name) {
              const key = normalizeText(person.name);
              const existing = entityMap.get(key);
              if (existing) {
                existing.count++;
              } else {
                entityMap.set(key, { count: 1, type: 'person' });
              }
            }
          }
        }
        
        if (data.entities?.locations) {
          for (const loc of data.entities.locations) {
            if (loc.name) {
              const key = normalizeText(loc.name);
              const existing = entityMap.get(key);
              if (existing) {
                existing.count++;
              } else {
                entityMap.set(key, { count: 1, type: 'location' });
              }
            }
          }
        }
        
        if (data.entities?.organizations) {
          for (const org of data.entities.organizations) {
            if (org.name) {
              const key = normalizeText(org.name);
              const existing = entityMap.get(key);
              if (existing) {
                existing.count++;
              } else {
                entityMap.set(key, { count: 1, type: 'organization' });
              }
            }
          }
        }
      } catch {
        // Skip malformed files
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Could not scan DOJ entities: ${error}`);
  }
  
  return entityMap;
}

async function buildUnifiedIndex(): Promise<UnifiedEntity[]> {
  console.log('🔗 Building Unified Entity Index...\n');
  
  // Load all data sources
  const blackBookContacts = await loadJSON<BlackBookContact>('black-book-contacts.json');
  const flightPassengers = await loadJSON<FlightPassenger>('flight-passengers.json');
  
  console.log(`📊 Loaded data sources:`);
  console.log(`   - Black Book: ${blackBookContacts.length} contacts`);
  console.log(`   - Flight Logs: ${flightPassengers.length} passengers`);
  
  // Scan DOJ entities
  const dojEntities = await scanDOJEntities();
  console.log(`   - DOJ Entities: ${dojEntities.size} unique names found\n`);
  
  const entityMap = new Map<string, UnifiedEntity>();
  
  // Process Black Book contacts
  for (const contact of blackBookContacts) {
    const key = contact.normalizedName;
    const dojData = dojEntities.get(key);
    
    entityMap.set(key, {
      id: `entity_${key.replace(/\s/g, '_')}`,
      name: contact.name,
      normalizedName: key,
      type: 'person',
      sources: { 
        blackBook: true, 
        flightLogs: false, 
        dojDocs: !!dojData 
      },
      dojDocumentCount: dojData?.count || 0,
      flightCount: 0,
      blackBookEntry: true,
      blackBookCircled: contact.circled || false,
      phones: contact.phones,
      emails: contact.emails,
      addresses: contact.addresses,
      significanceScore: (contact.circled ? 100 : 20) + (dojData?.count || 0) * 2,
    });
  }
  
  // Process Flight Passengers
  for (const passenger of flightPassengers) {
    const key = passenger.normalizedName;
    const existing = entityMap.get(key);
    const dojData = dojEntities.get(key);
    
    if (existing) {
      existing.sources.flightLogs = true;
      existing.flightCount = passenger.flightCount;
      existing.flightDestinations = passenger.destinations;
      existing.topCoPassengers = Object.entries(passenger.coPassengers || {})
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count: count as number }));
      existing.significanceScore += passenger.flightCount * 10;
    } else {
      entityMap.set(key, {
        id: `entity_${key.replace(/\s/g, '_')}`,
        name: passenger.name,
        normalizedName: key,
        type: 'person',
        sources: { 
          blackBook: false, 
          flightLogs: true, 
          dojDocs: !!dojData 
        },
        dojDocumentCount: dojData?.count || 0,
        flightCount: passenger.flightCount,
        blackBookEntry: false,
        blackBookCircled: false,
        flightDestinations: passenger.destinations,
        topCoPassengers: Object.entries(passenger.coPassengers || {})
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 10)
          .map(([name, count]) => ({ name, count: count as number })),
        significanceScore: passenger.flightCount * 10 + (dojData?.count || 0) * 2,
      });
    }
  }
  
  // Add DOJ-only entities that aren't in other sources
  for (const [key, data] of dojEntities.entries()) {
    if (!entityMap.has(key) && data.count >= 3) { // Only include if mentioned 3+ times
      entityMap.set(key, {
        id: `entity_${key.replace(/\s/g, '_')}`,
        name: key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        normalizedName: key,
        type: data.type as 'person' | 'organization' | 'location' | 'date',
        sources: { blackBook: false, flightLogs: false, dojDocs: true },
        dojDocumentCount: data.count,
        flightCount: 0,
        blackBookEntry: false,
        blackBookCircled: false,
        significanceScore: data.count * 2,
      });
    }
  }
  
  // Sort by significance score
  const entities = Array.from(entityMap.values())
    .sort((a, b) => b.significanceScore - a.significanceScore);
  
  // Calculate statistics
  const multiSource = entities.filter(e => {
    const sourceCount = Object.values(e.sources).filter(Boolean).length;
    return sourceCount >= 2;
  });
  
  const tripleSource = entities.filter(e => {
    return e.sources.blackBook && e.sources.flightLogs && e.sources.dojDocs;
  });
  
  console.log(`✅ Built unified index with ${entities.length} entities`);
  console.log(`\n🔥 CROSS-REFERENCED ENTITIES:`);
  console.log(`   - Appear in 2+ sources: ${multiSource.length}`);
  console.log(`   - Appear in ALL 3 sources: ${tripleSource.length}`);
  
  console.log('\n📊 Top 30 by Significance Score:');
  entities.slice(0, 30).forEach((e, i) => {
    const sources = [];
    if (e.sources.blackBook) sources.push(e.blackBookCircled ? '📓⭐' : '📓');
    if (e.sources.flightLogs) sources.push(`✈️${e.flightCount}`);
    if (e.sources.dojDocs) sources.push(`📄${e.dojDocumentCount}`);
    console.log(`   ${String(i + 1).padStart(2)}. ${e.name.padEnd(30)} [${e.significanceScore}] ${sources.join(' ')}`);
  });
  
  if (tripleSource.length > 0) {
    console.log('\n🎯 ENTITIES IN ALL 3 SOURCES (highest priority targets):');
    tripleSource.slice(0, 20).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.name} - ${e.flightCount} flights, ${e.dojDocumentCount} DOJ docs${e.blackBookCircled ? ' ⭐CIRCLED' : ''}`);
    });
  }
  
  return entities;
}

async function main() {
  try {
    const entities = await buildUnifiedIndex();
    
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(entities, null, 2));
    console.log(`\n💾 Saved unified index to ${OUTPUT_PATH}`);
    
    // Create a quick lookup by normalized name
    const lookupPath = path.join(path.dirname(OUTPUT_PATH), 'unified-entity-lookup.json');
    const lookup: Record<string, string> = {};
    for (const e of entities) {
      lookup[e.normalizedName] = e.id;
    }
    await fs.writeFile(lookupPath, JSON.stringify(lookup, null, 2));
    console.log(`💾 Saved lookup table to ${lookupPath}`);
    
    // Export stats
    const statsPath = path.join(path.dirname(OUTPUT_PATH), 'unified-stats.json');
    const stats = {
      totalEntities: entities.length,
      blackBookOnly: entities.filter(e => e.sources.blackBook && !e.sources.flightLogs && !e.sources.dojDocs).length,
      flightLogsOnly: entities.filter(e => !e.sources.blackBook && e.sources.flightLogs && !e.sources.dojDocs).length,
      dojDocsOnly: entities.filter(e => !e.sources.blackBook && !e.sources.flightLogs && e.sources.dojDocs).length,
      multiSource: entities.filter(e => Object.values(e.sources).filter(Boolean).length >= 2).length,
      tripleSource: entities.filter(e => e.sources.blackBook && e.sources.flightLogs && e.sources.dojDocs).length,
      circledContacts: entities.filter(e => e.blackBookCircled).length,
      topFlyers: entities.filter(e => e.flightCount >= 10).length,
    };
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    console.log(`💾 Saved statistics to ${statsPath}`);
    
  } catch (error) {
    console.error('❌ Error building unified index:', error);
    process.exit(1);
  }
}

main();
