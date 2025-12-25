// Free web search using DuckDuckGo HTML scraping (no API key needed)

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchWeb(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    // Use DuckDuckGo HTML search (free, no API key)
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
      console.error('[WEB-SEARCH] DuckDuckGo returned:', response.status);
      return [];
    }

    const html = await response.text();
    
    // Parse results from HTML
    const results: SearchResult[] = [];
    
    // Match result blocks - DuckDuckGo HTML format
    const resultRegex = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)<\/a>/g;
    
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const [, url, title, snippet] = match;
      if (url && title) {
        results.push({
          title: decodeHTMLEntities(title.trim()),
          url: decodeURIComponent(url),
          snippet: decodeHTMLEntities(snippet?.trim() || ''),
        });
      }
    }
    
    // Fallback: try alternate parsing if no results
    if (results.length === 0) {
      const altRegex = /<a[^>]*class="[^"]*result__url[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([^<]+)<\/a>/g;
      while ((match = altRegex.exec(html)) !== null && results.length < maxResults) {
        const [, url, title] = match;
        if (url && title) {
          results.push({
            title: decodeHTMLEntities(title.trim()),
            url: decodeURIComponent(url),
            snippet: '',
          });
        }
      }
    }

    console.log(`[WEB-SEARCH] Found ${results.length} results for: ${query}`);
    return results;
    
  } catch (error) {
    console.error('[WEB-SEARCH] Error:', error);
    return [];
  }
}

function decodeHTMLEntities(text: string): string {
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
