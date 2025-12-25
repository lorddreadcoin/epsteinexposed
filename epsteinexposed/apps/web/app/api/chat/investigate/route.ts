import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { 
  searchWeb, 
  formatSearchResults, 
  fetchWikipediaSummary, 
  getKnownFigureContext,
  analyzeConnectionPatterns,
  getEntityTypeIntelligence,
  buildTimelineContext,
  KNOWN_FIGURES
} from '@/lib/web-search';
import {
  buildConnectionStory,
  formatConnectionStory,
  searchEntityBackground
} from '@/lib/verified-sources';

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

// System prompt optimized for factual, educational analysis - NO REDUNDANCY
const SYSTEM_PROMPT = `You are an elite intelligence analyst investigating the Epstein network.

CRITICAL - NO REDUNDANCY:
1. NEVER repeat information you've already stated in this conversation
2. If you mentioned "21 documents" once, DO NOT mention it again - the user got it
3. Each response must provide NEW information, not rehash old facts
4. Be CONCISE like ChatGPT - users don't want walls of repeated text
5. If asked a follow-up, ONLY answer the NEW question with NEW information
6. Skip sections you've already covered - no repeated "Confidence Levels" or "Want to Learn More?"

CONVERSATION AWARENESS:
- Review the conversation history before responding
- If stats were given in message 1, don't repeat them in message 2
- For follow-ups, provide ONLY the new insight requested
- Keep responses focused and direct - aim for 150-300 words on follow-ups

DATA SOURCE TRANSPARENCY:
1. Our database contains a SUBSET of Epstein documents
2. Report counts ONCE with "In our indexed database..."
3. Don't re-state database counts in every response

RESPONSE STYLE:
- First message: Full briefing with WHO/WHAT/WHERE/WHEN/WHY
- Follow-up messages: Direct answer to the question only, with NEW info
- Be conversational, not repetitive
- Prioritize NEW facts from web sources over repeating database stats

FACTS OVER SPECULATION:
1. Clearly separate: DATABASE FACTS vs PUBLIC KNOWLEDGE vs AI ANALYSIS
2. If uncertain, say "Our documents don't show..." and move on
3. When citing, use actual document names
4. For follow-ups, search for NEW angles - don't rehash

EDUCATIONAL BUT CONCISE:
- WHO: Brief identification (one sentence)
- WHAT: Key facts (bullet points)
- WHY it matters: One paragraph max
- Skip sections already covered in previous messages

EXTERNAL SOURCES:
- Use web search results to provide NEW information not in our database
- Cite news articles briefly: "Per NYT, [fact]"
- Don't repeat the same external sources across multiple messages

FOLLOW-UP RESPONSES (after first message):
- Answer ONLY the specific question asked
- NO "WHO/WHAT/WHERE/WHEN/WHY" structure - just direct answer
- NO repeated confidence levels or database stats
- NO "Want to Learn More?" if already shown
- Target 100-200 words max for follow-ups
- Bring in NEW facts from web searches, not rehashed database info

FIRST MESSAGE ONLY:
- Full briefing with WHO/WHAT/CONNECTIONS/CONTEXT
- Database stats (mention ONCE)
- "Want to Learn More?" suggestions

Remember: Users will leave if they see the same information repeated. Each message must add value with NEW insights.`;


