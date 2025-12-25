// Free web search using multiple fallback methods

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchWeb(query: string, maxResults = 5): Promise<SearchResult[]> {
  console.log(`[WEB-SEARCH] Searching for: ${query}`);
  
  // Try Wikipedia API first (most reliable, free, no auth)
  const wikiResults = await searchWikipedia(query, maxResults);
  if (wikiResults.length > 0) {
    console.log(`[WEB-SEARCH] Wikipedia returned ${wikiResults.length} results`);
    return wikiResults;
  }
  
  // Fallback to DuckDuckGo Instant Answer API
  const ddgResults = await searchDuckDuckGoAPI(query, maxResults);
  if (ddgResults.length > 0) {
    console.log(`[WEB-SEARCH] DuckDuckGo API returned ${ddgResults.length} results`);
    return ddgResults;
  }
  
  console.log('[WEB-SEARCH] No results from any source');
  return [];
}

// Wikipedia API - very reliable, free, no rate limits
async function searchWikipedia(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&format=json&origin=*&srlimit=${maxResults}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      console.error('[WIKI] API returned:', response.status);
      return [];
    }
    
    const data = await response.json();
    const searchResults = data.query?.search || [];
    
    return searchResults.map((item: { title: string; snippet: string; pageid: number }) => ({
      title: item.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      snippet: item.snippet.replace(/<[^>]*>/g, ''), // Strip HTML tags
    }));
  } catch (error) {
    console.error('[WIKI] Error:', error);
    return [];
  }
}

// DuckDuckGo Instant Answer API - free, no auth needed
async function searchDuckDuckGoAPI(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      console.error('[DDG-API] returned:', response.status);
      return [];
    }
    
    const data = await response.json();
    const results: SearchResult[] = [];
    
    // Abstract (main result)
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.Abstract,
      });
    }
    
    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 50),
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }
    
    // Results section
    if (data.Results) {
      for (const result of data.Results.slice(0, maxResults - results.length)) {
        if (result.Text && result.FirstURL) {
          results.push({
            title: result.Text.split(' - ')[0] || result.Text.substring(0, 50),
            url: result.FirstURL,
            snippet: result.Text,
          });
        }
      }
    }
    
    return results.slice(0, maxResults);
  } catch (error) {
    console.error('[DDG-API] Error:', error);
    return [];
  }
}

