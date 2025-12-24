import { config } from 'dotenv';
import path from 'path';

// Load .env.local explicitly
config({ path: path.join(__dirname, '../.env.local') });

import { DocumentIngestionService } from '../src/services/document-ingestion.service';

async function main() {
  console.log('Starting Epstein document ingestion...\n');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable not set!');
    console.error('   Create apps/api/.env.local with: ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }
  
  const service = new DocumentIngestionService();
  
  try {
    const results = await service.ingestAllDocuments();
    console.log('\n✅ Ingestion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error);
    process.exit(1);
  }
}

main();
