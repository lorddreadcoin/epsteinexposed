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

    // Query entity_mentions to get ACTUAL document count per entity
    const entityIds = (data || []).map((item: { id: string }) => item.id);
    
    // Get actual document counts from entity_mentions table
    const documentCountsPromises = entityIds.map(async (entityId) => {
      const { data: mentions, error: mentionsError } = await supabase
        .from('entity_mentions')
        .select('document_id', { count: 'exact', head: false })
        .eq('entity_id', entityId);
      
      if (mentionsError || !mentions) return { entityId, count: 0, docIds: [] };
      
      // Get unique document IDs
      const uniqueDocIds = [...new Set(mentions.map(m => m.document_id))];
      return { entityId, count: uniqueDocIds.length, docIds: uniqueDocIds };
    });
    
    const documentCounts = await Promise.all(documentCountsPromises);
    const docCountMap = new Map(documentCounts.map(dc => [dc.entityId, { count: dc.count, docIds: dc.docIds }]));
    
    // Format results with ACTUAL document counts from entity_mentions
    const results = (data || []).map((item: {
      id: string;
      name: string;
      type: string;
      document_count: number;
      connection_count: number;
    }) => {
      const actualDocData = docCountMap.get(item.id) || { count: 0, docIds: [] };
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        occurrences: actualDocData.count, // Use ACTUAL count from entity_mentions
        documentIds: actualDocData.docIds.slice(0, 10), // Provide actual document IDs
      };
    });

    return NextResponse.json({ result: { data: results } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SEARCH] API Error:', errorMessage);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
