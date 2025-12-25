import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import { readFileSync } from 'fs'
import * as path from 'path'

// Load env manually
const envPath = path.join(process.cwd(), '.env.local')
let envVars: Record<string, string> = {}
try {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line: string) => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch (e) {
  console.log('Could not read .env.local, using process.env')
}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const BUCKET = 'documents'
const OUTPUT_FILE = './public/pdf-index.json'

interface PdfEntry {
  id: string
  filename: string
  storagePath: string
  publicUrl: string
  source: string
  isUnredacted: boolean
  size?: number
}

interface StorageFile {
  name: string
  id: string | null
  metadata?: { size?: number }
}

async function listAllFiles(prefix: string = ''): Promise<Array<StorageFile & { fullPath: string }>> {
  const allFiles: Array<StorageFile & { fullPath: string }> = []
  
  const { data: items, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 })
  
  if (error) {
    console.error(`Error listing ${prefix}:`, error)
    return []
  }
  
  for (const item of items || []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name
    
    if (item.id === null) {
      // It's a folder, recurse
      console.log(`  📁 Scanning folder: ${itemPath}`)
      const subFiles = await listAllFiles(itemPath)
      allFiles.push(...subFiles)
    } else if (item.name.toLowerCase().endsWith('.pdf')) {
      allFiles.push({
        ...item,
        fullPath: itemPath
      })
    }
  }
  
  return allFiles
}

async function main() {
  console.log('\n📑 INDEXING SUPABASE STORAGE\n')
  console.log(`Bucket: ${BUCKET}`)
  console.log(`URL: ${SUPABASE_URL}\n`)
  
  const files = await listAllFiles()
  console.log(`\n✅ Found ${files.length} PDFs in storage\n`)
  
  const entries: PdfEntry[] = files.map(file => {
    // Generate clean ID from filename
    const id = file.name
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase()
    
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file.fullPath}`
    
    // Determine source from path
    let source = 'doj'
    if (file.fullPath.includes('unredacted')) source = 'unredacted'
    else if (file.fullPath.includes('external')) source = 'external'
    else if (file.fullPath.includes('court')) source = 'court-filing'
    else if (file.fullPath.includes('flight')) source = 'flight-logs'
    
    return {
      id,
      filename: file.name,
      storagePath: file.fullPath,
      publicUrl,
      source,
      isUnredacted: file.fullPath.includes('unredacted'),
      size: file.metadata?.size
    }
  })
  
  // Create index with multiple lookup methods
  const byId: Record<string, PdfEntry> = {}
  const byFilename: Record<string, PdfEntry> = {}
  
  for (const entry of entries) {
    byId[entry.id] = entry
    byFilename[entry.filename.toLowerCase()] = entry
    
    // Add alternate IDs (without hyphens)
    const altId = entry.id.replace(/-/g, '')
    if (!byId[altId]) {
      byId[altId] = entry
    }
    
    // Add ID from filename without extension
    const filenameId = entry.filename.replace(/\.pdf$/i, '').toLowerCase()
    if (!byId[filenameId]) {
      byId[filenameId] = entry
    }
  }
  
  const index = {
    totalCount: entries.length,
    generatedAt: new Date().toISOString(),
    bucket: BUCKET,
    baseUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`,
    pdfs: entries,
    byId,
    byFilename,
  }
  
  await fs.mkdir('./public', { recursive: true })
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2))
  
  console.log('📊 Index Summary:')
  console.log(`   Total PDFs: ${entries.length}`)
  console.log(`   Unredacted: ${entries.filter(e => e.isUnredacted).length}`)
  console.log(`   DOJ: ${entries.filter(e => e.source === 'doj').length}`)
  console.log(`   Court Filings: ${entries.filter(e => e.source === 'court-filing').length}`)
  console.log(`   Flight Logs: ${entries.filter(e => e.source === 'flight-logs').length}`)
  console.log(`\n📋 Saved to: ${OUTPUT_FILE}`)
  
  // Show sample entries
  console.log('\n📄 Sample entries:')
  entries.slice(0, 10).forEach(e => {
    console.log(`   ${e.id} → ${e.storagePath}`)
  })
}

main().catch(console.error)
