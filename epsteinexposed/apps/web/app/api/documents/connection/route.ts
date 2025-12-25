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
  const entity1Name = searchParams.get('entity1') || '';
  const entity2Name = searchParams.get('entity2') || '';
  
  if (!entity1Name || !entity2Name) {
    return NextResponse.json({ result: { data: [] } });
  }
  
  try {
    // Find both entities
    const { data: entities, error: entitiesError } = await supabase
      .from('entities')
      .select('id, name, type')
      .or(`name.ilike.%${entity1Name}%,name.ilike.%${entity2Name}%`)
      .limit(2);
    
    if (entitiesError || !entities || entities.length < 2) {
      return NextResponse.json({ result: { data: [] } });
    }
    
    const entity1 = entities[0];
    const entity2 = entities[1];
    
    // Find the connection between them
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength')
      .or(`and(entity_a_id.eq.${entity1.id},entity_b_id.eq.${entity2.id}),and(entity_a_id.eq.${entity2.id},entity_b_id.eq.${entity1.id})`)
      .limit(1)
      .single();
    
    if (connectionError || !connection) {
      return NextResponse.json({ result: { data: [] } });
    }
    
    // Create document references representing the connection
    const documents: DocumentReference[] = [
      {
        id: `${entity1.id}-${entity2.id}`,
        filename: `Connection: ${entity1.name} ↔ ${entity2.name}`,
        path: `/connection/${entity1.id}/${entity2.id}`,
        pageCount: 1,
        dataset: 'DOJ Release',
        mentions: [
          { entity: entity1.name, type: entity1.type },
          { entity: entity2.name, type: entity2.type },
        ],
      },
      {
        id: `shared-docs-${connection.strength}`,
        filename: `${connection.strength} shared document mentions`,
        path: `/shared/${entity1.id}/${entity2.id}`,
        pageCount: connection.strength,
        dataset: 'DOJ Release',
        mentions: [
          { entity: entity1.name, type: entity1.type },
          { entity: entity2.name, type: entity2.type },
        ],
      },
    ];
    
    return NextResponse.json({ result: { data: documents } });
  } catch (error) {
    console.error('[CONNECTION DOCS] Error:', error);
    return NextResponse.json({ result: { data: [] } });
  }
}
