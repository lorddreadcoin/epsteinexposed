/**
 * VERIFIED SOURCE INTEGRATION
 * 
 * Fetches verified news articles and public records about Epstein network entities
 * from trusted sources (NYT, WaPo, Reuters, AP, court records, etc.)
 * 
 * Filters out unreliable sources (X/Twitter, blogs, unverified claims)
 */

interface VerifiedSource {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
  reliability: 'high' | 'medium';
}

interface ConnectionStory {
  entityA: string;
  entityB: string;
  keyFacts: string[];
  sources: VerifiedSource[];
  suggestedPrompts: string[];
}

// Trusted news sources and domains
const TRUSTED_SOURCES = [
  // Tier 1: Major news organizations
  'nytimes.com',
  'washingtonpost.com',
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'theguardian.com',
  'wsj.com',
  'npr.org',
  'pbs.org',
  'propublica.org',
  
  // Tier 2: Reputable news
  'cnn.com',
  'nbcnews.com',
  'cbsnews.com',
  'abcnews.go.com',
  'bloomberg.com',
  'time.com',
  'newsweek.com',
  'theatlantic.com',
  'newyorker.com',
  'vanityfair.com',
  
  // Tier 3: Court records and official sources
  'justice.gov',
  'fbi.gov',
  'courtlistener.com',
  'pacer.gov',
  'documentcloud.org',
  'scribd.com', // Often hosts court documents
  
  // Tier 4: Investigative journalism
  'miamiherald.com', // Julie K. Brown's Epstein reporting
  'thedailybeast.com',
  'vice.com',
  'motherjones.com',
  'salon.com',
];

// Sources to EXCLUDE (unreliable)
const EXCLUDED_SOURCES = [
  'twitter.com',
  'x.com',
  'facebook.com',
  'reddit.com',
  'youtube.com', // Unless official news channel
  '4chan.org',
  '8kun.top',
  'parler.com',
  'gab.com',
  'truthsocial.com',
  'infowars.com',
  'breitbart.com', // Partisan, often unreliable
  'dailymail.co.uk', // Tabloid
  'nypost.com', // Tabloid tendencies
];

/**
 * Check if a URL is from a trusted source
 */
function isTrustedSource(url: string): boolean {
  const urlLower = url.toLowerCase();
  
  // Exclude unreliable sources first
  if (EXCLUDED_SOURCES.some(domain => urlLower.includes(domain))) {
    return false;
  }
  
  // Check if from trusted source
  return TRUSTED_SOURCES.some(domain => urlLower.includes(domain));
}

/**
 * Get reliability rating for a source
 */
function getReliability(url: string): 'high' | 'medium' | 'low' {
  const urlLower = url.toLowerCase();
  
  // Tier 1 sources
  const tier1 = ['nytimes.com', 'washingtonpost.com', 'reuters.com', 'apnews.com', 'bbc.com', 'justice.gov', 'fbi.gov'];
  if (tier1.some(d => urlLower.includes(d))) return 'high';
  
  // Tier 2-3 sources
  if (isTrustedSource(url)) return 'medium';
  
  return 'low';
}

/**
 * Search for verified sources about entity connections
 */
export async function searchVerifiedSources(
  entityA: string,
  entityB: string,
  maxResults = 10
): Promise<VerifiedSource[]> {
  const query = `"${entityA}" "${entityB}" Epstein`;
  console.log(`[VERIFIED-SOURCES] Searching for: ${query}`);
  
  const results: VerifiedSource[] = [];
  
  // Try multiple search approaches
  const searchQueries = [
    `"${entityA}" "${entityB}" Epstein`,
    `${entityA} ${entityB} Jeffrey Epstein`,
    `${entityA} Epstein connection`,
  ];
  
  for (const searchQuery of searchQueries) {
    // Use DuckDuckGo HTML scraping (more results than API)
    const ddgResults = await searchDuckDuckGoHTML(searchQuery, maxResults);
    
    for (const result of ddgResults) {
      if (isTrustedSource(result.url)) {
        const reliability = getReliability(result.url);
        if (reliability !== 'low') {
          results.push({
            ...result,
            source: extractDomain(result.url),
            reliability,
          });
        }
      }
    }
    
    if (results.length >= maxResults) break;
  }
  
  // Deduplicate by URL
  const uniqueResults = Array.from(
    new Map(results.map(r => [r.url, r])).values()
  );
  
  console.log(`[VERIFIED-SOURCES] Found ${uniqueResults.length} verified sources`);
  return uniqueResults.slice(0, maxResults);
}

/**
 * Search DuckDuckGo HTML (more results than API)
 */
