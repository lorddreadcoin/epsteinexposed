import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIP, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cache for pdf-index.json
let pdfIndexCache: { pdfs: Array<{ id: string; filename: string; publicUrl: string; source: string; isUnredacted: boolean; size: number }> } | null = null;

function getPdfIndex() {
  if (pdfIndexCache) return pdfIndexCache;
  try {
    const indexPath = join(process.cwd(), 'public', 'pdf-index.json');
    const data = readFileSync(indexPath, 'utf-8');
    pdfIndexCache = JSON.parse(data);
    console.log('[DOC API] Loaded pdf-index.json with', pdfIndexCache?.pdfs?.length || 0, 'documents');
    return pdfIndexCache;
  } catch (err) {
    console.error('[DOC API] Failed to load pdf-index.json:', err);
    return null;
  }
}

// Featured/Special documents with known PDF URLs from DocumentCloud journalist project
const FEATURED_DOCUMENTS: Record<string, {
  title: string;
  pdfUrl: string;
  source: string;
  isRedacted: boolean;
  sourceNotes?: string;
  pageCount?: number;
}> = {
  // === CORE UNSEALED DOCUMENTS ===
  'giuffre-vs-maxwell-943-pages-unredacted': {
    title: 'Giuffre v. Maxwell - 943 Pages Unredacted',
    pdfUrl: 'https://s3.documentcloud.org/documents/24253239/1324-epstein-documents-943-pages.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Full 943-page unsealed court filing from Giuffre v. Maxwell civil case (Jan 2024)',
    pageCount: 943
  },
  '1324-epstein-documents-943-pages': {
    title: 'Epstein Documents - 943 Pages (Jan 2024)',
    pdfUrl: 'https://s3.documentcloud.org/documents/24253239/1324-epstein-documents-943-pages.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Full unsealed court documents released January 3, 2024',
    pageCount: 943
  },
  
  // === DOJ RELEASE 2025 ===
  'doj-jeffrey-epstein-files-released-2025-02-27': {
    title: 'DOJ Jeffrey Epstein Files - Released Feb 2025',
    pdfUrl: 'https://s3.documentcloud.org/documents/25547032/doj-jeffrey-epstein-files-released-2025-02-27.pdf',
    source: 'DOJ/DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Official DOJ release of Epstein investigation files - February 27, 2025',
    pageCount: 500
  },
  'doj-epstein-2025': {
    title: 'DOJ Epstein Files 2025',
    pdfUrl: 'https://s3.documentcloud.org/documents/25547032/doj-jeffrey-epstein-files-released-2025-02-27.pdf',
    source: 'DOJ/DocumentCloud',
    isRedacted: false,
    sourceNotes: 'February 2025 DOJ release',
    pageCount: 500
  },
  
  // === FLIGHT LOGS ===
  'epstein-flight-manifests-gawker': {
    title: 'Epstein Flight Manifests (Gawker)',
    pdfUrl: 'https://s3.documentcloud.org/documents/1507315/epstein-flight-manifests.pdf',
    source: 'Gawker/DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Flight logs from Epstein\'s private aircraft - Lolita Express',
    pageCount: 73
  },
  'flight-logs': {
    title: 'Epstein Flight Logs - Complete',
    pdfUrl: 'https://s3.documentcloud.org/documents/1507315/epstein-flight-manifests.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Complete flight manifests from Epstein\'s jets',
    pageCount: 73
  },
  'epstein-flight-logs': {
    title: 'Epstein Flight Logs',
    pdfUrl: 'https://s3.documentcloud.org/documents/1507315/epstein-flight-manifests.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Flight manifests showing passengers on Epstein\'s private jets',
    pageCount: 73
  },
  
  // === GIUFFRE V MAXWELL CIVIL CASE ===
  'giuffre-maxwell': {
    title: 'Giuffre v Maxwell - Unsealed Documents',
    pdfUrl: 'https://s3.documentcloud.org/documents/24253239/1324-epstein-documents-943-pages.pdf',
    source: 'The Guardian/DocumentCloud',
    isRedacted: false,
    sourceNotes: '2024 unsealed court documents',
    pageCount: 943
  },
  'giuffre-v-maxwell-unsealed-documents': {
    title: 'Giuffre v Maxwell Unsealed',
    pdfUrl: 'https://s3.documentcloud.org/documents/24253239/1324-epstein-documents-943-pages.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Complete unsealed documents from civil case',
    pageCount: 943
  },
  
  // === MAXWELL CRIMINAL CASE ===
  'maxwell-criminal-complaint': {
    title: 'Maxwell Criminal Complaint',
    pdfUrl: 'https://www.justice.gov/usao-sdny/press-release/file/1291481/download',
    source: 'DOJ/SDNY',
    isRedacted: false,
    sourceNotes: 'Federal criminal complaint against Ghislaine Maxwell',
    pageCount: 18
  },
  
  // === BLACK BOOK ===
  'epstein-black-book': {
    title: 'Epstein\'s Black Book (Contacts)',
    pdfUrl: 'https://s3.documentcloud.org/documents/1508273/jeffrey-epsteins-little-black-book-redacted.pdf',
    source: 'Gawker/DocumentCloud',
    isRedacted: true,
    sourceNotes: 'Redacted version of Epstein\'s contact book',
    pageCount: 92
  },
  'black-book': {
    title: 'Jeffrey Epstein\'s Little Black Book',
    pdfUrl: 'https://s3.documentcloud.org/documents/1508273/jeffrey-epsteins-little-black-book-redacted.pdf',
    source: 'DocumentCloud',
    isRedacted: true,
    sourceNotes: 'Contact book with names and phone numbers',
    pageCount: 92
  },
  'jeffrey-epsteins-little-black-book-redacted': {
    title: 'Jeffrey Epstein\'s Little Black Book',
    pdfUrl: 'https://s3.documentcloud.org/documents/1508273/jeffrey-epsteins-little-black-book-redacted.pdf',
    source: 'DocumentCloud',
    isRedacted: true,
    sourceNotes: 'Redacted contact book',
    pageCount: 92
  },
  
  // === DEPOSITIONS ===
  'virginia-giuffre-deposition': {
    title: 'Virginia Giuffre Deposition',
    pdfUrl: 'https://s3.documentcloud.org/documents/6250471/Epstein-Docs.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Deposition testimony from Virginia Giuffre',
    pageCount: 139
  },
  'epstein-docs': {
    title: 'Epstein Documents Collection',
    pdfUrl: 'https://s3.documentcloud.org/documents/6250471/Epstein-Docs.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Collection of Epstein-related documents',
    pageCount: 139
  },
  
  // === FBI FILES ===
  'jeffrey-epstein-part-01-redacted': {
    title: 'Jeffrey Epstein FBI File Part 01',
    pdfUrl: 'https://s3.documentcloud.org/documents/6506623/Jeffrey-Epstein-Part-01-Redacted-OPT.pdf',
    source: 'FBI/DocumentCloud',
    isRedacted: true,
    sourceNotes: 'FBI investigation file Part 1',
    pageCount: 200
  },
  'jeffrey-epstein-part-02-redacted': {
    title: 'Jeffrey Epstein FBI File Part 02',
    pdfUrl: 'https://s3.documentcloud.org/documents/6506624/Jeffrey-Epstein-Part-02-Redacted-OPT.pdf',
    source: 'FBI/DocumentCloud',
    isRedacted: true,
    sourceNotes: 'FBI investigation file Part 2',
    pageCount: 200
  },
  
  // === INDICTMENTS ===
  'epstein-indictment': {
    title: 'Jeffrey Epstein Federal Indictment',
    pdfUrl: 'https://s3.documentcloud.org/documents/6184408/U-S-v-Jeffrey-Epstein-Indictment.pdf',
    source: 'SDNY/DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Federal sex trafficking indictment against Jeffrey Epstein',
    pageCount: 14
  },
  'u-s-v-jeffrey-epstein-indictment': {
    title: 'U.S. v Jeffrey Epstein - Indictment',
    pdfUrl: 'https://s3.documentcloud.org/documents/6184408/U-S-v-Jeffrey-Epstein-Indictment.pdf',
    source: 'SDNY/DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Original 2019 federal indictment',
    pageCount: 14
  },
  
  // === NPA (Non-Prosecution Agreement) ===
  'epstein-non-prosecution-agreement': {
    title: 'Epstein Non-Prosecution Agreement (2007)',
    pdfUrl: 'https://s3.documentcloud.org/documents/1508967/epstein-non-prosecution-agreement.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: 'Controversial 2007 plea deal with federal prosecutors',
    pageCount: 17
  },
  'npa': {
    title: 'Non-Prosecution Agreement',
    pdfUrl: 'https://s3.documentcloud.org/documents/1508967/epstein-non-prosecution-agreement.pdf',
    source: 'DocumentCloud',
    isRedacted: false,
    sourceNotes: '2007 federal plea agreement',
    pageCount: 17
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

    // Priority 0.5: Check pdf-index.json for local/Supabase-hosted PDFs
    const pdfIndex = getPdfIndex();
    if (pdfIndex?.pdfs) {
      const docIdLower = docId.toLowerCase();
      const pdfEntry = pdfIndex.pdfs.find(p => 
        p.id.toLowerCase() === docIdLower ||
        p.filename.toLowerCase().replace('.pdf', '') === docIdLower ||
        p.filename.toLowerCase() === docIdLower
      );
      
      if (pdfEntry) {
        console.log('[DOC API] Found in pdf-index.json:', pdfEntry.filename);
        return NextResponse.json({
          id: pdfEntry.id,
          title: pdfEntry.filename.replace('.pdf', '').replace(/_/g, ' '),
          pdfUrl: pdfEntry.publicUrl,
          source: pdfEntry.source || 'DOJ',
          isRedacted: !pdfEntry.isUnredacted,
          type: 'pdf',
          pageCount: 1,
          size: pdfEntry.size,
        });
      }
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
