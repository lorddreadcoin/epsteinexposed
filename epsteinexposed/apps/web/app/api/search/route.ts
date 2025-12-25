import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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

    // Format results to match expected structure
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
      occurrences: item.document_count || 0,
      documentIds: item.document_count > 0 ? [item.id] : [], // Use entity ID as document reference
    }));

    return NextResponse.json({ result: { data: results } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SEARCH] API Error:', errorMessage);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
