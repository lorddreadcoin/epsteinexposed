import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Fallback data for when database times out
const FALLBACK_NODES = [
  { id: 'fallback-1', name: 'Jeffrey Epstein', label: 'Jeffrey Epstein', type: 'person', documentCount: 234, connectionCount: 500, connections: 500 },
  { id: 'fallback-2', name: 'Ghislaine Maxwell', label: 'Ghislaine Maxwell', type: 'person', documentCount: 111, connectionCount: 400, connections: 400 },
  { id: 'fallback-3', name: 'Southern District', label: 'Southern District', type: 'organization', documentCount: 89, connectionCount: 300, connections: 300 },
  { id: 'fallback-4', name: 'Palm Beach', label: 'Palm Beach', type: 'location', documentCount: 67, connectionCount: 200, connections: 200 },
  { id: 'fallback-5', name: 'Virgin Islands', label: 'Virgin Islands', type: 'location', documentCount: 45, connectionCount: 150, connections: 150 },
];

const FALLBACK_EDGES = [
  { source: 'fallback-1', target: 'fallback-2', from: 'fallback-1', to: 'fallback-2', weight: 500, strength: 500 },
  { source: 'fallback-1', target: 'fallback-3', from: 'fallback-1', to: 'fallback-3', weight: 300, strength: 300 },
  { source: 'fallback-1', target: 'fallback-4', from: 'fallback-1', to: 'fallback-4', weight: 200, strength: 200 },
  { source: 'fallback-2', target: 'fallback-3', from: 'fallback-2', to: 'fallback-3', weight: 250, strength: 250 },
  { source: 'fallback-1', target: 'fallback-5', from: 'fallback-1', to: 'fallback-5', weight: 150, strength: 150 },
];

async function fetchGraphData(edgeLimit: number, nodeLimit: number) {
  // Fetch connections with timeout handling
  const { data: topConnections, error: connError } = await supabase
    .from('connections')
    .select('entity_a_id, entity_b_id, strength')
    .order('strength', { ascending: false })
    .limit(edgeLimit);

  if (connError) {
    console.error('[GRAPH] Connection error:', connError);
    throw new Error(connError.message);
  }

  if (!topConnections || topConnections.length === 0) {
    console.error('[GRAPH] No connections found');
    throw new Error('No connections');
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

  // Fetch entity details in batches to avoid timeout
  const batchSize = 100;
  const entities: Array<{ id: string; name: string; type: string; document_count: number; connection_count: number }> = [];
  
  for (let i = 0; i < entityIds.length; i += batchSize) {
    const batch = entityIds.slice(i, i + batchSize);
    const { data: batchEntities, error: entityError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count')
      .in('id', batch);

    if (entityError) {
      console.error('[GRAPH] Entity fetch error:', entityError);
      throw new Error(entityError.message);
    }
    
    if (batchEntities) {
      entities.push(...batchEntities);
    }
  }

  console.log('[GRAPH] Fetched', entities.length, 'entity details');
  
  return { topConnections, entities };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Start with smaller limits to avoid timeout
    const requestedNodeLimit = Math.min(parseInt(searchParams.get('nodeLimit') || '200'), 500);
    const requestedEdgeLimit = Math.min(parseInt(searchParams.get('connectionLimit') || '400'), 1000);

    console.log('[GRAPH] Fetching nodeLimit:', requestedNodeLimit, 'edgeLimit:', requestedEdgeLimit);

    let topConnections;
    let entities;
    
    // Try with requested limits first, fall back to smaller if timeout
    try {
      const result = await fetchGraphData(requestedEdgeLimit, requestedNodeLimit);
      topConnections = result.topConnections;
      entities = result.entities;
    } catch (firstError) {
      console.warn('[GRAPH] First attempt failed, trying smaller dataset:', firstError);
      
      // Try with much smaller limits
      try {
        const result = await fetchGraphData(200, 100);
        topConnections = result.topConnections;
        entities = result.entities;
      } catch (secondError) {
        console.error('[GRAPH] Second attempt failed, using fallback:', secondError);
        
        // Return fallback data
        return NextResponse.json({
          nodes: FALLBACK_NODES,
          edges: FALLBACK_EDGES,
          result: { data: { nodes: FALLBACK_NODES, edges: FALLBACK_EDGES } },
          meta: {
            nodeCount: FALLBACK_NODES.length,
            edgeCount: FALLBACK_EDGES.length,
            fallback: true
          }
        });
      }
    }

    // Create entity map for quick lookup
    type EntityType = { id: string; name: string; type: string; document_count: number; connection_count: number };
    const entityMap = new Map<string, EntityType>((entities || []).map(e => [e.id, e]));

    // Filter connections to only those where we have entity details
    const validConnections = topConnections.filter(c => 
      entityMap.has(c.entity_a_id) && entityMap.has(c.entity_b_id)
    );

    console.log('[GRAPH] Valid connections:', validConnections.length);

    // Format response
    const nodes = Array.from(entityMap.values()).map((e: EntityType) => ({
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
