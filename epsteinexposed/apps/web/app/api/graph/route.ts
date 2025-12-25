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

// Intelligent type detection patterns
const LOCATION_PATTERNS = [
  // US States
  /^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)$/i,
  // Major US Cities
  /^(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Boston|Nashville|Detroit|Portland|Las Vegas|Memphis|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Kansas City|Mesa|Atlanta|Omaha|Colorado Springs|Raleigh|Miami|Oakland|Minneapolis|Tulsa|Wichita|New Orleans)$/i,
  // Florida Cities
  /^(Miami|Tampa|Orlando|Jacksonville|Fort Lauderdale|West Palm Beach|Palm Beach|Boca Raton|Naples|Sarasota|Clearwater|St\. Petersburg|Tallahassee|Gainesville|Key West|Fort Myers)$/i,
  // International Cities
  /^(London|Paris|Tokyo|Berlin|Madrid|Rome|Moscow|Beijing|Shanghai|Dubai|Sydney|Toronto|Montreal|Vancouver|Mexico City|São Paulo|Buenos Aires|Cairo|Mumbai|Delhi|Bangkok|Singapore|Hong Kong|Seoul|Istanbul|Amsterdam|Brussels|Vienna|Prague|Stockholm|Copenhagen|Oslo|Helsinki|Athens|Lisbon|Warsaw|Budapest)$/i,
  // Islands & Territories
  /^(Little St\.? James|Little Saint James|Great St\.? James|Virgin Islands|U\.?S\.? Virgin Islands|British Virgin Islands|Cayman Islands|Bahamas|Bermuda|Puerto Rico|Guam|American Samoa)$/i,
  // Geographic patterns
  /\b(Beach|Island|Islands|City|County|District|State|Province|Territory|Region|Area|Zone)\b/i,
  /^(North|South|East|West|Central)\s+/i,
];

const ORGANIZATION_PATTERNS = [
  // Government agencies
  /^(FBI|CIA|DOJ|NSA|DEA|ATF|DHS|TSA|ICE|FEMA|EPA|FDA|CDC|NIH|NASA|USPS|IRS|SSA)$/i,
  /\b(Department|Agency|Bureau|Commission|Administration|Service|Office|Division|Unit)\b/i,
  // Legal entities
  /^(Southern District|Eastern District|Western District|Northern District|District Court|Supreme Court|Court of Appeals|Federal Court)$/i,
  // Business entities
  /\b(Inc\.|LLC|Corp\.|Corporation|Company|Co\.|Ltd\.|Limited|Group|Associates|Partners|Enterprises|Industries|Holdings|Foundation|Institute|Organization|Association|Society|Council|Committee|Board)$/i,
  // Universities & Schools
  /\b(University|College|School|Academy|Institute of Technology)$/i,
];

// Specific known entities that need correction
const TYPE_CORRECTIONS: Record<string, string> = {
  // High-profile people (ensure these stay person)
  'Bill Clinton': 'person',
  'Ghislaine Maxwell': 'person',
  'Virginia Giuffre': 'person',
  'Virginia Roberts': 'person',
  'Prince Andrew': 'person',
  'Alan Dershowitz': 'person',
  'Leslie Wexner': 'person',
  'Donald Trump': 'person',
  'Bill Gates': 'person',
  'Stephen Hawking': 'person',
};

// GARBAGE ENTITIES - Data artifacts that are NOT real people/places/orgs
// These are parsing artifacts from phone records, metadata fields, column headers, etc.
const GARBAGE_ENTITY_PATTERNS = [
  // Phone record artifacts
  /^phone\s*(begin|on|off|end|start|stop|number|call|record|log|data|entry|type|status)$/i,
  /^(begin|end|start|stop)\s*(phone|call|record|entry|date|time)$/i,
  // Date/time artifacts
  /^(date|time|timestamp|datetime|created|updated|modified)\s*(begin|end|start|on|off)?$/i,
  // Column header artifacts
  /^(column|field|row|cell|entry|record|data|value|type|status|id|index|count|number)\s*\d*$/i,
  // Generic parsing artifacts
  /^(unknown|undefined|null|none|n\/a|na|tbd|tba|blank|empty)$/i,
  /^(service\s*provider|provider|carrier|network)$/i,
  // Single characters or very short nonsense
  /^[a-z]{1,2}$/i,
  /^\d+$/,
  /^[^a-zA-Z]*$/,  // No letters at all
  // Common OCR/parsing errors
  /^(page|pages|exhibit|document|file|attachment|appendix)\s*\d*$/i,
  /^(see|ref|reference|note|notes|comment|comments)$/i,
  // Metadata field names
  /^(from|to|cc|bcc|subject|re|fwd|sent|received)$/i,
  /^(questions?\s*what|what\s*questions?)$/i,
];

// Explicit garbage entity names to filter out
const GARBAGE_ENTITY_NAMES = new Set([
  'phone begin', 'phone on', 'phone off', 'phone end',
  'begin phone', 'end phone', 'phone number', 'phone call',
  'service provider', 'provider', 'unknown', 'undefined',
  'n/a', 'na', 'tbd', 'none', 'blank', 'empty',
  'questions what', 'what questions', 'see attached',
  'page 1', 'page 2', 'exhibit a', 'exhibit b',
  'column a', 'column b', 'field 1', 'field 2',
]);

function isGarbageEntity(name: string): boolean {
  if (!name || name.trim().length < 2) return true;
  
  const normalized = name.toLowerCase().trim();
  
  // Check explicit garbage names
  if (GARBAGE_ENTITY_NAMES.has(normalized)) {
    console.log(`[GARBAGE FILTER] Removing: "${name}" (explicit match)`);
    return true;
  }
  
  // Check garbage patterns
  for (const pattern of GARBAGE_ENTITY_PATTERNS) {
    if (pattern.test(normalized)) {
      console.log(`[GARBAGE FILTER] Removing: "${name}" (pattern match)`);
      return true;
    }
  }
  
  return false;
}

function correctEntityType(name: string, type: string): string {
  // Check explicit corrections first
  const explicitCorrection = TYPE_CORRECTIONS[name];
  if (explicitCorrection) {
    if (explicitCorrection !== type) {
      console.log(`[TYPE CORRECTION] ${name}: ${type} → ${explicitCorrection}`);
    }
    return explicitCorrection;
  }

  // If already correctly typed, return as-is
  if (type === 'location' || type === 'organization') {
    return type;
  }

  // Apply pattern-based detection for misclassified entities
  if (type === 'person' || type === 'other') {
    // Check if it's actually a location
    for (const pattern of LOCATION_PATTERNS) {
      if (pattern.test(name)) {
        console.log(`[TYPE CORRECTION] ${name}: ${type} → location (pattern match)`);
        return 'location';
      }
    }

    // Check if it's actually an organization
    for (const pattern of ORGANIZATION_PATTERNS) {
      if (pattern.test(name)) {
        console.log(`[TYPE CORRECTION] ${name}: ${type} → organization (pattern match)`);
        return 'organization';
      }
    }
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

  // Combine entities - people first, filter garbage, then apply type corrections
  const rawEntities = [...(peopleEntities || []), ...(otherEntities || [])];
  
  // Filter out garbage entities (data artifacts like "Phone Begin", "Service Provider", etc.)
  const cleanEntities = rawEntities.filter(e => !isGarbageEntity(e.name));
  
  const entities = cleanEntities.map(e => ({
    ...e,
    type: correctEntityType(e.name, e.type)
  }));
  
  console.log('[GRAPH] Fetched', peopleEntities?.length || 0, 'people,', otherEntities?.length || 0, 'other. After garbage filter:', entities.length);

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
