import { NextRequest, NextResponse } from 'next/server';

// This route calls your tRPC API to search documents, then optionally calls Claude
export async function POST(req: NextRequest) {
  try {
    const { message, selectedEntities, webSearchEnabled, conversationHistory } = await req.json();

    // Step 1: Search documents for relevant content via your existing API
    const searchTerms = [
      ...selectedEntities,
      ...message.split(' ').filter((w: string) => w.length > 3 && w[0] === w[0].toUpperCase()),
    ].slice(0, 10);

    // Call your existing API to search entities
    let relevantEntities: any[] = [];
    try {
      const searchResponse = await fetch(
        `http://localhost:3001/trpc/graph.searchEntities?input=${encodeURIComponent(
          JSON.stringify({ query: searchTerms.join(' '), limit: 20 })
        )}`
      );
      const searchData = await searchResponse.json();
      relevantEntities = searchData.result?.data || [];
    } catch (e) {
      console.error('Failed to search entities:', e);
    }

    // Build context from found entities
    const documentContext = relevantEntities
      .slice(0, 15)
      .map((e: any) => `- ${e.name} (${e.type}): mentioned ${e.occurrences} times across ${e.documentIds?.length || 0} documents`)
      .join('\n');

    // Check for Claude API key
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    if (!ANTHROPIC_API_KEY) {
      // Return document-based response without AI
      if (relevantEntities.length === 0) {
        return NextResponse.json({
          response: `No matching entities found in the documents for your query. Try searching for specific names or locations mentioned in the Epstein files.`,
          citations: [],
        });
      }

      const response = selectedEntities.length > 0
        ? `Found ${relevantEntities.length} entities related to your query.\n\nEntities in documents:\n${documentContext}\n\n[Configure ANTHROPIC_API_KEY in .env.local for AI-powered analysis]`
        : `Based on your query "${message}", I found ${relevantEntities.length} relevant entities in the documents:\n\n${documentContext}\n\n[Configure ANTHROPIC_API_KEY for deeper analysis]`;

      return NextResponse.json({
        response,
        citations: relevantEntities.slice(0, 5).map((e: any) => ({
          documentId: e.documentIds?.[0] || e.id,
          documentName: e.name,
          excerpt: `Mentioned ${e.occurrences} times`,
        })),
      });
    }

    // Real Claude API call with document-grounded system prompt
    const systemPrompt = `You are an investigation assistant analyzing the Jeffrey Epstein DOJ document release (11,622 documents with 96,322 extracted entities).

CRITICAL RULES:
1. ONLY use information from the provided document excerpts below
2. NEVER make claims not supported by these documents
3. If asked about something not in the documents, say "This information is not found in the available documents"
4. Be precise and factual - no speculation
5. When citing information, mention which entity/document it comes from
6. Keep responses concise but informative (2-4 paragraphs max)

ENTITIES FOUND IN DOCUMENTS MATCHING THIS QUERY:
${documentContext || 'No specific entities matched this query.'}

SELECTED ENTITIES TO FOCUS ON: ${selectedEntities.length > 0 ? selectedEntities.join(', ') : 'None specified'}

Your responses should:
- Reference specific entities and their document counts
- Note connections between entities if they appear in the same documents
- Highlight any unusual patterns (high frequency, specific locations, time periods)
- Direct users to view specific documents for verification`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0, // Zero temperature for factual accuracy - NO HALLUCINATION
        system: systemPrompt,
        messages: [
          ...conversationHistory.slice(-4).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
          { role: 'user', content: message },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', errorText);
      throw new Error('Claude API request failed');
    }

    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || 'Unable to generate response.';

    return NextResponse.json({
      response: responseText,
      citations: relevantEntities.slice(0, 5).map((e: any) => ({
        documentId: e.documentIds?.[0] || e.id,
        documentName: e.name,
        excerpt: `Mentioned ${e.occurrences} times in ${e.documentIds?.length || 0} documents`,
      })),
      tokensUsed: claudeData.usage?.output_tokens || 0,
    });

  } catch (error) {
    console.error('Investigation chat error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process query', 
        response: 'ERROR: Query processing failed. Ensure the API server is running on port 3001.' 
      },
      { status: 500 }
    );
  }
}
