import * as fs from 'fs/promises'
import * as path from 'path'

// ALL 8 DATASETS + EXTERNAL SOURCES
// DataSets 1-7 are in the project root, DataSet 8 is in apps/web
const PDF_SOURCES = [
  { path: '../../DataSet 1', name: 'dataset-1', source: 'doj' },
  { path: '../../DataSet 2', name: 'dataset-2', source: 'doj' },
  { path: '../../DataSet 3', name: 'dataset-3', source: 'doj' },
  { path: '../../DataSet 4', name: 'dataset-4', source: 'doj' },
  { path: '../../DataSet 5', name: 'dataset-5', source: 'doj' },
  { path: '../../DataSet 6', name: 'dataset-6', source: 'doj' },
  { path: '../../DataSet 7', name: 'dataset-7', source: 'doj' },
  { path: './DataSet 8', name: 'dataset-8', source: 'doj' },
  { path: './external-docs', name: 'external', source: 'external' },
]

const OUTPUT_FILE = './public/pdf-index.json'

interface PdfEntry {
  id: string
  filename: string
  fullPath: string
  relativePath: string
  storagePath: string
  size: number
  source: string
  dataset: string
}

async function walkDirectory(
  dir: string, 
  basePath: string = '', 
  dataset: string,
  source: string
): Promise<PdfEntry[]> {
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
      const subEntries = await walkDirectory(fullPath, relativePath, dataset, source)
      entries.push(...subEntries)
    } else if (item.name.toLowerCase().endsWith('.pdf')) {
      try {
        const stats = await fs.stat(fullPath)
        
        // Create clean ID from filename
        const id = item.name
          .replace(/\.pdf$/i, '')
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .toLowerCase()
        
        // Storage path for Supabase
        const storagePath = `${source}/${dataset}/${relativePath.replace(/\\/g, '/')}`
        
        entries.push({
          id,
          filename: item.name,
          fullPath: path.resolve(fullPath),
          relativePath: relativePath.replace(/\\/g, '/'),
          storagePath,
          size: stats.size,
          source,
          dataset
        })
      } catch {
        // Skip files we can't stat
      }
    }
  }
  
  return entries
}

async function main() {
  console.log('\n📑 INDEXING ALL EPSTEIN DOCUMENTS\n')
  console.log('Scanning 8 DOJ DataSets + External Sources...\n')
  
  const allEntries: PdfEntry[] = []
  const stats: Record<string, number> = {}
  
  for (const sourceConfig of PDF_SOURCES) {
    process.stdout.write(`📁 ${sourceConfig.name}... `)
    
    const entries = await walkDirectory(
      sourceConfig.path, 
      '', 
      sourceConfig.name,
      sourceConfig.source
    )
    
    if (entries.length > 0) {
      console.log(`✅ ${entries.length.toLocaleString()} PDFs`)
      allEntries.push(...entries)
      stats[sourceConfig.name] = entries.length
    } else {
      console.log(`⏭️  Empty or not found`)
    }
  }
  
  // Create index
  const index = {
    totalCount: allEntries.length,
    generatedAt: new Date().toISOString(),
    totalSizeBytes: allEntries.reduce((a, b) => a + b.size, 0),
    totalSizeGB: (allEntries.reduce((a, b) => a + b.size, 0) / 1024 / 1024 / 1024).toFixed(2),
    stats,
    pdfs: allEntries,
    byId: Object.fromEntries(allEntries.map(e => [e.id, e])),
    byFilename: Object.fromEntries(allEntries.map(e => [e.filename, e]))
  }
  
  // Save index
  await fs.mkdir('./public', { recursive: true })
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2))
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 INDEX COMPLETE')
  console.log('='.repeat(50))
  console.log(`📄 Total PDFs: ${allEntries.length.toLocaleString()}`)
  console.log(`💾 Total Size: ${index.totalSizeGB} GB`)
  console.log('\nBy Dataset:')
  for (const [name, count] of Object.entries(stats)) {
    console.log(`   ${name}: ${count.toLocaleString()}`)
  }
  console.log(`\n📋 Saved to: ${OUTPUT_FILE}`)
}

main().catch(console.error)
