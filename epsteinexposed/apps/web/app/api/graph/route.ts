import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch entities (nodes) from Supabase
    const { data: entities, error: entitiesError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count')
      .order('connection_count', { ascending: false })
      .limit(500);

    if (entitiesError) {
      console.error('[GRAPH] Entities error:', entitiesError);
      throw entitiesError;
    }

    // Fetch connections (edges) from Supabase
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength')
      .order('strength', { ascending: false })
      .limit(2000);

    if (connectionsError) {
      console.error('[GRAPH] Connections error:', connectionsError);
      throw connectionsError;
    }

    // Format nodes for graph visualization
    const nodes = (entities || []).map(e => ({
      id: e.id,
      label: e.name,
      type: e.type,
      documentCount: e.document_count || 0,
      connections: e.connection_count || 0,
    }));

    // Format edges for graph visualization
    const edges = (connections || []).map(c => ({
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
    console.error('[GRAPH] API Error:', errorMessage);
    return NextResponse.json({ error: 'Failed to load graph' }, { status: 500 });
  }
}
