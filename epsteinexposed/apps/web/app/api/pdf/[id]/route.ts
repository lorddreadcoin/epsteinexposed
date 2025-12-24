import { NextRequest, NextResponse } from 'next/server';

// PDF serving is not available in serverless - return a placeholder response
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // In production, PDFs would need to be served from a CDN or external storage
  // For now, return a message indicating the document ID
  return NextResponse.json(
    { 
      error: 'PDF viewing not available in this deployment',
      documentId: id,
      message: 'Documents are referenced by ID. Full PDF viewing requires additional infrastructure.'
    },
    { status: 501 }
  );
}
