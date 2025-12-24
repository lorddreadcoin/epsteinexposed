import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import Anthropic from '@anthropic-ai/sdk';
import { LocalExtractorService, LocalExtractedEntities } from './local-extractor.service';

interface Document {
  id: string;
  filename: string;
  path: string;
  text: string;
  pageCount: number;
  dataset: string;
}

interface ExtractedEntities {
  people: Array<{ name: string; role: string; context: string }>;
  locations: Array<{ name: string; type: string }>;
  dates: Array<{ date: string; event: string }>;
  flights: Array<{ from: string; to: string; date: string; passengers: string[] }>;
  phone_numbers: string[];
  organizations: Array<{ name: string }>;
}

export class DocumentIngestionService {
  private docsBasePath: string;
  private anthropic: Anthropic;
  private localExtractor: LocalExtractorService;
  private stats = {
    localExtractions: 0,
    claudeExtractions: 0,
    tokensUsed: 0,
    tokensSaved: 0,
  };
  
  constructor() {
    // Documents are in apps/web directory
    this.docsBasePath = path.join(__dirname, '../../../web');
    // Initialize Anthropic client here after dotenv has loaded
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
    this.localExtractor = new LocalExtractorService();
  }
  
  async ingestAllDocuments() {
    console.log('🔍 Starting document ingestion...');
    console.log(`📂 Base path: ${this.docsBasePath}`);
    
    const files = await this.findAllPDFs(this.docsBasePath);
    console.log(`📄 Found ${files.length} PDF files\n`);
    
    const results = {
      total: files.length,
      processed: 0,
      failed: 0,
      entities: {
        people: 0,
        locations: 0,
        dates: 0,
        flights: 0,
      }
    };
    
    for (const filePath of files) {
      try {
        const relativePath = path.relative(this.docsBasePath, filePath);
        console.log(`\n📄 Processing: ${relativePath}`);
        
        const doc = await this.processPDF(filePath);
        const entities = await this.extractEntitiesFromDocument(doc);
        
        // Update counts
        results.processed++;
        results.entities.people += entities.people.length;
        results.entities.locations += entities.locations.length;
        results.entities.dates += entities.dates.length;
        results.entities.flights += entities.flights.length;
        
        console.log(`   ✅ Success - ${entities.people.length} people, ${entities.locations.length} locations, ${entities.flights.length} flights`);
        
      } catch (error: unknown) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Failed: ${errorMessage}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 INGESTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total files: ${results.total}`);
    console.log(`Processed: ${results.processed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`\nEntities extracted:`);
    console.log(`  People: ${results.entities.people}`);
    console.log(`  Locations: ${results.entities.locations}`);
    console.log(`  Dates: ${results.entities.dates}`);
    console.log(`  Flights: ${results.entities.flights}`);
    console.log(`\n💰 TOKEN SAVINGS:`);
    console.log(`  Local extractions: ${this.stats.localExtractions}`);
    console.log(`  Claude extractions: ${this.stats.claudeExtractions}`);
    console.log(`  Tokens used: ${this.stats.tokensUsed.toLocaleString()}`);
    console.log(`  Tokens saved: ${this.stats.tokensSaved.toLocaleString()}`);
    const savingsPercent = this.stats.tokensSaved > 0 
      ? ((this.stats.tokensSaved / (this.stats.tokensSaved + this.stats.tokensUsed)) * 100).toFixed(1)
      : '100';
    console.log(`  Savings: ${savingsPercent}%`);
    
    return results;
  }
  
  private async findAllPDFs(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          // Skip node_modules and .next directories
          if (!item.name.startsWith('.') && item.name !== 'node_modules') {
            const subFiles = await this.findAllPDFs(fullPath);
            files.push(...subFiles);
          }
        } else if (item.name.toLowerCase().endsWith('.pdf')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dir}:`, error);
    }
    
    return files;
  }
  
  private async processPDF(filePath: string): Promise<Document> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    
    // Determine which dataset this belongs to
    const dataset = this.getDatasetFromPath(filePath);
    
    return {
      id: this.generateDocId(filePath),
      filename: path.basename(filePath),
      path: filePath,
      text: data.text,
      pageCount: data.numpages,
      dataset,
    };
  }
  
  private async extractEntitiesFromDocument(doc: Document): Promise<ExtractedEntities> {
    const allEntities: ExtractedEntities = {
      people: [],
      locations: [],
      dates: [],
      flights: [],
      phone_numbers: [],
      organizations: [],
    };
    
    // STEP 1: Local extraction first (FREE - no API calls)
    console.log(`   📋 Running local pattern extraction...`);
    const localEntities = this.localExtractor.extractAll(doc.text);
    
    // Estimate tokens we would have used
    const estimatedTokens = Math.ceil(doc.text.length / 4);
    
    // Convert local entities to our format
    for (const person of localEntities.people) {
      allEntities.people.push({
        name: person.name,
        role: 'extracted',
        context: person.context,
      });
    }
    
    for (const loc of localEntities.locations) {
      allEntities.locations.push({
        name: loc.name,
        type: loc.type,
      });
    }
    
    for (const date of localEntities.dates) {
      allEntities.dates.push({
        date: date.date,
        event: date.raw,
      });
    }
    
    for (const flight of localEntities.flights) {
      allEntities.flights.push({
        from: flight.from,
        to: flight.to,
        date: flight.date,
        passengers: flight.passengers,
      });
    }
    
    allEntities.phone_numbers = localEntities.phone_numbers.map(p => p.number);
    
    const localCount = allEntities.people.length + allEntities.locations.length + 
                       allEntities.dates.length + allEntities.flights.length;
    
    console.log(`   ✅ Local: ${localEntities.people.length} people, ${localEntities.locations.length} locations, ${localEntities.dates.length} dates, ${localEntities.flights.length} flights`);
    
    // STEP 2: Check if we need Claude (only for complex/ambiguous docs)
    const needsClaude = this.localExtractor.needsClaudeAnalysis(localEntities, doc.text.length);
    
    if (needsClaude) {
      console.log(`   🤖 Document needs Claude analysis (low local extraction)...`);
      
      // Only send a SUMMARY to Claude, not the full text
      const summary = this.createDocumentSummary(doc.text, localEntities);
      
      try {
        const message = await this.anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `Analyze this document summary and extract any ADDITIONAL entities not already found. Return ONLY JSON:

Already found: ${localCount} entities
Document: ${doc.filename} (${doc.pageCount} pages)

Summary (first 2000 chars):
${summary}

Return JSON with ONLY NEW entities not in the "already found" list:
{"people": [{"name": "", "role": "", "context": ""}], "locations": [{"name": "", "type": ""}], "organizations": [{"name": ""}]}`
          }]
        });
        
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
        const claudeEntities = JSON.parse(responseText);
        
        // Track token usage
        this.stats.claudeExtractions++;
        this.stats.tokensUsed += (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);
        
        // Merge Claude entities
        allEntities.people.push(...(claudeEntities.people || []));
        allEntities.locations.push(...(claudeEntities.locations || []));
        allEntities.organizations.push(...(claudeEntities.organizations || []));
        
        console.log(`   🤖 Claude added: ${(claudeEntities.people || []).length} people, ${(claudeEntities.locations || []).length} locations`);
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ⚠️  Claude extraction failed: ${errorMessage}`);
      }
    } else {
      // Track savings
      this.stats.localExtractions++;
      this.stats.tokensSaved += estimatedTokens;
      console.log(`   💰 Skipped Claude (saved ~${estimatedTokens.toLocaleString()} tokens)`);
    }
    
    // Save to JSON file
    await this.saveEntitiesToFile(doc, allEntities);
    
    return allEntities;
  }
  
  private createDocumentSummary(text: string, localEntities: LocalExtractedEntities): string {
    // Create a compact summary for Claude
    const lines = text.split('\n').filter(l => l.trim().length > 20);
    const uniqueLines = [...new Set(lines)].slice(0, 50);
    return uniqueLines.join('\n').slice(0, 2000);
  }
  
  private chunkText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + maxLength;
      
      if (end < text.length) {
        const lastNewline = text.lastIndexOf('\n\n', end);
        if (lastNewline > start) {
          end = lastNewline;
        }
      }
      
      chunks.push(text.slice(start, end));
      start = end;
    }
    
    return chunks;
  }
  
  private generateDocId(filePath: string): string {
    return path.basename(filePath, '.pdf')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
  }
  
  private getDatasetFromPath(filePath: string): string {
    const match = filePath.match(/DataSet (\d+)/i);
    if (match) return `Dataset ${match[1]}`;
    
    if (filePath.includes('Flight Log')) return 'Flight Logs';
    if (filePath.includes('Contact Book')) return 'Contact Book';
    if (filePath.includes('Masseuse List')) return 'Masseuse List';
    if (filePath.includes('Evidence List')) return 'Evidence List';
    if (filePath.includes('DOJ') || filePath.includes('OIG')) return 'DOJ Reports';
    
    return 'Uncategorized';
  }
  
  private async saveEntitiesToFile(doc: Document, entities: ExtractedEntities) {
    const outputDir = path.join(__dirname, '../../data/entities');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `${doc.id}.json`);
    await fs.writeFile(outputPath, JSON.stringify({
      document: doc,
      entities,
      processedAt: new Date().toISOString(),
    }, null, 2));
  }
}
