import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface DocumentReference {
  id: string;
  filename: string;
  path: string;
  pageCount: number;
  dataset: string;
  mentions: Array<{ entity: string; type: string; context?: string }>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityName = searchParams.get('name') || '';
  
  if (!entityName) {
    return NextResponse.json({ result: { data: [] } });
  }
  
  try {
    // Search for the entity in Supabase
    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, metadata')
      .ilike('name', `%${entityName}%`)
      .limit(1)
      .single();
    
    if (entityError || !entity) {
      return NextResponse.json({ result: { data: [] } });
    }
    
    // Get connections to find related entities (simulating document co-occurrences)
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength')
      .or(`entity_a_id.eq.${entity.id},entity_b_id.eq.${entity.id}`)
      .order('strength', { ascending: false })
      .limit(20);
    
    if (connectionsError) {
      console.error('[DOCUMENTS] Connection error:', connectionsError);
    }
    
    // Create mock document references based on connections
    const documents: DocumentReference[] = [];
    
    // Add a primary document for the entity itself
    documents.push({
      id: entity.id,
      filename: `Documents mentioning ${entity.name}`,
      path: `/entity/${entity.id}`,
      pageCount: entity.document_count || 1,
      dataset: 'DOJ Release',
      mentions: [{ entity: entity.name, type: entity.type }],
    });
    
    // Add documents for each connection (representing co-occurrences)
    if (connections) {
      for (const conn of connections.slice(0, 10)) {
        const relatedId = conn.entity_a_id === entity.id ? conn.entity_b_id : conn.entity_a_id;
        documents.push({
          id: `${entity.id}-${relatedId}`,
          filename: `Connection document (strength: ${conn.strength})`,
          path: `/connection/${entity.id}/${relatedId}`,
          pageCount: 1,
          dataset: 'DOJ Release',
          mentions: [{ entity: entity.name, type: entity.type }],
        });
      }
    }
    
    return NextResponse.json({ result: { data: documents } });
  } catch (error) {
    console.error('[DOCUMENTS] Error:', error);
    return NextResponse.json({ result: { data: [] } });
  }
}
