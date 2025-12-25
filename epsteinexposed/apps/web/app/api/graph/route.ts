import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Fallback data for when database times out
const FALLBACK_NODES = [
  { id: 'fallback-1', name: 'Jeffrey Epstein', label: 'Jeffrey Epstein', type: 'person', documentCount: 234, connectionCount: 500, connections: 500 },
  { id: 'fallback-2', name: 'Ghislaine Maxwell', label: 'Ghislaine Maxwell', type: 'person', documentCount: 111, connectionCount: 400, connections: 400 },
  { id: 'fallback-3', name: 'Southern District', label: 'Southern District', type: 'organization', documentCount: 89, connectionCount: 300, connections: 300 },
  { id: 'fallback-4', name: 'Palm Beach', label: 'Palm Beach', type: 'location', documentCount: 67, connectionCount: 200, connections: 200 },
  { id: 'fallback-5', name: 'Virgin Islands', label: 'Virgin Islands', type: 'location', documentCount: 45, connectionCount: 150, connections: 150 },
];

const FALLBACK_EDGES = [
  { source: 'fallback-1', target: 'fallback-2', from: 'fallback-1', to: 'fallback-2', weight: 500, strength: 500 },
  { source: 'fallback-1', target: 'fallback-3', from: 'fallback-1', to: 'fallback-3', weight: 300, strength: 300 },
  { source: 'fallback-1', target: 'fallback-4', from: 'fallback-1', to: 'fallback-4', weight: 200, strength: 200 },
  { source: 'fallback-2', target: 'fallback-3', from: 'fallback-2', to: 'fallback-3', weight: 250, strength: 250 },
  { source: 'fallback-1', target: 'fallback-5', from: 'fallback-1', to: 'fallback-5', weight: 150, strength: 150 },
];

// Type correction map for known misclassified entities
const TYPE_CORRECTIONS: Record<string, string> = {
  // Locations misclassified as people
  'Palm Beach': 'location',
  'West Palm Beach': 'location',
  'Fort Lauderdale': 'location',
  'Little St. James': 'location',
  'Little Saint James': 'location',
  'Manhattan': 'location',
  'New York': 'location',
  'London': 'location',
  'Paris': 'location',
  'Miami': 'location',
  'Florida': 'location',
  'Virgin Islands': 'location',
  'New Mexico': 'location',
  'Santa Fe': 'location',
  
  // Organizations
  'FBI': 'organization',
  'CIA': 'organization',
  'DOJ': 'organization',
  'Department of Justice': 'organization',
  'Southern District': 'organization',
  
  // Known people (in case misclassified)
  'Bill Clinton': 'person',
  'Ghislaine Maxwell': 'person',
  'Virginia Giuffre': 'person',
  'Virginia Roberts': 'person',
  'Prince Andrew': 'person',
  'Alan Dershowitz': 'person',
  'Leslie Wexner': 'person',
};

function correctEntityType(name: string, type: string): string {
  const corrected = TYPE_CORRECTIONS[name];
  if (corrected && corrected !== type) {
    console.log(`[TYPE CORRECTION] ${name}: ${type} → ${corrected}`);
    return corrected;
  }
  return type;
}

