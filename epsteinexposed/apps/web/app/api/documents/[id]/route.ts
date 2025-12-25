import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIP, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

// Featured/Special documents with known PDF URLs
const FEATURED_DOCUMENTS: Record<string, {
  title: string;
  pdfUrl: string;
  source: string;
  isRedacted: boolean;
  sourceNotes?: string;
  pageCount?: number;
}> = {
  'giuffre-vs-maxwell-943-pages-unredacted': {
    title: 'Giuffre v. Maxwell - 943 Pages Unredacted',
    pdfUrl: 'https://s3.documentcloud.org/documents/21165424/giuffre-v-maxwell-unsealed-documents.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Full 943-page unsealed court filing from Giuffre v. Maxwell civil case',
    pageCount: 943
  },
  'epstein-flight-manifests-gawker': {
    title: 'Epstein Flight Manifests (Gawker)',
    pdfUrl: 'https://assets.documentcloud.org/documents/1507315/epstein-flight-manifests.pdf',
    source: 'Gawker/DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Flight logs from Epstein\'s private aircraft',
    pageCount: 73
  },
  'flight-logs': {
    title: 'Epstein Flight Logs - Complete',
    pdfUrl: 'https://assets.documentcloud.org/documents/1507315/epstein-flight-manifests.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Complete flight manifests from Epstein\'s jets',
    pageCount: 73
  },
  'giuffre-maxwell': {
    title: 'Giuffre v Maxwell - Unsealed Documents',
    pdfUrl: 'https://s3.documentcloud.org/documents/21165424/giuffre-v-maxwell-unsealed-documents.pdf',
    source: 'The Guardian/DocumentCloud',
    isRedacted: false,
    sourceNotes: '2024 unsealed court documents',
    pageCount: 943
  },
  'maxwell-criminal-complaint': {
    title: 'Maxwell Criminal Complaint',
    pdfUrl: 'https://www.justice.gov/usao-sdny/press-release/file/1291481/download',
    source: 'DOJ/SDNY',
    isRedacted: false,
    sourceNotes: 'Federal criminal complaint against Ghislaine Maxwell',
    pageCount: 18
  },
  'epstein-black-book': {
    title: 'Epstein\'s Black Book (Contacts)',
    pdfUrl: 'https://assets.documentcloud.org/documents/1508273/jeffrey-epsteins-little-black-book-redacted.pdf',
    source: 'Gawker/DocumentCloud',
    isRedacted: true,
    sourceNotes: 'Redacted version of Epstein\'s contact book',
    pageCount: 92
  },
  'virginia-giuffre-deposition': {
    title: 'Virginia Giuffre Deposition',
    pdfUrl: 'https://s3.documentcloud.org/documents/6250471/Epstein-Docs.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Deposition testimony from Virginia Giuffre',
    pageCount: 139
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limiting
  const ip = getClientIP(request.headers);
  const rateLimit = checkRateLimit(`documents:${ip}`, RATE_LIMITS.documents);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { id } = await params;
    const docId = (id || '').trim();

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    console.log('[DOC API] Looking for document:', docId);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    // Priority 0: Check if this is a featured/special document by slug
    const featuredDoc = FEATURED_DOCUMENTS[docId.toLowerCase()];
    if (featuredDoc) {
      console.log('[DOC API] Found featured document:', featuredDoc.title);
      return NextResponse.json({
        id: docId,
        title: featuredDoc.title,
        pdfUrl: featuredDoc.pdfUrl,
        source: featuredDoc.source,
        isRedacted: featuredDoc.isRedacted,
        sourceNotes: featuredDoc.sourceNotes,
        type: 'pdf',
        pageCount: featuredDoc.pageCount || 1,
      });
    }

    // Priority 1: Query documents table by UUID id
    let doc: { id: string; doc_id: string | null; title: string | null; page_count: number | null; pdf_url: string | null } | null = null;
    
    // Try by UUID id first
    const uuidResult = await supabase
      .from('documents')
      .select('id, doc_id, title, page_count, pdf_url')
      .eq('id', docId)
      .single();
    
    if (!uuidResult.error && uuidResult.data) {
      doc = uuidResult.data;
    } else {
      // Try by doc_id (slug) if UUID lookup failed
      const slugResult = await supabase
        .from('documents')
        .select('id, doc_id, title, page_count, pdf_url')
        .eq('doc_id', docId)
        .single();
      
      if (!slugResult.error && slugResult.data) {
        doc = slugResult.data;
      } else {
        // Try by title ilike match
        const titleResult = await supabase
          .from('documents')
          .select('id, doc_id, title, page_count, pdf_url')
          .ilike('title', `%${docId.replace(/-/g, ' ')}%`)
          .limit(1)
          .single();
        
        if (!titleResult.error && titleResult.data) {
          doc = titleResult.data;
        }
      }
    }

    if (doc) {
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
