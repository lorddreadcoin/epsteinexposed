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

// Strip markdown formatting from AI responses to save tokens and clean display
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')           // Remove **bold**
    .replace(/\*/g, '')              // Remove *italic*
    .replace(/^#+\s/gm, '')          // Remove # headers
    .replace(/^[-•]\s/gm, '')        // Remove bullet points
    .replace(/^\d+\.\s/gm, '')       // Remove numbered lists
    .replace(/`([^`]+)`/g, '$1')     // Remove inline code
    .replace(/\n{3,}/g, '\n\n')      // Collapse multiple newlines
    .trim();
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

// Fetch actual connections between entities from the connections table
async function fetchEntityConnections(entityIds: string[]): Promise<Array<{
  entityA: string;
  entityB: string;
  strength: number;
  type: string;
}>> {
  if (entityIds.length === 0) return [];
  
  try {
    const { data: connections, error } = await supabase
      .from('connections')
      .select('entity_a_id, entity_b_id, strength, connection_type')
      .or(`entity_a_id.in.(${entityIds.join(',')}),entity_b_id.in.(${entityIds.join(',')})`)
      .order('strength', { ascending: false })
      .limit(50);
    
    if (error || !connections) return [];
    
    // Get entity names for the connections
    const allEntityIds = new Set<string>();
    connections.forEach(c => {
      allEntityIds.add(c.entity_a_id);
      allEntityIds.add(c.entity_b_id);
    });
    
    const { data: entities } = await supabase
      .from('entities')
      .select('id, name')
      .in('id', Array.from(allEntityIds));
    
    const entityNameMap = new Map((entities || []).map(e => [e.id, e.name]));
    
    return connections.map(c => ({
      entityA: entityNameMap.get(c.entity_a_id) || 'Unknown',
      entityB: entityNameMap.get(c.entity_b_id) || 'Unknown',
      strength: c.strength || 1,
      type: c.connection_type || 'co_occurrence'
    }));
  } catch (err) {
    console.error('[CONNECTIONS] Error fetching connections:', err);
    return [];
  }
}

async function searchDocuments(terms: string[], selectedEntities: string[] = [], limit = 20): Promise<{ results: DocumentResult[]; searchType: string; ocrWarnings: string[]; connections: Array<{ entityA: string; entityB: string; strength: number; type: string }> }> {
  try {
    const searchTerms = [...terms, ...selectedEntities].filter(Boolean);
    const ocrWarnings: string[] = [];
    
    if (searchTerms.length === 0) {
      return { results: [], searchType: 'none', ocrWarnings: [], connections: [] };
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
      .order('document_count', { ascending: false })
      .limit(100);
    
    if (!exactError && exactEntities && exactEntities.length > 0) {
      const entityIds = exactEntities.map(e => e.id);
      const connections = await fetchEntityConnections(entityIds);
      
      const results: DocumentResult[] = exactEntities.map((entity, idx) => ({
        id: entity.id,
        filename: `Entity: ${entity.name}`,
        excerpt: `${entity.name} (${entity.type}) - Appears in ${entity.document_count || 0} documents with ${entity.connection_count || 0} connections.`,
        entities: [entity.name],
        relevanceScore: 1 - (idx / exactEntities.length),
      }));
      return { results: results.slice(0, limit), searchType: 'exact', ocrWarnings, connections };
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
          const entityIds = fuzzyEntities.map((e: any) => e.id);
          const connections = await fetchEntityConnections(entityIds);
          return { results, searchType: 'fuzzy', ocrWarnings, connections };
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
        const entityIds = partialEntities.map(e => e.id);
        const connections = await fetchEntityConnections(entityIds);
        return { results: results.slice(0, limit), searchType: 'partial', ocrWarnings, connections };
      }
    }
    
    return { results: [], searchType: 'none', ocrWarnings, connections: [] };
  } catch (error) {
    console.error('[SEARCH] Search error:', error);
    return { results: [], searchType: 'error', ocrWarnings: [], connections: [] };
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
    const { results: relevantDocs, searchType, connections } = searchResult;
    
    console.log(`[CHAT] Found ${relevantDocs.length} documents (${searchType}), ${connections.length} connections for:`, searchTerms);
    
    // Step 2: Build context from documents
    const documentContext = relevantDocs.map(doc => ({
      id: doc.id,
      name: doc.filename,
      content: doc.excerpt,
      entities: doc.entities,
    }));
    
    // Step 3: Build connections context - THE KEY FEATURE
    let connectionsContext = '';
    if (connections.length > 0) {
      const topConnections = connections.slice(0, 20);
      connectionsContext = `\n\nKEY CONNECTIONS FOUND:\n${topConnections.map(c => 
        `${c.entityA} ↔ ${c.entityB} (strength: ${c.strength}, type: ${c.type})`
      ).join('\n')}`;
    }
    
    // Build context for the AI - simplified, no technical details exposed
    const contextText = documentContext
      .map(d => `Source: ${d.name}\nEntities: ${d.entities.join(', ')}\nContent: ${d.content}`)
      .join('\n\n---\n\n');
    
    const systemPrompt = `You are an elite intelligence analyst investigating the Epstein network. You have access to 11,622 DOJ documents and 1.3M entity connections.

CRITICAL TOKEN RULES:
- NEVER use markdown formatting. No asterisks, no hashtags, no dashes for lists.
- Write in SHORT paragraphs, 2-3 sentences max.
- Be CONCISE. Every word costs money. Maximum 200 words unless asked for detail.
- No preamble. Lead with the key finding immediately.
- Write plain prose only. No formatting whatsoever.

RESPONSE FORMAT:
Plain text only. No bold. No italic. No bullets. No numbered lists. No headers.
Example: "Bobbi Stemheim connects to Jeffrey Epstein through 3 intermediaries. She appears in 5 documents alongside States Attorney and Laura Menninger. The connection strength of 47 indicates moderate co-occurrence in legal filings."

NEVER:
- Use ** or * for emphasis
- Create lists with - or numbers
- Use # for headers
- Say "Based on the documents" or "The search results show"
- Mention document IDs, OCR errors, or technical terms
- Apologize or hedge
- Say "no connection found" if connections data is provided

DO:
- ALWAYS explain the connections between entities when provided
- State facts directly in flowing prose
- Name specific connection strengths and types
- Connect dots between entities - this is your PRIMARY job
- Keep it tight and punchy like a 30-second briefing

${contextText ? `INTELLIGENCE:\n${contextText}` : 'Limited data.'}
${connectionsContext}

${selectedEntities.length > 0 ? `FOCUS: ${selectedEntities.join(' and ')}` : ''}

Your job is to CONNECT THE DOTS. Show how entities relate to each other.`;

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
    const rawResponseText = firstContent && 'text' in firstContent ? firstContent.text : '';
    
    // Strip any markdown formatting that slipped through
    const responseText = stripMarkdown(rawResponseText);

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
