import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeLimit = Math.min(parseInt(searchParams.get('nodeLimit') || '500'), 1000);
    const connectionLimit = Math.min(parseInt(searchParams.get('connectionLimit') || '2000'), 5000);

    // Fetch top entities by connection count
    const { data: entities, error: entitiesError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count')
      .order('connection_count', { ascending: false })
      .limit(nodeLimit);

    if (entitiesError) {
      console.error('Entities error:', entitiesError);
      return NextResponse.json({ error: entitiesError.message }, { status: 500 });
    }

    if (!entities || entities.length === 0) {
      return NextResponse.json({ 
        result: { 
          data: { nodes: [], edges: [] } 
        } 
      });
    }

    const entityIds = entities.map(e => e.id);

    // Fetch MORE connections to ensure we get enough after filtering
    // We need to fetch extra because many will be filtered out
    const fetchLimit = connectionLimit * 10; // Fetch 10x more to compensate for filtering
    
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength, connection_type')
      .order('strength', { ascending: false })
      .limit(fetchLimit);

    console.log('[GRAPH API] Raw connections from DB:', connections?.length || 0);

    if (connectionsError) {
      console.error('Connections error:', connectionsError);
      return NextResponse.json({
        result: {
          data: {
            nodes: entities.map(e => ({
              id: e.id,
              label: e.name,
              type: e.type,
              documentCount: e.document_count || 0,
              connections: e.connection_count || 0,
            })),
            edges: []
          }
        }
      });
    }

    // Filter connections to only those between visible nodes
    const entityIdSet = new Set(entityIds);
    const filteredConnections = (connections || []).filter(c => 
      entityIdSet.has(c.entity_a_id) && entityIdSet.has(c.entity_b_id)
    ).slice(0, connectionLimit); // Limit after filtering
    
    console.log('[GRAPH API] Filtered connections (both endpoints in visible nodes):', filteredConnections.length);
    console.log('[GRAPH API] Entity IDs count:', entityIds.length);

    const nodes = entities.map(e => ({
      id: e.id,
      label: e.name,
      type: e.type,
      documentCount: e.document_count || 0,
      connections: e.connection_count || 0,
    }));

    const edges = filteredConnections.map(c => ({
      from: c.entity_a_id,
      to: c.entity_b_id,
      strength: c.strength || 1,
    }));

    console.log(`[GRAPH] Loaded ${nodes.length} nodes, ${edges.length} edges from Supabase`);

    return NextResponse.json({ 
      result: { 
        data: { nodes, edges } 
      } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Graph API error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
