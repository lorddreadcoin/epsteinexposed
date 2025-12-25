import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeLimit = Math.min(parseInt(searchParams.get('nodeLimit') || '800'), 2000);
    const minConnections = parseInt(searchParams.get('minConnections') || '3');

    console.log('[GRAPH] Fetching graph with nodeLimit:', nodeLimit, 'minConnections:', minConnections);

    // STEP 1: Get entities that HAVE connections (not just top by count)
    const { data: entities, error: entitiesError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count')
      .gte('connection_count', minConnections)
      .order('connection_count', { ascending: false })
      .limit(nodeLimit);

    if (entitiesError) {
      console.error('[GRAPH] Entity error:', entitiesError);
      return NextResponse.json({ error: entitiesError.message }, { status: 500 });
    }

    if (!entities || entities.length === 0) {
      return NextResponse.json({ nodes: [], edges: [], meta: { error: 'No entities found' } });
    }

    const entityIds = entities.map(e => e.id);
    const entityIdSet = new Set(entityIds);
    
    console.log('[GRAPH] Loaded', entities.length, 'entities');

    // STEP 2: Get ALL connections between these specific entities using BATCH queries
    const BATCH_SIZE = 100;
    const allConnections: Array<{ entity_a_id: string; entity_b_id: string; strength: number }> = [];
    
    // Query in batches to avoid timeout with large IN clauses
    for (let i = 0; i < entityIds.length; i += BATCH_SIZE) {
      const batchIds = entityIds.slice(i, i + BATCH_SIZE);
      
      const { data: batchConnections, error: connError } = await supabase
        .from('connections')
        .select('entity_a_id, entity_b_id, strength')
        .in('entity_a_id', batchIds)
        .order('strength', { ascending: false })
        .limit(5000);
      
      if (connError) {
        console.error('[GRAPH] Connection batch error:', connError);
        continue;
      }
      
      if (batchConnections) {
        allConnections.push(...batchConnections);
      }
    }

    console.log('[GRAPH] Raw connections fetched:', allConnections.length);

    // STEP 3: Filter to connections where BOTH endpoints are in our entity set and deduplicate
    const connectionMap = new Map<string, { entity_a_id: string; entity_b_id: string; strength: number }>();
    
    for (const conn of allConnections) {
      if (entityIdSet.has(conn.entity_a_id) && entityIdSet.has(conn.entity_b_id)) {
        // Create consistent key for deduplication
        const key = [conn.entity_a_id, conn.entity_b_id].sort().join('|');
        
        if (!connectionMap.has(key)) {
          connectionMap.set(key, conn);
        }
      }
    }

    console.log('[GRAPH] Filtered connections (both endpoints visible):', connectionMap.size);

    // STEP 4: Format response
    const nodes = entities.map(e => ({
      id: e.id,
      name: e.name || 'Unknown',
      label: e.name || 'Unknown',
      type: e.type || 'other',
      documentCount: e.document_count || 0,
      connectionCount: e.connection_count || 0,
      connections: e.connection_count || 0,
    }));

    const edges = Array.from(connectionMap.values())
      .sort((a, b) => (b.strength || 0) - (a.strength || 0))
      .slice(0, 5000) // Cap at 5000 edges for performance
      .map(c => ({
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
        edgeCount: edges.length,
        timestamp: new Date().toISOString()
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
