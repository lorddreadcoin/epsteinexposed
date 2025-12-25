import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIP, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  // Rate limiting
  const ip = getClientIP(req.headers);
  const rateLimit = checkRateLimit(`search:${ip}`, RATE_LIMITS.search);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  
  if (!query || query.length < 2) {
    return NextResponse.json({ result: { data: [] } });
  }

  try {
    // Use the search_entities function from Supabase
    const { data, error } = await supabase
      .rpc('search_entities', { 
        search_term: query, 
        limit_count: limit 
      });

    if (error) {
      console.error('[SEARCH] Error:', error);
      throw error;
    }

    // Use document_count and connection_count DIRECTLY from entities table
    // These are the authoritative counts - no need to query entity_mentions
    const results = (data || []).map((item: {
      id: string;
      name: string;
      type: string;
      document_count: number;
      connection_count: number;
    }) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      // Use the REAL counts from entities table
      occurrences: item.document_count || 0,
      documentCount: item.document_count || 0,
      connectionCount: item.connection_count || 0,
      documentIds: [], // We'll fetch specific docs when needed
    }));

    console.log('[SEARCH] Returning', results.length, 'results for:', query);
    if (results.length > 0) {
      console.log('[SEARCH] Top result:', results[0].name, 'docs:', results[0].documentCount, 'connections:', results[0].connectionCount);
    }

    return NextResponse.json({ result: { data: results } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SEARCH] API Error:', errorMessage);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
