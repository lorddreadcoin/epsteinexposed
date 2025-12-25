import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    console.log('[DOC API] Looking for document:', docId);

    // Query documents table to get actual doc_id (PDF filename)
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, doc_id, title, page_count')
      .eq('id', docId)
      .single();

    if (docError || !doc) {
      console.log('[DOC API] Document not found in database, trying direct PDF access');
      
      // Fallback: Try direct PDF access with various patterns
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const possiblePaths = [
        `${docId}.pdf`,
        `${docId}`,
        `documents/${docId}.pdf`,
      ];

      const pdfUrls = possiblePaths.map(path => 
        `${supabaseUrl}/storage/v1/object/public/pdfs/${path}`
      );

      return NextResponse.json({
        id: docId,
        title: docId.replace(/-/g, ' ').replace(/_/g, ' '),
        pdfUrl: pdfUrls[0],
        source: 'Supabase Storage (Direct)',
        isRedacted: false,
        type: 'pdf',
        pageCount: 1,
        alternativeUrls: pdfUrls.slice(1),
        warning: 'Document not found in database, attempting direct access'
      });
    }

    // Use doc_id (actual PDF filename) if available, otherwise fall back to id
    const pdfFilename = doc.doc_id || doc.id;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    
    // Build PDF URL using the correct filename from database
    const pdfUrl = `${supabaseUrl}/storage/v1/object/public/pdfs/${pdfFilename}.pdf`;
    
    console.log('[DOC API] Found document:', doc.title, 'PDF:', pdfFilename);
    
    return NextResponse.json({
      id: doc.id,
      title: doc.title || pdfFilename,
      pdfUrl: pdfUrl,
      source: 'Supabase Storage',
      isRedacted: false,
      type: 'pdf',
      pageCount: doc.page_count || 1,
    });

  } catch (error) {
    console.error('[DOC API] Error:', error);
    return NextResponse.json({
      error: 'Server error',
      message: String(error)
    }, { status: 500 });
  }
}
