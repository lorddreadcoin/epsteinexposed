/**
 * Step 2: Extract Text from PDFs via Journalist Studio
 * 
 * Fetches document content from Journalist Studio API/pages
 * and extracts text for entity processing.
 * 
 * NOTE: We don't download/host PDFs - we extract text and link back to source
 */

import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

const DOCUMENT_LIST = './data/document-list.json';
const OUTPUT_DIR = './data/documents';
const PROGRESS_FILE = './data/text-extraction-progress.json';

// Rate limiting to be respectful
const DELAY_MS = 3000; // 3 seconds between requests
const BATCH_SIZE = 50; // Save progress every 50 docs

interface DocumentMetadata {
  id: string;
  title: string;
  folder: string;
  url: string;
  sourceUrl: string;
}

interface ExtractedDocument {
  id: string;
  title: string;
  sourceUrl: string;
  journalistStudioUrl: string;
  text: string;
  pageCount?: number;
  extractedAt: string;
}

async function ensureDirectory(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory exists
  }
}

async function loadProgress(): Promise<Set<string>> {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

async function saveProgress(processed: Set<string>) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify([...processed], null, 2));
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractDocumentText(
  page: puppeteer.Page, 
  doc: DocumentMetadata
): Promise<ExtractedDocument | null> {
  try {
    // Navigate to document page on Journalist Studio
    const docUrl = doc.url.startsWith('http') 
      ? doc.url 
      : `https://journaliststudio.google.com${doc.url}`;
    
    await page.goto(docUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Extract text content from the page
    const textContent = await page.evaluate(() => {
      // Try multiple selectors for document content
      const selectors = [
        '[data-testid="document-content"]',
        '.document-content',
        '.pdf-viewer-text',
        '[role="document"]',
        'article',
        'main',
        '.content'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent && element.textContent.length > 100) {
          return element.textContent.trim();
        }
      }
      
      // Fallback: get all text from body, excluding navigation
      const body = document.body.cloneNode(true) as HTMLElement;
      const navElements = body.querySelectorAll('nav, header, footer, [role="navigation"]');
      navElements.forEach(el => el.remove());
      
      return body.textContent?.trim() || '';
    });
    
    // Get page count if available
    const pageCount = await page.evaluate(() => {
      const pageIndicator = document.querySelector('[data-testid="page-count"], .page-count');
      if (pageIndicator) {
        const match = pageIndicator.textContent?.match(/(\d+)\s*pages?/i);
        return match ? parseInt(match[1]) : undefined;
      }
      return undefined;
    });
    
    if (!textContent || textContent.length < 50) {
      console.log(`   ⚠️ Insufficient text extracted for ${doc.id}`);
      return null;
    }
    
    return {
      id: doc.id,
      title: doc.title,
      sourceUrl: doc.sourceUrl,
      journalistStudioUrl: docUrl,
      text: textContent,
      pageCount,
      extractedAt: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error(`   ❌ Error extracting ${doc.id}:`, error);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('EPSTEIN FILES - TEXT EXTRACTION FROM JOURNALIST STUDIO');
  console.log('='.repeat(60));
  console.log('NOTE: We extract text only - PDFs stay on Journalist Studio');
  console.log('      All documents will link back to their source');
  console.log('='.repeat(60));

  await ensureDirectory(OUTPUT_DIR);

  // Load document list
  let documents: DocumentMetadata[];
  try {
    const data = await fs.readFile(DOCUMENT_LIST, 'utf-8');
    documents = JSON.parse(data);
  } catch {
    console.error(`❌ Document list not found at ${DOCUMENT_LIST}`);
    console.log('   Run step 1 (scrape-document-list) first');
    process.exit(1);
  }

  console.log(`📄 Found ${documents.length} documents to process`);

  // Load progress
  const processed = await loadProgress();
  console.log(`✅ Already processed: ${processed.size} documents`);

  const remaining = documents.filter(d => !processed.has(d.id));
  console.log(`📋 Remaining: ${remaining.length} documents`);

  if (remaining.length === 0) {
    console.log('✅ All documents already processed!');
    return;
  }

  // Launch browser
  console.log('\n🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  let successCount = 0;
  let errorCount = 0;
  let totalChars = 0;

  try {
    for (let i = 0; i < remaining.length; i++) {
      const doc = remaining[i];
      console.log(`\n[${i + 1}/${remaining.length}] Processing: ${doc.title.substring(0, 50)}...`);

      const extracted = await extractDocumentText(page, doc);

      if (extracted) {
        // Save extracted document
        await fs.writeFile(
          path.join(OUTPUT_DIR, `${doc.id}.json`),
          JSON.stringify(extracted, null, 2)
        );

        successCount++;
        totalChars += extracted.text.length;
        console.log(`   ✅ Extracted ${extracted.text.length} chars`);
      } else {
        errorCount++;
      }

      processed.add(doc.id);

      // Save progress periodically
      if ((i + 1) % BATCH_SIZE === 0) {
        await saveProgress(processed);
        console.log(`\n💾 Progress saved: ${processed.size} documents processed`);
        console.log(`   Success: ${successCount}, Errors: ${errorCount}`);
        console.log(`   Total text: ${(totalChars / 1000000).toFixed(2)}M chars`);
      }

      // Rate limiting
      await sleep(DELAY_MS);
    }

  } finally {
    await browser.close();
    await saveProgress(processed);
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEXT EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully extracted: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total text: ${(totalChars / 1000000).toFixed(2)}M characters`);
  console.log(`📁 Results saved to: ${OUTPUT_DIR}`);
  console.log(`🔗 All documents link back to Journalist Studio`);
}

main().catch(console.error);
