import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DocumentResult {
  id: string;
  title: string;
  pdfUrl: string;
  source: string;
  isRedacted: boolean;
  type: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = (id || '').toLowerCase().trim();

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    console.log('[DOC API] Querying Supabase for document:', docId);

    // Query Supabase for documents mentioning this entity or with this ID
    // First, try to find entities with this name
    const { data: entities, error: entityError } = await supabase
      .from('entities')
      .select('name, document_count')
      .ilike('name', `%${docId}%`)
      .limit(5);

    if (entityError) {
      console.error('[DOC API] Entity query error:', entityError);
    }

    // If we found entities, return information about them
    if (entities && entities.length > 0) {
      const entity = entities[0]!;
      console.log('[DOC API] Found entity:', entity.name, 'with', entity.document_count, 'documents');
      
      return NextResponse.json({
        id: docId,
        title: entity.name,
        entityName: entity.name,
        documentCount: entity.document_count,
        type: 'entity',
        message: `Found entity "${entity.name}" mentioned in ${entity.document_count} documents. Use the AI Investigation to explore this entity's connections.`,
        relatedEntities: entities.slice(1).map(e => ({ name: e.name, documentCount: e.document_count }))
      });
    }

    // If no entity found, try searching for actual document files
    // This would require a documents table in Supabase (which we should add)
    console.log('[DOC API] No entity found for:', docId);
    
    return NextResponse.json({
      error: 'Document not found',
      docId,
      message: `Document "${docId}" not found. Searching for: "${docId}"`,
      suggestion: 'Try searching for entity names like "Donald Trump", "Jeffrey Epstein", "Palm Beach, FL" etc.',
      searchQuery: docId
    }, { status: 404 });

  } catch (error) {
    console.error('[DOC API] Error:', error);
    return NextResponse.json({
      error: 'Server error',
      message: String(error)
    }, { status: 500 });
  }
}
