import * as fs from 'fs/promises'
import * as path from 'path'
import https from 'https'
import http from 'http'
import { createWriteStream } from 'fs'

const OUTPUT_DIR = './external-docs'

interface SourceFile {
  name: string
  url: string
  filename: string
  folder: string
  isUnredacted: boolean
}

const SOURCES: SourceFile[] = [
  // COURT FILINGS - VERIFIED WORKING
  {
    name: 'Giuffre v Maxwell Unsealed 2024',
    url: 'https://uploads.guim.co.uk/2024/01/04/Final_Epstein_documents.pdf',
    filename: 'giuffre-v-maxwell-unsealed-2024.pdf',
    folder: 'court-filings',
    isUnredacted: false
  },
  
  // DOCUMENTCLOUD - PUBLIC COURT DOCUMENTS
  {
    name: 'Epstein Flight Logs (Gawker)',
    url: 'https://assets.documentcloud.org/documents/1507315/epstein-flight-manifests.pdf',
    filename: 'epstein-flight-manifests-gawker.pdf',
    folder: 'flight-logs',
    isUnredacted: true
  },
  {
    name: 'Virginia Giuffre Deposition',
    url: 'https://assets.documentcloud.org/documents/6250471/Giuffre-Exhibits.pdf',
    filename: 'giuffre-exhibits.pdf',
    folder: 'court-filings',
    isUnredacted: false
  },
  
  // COURTLISTENER / PACER DOCUMENTS
  {
    name: 'Maxwell Criminal Complaint',
    url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.539612/gov.uscourts.nysd.539612.1.0.pdf',
    filename: 'maxwell-criminal-complaint.pdf',
    folder: 'court-filings',
    isUnredacted: false
  }
]

function downloadFile(url: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    
    const request = protocol.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          console.log(`  ↪ Redirect: ${redirectUrl.substring(0, 50)}...`)
          downloadFile(redirectUrl, outputPath).then(resolve)
          return
        }
      }
      
      if (response.statusCode !== 200) {
        console.log(`  ❌ HTTP ${response.statusCode}`)
        resolve(false)
        return
      }
      
      const fileStream = createWriteStream(outputPath)
      response.pipe(fileStream)
      fileStream.on('finish', () => { fileStream.close(); resolve(true) })
      fileStream.on('error', () => resolve(false))
    })
    
    request.on('error', (err) => { console.log(`  ❌ ${err.message}`); resolve(false) })
    request.setTimeout(60000, () => { request.destroy(); resolve(false) })
  })
}

interface ManifestEntry extends SourceFile {
  status: 'downloaded' | 'exists' | 'failed'
  path?: string
  size?: number
}

async function main() {
  console.log('\n📥 DOWNLOADING EXTERNAL EPSTEIN DOCUMENTS\n')
  console.log('Sources: Internet Archive, Guardian, DOJ\n')
  
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  
  let downloaded = 0, failed = 0, skipped = 0
  const manifest: ManifestEntry[] = []
  
  for (const source of SOURCES) {
    const folderPath = path.join(OUTPUT_DIR, source.folder)
    await fs.mkdir(folderPath, { recursive: true })
    const outputPath = path.join(folderPath, source.filename)
    
    // Skip if exists
    try {
      const stats = await fs.stat(outputPath)
      console.log(`⏭️  ${source.name} (${(stats.size/1024/1024).toFixed(1)}MB exists)`)
      manifest.push({ ...source, status: 'exists', path: outputPath, size: stats.size })
      skipped++
      continue
    } catch {
      // File doesn't exist, continue to download
    }
    
    console.log(`📄 ${source.name}`)
    const success = await downloadFile(source.url, outputPath)
    
    if (success) {
      const stats = await fs.stat(outputPath)
      console.log(`   ✅ Downloaded (${(stats.size/1024/1024).toFixed(2)} MB)\n`)
      manifest.push({ ...source, status: 'downloaded', path: outputPath, size: stats.size })
      downloaded++
    } else {
      console.log(`   ❌ Failed\n`)
      manifest.push({ ...source, status: 'failed' })
      failed++
    }
  }
  
  // Save manifest
  await fs.writeFile(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  
  console.log('\n' + '='.repeat(50))
  console.log(`✅ Downloaded: ${downloaded}`)
  console.log(`⏭️  Skipped (exists): ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📁 Output: ${OUTPUT_DIR}/`)
  console.log('='.repeat(50) + '\n')
}

main().catch(console.error)
