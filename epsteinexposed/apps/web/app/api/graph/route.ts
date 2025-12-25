import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeLimit = Math.min(parseInt(searchParams.get('nodeLimit') || '500'), 1000);
    const edgeLimit = Math.min(parseInt(searchParams.get('connectionLimit') || '1000'), 3000);

    console.log('[GRAPH] Fetching nodeLimit:', nodeLimit, 'edgeLimit:', edgeLimit);

    // STRATEGY: Get top CONNECTIONS first, then get the entities involved
    // This guarantees we show entities that are actually connected
    
    const { data: topConnections, error: connError } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength')
      .order('strength', { ascending: false })
      .limit(edgeLimit);

    if (connError) {
      console.error('[GRAPH] Connection error:', connError);
      return NextResponse.json({ nodes: [], edges: [], error: connError.message });
    }

    if (!topConnections || topConnections.length === 0) {
      console.error('[GRAPH] No connections found');
      return NextResponse.json({ nodes: [], edges: [], error: 'No connections' });
    }

    console.log('[GRAPH] Got', topConnections.length, 'connections');

    // Extract unique entity IDs from connections
    const entityIdSet = new Set<string>();
    for (const conn of topConnections) {
      entityIdSet.add(conn.entity_a_id);
      entityIdSet.add(conn.entity_b_id);
    }
    
    // Limit to nodeLimit
    const entityIds = Array.from(entityIdSet).slice(0, nodeLimit);
    console.log('[GRAPH] Unique entities in connections:', entityIds.length);

    // Fetch entity details
    const { data: entities, error: entityError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count')
      .in('id', entityIds);

    if (entityError) {
      console.error('[GRAPH] Entity fetch error:', entityError);
      return NextResponse.json({ nodes: [], edges: [], error: entityError.message });
    }

    console.log('[GRAPH] Fetched', entities?.length, 'entity details');

    // Create entity map for quick lookup
    const entityMap = new Map((entities || []).map(e => [e.id, e]));

    // Filter connections to only those where we have entity details
    const validConnections = topConnections.filter(c => 
      entityMap.has(c.entity_a_id) && entityMap.has(c.entity_b_id)
    );

    console.log('[GRAPH] Valid connections:', validConnections.length);

    // Format response
    const nodes = Array.from(entityMap.values()).map(e => ({
      id: e.id,
      name: e.name || 'Unknown',
      label: e.name || 'Unknown',
      type: e.type || 'other',
      documentCount: e.document_count || 0,
      connectionCount: e.connection_count || 0,
      connections: e.connection_count || 0,
    }));

    const edges = validConnections.map(c => ({
      source: c.entity_a_id,
      target: c.entity_b_id,
      from: c.entity_a_id,
      to: c.entity_b_id,
      weight: c.strength || 1,
      strength: c.strength || 1,
    }));

    console.log('[GRAPH] Final:', nodes.length, 'nodes,', edges.length, 'edges');

    return NextResponse.json({
      nodes,
      edges,
      result: { data: { nodes, edges } },
      meta: {
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GRAPH] Error:', errorMessage);
    return NextResponse.json({ nodes: [], edges: [], error: errorMessage }, { status: 500 });
  }
}