async function fetchGraphData(edgeLimit: number, nodeLimit: number, offset: number = 0) {
  // PRIORITY: Fetch PERSON entities first (victims, perpetrators, high-profile names)
  // Then fill remaining slots with locations/orgs
  const personLimit = Math.floor(nodeLimit * 0.7); // 70% people
  const otherLimit = nodeLimit - personLimit; // 30% locations/orgs
  
  // Fetch high-profile PEOPLE with most connections (victims, perpetrators, witnesses)
  const { data: peopleEntities, error: peopleError } = await supabase
    .from('entities')
    .select('id, name, type, document_count, connection_count')
    .eq('type', 'person')
    .order('connection_count', { ascending: false })
    .range(offset, offset + personLimit - 1);

  if (peopleError) {
    console.error('[GRAPH] People fetch error:', peopleError);
    throw new Error(peopleError.message);
  }

  // Fetch top locations/organizations
  const { data: otherEntities, error: otherError } = await supabase
    .from('entities')
    .select('id, name, type, document_count, connection_count')
    .in('type', ['location', 'organization'])
    .order('connection_count', { ascending: false })
    .limit(otherLimit);

  if (otherError) {
    console.error('[GRAPH] Other entities fetch error:', otherError);
  }

  // Combine entities - people first, then apply type corrections
  const rawEntities = [...(peopleEntities || []), ...(otherEntities || [])];
  const entities = rawEntities.map(e => ({
    ...e,
    type: correctEntityType(e.name, e.type)
  }));
  
  console.log('[GRAPH] Fetched', peopleEntities?.length || 0, 'people,', otherEntities?.length || 0, 'other entities');

  if (entities.length === 0) {
    throw new Error('No entities found');
  }

  // Get entity IDs
  const entityIds = entities.map(e => e.id);

  // Fetch connections BETWEEN these entities
  const { data: topConnections, error: connError } = await supabase
    .from('connections')
    .select('entity_a_id, entity_b_id, strength')
    .or(`entity_a_id.in.(${entityIds.join(',')}),entity_b_id.in.(${entityIds.join(',')})`)
    .order('strength', { ascending: false })
    .limit(edgeLimit);

  if (connError) {
    console.error('[GRAPH] Connection error:', connError);
    throw new Error(connError.message);
  }

  console.log('[GRAPH] Got', topConnections?.length || 0, 'connections');
  
  return { topConnections: topConnections || [], entities };
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request.headers);
  const rateLimit = checkRateLimit(`graph:${ip}`, RATE_LIMITS.graph);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    // MASSIVELY increased limits for robust, dense graph - 2000 nodes, 8000 edges
    const requestedNodeLimit = Math.min(parseInt(searchParams.get('nodeLimit') || '2000'), 3000);
    const requestedEdgeLimit = Math.min(parseInt(searchParams.get('connectionLimit') || '8000'), 15000);
    // Offset for variety on refresh
    const offset = Math.min(parseInt(searchParams.get('offset') || '0'), 1000);

    console.log('[GRAPH] Fetching nodeLimit:', requestedNodeLimit, 'edgeLimit:', requestedEdgeLimit, 'offset:', offset);

    let topConnections;
    let entities;
    
    // Try with requested limits first, fall back to smaller if timeout
    try {
      const result = await fetchGraphData(requestedEdgeLimit, requestedNodeLimit, offset);
      topConnections = result.topConnections;
      entities = result.entities;
    } catch (firstError) {
      console.warn('[GRAPH] First attempt failed, trying smaller dataset:', firstError);
      
      // Try with medium limits (still substantial)
      try {
        const result = await fetchGraphData(800, 300, 0);
        topConnections = result.topConnections;
        entities = result.entities;
      } catch (secondError) {
        console.warn('[GRAPH] Second attempt failed, trying minimum:', secondError);
        
        // Try with minimum viable limits
        try {
          const result = await fetchGraphData(400, 150, 0);
          topConnections = result.topConnections;
          entities = result.entities;
        } catch (thirdError) {
          console.error('[GRAPH] All attempts failed, using fallback:', thirdError);
          
          // Return fallback data
          return NextResponse.json({
            nodes: FALLBACK_NODES,
            edges: FALLBACK_EDGES,
            result: { data: { nodes: FALLBACK_NODES, edges: FALLBACK_EDGES } },
            meta: {
              nodeCount: FALLBACK_NODES.length,
              edgeCount: FALLBACK_EDGES.length,
              fallback: true
            }
          });
        }
      }
    }

    // Filter out garbage entities (PDF parsing errors, UI elements, random dates)
    const GARBAGE_ENTITY_PATTERNS = [
      /^(Normal|Dear|Edit|Online|Network|Manual|Single|Double|Triple)$/i,
      /^(Login|Logout|Sign|Email|Help|Only|Mode|View|Click|Button)$/i,
      /^(Page|Next|Previous|Back|Forward|Home|Menu|Settings)$/i,
      /^(Submit|Cancel|Save|Delete|Update|Refresh|Load|Search)$/i,
      /^(Yes|No|OK|Cancel|Close|Open|Start|Stop|Exit)$/i,
      /^(On|Off|True|False|Enable|Disable|Show|Hide)$/i,
      /^On (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i, // "On August", "On January"
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}$/i, // "Aug 15", "January 3"
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/i, // Date formats like "8/15/2019"
    ];
    
    const isGarbageEntity = (name: string): boolean => {
      return GARBAGE_ENTITY_PATTERNS.some(pattern => pattern.test(name));
    };
    
    // Create entity map for quick lookup, filtering out garbage entities
    type EntityType = { id: string; name: string; type: string; document_count: number; connection_count: number };
    const entityMap = new Map<string, EntityType>(
      (entities || [])
        .filter(e => !isGarbageEntity(e.name))
        .map(e => [e.id, e])
    );

    // Filter connections to only those where we have entity details (and both entities are valid)
    const validConnections = topConnections.filter(c => 
      entityMap.has(c.entity_a_id) && entityMap.has(c.entity_b_id)
    );
    
    console.log('[GRAPH] Filtered out garbage entities. Valid entities:', entityMap.size);

    console.log('[GRAPH] Valid connections:', validConnections.length);

    // Format response
    const nodes = Array.from(entityMap.values()).map((e: EntityType) => ({
      id: e.id,
      name: e.name || 'Unknown',
      label: e.name || 'Unknown',
      type: e.type || 'other',
      documentCount: e.document_count || 0,
      connectionCount: e.connection_count || 0,
      connections: e.connection_count || 0,
    }));

    const edges = validConnections.map(c => ({
      source: c.entity_a_id,
      target: c.entity_b_id,
      from: c.entity_a_id,
      to: c.entity_b_id,
      weight: c.strength || 1,
      strength: c.strength || 1,
    }));

    console.log('[GRAPH] Final:', nodes.length, 'nodes,', edges.length, 'edges');

    return NextResponse.json({
      nodes,
      edges,
      result: { data: { nodes, edges } },
      meta: {
        nodeCount: nodes.length,
        edgeCount: edges.length
      }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GRAPH] Error:', errorMessage);
    return NextResponse.json({ nodes: [], edges: [], error: errorMessage }, { status: 500 });
  }
}