// Utility function for HTML entity decoding (kept for potential future use)
export function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Format search results for AI context
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return 'No web results found.';
  
  return results.map((r, i) => 
    `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
  ).join('\n\n');
}

// =============================================================================
// ENTITY ENRICHMENT - Fetch public knowledge about known entities
// =============================================================================

export interface EntityEnrichment {
  name: string;
  summary: string;
  occupation?: string;
  knownFor?: string[];
  relatedPeople?: string[];
  locations?: string[];
  source: string;
  sourceUrl: string;
}

// Fetch Wikipedia summary for a person/entity
export async function fetchWikipediaSummary(entityName: string): Promise<EntityEnrichment | null> {
  try {
    // Use Wikipedia REST API for page summary
    const encodedName = encodeURIComponent(entityName.replace(/ /g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedName}`;
    
    const response = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'EpsteinExposed/1.0 (research tool)'
      },
    });
    
    if (!response.ok) {
      // Try search if direct page not found
      return await searchAndFetchWikipedia(entityName);
    }
    
    const data = await response.json();
    
    if (data.type === 'disambiguation') {
      // Handle disambiguation pages
      return await searchAndFetchWikipedia(entityName + ' person');
    }
    
    return {
      name: data.title || entityName,
      summary: data.extract || 'No summary available.',
      occupation: extractOccupation(data.description || ''),
      knownFor: extractKnownFor(data.extract || ''),
      source: 'Wikipedia',
      sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodedName}`,
    };
  } catch (error) {
    console.error('[WIKI-ENRICH] Error:', error);
    return null;
  }
}

// Search Wikipedia and fetch the best match
async function searchAndFetchWikipedia(query: string): Promise<EntityEnrichment | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) return null;
    
    // Fetch summary for the found page
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title.replace(/ /g, '_'))}`;
    const summaryResponse = await fetch(summaryUrl);
    
    if (!summaryResponse.ok) return null;
    
    const data = await summaryResponse.json();
    
    return {
      name: data.title || query,
      summary: data.extract || firstResult.snippet?.replace(/<[^>]*>/g, '') || 'No summary available.',
      occupation: extractOccupation(data.description || ''),
      knownFor: extractKnownFor(data.extract || ''),
      source: 'Wikipedia',
      sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(firstResult.title.replace(/ /g, '_'))}`,
    };
  } catch (error) {
    console.error('[WIKI-SEARCH-ENRICH] Error:', error);
    return null;
  }
}

// Extract occupation from Wikipedia description
function extractOccupation(description: string): string | undefined {
  if (!description) return undefined;
  // Wikipedia descriptions are usually "American businessman" or "British socialite"
  return description;
}

// Extract key facts from summary
function extractKnownFor(summary: string): string[] {
  const knownFor: string[] = [];
  
  // Look for common patterns
  if (summary.toLowerCase().includes('epstein')) knownFor.push('Connection to Jeffrey Epstein');
  if (summary.toLowerCase().includes('maxwell')) knownFor.push('Connection to Ghislaine Maxwell');
  if (summary.toLowerCase().includes('convicted')) knownFor.push('Criminal conviction');
  if (summary.toLowerCase().includes('charged')) knownFor.push('Criminal charges');
  if (summary.toLowerCase().includes('trafficking')) knownFor.push('Trafficking allegations');
  if (summary.toLowerCase().includes('financier')) knownFor.push('Financier');
  if (summary.toLowerCase().includes('philanthropist')) knownFor.push('Philanthropist');
  if (summary.toLowerCase().includes('politician')) knownFor.push('Politician');
  if (summary.toLowerCase().includes('billionaire')) knownFor.push('Billionaire');
  
  return knownFor;
}

// Batch enrich multiple entities
export async function enrichEntities(entityNames: string[]): Promise<Map<string, EntityEnrichment>> {
  const enrichments = new Map<string, EntityEnrichment>();
  
  // Limit concurrent requests
  const batchSize = 3;
  for (let i = 0; i < entityNames.length; i += batchSize) {
    const batch = entityNames.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(name => fetchWikipediaSummary(name))
    );
    
    batch.forEach((name, idx) => {
      if (results[idx]) {
        enrichments.set(name, results[idx]!);
      }
    });
  }
  
  return enrichments;
}

// Known high-profile individuals in the Epstein case (pre-cached context)
export const KNOWN_FIGURES: Record<string, string> = {
  'Jeffrey Epstein': 'American financier and convicted sex offender who died in prison in 2019. Operated a sex trafficking ring involving minors.',
  'Ghislaine Maxwell': 'British socialite convicted in 2021 of sex trafficking and conspiracy. Longtime associate of Jeffrey Epstein.',
  'Virginia Giuffre': 'American activist and Epstein accuser who filed multiple lawsuits against Epstein associates.',
  'Prince Andrew': 'Member of the British Royal Family who settled a civil lawsuit brought by Virginia Giuffre.',
  'Bill Clinton': '42nd President of the United States. Flight logs show multiple trips on Epstein\'s aircraft.',
  'Donald Trump': '45th President of the United States. Known acquaintance of Epstein in the 1990s-2000s.',
  'Alan Dershowitz': 'American lawyer who represented Epstein and was accused by Virginia Giuffre.',
  'Leslie Wexner': 'Billionaire businessman, founder of L Brands. Epstein managed his finances.',
  'Jean-Luc Brunel': 'French modeling agent accused of procuring girls for Epstein. Died in prison in 2022.',
  'Sarah Kellen': 'Former Epstein assistant named in court documents as alleged co-conspirator.',
  'Nadia Marcinkova': 'Named in court documents as Epstein associate.',
  'Palm Beach': 'Location of Epstein\'s Florida mansion where many alleged crimes occurred.',
  'Little St. James': 'Private island in the U.S. Virgin Islands owned by Epstein, nicknamed "Pedophile Island".',
  'Zorro Ranch': 'Epstein\'s 10,000-acre New Mexico ranch, site of alleged abuse.',
};

// Get pre-cached context for known figures
export function getKnownFigureContext(name: string): string | null {
  // Check exact match
  if (KNOWN_FIGURES[name]) return KNOWN_FIGURES[name];
  
  // Check partial match
  for (const [key, value] of Object.entries(KNOWN_FIGURES)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
      return value;
    }
  }
  
  return null;
}

// =============================================================================
// PATTERN RECOGNITION - Detect suspicious patterns in connections
// =============================================================================

export interface PatternAnalysis {
  patterns: string[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  flags: string[];
  timeline: string[];
}

export function analyzeConnectionPatterns(
  connections: Array<{ entityA: string; entityB: string; strength: number; type?: string }>,
  entityName: string
): PatternAnalysis {
  const patterns: string[] = [];
  const flags: string[] = [];
  const timeline: string[] = [];
  let riskScore = 0;

  // Count connection types
  const connectionTypes = new Map<string, number>();
  const connectedEntities = new Set<string>();
  
  for (const conn of connections) {
    const otherEntity = conn.entityA === entityName ? conn.entityB : conn.entityA;
    connectedEntities.add(otherEntity);
    
    const type = conn.type || 'unknown';
    connectionTypes.set(type, (connectionTypes.get(type) || 0) + 1);
    
    // High-strength connections are significant
    if (conn.strength > 500) {
      patterns.push(`Strong connection to ${otherEntity} (strength: ${conn.strength})`);
      riskScore += 2;
    }
  }

  // Pattern: Multiple high-profile connections
  const highProfileConnections = Array.from(connectedEntities).filter(e => 
    Object.keys(KNOWN_FIGURES).some(k => e.toLowerCase().includes(k.toLowerCase()))
  );
  if (highProfileConnections.length >= 3) {
    patterns.push(`Connected to ${highProfileConnections.length} high-profile individuals`);
    flags.push('MULTIPLE_HIGH_PROFILE_CONNECTIONS');
    riskScore += 5;
  }

  // Pattern: Flight log appearances
  if (connections.some(c => c.type === 'flight' || c.entityA?.includes('Flight') || c.entityB?.includes('Flight'))) {
    patterns.push('Appears in flight log records');
    flags.push('FLIGHT_LOG_PRESENCE');
    riskScore += 3;
  }

  // Pattern: Location-based clustering
  const locationConnections = connections.filter(c => 
    c.type === 'location' || 
    ['Palm Beach', 'Little St. James', 'Zorro Ranch', 'New York', 'Virgin Islands'].some(loc =>
      c.entityA?.includes(loc) || c.entityB?.includes(loc)
    )
  );
  if (locationConnections.length >= 2) {
    patterns.push(`Connected to ${locationConnections.length} key Epstein locations`);
    flags.push('KEY_LOCATION_CONNECTIONS');
    riskScore += 4;
  }

  // Determine risk level
  let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (riskScore >= 10) riskLevel = 'HIGH';
  else if (riskScore >= 5) riskLevel = 'MEDIUM';

  return { patterns, riskLevel, flags, timeline };
}

// =============================================================================
// ENTITY TYPE-SPECIFIC INTELLIGENCE TEMPLATES
// =============================================================================

export interface EntityTypeIntelligence {
  type: string;
  investigationFocus: string[];
  keyQuestions: string[];
  relevantConnections: string[];
  documentTypes: string[];
}

export const ENTITY_TYPE_TEMPLATES: Record<string, EntityTypeIntelligence> = {
  person: {
    type: 'person',
    investigationFocus: [
      'Role in Epstein network (victim, associate, enabler, witness)',
      'Frequency and nature of interactions with Epstein/Maxwell',
      'Presence in flight logs, black book, or court documents',
      'Legal status (accused, convicted, settled, cleared)',
      'Public statements or denials made'
    ],
    keyQuestions: [
      'What was their relationship to Jeffrey Epstein?',
      'Are they mentioned in flight logs? How many times?',
      'Do they appear in the Black Book?',
      'Were they named in any legal proceedings?',
      'What locations connect them to the network?'
    ],
    relevantConnections: ['Ghislaine Maxwell', 'Jeffrey Epstein', 'Virginia Giuffre', 'flight logs', 'victims'],
    documentTypes: ['Court filings', 'Depositions', 'Flight logs', 'Black Book', 'FBI documents']
  },
  location: {
    type: 'location',
    investigationFocus: [
      'Events that occurred at this location',
      'Who visited and when',
      'Crimes alleged to have occurred here',
      'Property ownership and access'
    ],
    keyQuestions: [
      'What alleged crimes occurred here?',
      'Who had access to this location?',
      'What time period was this location active?',
      'Are there witness statements about this place?'
    ],
    relevantConnections: ['visitors', 'staff', 'victims', 'witnesses'],
    documentTypes: ['Property records', 'Witness statements', 'Court documents']
  },
  organization: {
    type: 'organization',
    investigationFocus: [
      'Connection to Epstein financial network',
      'Role in facilitating activities',
      'Key personnel involved',
      'Legal exposure'
    ],
    keyQuestions: [
      'What was this organization\'s connection to Epstein?',
      'Who were the key personnel?',
      'Did they face legal consequences?',
      'What financial connections existed?'
    ],
    relevantConnections: ['executives', 'board members', 'financial records'],
    documentTypes: ['Corporate filings', 'Financial records', 'Court documents']
  },
  flight: {
    type: 'flight',
    investigationFocus: [
      'Passenger manifest',
      'Origin and destination',
      'Date and frequency',
      'Connection to key locations'
    ],
    keyQuestions: [
      'Who was on this flight?',
      'Where did it go?',
      'Was it to a known Epstein property?',
      'How many times did certain passengers fly?'
    ],
    relevantConnections: ['passengers', 'pilots', 'destinations'],
    documentTypes: ['Flight logs', 'FAA records', 'Witness statements']
  }
};

export function getEntityTypeIntelligence(type: string): EntityTypeIntelligence {
  const template = ENTITY_TYPE_TEMPLATES[type.toLowerCase()];
  return template || ENTITY_TYPE_TEMPLATES['person'] as EntityTypeIntelligence;
}

// =============================================================================
// TIMELINE ANALYSIS - Build chronological narratives
// =============================================================================

export interface TimelineEvent {
  date: string;
  description: string;
  entities: string[];
  source: string;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Key dates in the Epstein case for context
export const KEY_TIMELINE_EVENTS: TimelineEvent[] = [
  { date: '2005', description: 'Palm Beach police begin investigation', entities: ['Jeffrey Epstein', 'Palm Beach'], source: 'Court records', significance: 'HIGH' },
  { date: '2006', description: 'FBI begins federal investigation', entities: ['Jeffrey Epstein', 'FBI'], source: 'DOJ documents', significance: 'HIGH' },
  { date: '2007', description: 'Non-prosecution agreement signed', entities: ['Jeffrey Epstein', 'Alexander Acosta'], source: 'Court records', significance: 'HIGH' },
  { date: '2008', description: 'Epstein pleads guilty to state charges, serves 13 months', entities: ['Jeffrey Epstein', 'Florida'], source: 'Court records', significance: 'HIGH' },
  { date: '2015', description: 'Virginia Giuffre files defamation suit against Maxwell', entities: ['Virginia Giuffre', 'Ghislaine Maxwell'], source: 'Court filings', significance: 'HIGH' },
  { date: '2019-07', description: 'Epstein arrested on federal sex trafficking charges', entities: ['Jeffrey Epstein', 'SDNY'], source: 'DOJ', significance: 'HIGH' },
  { date: '2019-08-10', description: 'Epstein found dead in Manhattan jail cell', entities: ['Jeffrey Epstein', 'MCC New York'], source: 'News reports', significance: 'HIGH' },
  { date: '2020-07', description: 'Ghislaine Maxwell arrested in New Hampshire', entities: ['Ghislaine Maxwell', 'FBI'], source: 'DOJ', significance: 'HIGH' },
  { date: '2021-12', description: 'Maxwell convicted on 5 of 6 counts', entities: ['Ghislaine Maxwell'], source: 'Court records', significance: 'HIGH' },
  { date: '2022-06', description: 'Maxwell sentenced to 20 years in prison', entities: ['Ghislaine Maxwell'], source: 'Court records', significance: 'HIGH' },
];

export function getRelevantTimelineEvents(entityName: string): TimelineEvent[] {
  return KEY_TIMELINE_EVENTS.filter(event => 
    event.entities.some(e => 
      e.toLowerCase().includes(entityName.toLowerCase()) || 
      entityName.toLowerCase().includes(e.toLowerCase())
    )
  );
}

export function buildTimelineContext(entityName: string): string {
  const events = getRelevantTimelineEvents(entityName);
  if (events.length === 0) return '';
  
  return `\n\nKEY TIMELINE EVENTS for ${entityName}:\n${events.map(e => 
    `• ${e.date}: ${e.description} [${e.source}]`
  ).join('\n')}`;
}

// =============================================================================
// INVESTIGATION DEPTH SCORING
// =============================================================================

export interface InvestigationDepth {
  documentMentions: number;
  connectionStrength: number;
  sourceVariety: number;
  legalExposure: number;
  overallScore: number;
  tier: 'CENTRAL_FIGURE' | 'KEY_ASSOCIATE' | 'PERIPHERAL' | 'MINOR_MENTION';
}

export function calculateInvestigationDepth(
  documentCount: number,
  connectionCount: number,
  connectionStrength: number,
  inBlackBook: boolean,
  inFlightLogs: boolean,
  inCourtDocs: boolean
): InvestigationDepth {
  let sourceVariety = 0;
  if (inBlackBook) sourceVariety += 30;
  if (inFlightLogs) sourceVariety += 40;
  if (inCourtDocs) sourceVariety += 30;
  
  const documentScore = Math.min(documentCount / 10, 100);
  const connectionScore = Math.min(connectionCount / 5, 100);
  const strengthScore = Math.min(connectionStrength / 10, 100);
  
  const overallScore = (documentScore * 0.3) + (connectionScore * 0.2) + (strengthScore * 0.2) + (sourceVariety * 0.3);
  
  let tier: InvestigationDepth['tier'] = 'MINOR_MENTION';
  if (overallScore >= 80) tier = 'CENTRAL_FIGURE';
  else if (overallScore >= 50) tier = 'KEY_ASSOCIATE';
  else if (overallScore >= 20) tier = 'PERIPHERAL';
  
  return {
    documentMentions: documentCount,
    connectionStrength,
    sourceVariety,
    legalExposure: inCourtDocs ? 100 : 0,
    overallScore,
    tier
  };
}
