import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

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

async function searchDocuments(terms: string[], selectedEntities: string[] = [], limit = 20): Promise<DocumentResult[]> {
  try {
    // Search for entities matching the terms
    const searchTerms = [...terms, ...selectedEntities].filter(Boolean);
    
    if (searchTerms.length === 0) {
      return [];
    }
    
    // Build search query - match any of the terms
    const { data: entities, error } = await supabase
      .from('entities')
      .select('id, name, type, metadata')
      .or(searchTerms.map(term => `name.ilike.%${term}%`).join(','))
      .limit(100);
    
    if (error) {
      console.error('[SEARCH] Entity search error:', error);
      return [];
    }
    
    if (!entities || entities.length === 0) {
      return [];
    }
    
    // Create mock document results from entities
    // In a real implementation, you'd query a documents table
    const results: DocumentResult[] = entities.map((entity, idx) => ({
      id: entity.id,
      filename: `Document containing ${entity.name}`,
      excerpt: `Entity: ${entity.name} (${entity.type}). This entity appears in ${entity.metadata?.documentCount || 0} documents.`,
      entities: [entity.name],
      relevanceScore: 1 - (idx / entities.length), // Descending relevance
    }));
    
    return results.slice(0, limit);
  } catch (error) {
    console.error('[SEARCH] Search error:', error);
    return [];
  }
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
    
    const relevantDocs = await searchDocuments(searchTerms, selectedEntities, 20);
    
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
