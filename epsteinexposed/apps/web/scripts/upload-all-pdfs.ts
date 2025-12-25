import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import { readFileSync, existsSync } from 'fs'

// Load env from .env.local manually
const envPath = '.env.local'
try {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch {
  console.log('Note: .env.local not found, using existing env vars')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET = 'documents'
const BATCH_SIZE = 5 // Conservative for stability
const PROGRESS_FILE = './upload-progress.json'
const INDEX_FILE = './public/pdf-index.json'

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

interface PdfIndex {
  totalCount: number
  totalSizeGB: string
  pdfs: PdfEntry[]
}

interface UploadProgress {
  uploaded: string[]
  failed: { path: string; error: string }[]
  startedAt: string
  lastUpdated: string
}

async function loadProgress(): Promise<UploadProgress> {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { 
      uploaded: [], 
      failed: [], 
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  }
}

async function saveProgress(progress: UploadProgress) {
  progress.lastUpdated = new Date().toISOString()
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

async function uploadFile(fullPath: string, storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fileBuffer = readFileSync(fullPath)
    
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, new Uint8Array(fileBuffer), {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (error) throw error
    return { success: true }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

async function main() {
  console.log('\n📤 UPLOADING ALL PDFS TO SUPABASE STORAGE\n')
  
  // Load index
  if (!existsSync(INDEX_FILE)) {
    console.log('❌ PDF index not found! Run "pnpm index:pdfs" first.')
    process.exit(1)
  }
  
  const indexData = await fs.readFile(INDEX_FILE, 'utf-8')
  const index: PdfIndex = JSON.parse(indexData)
  
  console.log(`📊 Total PDFs in index: ${index.totalCount.toLocaleString()}`)
  console.log(`💾 Total size: ${index.totalSizeGB} GB\n`)
  
  // Load progress
  const progress = await loadProgress()
  const uploadedSet = new Set(progress.uploaded)
  
  // Filter out already uploaded
  const toUpload = index.pdfs.filter((pdf: PdfEntry) => !uploadedSet.has(pdf.storagePath))
  
  console.log(`✅ Already uploaded: ${progress.uploaded.length.toLocaleString()}`)
  console.log(`📤 Remaining: ${toUpload.length.toLocaleString()}\n`)
  
  if (toUpload.length === 0) {
    console.log('🎉 All PDFs already uploaded!')
    return
  }
  
  // Estimate time
  const estimatedMinutes = (toUpload.length / BATCH_SIZE) * 0.5
  console.log(`⏱️  Estimated time: ${estimatedMinutes.toFixed(0)} minutes\n`)
  console.log('Starting upload... (Press Ctrl+C to pause, progress is saved)\n')
  
  const startTime = Date.now()
  let batchCount = 0
  
  for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
    const batch = toUpload.slice(i, i + BATCH_SIZE)
    batchCount++
    
    // Upload batch in parallel
    const results = await Promise.all(batch.map(async (pdf: PdfEntry) => {
      const result = await uploadFile(pdf.fullPath, pdf.storagePath)
      return { pdf, ...result }
    }))
    
    // Process results
    for (const result of results) {
      if (result.success) {
        progress.uploaded.push(result.pdf.storagePath)
      } else {
        progress.failed.push({ path: result.pdf.storagePath, error: result.error || 'Unknown error' })
        console.log(`   ❌ ${result.pdf.filename}: ${result.error}`)
      }
    }
    
    // Progress update every 10 batches
    if (batchCount % 10 === 0 || i + BATCH_SIZE >= toUpload.length) {
      const elapsed = (Date.now() - startTime) / 1000 / 60
      const uploadedThisRun = progress.uploaded.length - uploadedSet.size
      const rate = uploadedThisRun / Math.max(elapsed, 0.1)
      const remaining = rate > 0 ? (toUpload.length - i - BATCH_SIZE) / rate : 0
      
      const pct = ((i + BATCH_SIZE) / toUpload.length * 100).toFixed(1)
      console.log(`   📊 ${pct}% | ${progress.uploaded.length.toLocaleString()} uploaded | ~${Math.max(0, remaining).toFixed(0)} min left`)
    }
    
    // Save progress every batch
    await saveProgress(progress)
  }
  
  // Final summary
  const totalTime = (Date.now() - startTime) / 1000 / 60
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 UPLOAD COMPLETE')
  console.log('='.repeat(50))
  console.log(`✅ Total uploaded: ${progress.uploaded.length.toLocaleString()}`)
  console.log(`❌ Failed: ${progress.failed.length}`)
  console.log(`⏱️  Time: ${totalTime.toFixed(1)} minutes`)
  
  if (progress.failed.length > 0) {
    console.log(`\n⚠️  ${progress.failed.length} files failed. Check ${PROGRESS_FILE} for details.`)
    console.log('   Re-run this script to retry failed uploads.')
  }
}

main().catch(console.error)
