import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = (id || '').trim();

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    console.log('[DOC API] Looking for document:', docId);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    // Query documents table - get all relevant fields including pdf_url
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, doc_id, title, page_count, pdf_url')
      .eq('id', docId)
      .single();

    if (!docError && doc) {
      console.log('[DOC API] Found document in DB:', doc.title, 'doc_id:', doc.doc_id, 'pdf_url:', doc.pdf_url);
      
      // Priority 1: Use pdf_url from database if it exists
      if (doc.pdf_url) {
        return NextResponse.json({
          id: doc.id,
          title: doc.title || doc.doc_id || docId,
          pdfUrl: doc.pdf_url,
          source: 'Database PDF URL',
          type: 'pdf',
          pageCount: doc.page_count || 1,
        });
      }
      
      // Priority 2: Use doc_id to construct URL
      if (doc.doc_id) {
        const pdfUrl = `${supabaseUrl}/storage/v1/object/public/pdfs/${doc.doc_id}.pdf`;
        return NextResponse.json({
          id: doc.id,
          title: doc.title || doc.doc_id,
          pdfUrl: pdfUrl,
          source: 'Constructed from doc_id',
          type: 'pdf',
          pageCount: doc.page_count || 1,
        });
      }
    }

    // Fallback: Check entity_mentions to find which documents this entity appears in
    console.log('[DOC API] Checking entity_mentions for document references...');
    const { data: mentions } = await supabase
      .from('entity_mentions')
      .select('document_id')
      .eq('entity_id', docId)
      .limit(1);

    if (mentions && mentions.length > 0 && mentions[0]) {
      const actualDocId = mentions[0].document_id;
      console.log('[DOC API] Found document reference via entity_mentions:', actualDocId);
      
      // Get the actual document
      const { data: actualDoc } = await supabase
        .from('documents')
        .select('id, doc_id, title, page_count, pdf_url')
        .eq('id', actualDocId)
        .single();

      if (actualDoc) {
        const pdfUrl = actualDoc.pdf_url || `${supabaseUrl}/storage/v1/object/public/pdfs/${actualDoc.doc_id || actualDoc.id}.pdf`;
        return NextResponse.json({
          id: actualDoc.id,
          title: actualDoc.title || actualDoc.doc_id || 'Document',
          pdfUrl: pdfUrl,
          source: 'Via entity_mentions',
          type: 'pdf',
          pageCount: actualDoc.page_count || 1,
        });
      }
    }

    // Last resort: This ID is not a document, it's likely an entity ID
    // Return an entity type response
    console.log('[DOC API] ID appears to be an entity, not a document');
    
    // Check if it's an entity
    const { data: entity } = await supabase
      .from('entities')
      .select('id, name, type')
      .eq('id', docId)
      .single();

    if (entity) {
      return NextResponse.json({
        id: entity.id,
        title: entity.name,
        type: 'entity',
        entityType: entity.type,
        message: `"${entity.name}" is an entity (${entity.type}), not a document. View related documents in the AI investigator.`,
      });
    }

    // Truly not found
    return NextResponse.json({
      error: 'Document not found',
      message: `No document or entity found with ID: ${docId}`,
      id: docId,
    }, { status: 404 });

  } catch (error) {
    console.error('[DOC API] Error:', error);
    return NextResponse.json({
      error: 'Server error',
      message: String(error)
    }, { status: 500 });
  }
}
