import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const nodeLimit = Math.min(parseInt(searchParams.get('nodeLimit') || '500'), 1000);
    const connectionLimit = parseInt(searchParams.get('connectionLimit') || '2000');

    console.log('[GRAPH] Starting with nodeLimit:', nodeLimit, 'connectionLimit:', connectionLimit);

    // STEP 1: Get top entities by connection count (simple query)
    const { data: entities, error: entityError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count')
      .order('connection_count', { ascending: false })
      .limit(nodeLimit);

    if (entityError) {
      console.error('[GRAPH] Entity query error:', entityError);
      return NextResponse.json({ 
        nodes: [], 
        edges: [], 
        error: `Entity query failed: ${entityError.message}` 
      });
    }

    if (!entities || entities.length === 0) {
      console.error('[GRAPH] No entities found in database');
      return NextResponse.json({ 
        nodes: [], 
        edges: [], 
        error: 'No entities in database' 
      });
    }

    console.log('[GRAPH] Loaded', entities.length, 'entities');

    const entityIds = entities.map(e => e.id);
    const entityIdSet = new Set(entityIds);

    // STEP 2: Get connections - simple approach
    let connections: Array<{ entity_a_id: string; entity_b_id: string; strength: number }> = [];
    
    const { data: connData, error: connError } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength')
      .order('strength', { ascending: false })
      .limit(connectionLimit);

    if (connError) {
      console.error('[GRAPH] Connection query error:', connError);
      // Continue without connections rather than failing
    } else {
      connections = connData || [];
    }

    console.log('[GRAPH] Raw connections from DB:', connections.length);

    // STEP 3: Filter to connections where BOTH endpoints are visible
    const filteredConnections = connections.filter(c => 
      entityIdSet.has(c.entity_a_id) && entityIdSet.has(c.entity_b_id)
    );

    console.log('[GRAPH] Filtered connections (both visible):', filteredConnections.length);

    // STEP 4: If very few connections, log diagnostic info
    if (filteredConnections.length < 50) {
      const connEntityIds = new Set([
        ...connections.map(c => c.entity_a_id),
        ...connections.map(c => c.entity_b_id)
      ]);
      
      const overlap = [...entityIdSet].filter(id => connEntityIds.has(id));
      console.log('[GRAPH] Entity overlap with connections:', overlap.length, '/', entityIds.length);
      console.log('[GRAPH] Sample connection entity_a_ids:', connections.slice(0, 3).map(c => c.entity_a_id));
      console.log('[GRAPH] Sample our entity IDs:', entityIds.slice(0, 3));
    }

    // STEP 5: Format response
    const nodes = entities.map(e => ({
      id: e.id,
      name: e.name || 'Unknown',
      label: e.name || 'Unknown',
      type: e.type || 'other',
      documentCount: e.document_count || 0,
      connectionCount: e.connection_count || 0,
      connections: e.connection_count || 0,
    }));

    const edges = filteredConnections.map(c => ({
      source: c.entity_a_id,
      target: c.entity_b_id,
      from: c.entity_a_id,
      to: c.entity_b_id,
      weight: c.strength || 1,
      strength: c.strength || 1,
    }));

    const duration = Date.now() - startTime;
    console.log('[GRAPH] Complete in', duration, 'ms:', nodes.length, 'nodes,', edges.length, 'edges');

    return NextResponse.json({
      nodes,
      edges,
      result: { data: { nodes, edges } },
      meta: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        queryTimeMs: duration
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GRAPH] Fatal error:', errorMessage);
    return NextResponse.json({ 
      nodes: [], 
      edges: [], 
      error: errorMessage 
    }, { status: 500 });
  }
}
