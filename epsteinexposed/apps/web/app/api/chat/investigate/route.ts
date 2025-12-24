import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Rate limiting to protect API costs
const RATE_LIMIT = 20; // requests per hour per IP
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 3600000 }); // 1 hour
    return true;
  }
  
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.reset) {
      rateLimitMap.delete(ip);
    }
  }
}, 300000); // Every 5 minutes

interface DocumentResult {
  id: string;
  filename: string;
  excerpt: string;
  entities: string[];
  relevanceScore: number;
}

interface Citation {
  documentId: string;
  documentName: string;
  excerpt: string;
  page?: number;
}

// Simple in-memory cache for document index
let documentIndex: Map<string, Set<string>> | null = null;
interface EntityPerson { name: string; role?: string; context?: string; }
interface EntityLocation { name: string; type?: string; }
interface EntityOrg { name: string; }
interface DocumentData {
  document?: { filename?: string; text?: string; };
  entities?: {
    people?: EntityPerson[];
    locations?: EntityLocation[];
    organizations?: EntityOrg[];
  };
}

let documentCache: Map<string, DocumentData> | null = null;

async function initializeIndex() {
  if (documentIndex && documentCache) return;
  
  documentIndex = new Map();
  documentCache = new Map();
  
  const entitiesPath = path.join(process.cwd(), '../api/data/entities');
  
  try {
    const files = await fs.readdir(entitiesPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles.slice(0, 1000)) { // Limit for performance
      try {
        const filePath = path.join(entitiesPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        const docId = file.replace('.json', '');
        
        documentCache.set(docId, data);
        
        // Build inverted index
        const entities = [
          ...(data.entities?.people?.map((p: EntityPerson) => p.name) || []),
          ...(data.entities?.locations?.map((l: EntityLocation) => l.name) || []),
          ...(data.entities?.organizations?.map((o: EntityOrg) => o.name) || []),
        ];
        
        for (const entity of entities) {
          if (!entity) continue;
          const normalized = entity.toLowerCase().trim();
          if (!documentIndex.has(normalized)) {
            documentIndex.set(normalized, new Set());
          }
          documentIndex.get(normalized)!.add(docId);
        }
      } catch {
        // Skip failed files
      }
    }
    
    console.log(`[SEARCH] Indexed ${documentCache.size} documents, ${documentIndex.size} entities`);
  } catch (error) {
    console.error('[SEARCH] Failed to initialize index:', error);
  }
}

async function searchDocuments(terms: string[], limit = 20): Promise<DocumentResult[]> {
  await initializeIndex();
  
  if (!documentIndex || !documentCache) return [];
  
  const matchedDocs = new Map<string, number>();
  
  for (const term of terms) {
    const normalized = term.toLowerCase().trim();
    
    // Exact match
    if (documentIndex.has(normalized)) {
      for (const docId of documentIndex.get(normalized)!) {
        matchedDocs.set(docId, (matchedDocs.get(docId) || 0) + 2);
      }
    }
    
    // Partial match
    for (const [entity, docs] of documentIndex.entries()) {
      if (entity.includes(normalized) || normalized.includes(entity)) {
        for (const docId of docs) {
          matchedDocs.set(docId, (matchedDocs.get(docId) || 0) + 1);
        }
      }
    }
  }
  
  const results: DocumentResult[] = [];
  const scores = Array.from(matchedDocs.values());
  const maxScore = scores.length > 0 ? Math.max(...scores) : 1;
  
  for (const [docId, score] of matchedDocs.entries()) {
    const docData = documentCache.get(docId);
    if (!docData) continue;
    
    results.push({
      id: docId,
      filename: docData.document?.filename || `${docId}.pdf`,
      excerpt: docData.document?.text?.slice(0, 500) || 
               JSON.stringify(docData.entities).slice(0, 500),
      entities: [
        ...(docData.entities?.people?.map((p: EntityPerson) => p.name) || []),
        ...(docData.entities?.locations?.map((l: EntityLocation) => l.name) || []),
      ].slice(0, 10),
      relevanceScore: maxScore > 0 ? score / maxScore : 0,
    });
  }
  
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

function extractKeyTerms(message: string): string[] {
  const words = message.split(/\s+/);
  return words.filter(w => {
    if (w.length <= 3) return false;
    const firstChar = w.charAt(0);
    return firstChar === firstChar.toUpperCase() || /\d{4}/.test(w);
  });
}

function extractCitations(text: string, docs: DocumentResult[]): Citation[] {
  const citations: Citation[] = [];
  const citationPattern = /\[DOC-([^\]]+)\]/g;
  
  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    const docId = match[1];
    const doc = docs.find(d => d.id === docId || d.id.includes(docId));
    if (doc) {
      citations.push({
        documentId: doc.id,
        documentName: doc.filename,
        excerpt: doc.excerpt.substring(0, 150) + '...',
      });
    }
  }
  
  // Also add top matching docs as potential citations
  if (citations.length === 0 && docs.length > 0) {
    for (const doc of docs.slice(0, 3)) {
      citations.push({
        documentId: doc.id,
        documentName: doc.filename,
        excerpt: doc.excerpt.substring(0, 150) + '...',
      });
    }
  }
  
  return citations;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', rateLimited: true },
        { status: 429 }
      );
    }
    
    const { message, context } = await req.json();
    const selectedEntities = context?.selectedEntities || [];
    const conversationHistory = context?.conversationHistory || [];
    
    // Step 1: Search documents for relevant content
    const searchTerms = [
      ...selectedEntities,
      ...extractKeyTerms(message),
    ].filter(Boolean);
    
    const relevantDocs = await searchDocuments(searchTerms, 20);
    
    console.log(`[CHAT] Found ${relevantDocs.length} relevant documents for:`, searchTerms);
    
    // Step 2: Build context from documents
    const documentContext = relevantDocs.map(doc => ({
      id: doc.id,
      name: doc.filename,
      content: doc.excerpt,
      entities: doc.entities,
    }));
    
    // Step 3: Build system prompt - DOCUMENT-GROUNDED ONLY
    const contextText = documentContext
      .map(d => `[DOC-${d.id}] ${d.name}\nEntities: ${d.entities.join(', ')}\nContent: ${d.content}`)
      .join('\n\n---\n\n');
    
    const systemPrompt = `You are an investigative research assistant analyzing the Jeffrey Epstein DOJ document releases.

CRITICAL RULES:
1. You may ONLY cite information that exists in the provided documents
2. NEVER hallucinate or make up information
3. NEVER reference external sources
4. Every claim must be traceable to a specific document using [DOC-xxx] format
5. If information is not in the documents, say "This information is not found in the available documents."
6. Use a professional, factual tone - no sensationalism

AVAILABLE DOCUMENTS FOR THIS QUERY:
${contextText || 'No documents found matching this query.'}

${selectedEntities.length > 0 ? `
ENTITIES BEING ANALYZED:
${selectedEntities.join(', ')}

Focus your analysis on connections and mentions of these specific entities.
` : ''}

Respond in a clear, structured format. Always cite specific documents when making claims using [DOC-xxx] format.`;

    // Step 4: Call Claude API with temperature 0 for factual accuracy
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        ...conversationHistory.slice(-5).map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ],
    });

    const firstContent = response.content[0];
    const responseText = firstContent && 'text' in firstContent ? firstContent.text : '';

    // Step 5: Extract citations from response
    const citations = extractCitations(responseText, relevantDocs);

    // Step 6: Check if we found useful info
    const noDocumentResults = relevantDocs.length === 0 || 
      responseText.toLowerCase().includes('not found in the available documents');

    return NextResponse.json({
      response: responseText,
      citations,
      noDocumentResults,
      documentsSearched: relevantDocs.length,
    });

  } catch (error) {
    console.error('[CHAT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: String(error) },
      { status: 500 }
    );
  }
}
