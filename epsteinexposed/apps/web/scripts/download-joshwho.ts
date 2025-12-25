import * as fs from 'fs/promises'
import { createWriteStream, existsSync, statSync } from 'fs'
import * as path from 'path'
import https from 'https'

const OUTPUT_DIR = './external-docs/unredacted'

const JOSHWHO_SOURCES = [
  {
    name: 'Giuffre vs Maxwell Combined (943 pages)',
    url: 'https://joshwho.net/EpsteinList/gov.uscourts.nysd.447706.1320.0-combined.pdf',
    filename: 'giuffre-vs-maxwell-943-pages-unredacted.pdf',
    description: '943 pages of court documents from Virginia Giuffre\'s case against Ghislaine Maxwell'
  },
  {
    name: 'Black Book Unredacted (Full)',
    url: 'https://joshwho.net/EpsteinList/black-book-unredacted.pdf',
    filename: 'epstein-black-book-full-unredacted.pdf',
    description: 'Complete unredacted version of Jeffrey Epstein\'s address book/Rolodex'
  }
]

function downloadFile(url: string, outputPath: string): Promise<{ success: boolean; size?: number; error?: string }> {
  return new Promise((resolve) => {
    console.log(`   Downloading from: ${url}`)
    
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      },
      timeout: 300000 // 5 minutes for large files
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          console.log(`   ↪️ Redirecting...`)
          downloadFile(redirectUrl, outputPath).then(resolve)
          return
        }
      }
      
      if (response.statusCode !== 200) {
        console.log(`   ❌ HTTP ${response.statusCode}`)
        resolve({ success: false, error: `HTTP ${response.statusCode}` })
        return
      }
      
      const fileStream = createWriteStream(outputPath)
      let downloadedBytes = 0
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length
        process.stdout.write(`\r   📥 ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB downloaded...`)
      })
      
      response.pipe(fileStream)
      
      fileStream.on('finish', () => {
        fileStream.close()
        console.log(`\n   ✅ Complete: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`)
        resolve({ success: true, size: downloadedBytes })
      })
      
      fileStream.on('error', (err) => {
        resolve({ success: false, error: err.message })
      })
    })
    
    request.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
    
    request.on('timeout', () => {
      request.destroy()
      resolve({ success: false, error: 'Timeout' })
    })
  })
}

async function main() {
  console.log('\n📥 DOWNLOADING JOSHWHO UNREDACTED DOCUMENTS\n')
  console.log('Source: joshwho.net/EpsteinList/')
  console.log('Content: Giuffre vs Maxwell (943 pages) + Full Black Book\n')
  
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  
  const results: any[] = []
  
  for (const source of JOSHWHO_SOURCES) {
    const outputPath = path.join(OUTPUT_DIR, source.filename)
    
    console.log(`📄 ${source.name}`)
    console.log(`   ${source.description}`)
    
    // Check if exists
    if (existsSync(outputPath)) {
      const stats = statSync(outputPath)
      console.log(`   ⏭️ Already exists (${(stats.size / 1024 / 1024).toFixed(1)} MB)\n`)
      results.push({ ...source, status: 'exists', size: stats.size })
      continue
    }
    
    const result = await downloadFile(source.url, outputPath)
    
    if (result.success) {
      results.push({ ...source, status: 'downloaded', size: result.size })
    } else {
      console.log(`   ❌ Failed: ${result.error}\n`)
      results.push({ ...source, status: 'failed', error: result.error })
    }
    
    console.log('')
  }
  
  // Save manifest
  const manifest = {
    source: 'joshwho.net/EpsteinList/',
    description: 'Community-sourced unredacted Epstein documents',
    downloadedAt: new Date().toISOString(),
    files: results,
    note: 'These are PUBLIC documents. Names extracted from Giuffre vs Maxwell court filings.'
  }
  
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'joshwho-manifest.json'),
    JSON.stringify(manifest, null, 2)
  )
  
  // Summary
  console.log('='.repeat(50))
  console.log('📊 JOSHWHO DOWNLOAD COMPLETE')
  console.log('='.repeat(50))
  
  const downloaded = results.filter(r => r.status === 'downloaded')
  const existing = results.filter(r => r.status === 'exists')
  const failed = results.filter(r => r.status === 'failed')
  
  console.log(`✅ Downloaded: ${downloaded.length}`)
  console.log(`⏭️ Already existed: ${existing.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  
  const totalSize = results
    .filter(r => r.size)
    .reduce((a, b) => a + (b.size || 0), 0)
  console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`)
  
  console.log(`\n📁 Files saved to: ${OUTPUT_DIR}/`)
}

main().catch(console.error)
