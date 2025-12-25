import { NextRequest, NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import path from 'path'

// Base path for DataSet 8 PDFs
const PDF_BASE_PATH = path.join(process.cwd(), 'DataSet 8')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    
    // Reconstruct the file path from segments
    const filePath = pathSegments.join('/')
    const fullPath = path.join(PDF_BASE_PATH, filePath)
    
    // Security: Ensure we're not escaping the base directory
    const normalizedPath = path.normalize(fullPath)
    if (!normalizedPath.startsWith(PDF_BASE_PATH)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }
    
    // Check if file exists
    try {
      await access(normalizedPath)
    } catch {
      return NextResponse.json({ 
        error: 'PDF not found',
        path: filePath 
      }, { status: 404 })
    }
    
    // Read and serve the PDF
    const fileBuffer = await readFile(normalizedPath)
    
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('PDF serve error:', errorMessage)
    return NextResponse.json({ 
      error: 'Failed to serve PDF',
      message: errorMessage 
    }, { status: 500 })
  }
}