interface DocumentResult {
  id: string;
  filename: string;
  name?: string;
  type?: string;
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

// Fetch actual document excerpts where entities appear together
async function fetchDocumentExcerpts(entityNames: string[], limit = 5): Promise<Array<{
  docId: string;
  title: string;
  excerpt: string;
  entities: string[];
  page?: number;
}>> {
  if (entityNames.length === 0) return [];
  
  try {
    // First, get entity IDs
    const { data: entities } = await supabase
      .from('entities')
      .select('id, name')
      .in('name', entityNames);
    
    if (!entities || entities.length === 0) return [];
    
    const entityIds = entities.map(e => e.id);
    const entityNameMap = new Map(entities.map(e => [e.id, e.name]));
    
    // Get entity mentions with context
    const { data: mentions } = await supabase
      .from('entity_mentions')
      .select('document_id, entity_id, context, page_number')
      .in('entity_id', entityIds)
      .not('context', 'is', null)
      .limit(50);
    
    if (!mentions || mentions.length === 0) return [];
    
    // Group by document to find docs with multiple entities
    const docMentions = new Map<string, { entities: Set<string>; contexts: string[]; page?: number }>();
    
    for (const m of mentions) {
      if (!docMentions.has(m.document_id)) {
        docMentions.set(m.document_id, { entities: new Set(), contexts: [], page: m.page_number || undefined });
      }
      const doc = docMentions.get(m.document_id)!;
      const entityName = entityNameMap.get(m.entity_id);
      if (entityName) doc.entities.add(entityName);
      if (m.context) doc.contexts.push(m.context);
    }
    
    // Get document titles AND doc_id (the actual PDF filename ID)
    const docIds = Array.from(docMentions.keys()).slice(0, limit * 2);
    const { data: docs } = await supabase
      .from('documents')
      .select('id, doc_id, title')
      .in('id', docIds);
    
    // Map database ID to doc_id (PDF filename) and title
    const docInfoMap = new Map((docs || []).map(d => [
      d.id, 
      { 
        pdfId: d.doc_id || d.id, // Use doc_id for PDF lookup, fallback to id
        title: d.title || d.doc_id || 'Unknown Document' 
      }
    ]));
    
    // Build results, prioritizing docs with multiple entities
    const results = Array.from(docMentions.entries())
      .map(([dbId, data]) => {
        const docInfo = docInfoMap.get(dbId);
        return {
          docId: docInfo?.pdfId || dbId, // Use the PDF-compatible ID
          title: docInfo?.title || 'Document',
          excerpt: data.contexts.slice(0, 2).join(' ... ').substring(0, 300),
          entities: Array.from(data.entities),
          entityCount: data.entities.size,
          page: data.page
        };
      })
      .sort((a, b) => b.entityCount - a.entityCount)
      .slice(0, limit);
    
    return results;
  } catch (err) {
    console.error('[EXCERPTS] Error fetching document excerpts:', err);
    return [];
  }
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
    
    // Check if user is requesting web search - expanded triggers
    const messageLower = message.toLowerCase();
    const isWebSearch = messageLower.includes('search the web') || 
                        messageLower.includes('from the web') ||
                        messageLower.includes('recent news') ||
                        messageLower.includes('latest news') ||
                        messageLower.includes('find info') ||
                        messageLower.includes('look up') ||
                        messageLower.includes('wikipedia') ||
                        messageLower.includes('online') ||
                        context?.useWebSearch === true;
    
    // Step 0: If web search requested, do that first
    let webSearchContext = '';
    let webSearchPerformed = false;
    if (isWebSearch) {
      // Extract the search subject from the message
      let searchQuery = '';
      if (selectedEntities.length > 0) {
        searchQuery = `${selectedEntities[0]} Jeffrey Epstein`;
      } else {
        // Try to extract what they want to search for
        searchQuery = message
          .replace(/search the web for|from the web|recent news about|latest news|find info on|look up|can you find/gi, '')
          .trim();
        if (!searchQuery || searchQuery.length < 3) {
          searchQuery = message;
        }
      }
      
      console.log('[CHAT] Performing web search for:', searchQuery);
      const webResults = await searchWeb(searchQuery, 5);
      webSearchPerformed = true;
      
      if (webResults.length > 0) {
        webSearchContext = `\n\nWEB SEARCH RESULTS (Wikipedia & external sources):\n${formatSearchResults(webResults)}`;
        console.log('[CHAT] Web search returned', webResults.length, 'results');
      } else {
        webSearchContext = '\n\nWEB SEARCH: No relevant external results found for this query.';
        console.log('[CHAT] Web search returned no results');
      }
    }
    
    // Step 1: Search documents for relevant content
    const searchTerms = [
      ...selectedEntities,
      ...extractKeyTerms(message),
    ].filter(Boolean);
    
    const searchResult = await searchDocuments(searchTerms, selectedEntities, 20);
    const { results: relevantDocs, searchType, connections } = searchResult;
    
    // Step 2: Fetch ACTUAL document excerpts where entities appear
    const documentExcerpts = await fetchDocumentExcerpts(selectedEntities.slice(0, 5), 5);
    
    console.log(`[CHAT] Found ${relevantDocs.length} entities (${searchType}), ${connections.length} connections, ${documentExcerpts.length} doc excerpts for:`, searchTerms);
    
    // Helper: Convert numeric strength to semantic label
    const getInvolvementLevel = (strength: number): string => {
      if (strength >= 1000) return 'Undeniably Connected (Alleged)';
      if (strength >= 500) return 'Very Connected';
      if (strength >= 200) return 'Connected';
      if (strength >= 100) return 'Somewhat Connected';
      if (strength >= 50) return 'Low Connection';
      return 'Very Low Connection';
    };
    
    // Step 3: Build connections context - THE KEY FEATURE
    let connectionsContext = '';
    if (connections.length > 0) {
      const topConnections = connections.slice(0, 15);
      connectionsContext = `\n\nKEY CONNECTIONS:\n${topConnections.map(c => 
        `${c.entityA} ↔ ${c.entityB} [${getInvolvementLevel(c.strength)}]`
      ).join('\n')}`;
    }
    
    // Step 4: Build REAL document context with actual excerpts
    let documentContext = '';
    if (documentExcerpts.length > 0) {
      documentContext = `\n\nDOCUMENT EVIDENCE:\n${documentExcerpts.map(d => 
        `[${d.title}] "${d.excerpt}" (mentions: ${d.entities.join(', ')})`
      ).join('\n\n')}`;
    }
    
    // Step 4.5: ENTITY ENRICHMENT - Add public knowledge for context
    let publicKnowledgeContext = '';
    for (const entityName of selectedEntities.slice(0, 3)) {
      // First check pre-cached known figures
      const knownContext = getKnownFigureContext(entityName);
      if (knownContext) {
        publicKnowledgeContext += `\n\nPUBLIC KNOWLEDGE [${entityName}]: ${knownContext}`;
      } else {
        // Try Wikipedia for unknown entities
        const wikiData = await fetchWikipediaSummary(entityName);
        if (wikiData) {
          publicKnowledgeContext += `\n\nPUBLIC KNOWLEDGE [${wikiData.name}]: ${wikiData.occupation ? `(${wikiData.occupation}) ` : ''}${wikiData.summary.substring(0, 300)}... [Source: Wikipedia]`;
        }
      }
    }
    
    // Build entity summary with EXPLICIT document counts from database
    // This is critical - the AI must use these exact numbers, not hallucinate
    let entitySummary = '';
    
    // ENHANCED: Fetch complete entity data from Supabase for accurate counts
    const entityDataPromises = selectedEntities.map(async (entityName) => {
      const { data: entities } = await supabase
        .from('entities')
        .select('name, type, document_count, connection_count')
        .ilike('name', `%${entityName}%`)
        .order('document_count', { ascending: false })
        .limit(3);
      
      return { entityName, entities: entities || [] };
    });
    
    const entityDataResults = await Promise.all(entityDataPromises);
    
    // Build comprehensive entity profiles
    for (const { entityName, entities } of entityDataResults) {
      if (entities.length > 0) {
        const primaryEntity = entities[0];
        entitySummary += `\n[DATABASE VERIFIED] ${primaryEntity.name}:\n`;
        entitySummary += `  • Type: ${primaryEntity.type}\n`;
        entitySummary += `  • Appears in ${primaryEntity.document_count} documents across our indexed database\n`;
        entitySummary += `  • Connected to ${primaryEntity.connection_count} other entities\n`;
        
        // If multiple matches, show them
        if (entities.length > 1) {
          entitySummary += `  • Related entries: ${entities.slice(1).map(e => `${e.name} (${e.document_count} docs)`).join(', ')}\n`;
        }
      } else {
        // Fallback to search results
        const entityDocs = relevantDocs.filter(d => 
          d.name?.toLowerCase().includes(entityName.toLowerCase()) ||
          d.excerpt?.toLowerCase().includes(entityName.toLowerCase())
        );
        const docCount = entityDocs.length;
        entitySummary += `\n[SEARCH RESULTS] ${entityName}: Found in ${docCount} search results\n`;
      }
    }
    
    // Add document excerpts with entity context
    entitySummary += '\n\nDOCUMENT EXCERPTS:\n' + relevantDocs.slice(0, 10).map(d => 
      `• [${d.name || 'Document'}] ${d.excerpt}`
    ).join('\n');

    // Step 5: ADVANCED INTELLIGENCE LAYERS
    
    // 5a. NETWORK CONTEXT - Fetch direct connections from Supabase for comprehensive network view
    let networkContext = '';
    if (selectedEntities.length > 0 && entityDataResults[0]?.entities.length > 0) {
      const primaryEntity = entityDataResults[0].entities[0];
      
      // Query connections table using entity IDs
      const { data: entityWithId } = await supabase
        .from('entities')
        .select('id, name')
        .eq('name', primaryEntity.name)
        .single();
      
      if (entityWithId) {
        const { data: directConnections } = await supabase
          .from('connections')
          .select('entity_a_id, entity_b_id, strength')
          .or(`entity_a_id.eq.${entityWithId.id},entity_b_id.eq.${entityWithId.id}`)
          .order('strength', { ascending: false })
          .limit(20);
        
        if (directConnections && directConnections.length > 0) {
          // Fetch entity details for connected entities
          const connectedIds = directConnections.map(c => 
            c.entity_a_id === entityWithId.id ? c.entity_b_id : c.entity_a_id
          );
          
          const { data: connectedEntities } = await supabase
            .from('entities')
            .select('id, name, type, document_count')
            .in('id', connectedIds);
          
          if (connectedEntities && connectedEntities.length > 0) {
            networkContext = `\n\nDIRECT NETWORK CONNECTIONS (Top 20 by co-occurrence):\n`;
            for (const conn of directConnections) {
              const connectedId = conn.entity_a_id === entityWithId.id ? conn.entity_b_id : conn.entity_a_id;
              const connectedEntity = connectedEntities.find(e => e.id === connectedId);
              if (connectedEntity) {
                networkContext += `• ${connectedEntity.name} (${connectedEntity.type}) - Co-occurred ${conn.strength} times, ${connectedEntity.document_count} total docs\n`;
              }
            }
          }
        }
      }
    }
    
    // 5b. Pattern Recognition - Analyze connection patterns for suspicious activity
    let patternAnalysisContext = '';
    if (selectedEntities.length > 0 && connections.length > 0) {
      const patternAnalysis = analyzeConnectionPatterns(connections, selectedEntities[0]);
      if (patternAnalysis.patterns.length > 0) {
        patternAnalysisContext = `\n\nPATTERN ANALYSIS [Risk Level: ${patternAnalysis.riskLevel}]:\n${patternAnalysis.patterns.map(p => `• ${p}`).join('\n')}`;
        if (patternAnalysis.flags.length > 0) {
          patternAnalysisContext += `\nFLAGS: ${patternAnalysis.flags.join(', ')}`;
        }
      }
    }
    
    // 5b. Timeline Context - Add key dates and events
    let timelineContext = '';
    for (const entityName of selectedEntities.slice(0, 2)) {
      const timeline = buildTimelineContext(entityName);
      if (timeline) {
        timelineContext += timeline;
      }
    }
    
    // 5c. Entity Type Intelligence - Get investigation focus based on entity type
    let entityTypeContext = '';
    if (selectedEntities.length > 0) {
      // Determine entity type from search results
      const primaryEntity = relevantDocs.find(d => 
        selectedEntities.some(e => d.name?.toLowerCase().includes(e.toLowerCase()))
      );
      const entityType = primaryEntity?.type || 'person';
      const typeIntel = getEntityTypeIntelligence(entityType);
      entityTypeContext = `\n\nINVESTIGATION FOCUS for ${entityType.toUpperCase()}:\n${typeIntel.investigationFocus.slice(0, 3).map(f => `• ${f}`).join('\n')}\n\nKEY QUESTIONS TO ANSWER:\n${typeIntel.keyQuestions.slice(0, 3).map(q => `• ${q}`).join('\n')}`;
    }
    
    // 5d. Cross-reference with known figures database
    let knownFiguresContext = '';
    const connectedKnownFigures = connections.filter(c => 
      Object.keys(KNOWN_FIGURES).some(k => 
        c.entityA?.toLowerCase().includes(k.toLowerCase()) || 
        c.entityB?.toLowerCase().includes(k.toLowerCase())
      )
    );
    if (connectedKnownFigures.length > 0) {
      knownFiguresContext = `\n\nCONNECTIONS TO KNOWN FIGURES:\n${connectedKnownFigures.slice(0, 5).map(c => {
        const knownEntity = Object.keys(KNOWN_FIGURES).find(k => 
          c.entityA?.toLowerCase().includes(k.toLowerCase()) || 
          c.entityB?.toLowerCase().includes(k.toLowerCase())
        );
        return `• ${c.entityA} ↔ ${c.entityB} (strength: ${c.strength}) - ${knownEntity && KNOWN_FIGURES[knownEntity] ? KNOWN_FIGURES[knownEntity].substring(0, 80) + '...' : ''}`;
      }).join('\n')}`;
    }
    
    // 5e. VERIFIED EXTERNAL SOURCES - Fetch news articles and public records
    let verifiedSourcesContext = '';
    if (selectedEntities.length >= 2) {
      // Build connection story for top 2 entities
      try {
        const connectionStory = await buildConnectionStory(
          selectedEntities[0],
          selectedEntities[1]
        );
        verifiedSourcesContext = formatConnectionStory(connectionStory);
      } catch (err) {
        console.log('[VERIFIED-SOURCES] Error fetching connection story:', err);
      }
    } else if (selectedEntities.length === 1) {
      // Fetch background for single entity
      try {
        const background = await searchEntityBackground(selectedEntities[0]);
        if (background.length > 0) {
          verifiedSourcesContext = `\n\nVERIFIED NEWS SOURCES ABOUT ${selectedEntities[0]}:\n`;
          background.slice(0, 3).forEach(source => {
            verifiedSourcesContext += `• "${source.title}" - ${source.source} [${source.reliability.toUpperCase()}]\n`;
            verifiedSourcesContext += `  ${source.snippet.substring(0, 120)}...\n`;
            verifiedSourcesContext += `  URL: ${source.url}\n\n`;
          });
        }
      } catch (err) {
        console.log('[VERIFIED-SOURCES] Error fetching entity background:', err);
      }
    }

    // Step 6: Call GPT-4o-mini via OpenRouter (much cheaper than Claude)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    
    if (!openrouterKey) {
      console.error('[CHAT] Missing OPENROUTER_API_KEY');
      return NextResponse.json({
        response: 'Investigation API is not configured. Please add OPENROUTER_API_KEY.',
        error: 'API not configured'
      });
    }

    // Build the full context for the AI with ALL INTELLIGENCE LAYERS
    const fullContext = `ENTITY SUMMARY:\n${entitySummary || 'No entity data found.'}${networkContext}${publicKnowledgeContext}${verifiedSourcesContext}${entityTypeContext}${patternAnalysisContext}${timelineContext}${knownFiguresContext}${connectionsContext}${documentContext}${webSearchContext}\n\n${selectedEntities.length > 0 ? `FOCUS: ${selectedEntities.join(' and ')}` : ''}`;

    // Detect if this is a follow-up message (conversation has history)
    const isFollowUp = conversationHistory.length > 0;
    const followUpInstruction = isFollowUp 
      ? `\n\nIMPORTANT: This is message #${conversationHistory.length + 1} in the conversation. DO NOT repeat any information from previous messages. Give a CONCISE, DIRECT answer (100-200 words max) with NEW information only. Skip all sections you've already covered.`
      : '';

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
              ? `Context from database:\n${fullContext}\n\nUser question: ${message}${followUpInstruction}` 
              : message + followUpInstruction
          }
        ],
        max_tokens: isFollowUp ? 350 : 600, // Shorter responses for follow-ups
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

    // Step 5: Build citations from ACTUAL document excerpts with page numbers
    let citations: Citation[] = documentExcerpts.map(d => ({
      documentId: d.docId,
      documentName: d.title + (d.page ? `, page ${d.page}` : ''),
      excerpt: d.excerpt.substring(0, 150) + (d.excerpt.length > 150 ? '...' : ''),
      page: d.page,
    }));
    
    // Fallback: If no document excerpts, create citations from relevantDocs
    if (citations.length === 0 && relevantDocs.length > 0) {
      citations = relevantDocs.slice(0, 5).map(d => ({
        documentId: d.id,
        documentName: d.filename || 'DOJ Document',
        excerpt: d.excerpt?.substring(0, 150) || 'Click to view document',
      }));
      console.log('[CHAT] Using fallback citations from relevantDocs:', citations.length);
    }
    
    // Additional fallback: Fetch ACTUAL documents from entity_mentions if we have entity data
    if (citations.length === 0 && selectedEntities.length > 0) {
      try {
        // Get entity IDs for selected entities
        const { data: entityRecords } = await supabase
          .from('entities')
          .select('id, name')
          .in('name', selectedEntities.slice(0, 3));
        
        if (entityRecords && entityRecords.length > 0) {
          const entityIds = entityRecords.map(e => e.id);
          
          // Get actual document IDs from entity_mentions
          const { data: mentions } = await supabase
            .from('entity_mentions')
            .select('document_id, entity_id')
            .in('entity_id', entityIds)
            .limit(10);
          
          if (mentions && mentions.length > 0) {
            // Get unique document IDs
            const uniqueDocIds = [...new Set(mentions.map(m => m.document_id))].slice(0, 5);
            
            // Fetch document details
            const { data: docs } = await supabase
              .from('documents')
              .select('id, doc_id, title')
              .in('id', uniqueDocIds);
            
            if (docs && docs.length > 0) {
              const entityNameMap = new Map(entityRecords.map(e => [e.id, e.name]));
              citations = docs.map(doc => {
                // Find which entity this doc is related to
                const relatedMention = mentions.find(m => m.document_id === doc.id);
                const entityName = relatedMention ? entityNameMap.get(relatedMention.entity_id) : selectedEntities[0];
                return {
                  documentId: doc.id,
                  documentName: doc.title || doc.doc_id || 'DOJ Document',
                  excerpt: `Document mentioning ${entityName || 'selected entity'}`,
                };
              });
              console.log('[CHAT] Using actual document citations:', citations.length);
            }
          }
        }
      } catch (err) {
        console.log('[CHAT] Error fetching document citations:', err);
      }
    }

    // Step 6: Check if we found useful info
    const noDocumentResults = documentExcerpts.length === 0 && connections.length === 0;

    // Helper: Filter out garbage entities (PDF parsing errors, UI elements)
    const GARBAGE_ENTITY_PATTERNS = [
      /^(Normal|Dear|Edit|Online|Network|Manual|Single|Double|Triple)$/i,
      /^(Login|Logout|Sign|Email|Help|Only|Mode|View|Click|Button)$/i,
      /^(Page|Next|Previous|Back|Forward|Home|Menu|Settings)$/i,
      /^(Submit|Cancel|Save|Delete|Update|Refresh|Load|Search)$/i,
      /^(Yes|No|OK|Cancel|Close|Open|Start|Stop|Exit)$/i,
      /^(On|Off|True|False|Enable|Disable|Show|Hide)$/i,
    ];
    
    const isGarbageEntity = (name: string): boolean => {
      return GARBAGE_ENTITY_PATTERNS.some(pattern => pattern.test(name));
    };
    
    // Helper: Format date entities properly (fix "On Aug" -> "August 2019" or "Events in August")
    const formatEntityName = (name: string): string => {
      // Fix date entities that start with "On"
      if (name.startsWith('On ')) {
        const datePart = name.substring(3);
        // If it's just a month, make it more readable
        if (['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(datePart)) {
          return `Events in ${datePart}`;
        }
        return `Date: ${datePart}`;
      }
      return name;
    };
    
    // Step 7: Generate CONTEXTUAL follow-up suggestions based on the conversation
    const suggestions: string[] = [];
    
    // Extract entities mentioned in the response for contextual suggestions
    const mentionedEntities = new Set<string>();
    connections.forEach(c => {
      // Filter out garbage entities before adding
      if (c.entityA && !isGarbageEntity(c.entityA)) {
        mentionedEntities.add(formatEntityName(c.entityA));
      }
      if (c.entityB && !isGarbageEntity(c.entityB)) {
        mentionedEntities.add(formatEntityName(c.entityB));
      }
    });
    
    // Remove already-selected entities to suggest NEW ones
    const newEntities = Array.from(mentionedEntities).filter(e => !selectedEntities.includes(e));
    
    // If user selected a garbage entity, warn them
    const selectedGarbageEntities = selectedEntities.filter(e => isGarbageEntity(e));
    if (selectedGarbageEntities.length > 0) {
      return NextResponse.json({
        response: `NOTICE: The selected entity "${selectedGarbageEntities[0]}" appears to be a PDF parsing error or UI element, not an actual person, organization, or location in the Epstein investigation. These technical terms were incorrectly extracted from document formatting.\n\nPlease select a different entity from the graph to investigate actual individuals, organizations, or locations connected to the Epstein case.`,
        citations: [],
        noDocumentResults: true,
        documentsSearched: 0,
        connectionsFound: 0,
        suggestions: [
          'Select a person entity (like Jeffrey Epstein, Ghislaine Maxwell)',
          'Select a location entity (like Palm Beach, Virgin Islands)',
          'Select an organization entity (like Southern District)'
        ],
        webSearchPerformed: false,
      });
    }
    
    // Build contextual suggestions based on what was discussed
    const userQuery = message.toLowerCase();
    
    if (userQuery.includes('role') || userQuery.includes('who is')) {
      // User asked about role - suggest connections and documents
      if (newEntities.length > 0) {
        suggestions.push(`What documents connect ${selectedEntities[0] || 'them'} to ${newEntities[0]}?`);
      }
      suggestions.push(`Show me the strongest connections in this network`);
      if (documentExcerpts.length > 0) {
        suggestions.push(`What other names appear in these documents?`);
      }
    } else if (userQuery.includes('connection') || userQuery.includes('related')) {
      // User asked about connections - suggest deeper investigation
      if (newEntities.length > 0) {
        suggestions.push(`Investigate ${newEntities[0]}'s involvement`);
      }
      suggestions.push(`What locations are associated with these individuals?`);
      suggestions.push(`Are there any flight records mentioning them?`);
    } else if (userQuery.includes('document') || userQuery.includes('evidence')) {
      // User asked about documents - suggest entity exploration
      suggestions.push(`Who else appears in these same documents?`);
      if (newEntities.length > 0) {
        suggestions.push(`What is ${newEntities[0]}'s connection to Epstein?`);
      }
      suggestions.push(`Search for court filings related to this`);
    } else {
      // Default contextual suggestions
      if (newEntities.length > 0) {
        suggestions.push(`Tell me about ${newEntities[0]}`);
      }
      if (newEntities.length > 1) {
        suggestions.push(`How is ${newEntities[1]} connected?`);
      }
      if (connections.length > 0) {
        suggestions.push(`What documents support these connections?`);
      } else {
        suggestions.push(`Search for related court documents`);
      }
    }
    
    // Always add a web search option if not already suggested
    if (!suggestions.some(s => s.toLowerCase().includes('search'))) {
      const searchEntity = selectedEntities[0] || newEntities[0] || 'this topic';
      suggestions.push(`Search the web for recent news about ${searchEntity}`);
    }

    return NextResponse.json({
      response: responseText,
      citations,
      noDocumentResults,
      documentsSearched: documentExcerpts.length,
      connectionsFound: connections.length,
      suggestions: suggestions.slice(0, 3),
      webSearchPerformed,
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
