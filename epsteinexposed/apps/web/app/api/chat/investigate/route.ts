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

// Check if a term looks like an OCR error
function detectOCRError(term: string): boolean {
  // Patterns that suggest OCR errors:
  // - Mix of uppercase in wrong places (AmoTml)
  // - Unusual character sequences
  // - Very short nonsense words
  const hasWeirdCaps = /[a-z][A-Z]/.test(term) || /[A-Z]{2,}[a-z][A-Z]/.test(term);
  const hasDigitLetterMix = /\d[a-zA-Z]|[a-zA-Z]\d/.test(term) && !/\d{4}/.test(term);
  const looksLikeNonsense = term.length > 3 && !/[aeiou]/i.test(term);
  return hasWeirdCaps || hasDigitLetterMix || looksLikeNonsense;
}

async function searchDocuments(terms: string[], selectedEntities: string[] = [], limit = 20): Promise<{ results: DocumentResult[]; searchType: string; ocrWarnings: string[] }> {
  try {
    const searchTerms = [...terms, ...selectedEntities].filter(Boolean);
    const ocrWarnings: string[] = [];
    
    if (searchTerms.length === 0) {
      return { results: [], searchType: 'none', ocrWarnings: [] };
    }
    
    // Check for OCR errors in search terms
    for (const term of searchTerms) {
      if (detectOCRError(term)) {
        ocrWarnings.push(`"${term}" may be an OCR error from scanned documents. Try alternate spellings.`);
      }
    }
    
    // First try exact/contains match
    const { data: exactEntities, error: exactError } = await supabase
      .from('entities')
      .select('id, name, type, document_count, connection_count')
      .or(searchTerms.map(term => `name.ilike.%${term}%`).join(','))
      .order('connection_count', { ascending: false })
      .limit(100);
    
    if (!exactError && exactEntities && exactEntities.length > 0) {
      const results: DocumentResult[] = exactEntities.map((entity, idx) => ({
        id: entity.id,
        filename: `Entity: ${entity.name}`,
        excerpt: `${entity.name} (${entity.type}) - Appears in ${entity.document_count || 0} documents with ${entity.connection_count || 0} connections.`,
        entities: [entity.name],
        relevanceScore: 1 - (idx / exactEntities.length),
      }));
      return { results: results.slice(0, limit), searchType: 'exact', ocrWarnings };
    }
    
    // Fall back to fuzzy search using RPC function (if available)
    try {
      for (const term of searchTerms) {
        const { data: fuzzyEntities, error: fuzzyError } = await supabase
          .rpc('fuzzy_search_entities', { search_term: term, limit_count: limit });
        
        if (!fuzzyError && fuzzyEntities && fuzzyEntities.length > 0) {
          const results: DocumentResult[] = fuzzyEntities.map((entity: any, idx: number) => ({
            id: entity.id,
            filename: `Similar: ${entity.name} (${Math.round((entity.similarity || 0) * 100)}% match)`,
            excerpt: `${entity.name} (${entity.type}) - Similar to "${term}". ${entity.document_count || 0} documents, ${entity.connection_count || 0} connections.`,
            entities: [entity.name],
            relevanceScore: entity.similarity || (1 - idx / fuzzyEntities.length),
          }));
          return { results, searchType: 'fuzzy', ocrWarnings };
        }
      }
    } catch (fuzzyErr) {
      console.log('[SEARCH] Fuzzy search not available, using fallback');
    }
    
    // Last resort: search with just the first 3 characters of each term
    const partialTerms = searchTerms.map(t => t.substring(0, 3)).filter(t => t.length >= 3);
    if (partialTerms.length > 0) {
      const { data: partialEntities } = await supabase
        .from('entities')
        .select('id, name, type, document_count, connection_count')
        .or(partialTerms.map(term => `name.ilike.%${term}%`).join(','))
        .order('connection_count', { ascending: false })
        .limit(50);
      
      if (partialEntities && partialEntities.length > 0) {
        const results: DocumentResult[] = partialEntities.map((entity, idx) => ({
          id: entity.id,
          filename: `Partial match: ${entity.name}`,
          excerpt: `${entity.name} (${entity.type}) - Partial match. ${entity.document_count || 0} documents, ${entity.connection_count || 0} connections.`,
          entities: [entity.name],
          relevanceScore: 0.5 - (idx / partialEntities.length) * 0.5,
        }));
        return { results: results.slice(0, limit), searchType: 'partial', ocrWarnings };
      }
    }
    
    return { results: [], searchType: 'none', ocrWarnings };
  } catch (error) {
    console.error('[SEARCH] Search error:', error);
    return { results: [], searchType: 'error', ocrWarnings: [] };
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
    
    const searchResult = await searchDocuments(searchTerms, selectedEntities, 20);
    const { results: relevantDocs, searchType, ocrWarnings } = searchResult;
    
    console.log(`[CHAT] Found ${relevantDocs.length} documents (${searchType}) for:`, searchTerms);
    
    // Step 2: Build context from documents
    const documentContext = relevantDocs.map(doc => ({
      id: doc.id,
      name: doc.filename,
      content: doc.excerpt,
      entities: doc.entities,
    }));
    
    // Step 3: Build OCR warning context
    let ocrContext = '';
    if (ocrWarnings.length > 0) {
      ocrContext = `\n\nPOTENTIAL OCR ERRORS DETECTED:\n${ocrWarnings.join('\n')}\nConsider suggesting alternate spellings or similar names to the user.`;
    }
    
    // Build search type context
    let searchContext = '';
    if (searchType === 'fuzzy') {
      searchContext = '\n\nNote: No exact matches found. Results are fuzzy/similar matches. Inform the user about the similarity percentages.';
    } else if (searchType === 'partial') {
      searchContext = '\n\nNote: Only partial matches found. Ask the user for more specific search terms.';
    } else if (searchType === 'none') {
      searchContext = '\n\nNo matching entities found. Help the user by suggesting: (1) alternate spellings, (2) related entities they might mean, (3) common OCR errors like l→1, O→0, rn→m.';
    }
    
    const contextText = documentContext
      .map(d => `[DOC-${d.id}] ${d.name}\nEntities: ${d.entities.join(', ')}\nContent: ${d.content}`)
      .join('\n\n---\n\n');
    
    const systemPrompt = `You are an expert investigative analyst for the Epstein Exposed platform. You have access to 33,824 entities and 1.3 million connections extracted from 11,622 DOJ documents.

YOUR ROLE:
- Help users explore connections and patterns in the Epstein document network
- Explain relationships between entities (people, locations, organizations, dates, flights)
- Identify potential OCR errors and suggest corrections
- Ask clarifying questions when queries are ambiguous

WHEN SEARCH RESULTS ARE POOR:
1. If an entity name looks like an OCR error (nonsense words, weird capitalization), say so and suggest what it might actually be
2. If you find no results, suggest similar-sounding entities the user might mean
3. If results are ambiguous, ask: "Are you looking for [Person A] or [Person B]?"

WHEN EXPLAINING CONNECTIONS:
- State the connection strength (how many documents they appear together in)
- Explain the context (financial records, flight logs, witness statements, etc.)
- Note any patterns (same time periods, locations, or third-party connections)

ALWAYS:
- Be direct and factual
- Cite document IDs when making claims using [DOC-xxx] format
- Acknowledge when information is incomplete or uncertain
- Suggest next steps for the investigation

NEVER:
- Make up information not in the documents
- Speculate about guilt or innocence
- Provide sensationalized interpretations

${ocrContext}${searchContext}

AVAILABLE DOCUMENTS FOR THIS QUERY:
${contextText || 'No documents found matching this query.'}

${selectedEntities.length > 0 ? `
ENTITIES BEING ANALYZED:
${selectedEntities.join(', ')}

Focus your analysis on connections and mentions of these specific entities.
` : ''}

If no results were found, explain this to the user and offer helpful suggestions for finding what they're looking for.`;

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
