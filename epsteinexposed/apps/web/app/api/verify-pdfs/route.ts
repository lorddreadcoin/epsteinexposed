import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// This endpoint verifies that PDF URLs in pdf-index.json are accessible
// Run manually or via cron to identify broken PDF links

interface PdfEntry {
  id: string;
  filename: string;
  publicUrl: string;
  source: string;
  isUnredacted: boolean;
  size: number;
}

interface VerificationResult {
  id: string;
  filename: string;
  url: string;
  status: 'ok' | 'error' | 'timeout';
  httpStatus?: number;
  error?: string;
  responseTime?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const checkAll = searchParams.get('all') === 'true';
  
  try {
    // Load pdf-index.json
    const indexPath = join(process.cwd(), 'public', 'pdf-index.json');
    const data = readFileSync(indexPath, 'utf-8');
    const pdfIndex = JSON.parse(data);
    
    if (!pdfIndex?.pdfs || !Array.isArray(pdfIndex.pdfs)) {
      return NextResponse.json({ error: 'Invalid pdf-index.json structure' }, { status: 500 });
    }
    
    const totalPdfs = pdfIndex.pdfs.length;
    const pdfsToCheck: PdfEntry[] = checkAll 
      ? pdfIndex.pdfs 
      : pdfIndex.pdfs.slice(offset, offset + limit);
    
    console.log(`[VERIFY] Checking ${pdfsToCheck.length} PDFs (offset: ${offset}, total: ${totalPdfs})`);
    
    const results: VerificationResult[] = [];
    const errors: VerificationResult[] = [];
    
    // Check PDFs in batches of 10 to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < pdfsToCheck.length; i += batchSize) {
      const batch = pdfsToCheck.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (pdf): Promise<VerificationResult> => {
          const startTime = Date.now();
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(pdf.publicUrl, {
              method: 'HEAD',
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
              return {
                id: pdf.id,
                filename: pdf.filename,
                url: pdf.publicUrl,
                status: 'ok',
                httpStatus: response.status,
                responseTime,
              };
            } else {
              return {
                id: pdf.id,
                filename: pdf.filename,
                url: pdf.publicUrl,
                status: 'error',
                httpStatus: response.status,
                error: `HTTP ${response.status}`,
                responseTime,
              };
            }
          } catch (err: unknown) {
            const responseTime = Date.now() - startTime;
            const error = err as Error;
            if (error.name === 'AbortError') {
              return {
                id: pdf.id,
                filename: pdf.filename,
                url: pdf.publicUrl,
                status: 'timeout',
                error: 'Request timed out after 10s',
                responseTime,
              };
            }
            return {
              id: pdf.id,
              filename: pdf.filename,
              url: pdf.publicUrl,
              status: 'error',
              error: error.message || 'Unknown error',
              responseTime,
            };
          }
        })
      );
      
      results.push(...batchResults);
      errors.push(...batchResults.filter(r => r.status !== 'ok'));
    }
    
    const okCount = results.filter(r => r.status === 'ok').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const timeoutCount = results.filter(r => r.status === 'timeout').length;
    
    return NextResponse.json({
      summary: {
        totalInIndex: totalPdfs,
        checked: results.length,
        ok: okCount,
        errors: errorCount,
        timeouts: timeoutCount,
        successRate: `${((okCount / results.length) * 100).toFixed(1)}%`,
        offset,
        limit,
      },
      errors: errors.slice(0, 50), // Only return first 50 errors
      // Uncomment to see all results (warning: large response)
      // allResults: results,
    });
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[VERIFY] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to verify PDFs', 
      details: error.message 
    }, { status: 500 });
  }
}