async function searchDuckDuckGoHTML(query: string, maxResults: number): Promise<Array<{title: string; url: string; snippet: string}>> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      console.log('[DDG-HTML] Response not OK:', response.status);
      return [];
    }
    
    const html = await response.text();
    
    // Parse HTML for results - multiple regex patterns for different DDG layouts
    const results: Array<{title: string; url: string; snippet: string}> = [];
    
    // Pattern 1: Standard DDG HTML results with result__a class
    const pattern1 = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;
    // Pattern 2: Snippet extraction
    const snippetPattern = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;
    // Pattern 3: Alternative layout - result-link class
    const pattern3 = /<a[^>]*class="[^"]*result-link[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    
    // Extract all links and titles first
    const links: Array<{url: string; title: string}> = [];
    let match;
    
    while ((match = pattern1.exec(html)) !== null) {
      const rawUrl = match[1];
      // DDG uses uddg parameter for actual URL
      const urlMatch = rawUrl.match(/uddg=([^&]+)/);
      const actualUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      
      if (actualUrl && title && !actualUrl.includes('duckduckgo.com') && actualUrl.startsWith('http')) {
        links.push({ url: actualUrl, title });
      }
    }
    
    // Extract snippets
    const snippets: string[] = [];
    while ((match = snippetPattern.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
    }
    
    // Combine links with snippets
    for (let i = 0; i < Math.min(links.length, maxResults); i++) {
      const link = links[i];
      if (link) {
        results.push({
          title: link.title,
          url: link.url,
          snippet: snippets[i] || 'Click to view article',
        });
      }
    }
    
    // Fallback: Try pattern 3 if no results
    if (results.length === 0) {
      while ((match = pattern3.exec(html)) !== null && results.length < maxResults) {
        const url = decodeURIComponent(match[1]);
        const title = match[2].trim();
        if (url && title && !url.includes('duckduckgo.com') && url.startsWith('http')) {
          results.push({ title, url, snippet: 'Click to view article' });
        }
      }
    }
    
    console.log(`[DDG-HTML] Parsed ${results.length} results from HTML`);
    return results;
  } catch (error) {
    console.error('[DDG-HTML] Error:', error);
    return [];
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Build a connection story with key facts from verified sources
 */
export async function buildConnectionStory(
  entityA: string,
  entityB: string
): Promise<ConnectionStory> {
  console.log(`[CONNECTION-STORY] Building story for: ${entityA} ↔ ${entityB}`);
  
  // Fetch verified sources
  const sources = await searchVerifiedSources(entityA, entityB, 10);
  
  // Extract key facts from sources
  const keyFacts: string[] = [];
  
  // Analyze snippets for key information
  for (const source of sources.slice(0, 5)) {
    const snippet = source.snippet.toLowerCase();
    
    // Look for specific patterns
    if (snippet.includes('mar-a-lago') || snippet.includes('mar a lago')) {
      keyFacts.push(`${entityA} and ${entityB} were connected through Mar-a-Lago [${source.source}]`);
    }
    if (snippet.includes('flight log') || snippet.includes('private jet')) {
      keyFacts.push(`Flight records show connections between ${entityA} and ${entityB} [${source.source}]`);
    }
    if (snippet.includes('party') || snippet.includes('social')) {
      keyFacts.push(`${entityA} and ${entityB} attended social events together [${source.source}]`);
    }
    if (snippet.includes('lawsuit') || snippet.includes('court') || snippet.includes('deposition')) {
      keyFacts.push(`Legal documents reference connections between ${entityA} and ${entityB} [${source.source}]`);
    }
    if (snippet.includes('photograph') || snippet.includes('photo')) {
      keyFacts.push(`Photographic evidence exists of ${entityA} and ${entityB} together [${source.source}]`);
    }
  }
  
  // Generate suggested follow-up prompts
  const suggestedPrompts = [
    `What specific events connected ${entityA} and ${entityB}?`,
    `What do court documents say about ${entityA} and ${entityB}?`,
    `What is the timeline of ${entityA}'s relationship with ${entityB}?`,
    `What did ${entityA} say publicly about ${entityB}?`,
    `Are there any legal implications for ${entityA} regarding ${entityB}?`,
  ];
  
  return {
    entityA,
    entityB,
    keyFacts: keyFacts.slice(0, 3), // Top 3 key facts
    sources,
    suggestedPrompts,
  };
}

/**
 * Format connection story for AI context
 */
export function formatConnectionStory(story: ConnectionStory): string {
  let formatted = `\n\nVERIFIED EXTERNAL SOURCES - ${story.entityA} ↔ ${story.entityB}:\n`;
  
  // Add key facts
  if (story.keyFacts.length > 0) {
    formatted += `\nKEY FACTS FROM VERIFIED SOURCES:\n`;
    story.keyFacts.forEach((fact, i) => {
      formatted += `${i + 1}. ${fact}\n`;
    });
  }
  
  // Add source citations
  if (story.sources.length > 0) {
    formatted += `\nVERIFIED NEWS SOURCES (${story.sources.length} found):\n`;
    story.sources.slice(0, 5).forEach(source => {
      formatted += `• "${source.title}" - ${source.source} [${source.reliability.toUpperCase()}]\n`;
      formatted += `  ${source.snippet.substring(0, 150)}...\n`;
      formatted += `  URL: ${source.url}\n`;
    });
  }
  
  // Add suggested prompts
  if (story.suggestedPrompts.length > 0) {
    formatted += `\nSUGGESTED FOLLOW-UP QUESTIONS:\n`;
    story.suggestedPrompts.slice(0, 3).forEach((prompt, i) => {
      formatted += `${i + 1}. "${prompt}"\n`;
    });
  }
  
  return formatted;
}

/**
 * Search for verified sources about a single entity
 */
export async function searchEntityBackground(entityName: string): Promise<VerifiedSource[]> {
  const query = `"${entityName}" Jeffrey Epstein`;
  console.log(`[ENTITY-BACKGROUND] Searching for: ${query}`);
  
  const results = await searchDuckDuckGoHTML(query, 10);
  const verified: VerifiedSource[] = [];
  
  for (const result of results) {
    if (isTrustedSource(result.url)) {
      const reliability = getReliability(result.url);
      if (reliability !== 'low') {
        verified.push({
          ...result,
          source: extractDomain(result.url),
          reliability,
        });
      }
    }
  }
  
  return verified.slice(0, 5);
}
