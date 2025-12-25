import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { supabase } from '@/lib/supabase';

// Known hosted PDFs from Supabase Storage
const HOSTED_PDFS: Record<string, { title: string; url: string; source: string; isUnredacted: boolean }> = {
  'giuffre-v-maxwell-unsealed-2024': {
    title: 'Giuffre v Maxwell Unsealed Documents (2024)',
    url: 'https://lyzpmfvujegnbsdptypz.supabase.co/storage/v1/object/public/documents/court-filings/giuffre-v-maxwell-unsealed-2024.pdf',
    source: 'court-filings',
    isUnredacted: false
  },
  'maxwell-criminal-complaint': {
    title: 'Maxwell Criminal Complaint',
    url: 'https://lyzpmfvujegnbsdptypz.supabase.co/storage/v1/object/public/documents/court-filings/maxwell-criminal-complaint.pdf',
    source: 'court-filings',
    isUnredacted: false
  },
  'epstein-flight-manifests-gawker': {
    title: 'Epstein Flight Manifests (Flight Logs)',
    url: 'https://lyzpmfvujegnbsdptypz.supabase.co/storage/v1/object/public/documents/flight-logs/epstein-flight-manifests-gawker.pdf',
    source: 'flight-logs',
    isUnredacted: true
  },
  'flight-logs': {
    title: 'Epstein Flight Manifests (Flight Logs)',
    url: 'https://lyzpmfvujegnbsdptypz.supabase.co/storage/v1/object/public/documents/flight-logs/epstein-flight-manifests-gawker.pdf',
    source: 'flight-logs',
    isUnredacted: true
  },
  'giuffre-maxwell': {
    title: 'Giuffre v Maxwell Unsealed Documents (2024)',
    url: 'https://lyzpmfvujegnbsdptypz.supabase.co/storage/v1/object/public/documents/court-filings/giuffre-v-maxwell-unsealed-2024.pdf',
    source: 'court-filings',
    isUnredacted: false
  }
};

// PDF Index cache
interface PdfEntry {
  id: string;
  filename: string;
  relativePath: string;
  size: number;
}
interface PdfIndex {
  totalCount: number;
  pdfs: PdfEntry[];
  byId: Record<string, PdfEntry>;
  byFilename: Record<string, PdfEntry>;
}
let pdfIndexCache: PdfIndex | null = null;

async function loadPdfIndex(): Promise<PdfIndex | null> {
  if (pdfIndexCache) return pdfIndexCache;
  try {
    const indexPath = path.join(process.cwd(), 'public', 'pdf-index.json');
    const data = await readFile(indexPath, 'utf-8');
    pdfIndexCache = JSON.parse(data);
    return pdfIndexCache;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // 1. Check known hosted PDFs first
    const hostedPdf = HOSTED_PDFS[id] || HOSTED_PDFS[id.toLowerCase().replace(/[^a-z0-9-]/g, '-')];
    if (hostedPdf) {
      return NextResponse.json({
        id,
        title: hostedPdf.title,
        pdfUrl: hostedPdf.url,
        source: hostedPdf.source,
        isRedacted: !hostedPdf.isUnredacted,
        hosted: true,
        type: 'pdf'
      });
    }

    // 2. Check local PDF index (for 11,622 DOJ documents)
    const index = await loadPdfIndex();
    if (index) {
      // Try exact ID match (e.g., "efta00009676")
      let pdfEntry = index.byId[id.toLowerCase()];
      
      // Try filename match
      if (!pdfEntry) {
        pdfEntry = index.byFilename[`${id}.pdf`] || index.byFilename[`${id}.PDF`];
      }
      
      // Try partial match
      if (!pdfEntry) {
        const match = index.pdfs.find((p: PdfEntry) => 
          p.id.includes(id.toLowerCase()) || 
          p.filename.toLowerCase().includes(id.toLowerCase())
        );
        if (match) pdfEntry = match;
      }
      
      if (pdfEntry) {
        return NextResponse.json({
          id: pdfEntry.id,
          title: pdfEntry.filename.replace('.pdf', '').replace('.PDF', ''),
          pdfUrl: `/api/pdf/${pdfEntry.relativePath}`,
          source: 'doj',
          isRedacted: true,
          hosted: false,
          localPath: pdfEntry.relativePath,
          type: 'pdf'
        });
      }
    }

    // 3. Try documents table in Supabase
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('doc_id', id)
      .single();

    if (doc?.pdf_url) {
      return NextResponse.json({
        id: doc.doc_id,
        title: doc.title,
        pdfUrl: doc.pdf_url,
        source: doc.source || 'doj',
        isRedacted: true,
        hosted: true,
        type: 'pdf'
      });
    }

    // 4. Try by UUID
    const { data: docById } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (docById?.pdf_url) {
      return NextResponse.json({
        id: docById.doc_id || docById.id,
        title: docById.title,
        pdfUrl: docById.pdf_url,
        source: docById.source || 'doj',
        isRedacted: true,
        hosted: true,
        type: 'pdf'
      });
    }

    // 5. Check if this is an entity ID
    const { data: entity } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count, metadata')
      .eq('id', id)
      .single();

    if (entity) {
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
    const { data: connections } = await supabase
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
        docId: id,
        message: 'This document is not yet available. We are working on hosting all 11,622 DOJ documents.',
        suggestion: 'Try searching for the document by name or entity.',
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
