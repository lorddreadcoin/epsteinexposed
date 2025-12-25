import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // First, check if this is an entity ID (since we're using entity IDs as "document" references)
    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count, metadata')
      .eq('id', id)
      .single();

    if (entity) {
      // Return entity info as a "document"
      return NextResponse.json({
        id: entity.id,
        name: entity.name,
        type: 'entity',
        entityType: entity.type,
        documentCount: entity.document_count || 0,
        connectionCount: entity.connection_count || 0,
        metadata: entity.metadata,
        content: `Entity: ${entity.name}\nType: ${entity.type}\nAppears in ${entity.document_count || 0} documents with ${entity.connection_count || 0} connections.`,
      });
    }

    // If not an entity, try to find related connections
    const { data: connections, error: connError } = await supabase
      .from('connections')
      .select(`
        id,
        entity_a_id,
        entity_b_id,
        strength,
        connection_type,
        document_ids
      `)
      .or(`entity_a_id.eq.${id},entity_b_id.eq.${id}`)
      .limit(50);

    if (connections && connections.length > 0) {
      // Get entity names for these connections
      const entityIds = new Set<string>();
      connections.forEach(c => {
        entityIds.add(c.entity_a_id);
        entityIds.add(c.entity_b_id);
      });

      const { data: entities } = await supabase
        .from('entities')
        .select('id, name, type')
        .in('id', Array.from(entityIds));

      const entityMap = new Map(entities?.map(e => [e.id, e]) || []);

      return NextResponse.json({
        id,
        type: 'connection_list',
        connections: connections.map(c => ({
          id: c.id,
          entityA: entityMap.get(c.entity_a_id),
          entityB: entityMap.get(c.entity_b_id),
          strength: c.strength,
          connectionType: c.connection_type,
          documentIds: c.document_ids,
        })),
      });
    }

    // Nothing found
    return NextResponse.json(
      { 
        error: 'Document not found',
        message: `No entity or document found with ID: ${id}. This may be an OCR artifact or the document has not been indexed.`,
        suggestion: 'Try searching for the entity name in the graph or Investigation Assistant.',
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('[DOCUMENTS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document', details: String(error) },
      { status: 500 }
    );
  }
}
