import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Rate limiting to protect API costs
const RATE_LIMIT = 50; // requests per hour per IP (increased since cheaper)
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

// System prompt optimized for token efficiency
const SYSTEM_PROMPT = `You are an elite intelligence analyst investigating the Epstein network. You have access to 11,622 DOJ documents and 1.3M entity connections.

RULES:
- Be CONCISE. Max 200 words unless complex analysis needed.
- NO markdown formatting (no **, no *, no #, no bullets)
- NO preamble like "Based on the documents..." 
- Lead with the key finding immediately
- State facts directly with specific numbers
- Connect dots between entities - this is your PRIMARY job
- If connections data is provided, ALWAYS explain the relationships

RESPONSE STYLE:
Write in plain prose. Short paragraphs. Like a senior analyst giving a 30-second briefing.

Example good response:
"Bobbi Stemheim connects to Jeffrey Epstein through States Attorney (strength 47) and Laura Menninger (strength 32). She appears in 5 documents related to Maxwell court proceedings. The connection pattern suggests involvement in legal defense coordination."

Be direct. Be specific. No fluff.`;

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

// Strip any markdown that slips through
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#+\s/gm, '')
    .replace(/^[-•]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
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
    
    // Build context for the AI
    const contextText = documentContext
      .map(d => `Source: ${d.name}\nEntities: ${d.entities.join(', ')}\nContent: ${d.content}`)
      .join('\n\n---\n\n');

    // Step 4: Call GPT-4o-mini via OpenRouter (much cheaper than Claude)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    
    if (!openrouterKey) {
      console.error('[CHAT] Missing OPENROUTER_API_KEY');
      return NextResponse.json({
        response: 'Investigation API is not configured. Please add OPENROUTER_API_KEY.',
        error: 'API not configured'
      });
    }

    // Build the full context for the AI
    const fullContext = `${contextText ? `INTELLIGENCE:\n${contextText}` : 'Limited data.'}${connectionsContext}\n\n${selectedEntities.length > 0 ? `FOCUS: ${selectedEntities.join(' and ')}` : ''}`;

    const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://epsteinexposed.netlify.app',
        'X-Title': 'Epstein Exposed Investigation'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory.slice(-5).map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
          { 
            role: 'user', 
            content: fullContext 
              ? `Context from database:\n${fullContext}\n\nUser question: ${message}` 
              : message
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('[CHAT] OpenRouter error:', apiResponse.status, errorText);
      return NextResponse.json({
        response: `Analysis engine temporarily unavailable. Please try again.`,
        error: `OpenRouter API error: ${apiResponse.status}`
      });
    }

    const data = await apiResponse.json();
    const rawResponseText = data.choices?.[0]?.message?.content || 'No response generated';
    
    // Strip any markdown formatting that slipped through
    const responseText = stripMarkdown(rawResponseText);

    // Log cost tracking
    console.log('[CHAT] Model: gpt-4o-mini, Tokens:', data.usage?.total_tokens || 'unknown');

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
      model: 'gpt-4o-mini',
      tokens: data.usage?.total_tokens
    });

  } catch (error) {
    console.error('[CHAT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: String(error) },
      { status: 500 }
    );
  }
}
