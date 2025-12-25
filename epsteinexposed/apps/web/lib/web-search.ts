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
