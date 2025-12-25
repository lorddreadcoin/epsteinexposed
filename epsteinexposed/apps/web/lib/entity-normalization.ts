// Entity normalization utility - consolidates name variations using smart fuzzy matching
// Handles spelling variations, reversed names, and known aliases

export interface EntityVariation {
  name: string;
  mentions: number;
  documents: number;
  documentIds: string[];
}

export interface MergedEntity {
  canonicalName: string;
  type: string;
  variations: EntityVariation[];
  totalMentions: number;
  totalDocuments: number;
  allDocumentIds: string[];
  confidence: number; // How confident we are in the merge
}

/**
 * Normalize a name for comparison (lowercase, remove punctuation, standardize spacing)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,\-'"`]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize spaces
    .replace(/\b(mr|mrs|ms|dr|prof|sir|lady|lord|prince|princess|duke|duchess)\b\.?\s*/gi, '') // Remove titles
    .trim();
}

/**
 * Extract name parts (first, last, middle)
 */
function extractNameParts(name: string): { first: string; last: string; middle: string; full: string } {
  const normalized = normalizeName(name);
  const parts = normalized.split(' ').filter(p => p.length > 0);
  
  if (parts.length === 0) return { first: '', last: '', middle: '', full: normalized };
  if (parts.length === 1) return { first: parts[0] || '', last: '', middle: '', full: normalized };
  if (parts.length === 2) return { first: parts[0] || '', last: parts[1] || '', middle: '', full: normalized };
  
  return {
    first: parts[0] || '',
    last: parts[parts.length - 1] || '',
    middle: parts.slice(1, -1).join(' '),
    full: normalized
  };
}

/**
 * Calculate similarity between two strings (Levenshtein-based)
 */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  // Quick check - if length difference is too large, low similarity
  if (longer.length - shorter.length > Math.max(3, longer.length * 0.3)) return 0;
  
  // Calculate edit distance using dynamic programming
  const m = shorter.length;
  const n = longer.length;
  const matrix: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) matrix[i]![0] = i;
  for (let j = 0; j <= n; j++) matrix[0]![j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
      const prevRow = matrix[i - 1];
      const currRow = matrix[i];
      if (prevRow && currRow) {
        currRow[j] = Math.min(
          (prevRow[j - 1] ?? 0) + cost,
          (currRow[j - 1] ?? 0) + 1,
          (prevRow[j] ?? 0) + 1
        );
      }
    }
  }
  
  const lastRow = matrix[m];
  const distance = lastRow ? (lastRow[n] ?? 0) : 0;
  return 1 - distance / longer.length;
}

/**
 * Check if two names likely refer to the same person
 * Uses multiple heuristics for smart matching
 */
export function areNamesSamePerson(name1: string, name2: string): { match: boolean; confidence: number; reason: string } {
  const n1 = extractNameParts(name1);
  const n2 = extractNameParts(name2);
  
  // Exact match after normalization
  if (n1.full === n2.full) {
    return { match: true, confidence: 1.0, reason: 'exact_match' };
  }
  
  // Check for reversed names (First Last vs Last First)
  const reversed1 = `${n1.last} ${n1.first}`.trim();
  const reversed2 = `${n2.last} ${n2.first}`.trim();
  
  if (n1.full === reversed2 || n2.full === reversed1) {
    return { match: true, confidence: 0.95, reason: 'reversed_name' };
  }
  
  // Check if one contains the other (handles "Ghislaine Maxwell II" vs "Ghislaine Maxwell")
  if (n1.full.includes(n2.full) || n2.full.includes(n1.full)) {
    const shorter = n1.full.length < n2.full.length ? n1.full : n2.full;
    const longer = n1.full.length < n2.full.length ? n2.full : n1.full;
    // Only match if the extra part is short (like "II", "Jr", etc.)
    if (longer.length - shorter.length <= 5) {
      return { match: true, confidence: 0.9, reason: 'contains_variation' };
    }
  }
  
  // Check first + last name match with high similarity
  if (n1.first && n1.last && n2.first && n2.last) {
    const firstSim = stringSimilarity(n1.first, n2.first);
    const lastSim = stringSimilarity(n1.last, n2.last);
    
    // Both first and last names very similar (handles typos like "Ghislain" vs "Ghislaine")
    if (firstSim >= 0.8 && lastSim >= 0.9) {
      return { match: true, confidence: Math.min(firstSim, lastSim), reason: 'fuzzy_match' };
    }
    
    // Reversed with high similarity
    const firstToLastSim = stringSimilarity(n1.first, n2.last);
    const lastToFirstSim = stringSimilarity(n1.last, n2.first);
    if (firstToLastSim >= 0.8 && lastToFirstSim >= 0.9) {
      return { match: true, confidence: Math.min(firstToLastSim, lastToFirstSim) * 0.95, reason: 'fuzzy_reversed' };
    }
  }
  
  // Overall string similarity for short names
  const overallSim = stringSimilarity(n1.full, n2.full);
  if (overallSim >= 0.85) {
    return { match: true, confidence: overallSim, reason: 'high_similarity' };
  }
  
  return { match: false, confidence: overallSim, reason: 'no_match' };
}

/**
 * Merge multiple entity search results into consolidated entities
 */
