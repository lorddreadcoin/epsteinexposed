import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// PDF Index cache
interface PdfEntry {
  id: string;
  filename: string;
  storagePath: string;
  publicUrl: string;
  source: string;
  isUnredacted: boolean;
}

interface PdfIndex {
  totalCount: number;
  pdfs: PdfEntry[];
  byId: Record<string, PdfEntry>;
  byFilename: Record<string, PdfEntry>;
  baseUrl: string;
}

let pdfIndexCache: PdfIndex | null = null;

async function loadPdfIndex(): Promise<PdfIndex> {
  if (pdfIndexCache) return pdfIndexCache;
  try {
    const indexPath = path.join(process.cwd(), 'public', 'pdf-index.json');
    const data = await readFile(indexPath, 'utf-8');
    pdfIndexCache = JSON.parse(data);
    console.log('[DOC API] Loaded index with', pdfIndexCache?.totalCount, 'documents');
    return pdfIndexCache!;
  } catch (err) {
    console.error('[DOC API] Failed to load PDF index:', err);
    return { totalCount: 0, pdfs: [], byId: {}, byFilename: {}, baseUrl: '' };
  }
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

    console.log('[DOC API] Looking for:', docId);

    // Load the PDF index (generated from Supabase Storage)
    const index = await loadPdfIndex();
    
    // Try multiple lookup strategies
    let doc: PdfEntry | undefined = index.byId?.[docId];
    
    if (!doc) {
      // Try without hyphens
      doc = index.byId?.[docId.replace(/-/g, '')];
    }
    
    if (!doc) {
      // Try as filename
      doc = index.byFilename?.[`${docId}.pdf`];
    }
    
    if (!doc) {
      // Try with .pdf extension
      doc = index.byFilename?.[docId.endsWith('.pdf') ? docId : `${docId}.pdf`];
    }
    
    if (!doc && index.pdfs) {
      // Fuzzy search - find partial match
      doc = index.pdfs.find((p: PdfEntry) => 
        p.id.includes(docId) || 
        p.filename.toLowerCase().includes(docId) ||
        p.storagePath.toLowerCase().includes(docId)
      );
    }
    
    if (doc) {
      console.log('[DOC API] Found:', doc.filename);
      return NextResponse.json({
        id: doc.id,
        title: doc.filename.replace(/\.pdf$/i, '').replace(/-/g, ' '),
        pdfUrl: doc.publicUrl,
        source: doc.source,
        isRedacted: !doc.isUnredacted,
        storagePath: doc.storagePath,
        type: 'pdf'
      });
    }

    // Not found
    console.log('[DOC API] Not found:', docId);
    console.log('[DOC API] Index has', index.totalCount, 'documents');
    
    return NextResponse.json({
      error: 'Document not found',
      docId,
      message: `Document "${docId}" not found. Index has ${index.totalCount || 0} documents.`,
      availableSample: Object.keys(index.byId || {}).slice(0, 10)
    }, { status: 404 });

  } catch (error) {
    console.error('[DOC API] Error:', error);
    return NextResponse.json({
      error: 'Server error',
      message: String(error)
    }, { status: 500 });
  }
}
