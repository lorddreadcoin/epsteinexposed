/**
 * Step 1: Scrape Document List from Journalist Studio
 * 
 * This script extracts the list of all documents from the Epstein Files collection
 * on Google Journalist Studio and saves metadata for processing.
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const COLLECTION_URL = 'https://journaliststudio.google.com/pinpoint/search?collection=ea371fdea7a785c0';
const OUTPUT_DIR = './data';
const OUTPUT_FILE = './data/document-list.json';

interface DocumentMetadata {
  id: string;
  title: string;
  folder: string;
  pageCount?: number;
  url: string;
  sourceUrl: string;
}

async function ensureDirectory(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    // Directory exists
  }
}

async function scrapeDocumentList(): Promise<DocumentMetadata[]> {
  console.log('🚀 Starting document list extraction from Journalist Studio...');
  console.log(`📍 Collection URL: ${COLLECTION_URL}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const documents: DocumentMetadata[] = [];
  let pageNum = 1;
  let hasMore = true;
  
  try {
    await page.goto(COLLECTION_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Page loaded');
    
    // Wait for document list to load
    await page.waitForSelector('[data-testid="document-list"]', { timeout: 30000 }).catch(() => {
      console.log('⚠️ Document list selector not found, trying alternative...');
    });
    
    // Scroll and collect documents
    while (hasMore) {
      console.log(`📄 Scraping page ${pageNum}...`);
      
      // Extract visible documents
      const newDocs = await page.evaluate(() => {
        const docs: any[] = [];
        
        // Try multiple selectors for document items
        const selectors = [
          '[data-testid="document-item"]',
          '.document-item',
          '[role="listitem"]',
          'a[href*="/document/"]'
        ];
        
        for (const selector of selectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            items.forEach((item) => {
              const link = item.querySelector('a') || item;
              const href = link.getAttribute('href') || '';
              const title = item.textContent?.trim() || '';
              
              if (href && title) {
                // Extract document ID from URL
                const idMatch = href.match(/document\/([^/]+)/);
                const id = idMatch ? idMatch[1] : href;
                
                docs.push({
                  id,
                  title: title.substring(0, 200),
                  url: href.startsWith('http') ? href : `https://journaliststudio.google.com${href}`,
                });
              }
            });
            break;
          }
        }
        
        return docs;
      });
      
      // Add new documents (deduplicate by ID)
      const existingIds = new Set(documents.map(d => d.id));
      for (const doc of newDocs) {
        if (!existingIds.has(doc.id)) {
          documents.push({
            ...doc,
            folder: 'epstein-files',
            sourceUrl: COLLECTION_URL,
          });
          existingIds.add(doc.id);
        }
      }
      
      console.log(`   Found ${newDocs.length} documents on this page, total: ${documents.length}`);
      
      // Try to load more documents
      const loadMoreButton = await page.$('button:has-text("Load more"), [data-testid="load-more"]');
      if (loadMoreButton) {
        await loadMoreButton.click();
        await page.waitForTimeout(2000);
        pageNum++;
      } else {
        // Try scrolling to load more
        const previousCount = documents.length;
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(2000);
        
        // Check if new documents loaded
        const currentCount = documents.length;
        if (currentCount === previousCount) {
          hasMore = false;
        }
        pageNum++;
      }
      
      // Safety limit
      if (pageNum > 200) {
        console.log('⚠️ Reached page limit, stopping...');
        hasMore = false;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
  }
  
  return documents;
}

async function main() {
  console.log('='.repeat(60));
  console.log('EPSTEIN FILES - DOCUMENT LIST EXTRACTION');
  console.log('='.repeat(60));
  
  await ensureDirectory(OUTPUT_DIR);
  
  // Check if we already have a document list
  try {
    const existing = await fs.readFile(OUTPUT_FILE, 'utf-8');
    const existingDocs = JSON.parse(existing);
    console.log(`📋 Found existing document list with ${existingDocs.length} documents`);
    console.log('   Delete data/document-list.json to re-scrape');
    return;
  } catch {
    // No existing file, proceed with scraping
  }
  
  const documents = await scrapeDocumentList();
  
  // Save document list
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(documents, null, 2));
  
  console.log('='.repeat(60));
  console.log(`✅ COMPLETE: Extracted ${documents.length} documents`);
  console.log(`📁 Saved to: ${OUTPUT_FILE}`);
  console.log('='.repeat(60));
  
  // Print sample
  console.log('\n📄 Sample documents:');
  documents.slice(0, 5).forEach((doc, i) => {
    console.log(`   ${i + 1}. ${doc.title.substring(0, 60)}...`);
  });
}

main().catch(console.error);
