# Epstein Files Data Extraction Pipeline

## Overview
This pipeline extracts entity data from the complete Journalist Studio Epstein Files collection (14,762+ documents) and populates our Supabase database for unified data access.

## Data Source
- **Collection**: New Epstein Files
- **URL**: https://journaliststudio.google.com/pinpoint/search?collection=ea371fdea7a785c0
- **Documents**: 14,762+ PDFs
- **Content**: DOJ releases, flight logs, black book, depositions, court records

## Pipeline Steps

1. **Document List Extraction** (`01-scrape-document-list.ts`)
   - Scrapes document metadata from Journalist Studio
   - Saves to `data/document-list.json`

2. **PDF Text Extraction** (`02-extract-pdf-text.ts`)
   - Downloads and extracts text from each PDF
   - Saves to `data/documents/{doc_id}.json`

3. **Entity Extraction** (`03-extract-entities.ts`)
   - Uses OpenRouter API (GPT-4o-mini) to extract entities
   - Extracts: people, locations, organizations, dates, flights
   - Saves to `data/entities/{doc_id}.json`

4. **Supabase Upload** (`04-upload-to-supabase.ts`)
   - Uploads all entities and connections to Supabase
   - Creates unified data source for graph + AI

5. **Verification** (`05-verify-data.ts`)
   - Validates data integrity
   - Generates statistics report

## Usage

```bash
# Install dependencies
npm install

# Run full pipeline
npm run extract:all

# Or run individual steps
npm run extract:list      # Step 1
npm run extract:text      # Step 2
npm run extract:entities  # Step 3
npm run upload:supabase   # Step 4
npm run verify            # Step 5
```

## Environment Variables Required
- `OPENROUTER_API_KEY` - For entity extraction
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key

## Estimated Processing Time
- Document list: ~5 minutes
- PDF extraction: ~2-4 hours (rate limited)
- Entity extraction: ~8-12 hours (API rate limited)
- Supabase upload: ~1 hour
- Total: ~12-18 hours

## Cost Estimate
- OpenRouter GPT-4o-mini: ~$0.15/1M input, $0.60/1M output
- Estimated 14,762 docs × ~2K tokens avg = ~30M tokens
- Estimated cost: ~$20-50