export function mergeEntities(entities: Array<{
  name: string;
  type: string;
  occurrences?: number;
  mentions?: number;
  documentIds?: string[];
  documents?: number;
}>): MergedEntity[] {
  const merged: MergedEntity[] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < entities.length; i++) {
    if (processed.has(i)) continue;
    
    const entity = entities[i];
    if (!entity) continue;
    
    const firstVariation: EntityVariation = {
      name: entity.name,
      mentions: entity.occurrences || entity.mentions || 0,
      documents: entity.documents || entity.documentIds?.length || 0,
      documentIds: entity.documentIds || [],
    };
    
    const variations: EntityVariation[] = [firstVariation];
    let totalMentions = firstVariation.mentions;
    let totalDocuments = firstVariation.documents;
    const allDocumentIds = new Set<string>(firstVariation.documentIds);
    let bestConfidence = 1.0;
    
    // Find all matching entities
    for (let j = i + 1; j < entities.length; j++) {
      if (processed.has(j)) continue;
      
      const other = entities[j];
      if (!other) continue;
      
      // Only merge same type
      if (entity.type !== other.type) continue;
      
      const comparison = areNamesSamePerson(entity.name, other.name);
      
      if (comparison.match && comparison.confidence >= 0.8) {
        processed.add(j);
        
        const otherVariation: EntityVariation = {
          name: other.name,
          mentions: other.occurrences || other.mentions || 0,
          documents: other.documents || other.documentIds?.length || 0,
          documentIds: other.documentIds || [],
        };
        
        variations.push(otherVariation);
        totalMentions += otherVariation.mentions;
        totalDocuments += otherVariation.documents;
        otherVariation.documentIds.forEach(id => allDocumentIds.add(id));
        bestConfidence = Math.min(bestConfidence, comparison.confidence);
      }
    }
    
    // Determine canonical name (use the one with most mentions)
    const canonicalVariation = variations.reduce((best, v) => 
      v.mentions > best.mentions ? v : best
    , firstVariation);
    
    merged.push({
      canonicalName: canonicalVariation.name,
      type: entity.type,
      variations,
      totalMentions,
      totalDocuments: allDocumentIds.size || totalDocuments,
      allDocumentIds: Array.from(allDocumentIds),
      confidence: bestConfidence,
    });
    
    processed.add(i);
  }
  
  // Sort by total mentions (most prominent entities first)
  return merged.sort((a, b) => b.totalMentions - a.totalMentions);
}

/**
 * Get document links for an entity (for AI briefing citations)
 */
export function getEntityDocumentLinks(entity: MergedEntity): Array<{
  name: string;
  url: string;
  type: string;
}> {
  const links: Array<{ name: string; url: string; type: string }> = [];
  
  // Known document mappings
  const knownDocs: Record<string, { name: string; url: string; type: string }> = {
    'flight-logs': { 
      name: 'Flight Logs', 
      url: 'https://www.epsteinarchive.org/docs/flight-logs/', 
      type: 'archive' 
    },
    'black-book': { 
      name: 'Black Book (Unredacted)', 
      url: 'https://www.epsteinarchive.org/docs/black-book-unredacted/', 
      type: 'archive' 
    },
    'giuffre-maxwell': { 
      name: 'Giuffre v Maxwell (Unsealed)', 
      url: 'https://www.epsteinarchive.org/docs/giuffre-v-maxwell-unsealed/', 
      type: 'court' 
    },
    'indictment': { 
      name: 'Federal Indictment', 
      url: 'https://www.epsteinarchive.org/docs/federal-indictment/', 
      type: 'court' 
    },
    'maxwell-deposition': { 
      name: 'Maxwell Deposition 2016', 
      url: 'https://www.epsteinarchive.org/docs/maxwell-deposition-2016/', 
      type: 'deposition' 
    },
    'giuffre-deposition': { 
      name: 'Virginia Giuffre Deposition', 
      url: 'https://www.epsteinarchive.org/docs/Virginia-Giuffre-deposition/', 
      type: 'deposition' 
    },
    'fbi': { 
      name: 'FBI Investigation Phase 1', 
      url: 'https://www.epsteinarchive.org/docs/fbi-phase1/', 
      type: 'investigation' 
    },
  };
  
  // Add known documents based on entity name
  const entityLower = entity.canonicalName.toLowerCase();
  
  const addDoc = (key: string) => {
    const doc = knownDocs[key];
    if (doc && !links.find(l => l.url === doc.url)) {
      links.push(doc);
    }
  };
  
  if (entityLower.includes('maxwell')) {
    addDoc('maxwell-deposition');
    addDoc('giuffre-maxwell');
  }
  if (entityLower.includes('giuffre') || entityLower.includes('virginia')) {
    addDoc('giuffre-deposition');
    addDoc('giuffre-maxwell');
  }
  if (entityLower.includes('epstein') || entityLower.includes('jeffrey')) {
    addDoc('indictment');
    addDoc('fbi');
  }
  
  // Always add flight logs and black book for people
  if (entity.type === 'person') {
    addDoc('flight-logs');
    addDoc('black-book');
  }
  
  // Add DOJ court records link
  links.push({
    name: 'DOJ Court Records',
    url: 'https://www.justice.gov/epstein/court-records',
    type: 'official'
  });
  
  return links.slice(0, 5); // Return top 5 most relevant
}
