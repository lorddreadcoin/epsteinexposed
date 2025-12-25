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
    const entityIdSet = new Set(entityIds);

    // DIFFERENT APPROACH: Query connections FOR these specific entities
    // Instead of getting top global connections and filtering
    
    // Get connections where entity_a is in our set
    const { data: connectionsA, error: errorA } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength')
      .in('entity_a_id', entityIds)
      .order('strength', { ascending: false })
      .limit(connectionLimit);

    // Get connections where entity_b is in our set  
    const { data: connectionsB, error: errorB } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength')
      .in('entity_b_id', entityIds)
      .order('strength', { ascending: false })
      .limit(connectionLimit);

    if (errorA) console.error('[GRAPH API] Connections A error:', errorA);
    if (errorB) console.error('[GRAPH API] Connections B error:', errorB);

    // Combine and dedupe - only keep if BOTH endpoints are visible
    const connectionMap = new Map<string, { entity_a_id: string; entity_b_id: string; strength: number }>();
    
    for (const c of [...(connectionsA || []), ...(connectionsB || [])]) {
      if (entityIdSet.has(c.entity_a_id) && entityIdSet.has(c.entity_b_id)) {
        const key = [c.entity_a_id, c.entity_b_id].sort().join('-');
        if (!connectionMap.has(key)) {
          connectionMap.set(key, c);
        }
      }
    }

    const filteredConnections = Array.from(connectionMap.values())
      .sort((a, b) => (b.strength || 0) - (a.strength || 0))
      .slice(0, connectionLimit);
    
    console.log('[GRAPH API] Entities:', entityIds.length);
    console.log('[GRAPH API] Connections A:', connectionsA?.length || 0);
    console.log('[GRAPH API] Connections B:', connectionsB?.length || 0);
    console.log('[GRAPH API] Final filtered:', filteredConnections.length);

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
