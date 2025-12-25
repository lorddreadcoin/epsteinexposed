import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import * as path from 'path'
import { readFileSync } from 'fs'

// Load env from .env.local manually since dotenv may not be installed
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
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET = 'documents'
const EXTERNAL_DIR = './external-docs'

interface UploadResult {
  filename: string
  storagePath: string
  publicUrl: string
  source: string
  isUnredacted: boolean
  size: number
}

async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  
  if (!exists) {
    console.log(`📦 Creating bucket: ${BUCKET}`)
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/pdf']
    })
    if (error) {
      console.error(`❌ Failed to create bucket: ${error.message}`)
      process.exit(1)
    }
    console.log(`   ✅ Bucket created`)
  } else {
    console.log(`📦 Bucket exists: ${BUCKET}`)
  }
}

async function uploadDirectory(dir: string, prefix: string = ''): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    if (entry.isDirectory()) {
      const subResults = await uploadDirectory(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name)
      results.push(...subResults)
    } else if (entry.name.endsWith('.pdf')) {
      const storagePath = prefix ? `${prefix}/${entry.name}` : entry.name
      
      console.log(`📤 Uploading: ${storagePath}`)
      
      try {
        const fileBuffer = readFileSync(fullPath)
        
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: true
          })
        
        if (error) throw error
        
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(storagePath)
        
        const stats = await fs.stat(fullPath)
        
        results.push({
          filename: entry.name,
          storagePath,
          publicUrl: urlData.publicUrl,
          source: prefix.split('/')[0] || 'root',
          isUnredacted: prefix.includes('unredacted'),
          size: stats.size
        })
        
        console.log(`   ✅ ${(stats.size/1024/1024).toFixed(2)} MB`)
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.log(`   ❌ ${errorMessage}`)
      }
    }
  }
  
  return results
}

async function updateDatabase(results: UploadResult[]) {
  console.log('\n📝 Updating database with PDF URLs...\n')
  
  let updated = 0
  let errors = 0
  
  for (const result of results) {
    const docId = result.filename.replace('.pdf', '').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
    
    const { error } = await supabase.from('documents').upsert({
      doc_id: docId,
      title: result.filename.replace('.pdf', '').replace(/-/g, ' '),
      pdf_url: result.publicUrl,
      storage_path: result.storagePath,
      source: result.source,
      is_redacted: !result.isUnredacted,
      source_notes: result.isUnredacted ? 'Unredacted version from external source' : null
    }, { onConflict: 'doc_id' })
    
    if (error) {
      console.log(`   ⚠️ DB error for ${docId}: ${error.message}`)
      errors++
    } else {
      updated++
    }
  }
  
  console.log(`\n✅ Updated ${updated} document records`)
  if (errors > 0) console.log(`⚠️ ${errors} errors (may need schema update)`)
}

async function main() {
  console.log('\n📤 UPLOADING DOCUMENTS TO SUPABASE STORAGE\n')
  console.log(`Bucket: ${BUCKET}`)
  console.log(`Source: ${EXTERNAL_DIR}\n`)
  
  // Check if external-docs exists
  try {
    await fs.access(EXTERNAL_DIR)
  } catch {
    console.log('❌ external-docs directory not found!')
    console.log('   Run "pnpm download:external" first')
    process.exit(1)
  }
  
  // Ensure bucket exists
  await ensureBucketExists()
  
  const results = await uploadDirectory(EXTERNAL_DIR)
  
  console.log('\n' + '='.repeat(50))
  console.log(`📊 UPLOAD COMPLETE: ${results.length} files`)
  console.log('='.repeat(50))
  
  if (results.length > 0) {
    // Update database
    await updateDatabase(results)
    
    // Save URL mapping
    await fs.writeFile(
      './pdf-urls.json',
      JSON.stringify(results, null, 2)
    )
    
    console.log('\n📋 URL mapping saved to pdf-urls.json')
    
    // Show sample URLs
    console.log('\n📎 Sample URLs:')
    results.slice(0, 3).forEach(r => {
      console.log(`   ${r.filename}: ${r.publicUrl}`)
    })
  }
}

main().catch(console.error)
