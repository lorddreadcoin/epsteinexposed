import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

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

async function fetchGraphData(edgeLimit: number, nodeLimit: number, offset: number = 0) {
  // Fetch connections with timeout handling
  // Use offset to get different "slices" of the data for variety
  const { data: topConnections, error: connError } = await supabase
    .from('connections')
    .select('entity_a_id, entity_b_id, strength')
    .order('strength', { ascending: false })
    .range(offset, offset + edgeLimit - 1);

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

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request.headers);
  const rateLimit = checkRateLimit(`graph:${ip}`, RATE_LIMITS.graph);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    // MASSIVELY increased limits for robust, dense graph - 2000 nodes, 8000 edges
    const requestedNodeLimit = Math.min(parseInt(searchParams.get('nodeLimit') || '2000'), 3000);
    const requestedEdgeLimit = Math.min(parseInt(searchParams.get('connectionLimit') || '8000'), 15000);
    // Offset for variety on refresh
    const offset = Math.min(parseInt(searchParams.get('offset') || '0'), 1000);

    console.log('[GRAPH] Fetching nodeLimit:', requestedNodeLimit, 'edgeLimit:', requestedEdgeLimit, 'offset:', offset);

    let topConnections;
    let entities;
    
    // Try with requested limits first, fall back to smaller if timeout
    try {
      const result = await fetchGraphData(requestedEdgeLimit, requestedNodeLimit, offset);
      topConnections = result.topConnections;
      entities = result.entities;
    } catch (firstError) {
      console.warn('[GRAPH] First attempt failed, trying smaller dataset:', firstError);
      
      // Try with medium limits (still substantial)
      try {
        const result = await fetchGraphData(800, 300, 0);
        topConnections = result.topConnections;
        entities = result.entities;
      } catch (secondError) {
        console.warn('[GRAPH] Second attempt failed, trying minimum:', secondError);
        
        // Try with minimum viable limits
        try {
          const result = await fetchGraphData(400, 150, 0);
          topConnections = result.topConnections;
          entities = result.entities;
        } catch (thirdError) {
          console.error('[GRAPH] All attempts failed, using fallback:', thirdError);
          
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
    }

    // Filter out garbage entities (PDF parsing errors, UI elements)
    const GARBAGE_ENTITY_PATTERNS = [
      /^(Normal|Dear|Edit|Online|Network|Manual|Single|Double|Triple)$/i,
      /^(Login|Logout|Sign|Email|Help|Only|Mode|View|Click|Button)$/i,
      /^(Page|Next|Previous|Back|Forward|Home|Menu|Settings)$/i,
      /^(Submit|Cancel|Save|Delete|Update|Refresh|Load|Search)$/i,
      /^(Yes|No|OK|Cancel|Close|Open|Start|Stop|Exit)$/i,
      /^(On|Off|True|False|Enable|Disable|Show|Hide)$/i,
    ];
    
    const isGarbageEntity = (name: string): boolean => {
      return GARBAGE_ENTITY_PATTERNS.some(pattern => pattern.test(name));
    };
    
    // Create entity map for quick lookup, filtering out garbage entities
    type EntityType = { id: string; name: string; type: string; document_count: number; connection_count: number };
    const entityMap = new Map<string, EntityType>(
      (entities || [])
        .filter(e => !isGarbageEntity(e.name))
        .map(e => [e.id, e])
    );

    // Filter connections to only those where we have entity details (and both entities are valid)
    const validConnections = topConnections.filter(c => 
      entityMap.has(c.entity_a_id) && entityMap.has(c.entity_b_id)
    );
    
    console.log('[GRAPH] Filtered out garbage entities. Valid entities:', entityMap.size);

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
