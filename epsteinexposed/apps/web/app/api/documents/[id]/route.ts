import { NextRequest, NextResponse } from 'next/server';

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

    console.log('[DOC API] Looking for PDF:', docId);

    // DIRECT PDF LINKING - Build Supabase Storage URL directly
    // All PDFs are stored in Supabase Storage bucket 'pdfs'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    
    // Try multiple PDF path patterns
    const possiblePaths = [
      `${docId}.pdf`,
      `${docId}`,
      `documents/${docId}.pdf`,
      `documents/${docId}`,
      // Try with underscores instead of hyphens
      `${docId.replace(/-/g, '_')}.pdf`,
      // Try original format from entity files
      `${docId.replace(/-/g, '_')}`,
    ];

    // Build direct Supabase Storage URLs
    const pdfUrls = possiblePaths.map(path => 
      `${supabaseUrl}/storage/v1/object/public/pdfs/${path}`
    );

    // Return the first URL (we'll let the browser handle 404s)
    const pdfUrl = pdfUrls[0];
    
    console.log('[DOC API] Returning PDF URL:', pdfUrl);
    
    return NextResponse.json({
      id: docId,
      title: docId.replace(/-/g, ' ').replace(/_/g, ' '),
      pdfUrl: pdfUrl,
      source: 'Supabase Storage',
      isRedacted: false,
      type: 'pdf',
      // Provide alternative URLs in case first one fails
      alternativeUrls: pdfUrls.slice(1)
    });

  } catch (error) {
    console.error('[DOC API] Error:', error);
    return NextResponse.json({
      error: 'Server error',
      message: String(error)
    }, { status: 500 });
  }
}
