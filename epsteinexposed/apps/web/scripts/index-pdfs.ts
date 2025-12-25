import * as fs from 'fs/promises'
import * as path from 'path'

const PDF_BASE_PATH = './DataSet 8'
const OUTPUT_FILE = './public/pdf-index.json'

interface PdfEntry {
  id: string
  filename: string
  path: string
  relativePath: string
  size: number
}

async function walkDirectory(dir: string, basePath: string = ''): Promise<PdfEntry[]> {
  const entries: PdfEntry[] = []
  
  let items
  try {
    items = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return entries
  }
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    const relativePath = path.join(basePath, item.name)
    
    if (item.isDirectory()) {
      const subEntries = await walkDirectory(fullPath, relativePath)
      entries.push(...subEntries)
    } else if (item.name.toLowerCase().endsWith('.pdf')) {
      const stats = await fs.stat(fullPath)
      
      // Generate a clean ID from the filename
      const id = item.name
        .replace('.pdf', '')
        .replace('.PDF', '')
        .toLowerCase()
      
      entries.push({
        id,
        filename: item.name,
        path: fullPath,
        relativePath: relativePath.replace(/\\/g, '/'),
        size: stats.size
      })
    }
  }
  
  return entries
}

async function main() {
  console.log('📑 Indexing PDFs from DataSet 8...\n')
  
  try {
    await fs.access(PDF_BASE_PATH)
  } catch {
    console.log('❌ DataSet 8 directory not found!')
    process.exit(1)
  }
  
  const entries = await walkDirectory(PDF_BASE_PATH)
  
  console.log(`✅ Found ${entries.length} PDFs\n`)
  
  // Create lookup maps
  const index = {
    totalCount: entries.length,
    generatedAt: new Date().toISOString(),
    pdfs: entries,
    byId: Object.fromEntries(entries.map(e => [e.id, e])),
    byFilename: Object.fromEntries(entries.map(e => [e.filename, e]))
  }
  
  // Ensure public directory exists
  await fs.mkdir('./public', { recursive: true })
  
  // Save index
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2))
  
  console.log(`📋 Index saved to ${OUTPUT_FILE}`)
  console.log(`   Total size: ${(entries.reduce((a, b) => a + b.size, 0) / 1024 / 1024 / 1024).toFixed(2)} GB`)
  
  // Show sample entries
  console.log('\n📄 Sample entries:')
  entries.slice(0, 5).forEach(e => {
    console.log(`   ${e.id} → ${e.relativePath}`)
  })
}

main().catch(console.error)
