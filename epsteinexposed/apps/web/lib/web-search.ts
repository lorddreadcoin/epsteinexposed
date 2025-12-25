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
