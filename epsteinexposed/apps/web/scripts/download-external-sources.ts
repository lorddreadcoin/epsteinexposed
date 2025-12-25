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
  // ═══════════════════════════════════════════════════════════════════
  // COURT FILINGS - VERIFIED WORKING
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Giuffre v Maxwell Unsealed 2024',
    url: 'https://uploads.guim.co.uk/2024/01/04/Final_Epstein_documents.pdf',
    filename: 'giuffre-v-maxwell-unsealed-2024.pdf',
    folder: 'court-filings',
    isUnredacted: false
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // DOCUMENTCLOUD - PUBLIC COURT DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Epstein Flight Logs (Gawker)',
    url: 'https://assets.documentcloud.org/documents/1507315/epstein-flight-manifests.pdf',
    filename: 'epstein-flight-manifests-gawker.pdf',
    folder: 'flight-logs',
    isUnredacted: true
  },
  {
    name: 'Flight Logs 2021 Release',
    url: 'https://assets.documentcloud.org/documents/21165424/epstein-flight-manifests.pdf',
    filename: 'epstein-flight-logs-2021.pdf',
    folder: 'flight-logs',
    isUnredacted: true
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // COURTLISTENER / PACER DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Maxwell Criminal Complaint',
    url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.539612/gov.uscourts.nysd.539612.1.0.pdf',
    filename: 'maxwell-criminal-complaint.pdf',
    folder: 'court-filings',
    isUnredacted: false
  },
  {
    name: 'Maxwell Indictment',
    url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.539612/gov.uscourts.nysd.539612.2.0.pdf',
    filename: 'maxwell-indictment.pdf',
    folder: 'court-filings',
    isUnredacted: true
  },
  {
    name: 'Epstein Indictment SDNY',
    url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.517520/gov.uscourts.nysd.517520.2.0.pdf',
    filename: 'epstein-indictment-sdny.pdf',
    folder: 'court-filings',
    isUnredacted: true
  },
  {
    name: 'Epstein Non-Prosecution Agreement',
    url: 'https://storage.courtlistener.com/recap/gov.uscourts.flsd.350114/gov.uscourts.flsd.350114.1.0.pdf',
    filename: 'epstein-npa-florida.pdf',
    folder: 'court-filings',
    isUnredacted: true
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // ARCHIVE.ORG - UNREDACTED BLACK BOOKS (Multiple mirrors)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Black Book Unredacted + Flight Logs',
    url: 'https://ia800601.us.archive.org/15/items/jeffrey-epsteins-black-book-unredacted-with-bonus-flight-logs-jeffrey-epstein/Jeffrey%20Epsteins%20Black%20Book%20UNREDACTED%20with%20Bonus%20Flight%20Logs%20Jeffrey%20Epstein.pdf',
    filename: 'black-book-unredacted-flight-logs.pdf',
    folder: 'unredacted',
    isUnredacted: true
  },
  {
    name: 'Little Black Book Original',
    url: 'https://ia803203.us.archive.org/22/items/jeffrey-epsteins-little-black-book-unredacted_202006/Jeffrey%20Epstein%27s%20Little%20Black%20Book%20unredacted.pdf',
    filename: 'little-black-book-original.pdf',
    folder: 'unredacted',
    isUnredacted: true
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // HOUSE OVERSIGHT / GOVERNMENT RELEASES
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'House Oversight Epstein Estate Batch',
    url: 'https://oversightdemocrats.house.gov/sites/evo-subsites/democrats-oversight.house.gov/files/Epstein%20Estate%20Documents.pdf',
    filename: 'oversight-estate-documents.pdf',
    folder: 'house-oversight',
    isUnredacted: false
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // FLORIDA CASE FILES
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Palm Beach Police Report',
    url: 'https://assets.documentcloud.org/documents/1508967/palm-beach-police-report.pdf',
    filename: 'palm-beach-police-report.pdf',
    folder: 'florida-case',
    isUnredacted: true
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // VICTIM STATEMENTS & DEPOSITIONS
  // ═══════════════════════════════════════════════════════════════════
  {
    name: 'Victim Impact Statements',
    url: 'https://storage.courtlistener.com/recap/gov.uscourts.nysd.517520/gov.uscourts.nysd.517520.48.0.pdf',
    filename: 'victim-impact-statements.pdf',
    folder: 'victim-statements',
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
