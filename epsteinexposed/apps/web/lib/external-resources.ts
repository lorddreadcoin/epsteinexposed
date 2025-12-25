// Smart external resource mapping for context-aware linking
// Maps entities, document types, and keywords to specific external URLs

export interface ExternalResource {
  name: string;
  url: string;
  description: string;
  color: string; // Tailwind color class
}

// Known entities with direct external links
const ENTITY_LINKS: Record<string, ExternalResource[]> = {
  'ghislaine maxwell': [
    { name: 'Maxwell Case Files (DOJ)', url: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell', description: 'Official DOJ case page', color: 'cyan' },
    { name: 'Maxwell Deposition 2016', url: 'https://www.epsteinarchive.org/docs/maxwell-deposition-2016/', description: 'Full deposition transcript', color: 'amber' },
    { name: 'Maxwell Trial Videos', url: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell#videos', description: 'Interview recordings', color: 'pink' },
  ],
  'jeffrey epstein': [
    { name: 'Epstein Case (DOJ)', url: 'https://www.justice.gov/usao-sdny/united-states-v-jeffrey-epstein', description: 'Official DOJ case page', color: 'cyan' },
    { name: 'Federal Indictment', url: 'https://www.epsteinarchive.org/docs/federal-indictment/', description: 'Full indictment document', color: 'amber' },
    { name: 'FBI Investigation Phase 1', url: 'https://www.epsteinarchive.org/docs/fbi-phase1/', description: 'FBI documents', color: 'purple' },
  ],
  'virginia giuffre': [
    { name: 'Giuffre Deposition', url: 'https://www.epsteinarchive.org/docs/Virginia-Giuffre-deposition/', description: 'Full deposition transcript', color: 'amber' },
    { name: 'Giuffre v Maxwell (Unsealed)', url: 'https://www.epsteinarchive.org/docs/giuffre-v-maxwell-unsealed/', description: 'Unsealed court documents', color: 'cyan' },
  ],
  'johanna sjoberg': [
    { name: 'Sjoberg Deposition', url: 'https://www.epsteinarchive.org/docs/Sjoberg-Johanna-deposition/', description: 'Full deposition transcript', color: 'amber' },
  ],
  'katie johnson': [
    { name: 'Katie Johnson Lawsuit', url: 'https://www.epsteinarchive.org/docs/katie-johnson-lawsuit/', description: 'Court filing', color: 'cyan' },
    { name: 'Katie Johnson Interview 2016', url: 'https://www.epsteinarchive.org/docs/katie-johnson-interview-2016/', description: 'Video interview', color: 'pink' },
  ],
  'black book': [
    { name: 'Black Book (Unredacted)', url: 'https://www.epsteinarchive.org/docs/black-book-unredacted/', description: 'Full contact list', color: 'amber' },
    { name: 'Birthday Book', url: 'https://www.epsteinarchive.org/docs/birthday-book/', description: 'Related contact records', color: 'purple' },
  ],
  'flight log': [
    { name: 'Flight Logs', url: 'https://www.epsteinarchive.org/docs/flight-logs/', description: 'Lolita Express records', color: 'cyan' },
  ],
  'flight logs': [
    { name: 'Flight Logs', url: 'https://www.epsteinarchive.org/docs/flight-logs/', description: 'Lolita Express records', color: 'cyan' },
  ],
  'lolita express': [
    { name: 'Flight Logs', url: 'https://www.epsteinarchive.org/docs/flight-logs/', description: 'Lolita Express records', color: 'cyan' },
  ],
  'fbi': [
    { name: 'FBI Investigation Phase 1', url: 'https://www.epsteinarchive.org/docs/fbi-phase1/', description: 'FBI documents', color: 'purple' },
  ],
  'house oversight': [
    { name: 'House Oversight Emails', url: 'https://www.epsteinarchive.org/docs/house-oversight-emails/', description: 'Congressional oversight', color: 'cyan' },
  ],
};

// Document type patterns to external resources
const DOCUMENT_TYPE_LINKS: Record<string, ExternalResource[]> = {
  'deposition': [
    { name: 'Maxwell Deposition', url: 'https://www.epsteinarchive.org/docs/maxwell-deposition-2016/', description: 'Ghislaine Maxwell 2016', color: 'amber' },
    { name: 'Giuffre Deposition', url: 'https://www.epsteinarchive.org/docs/Virginia-Giuffre-deposition/', description: 'Virginia Giuffre', color: 'amber' },
    { name: 'Sjoberg Deposition', url: 'https://www.epsteinarchive.org/docs/Sjoberg-Johanna-deposition/', description: 'Johanna Sjoberg', color: 'amber' },
  ],
  'court': [
    { name: 'DOJ Court Records', url: 'https://www.justice.gov/epstein/court-records', description: 'All official court filings', color: 'cyan' },
    { name: 'Giuffre v Maxwell', url: 'https://www.epsteinarchive.org/docs/giuffre-v-maxwell-unsealed/', description: 'Unsealed documents', color: 'amber' },
  ],
  'indictment': [
    { name: 'Federal Indictment', url: 'https://www.epsteinarchive.org/docs/federal-indictment/', description: 'Official indictment', color: 'cyan' },
  ],
  'interview': [
    { name: 'Maxwell Trial Videos', url: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell#videos', description: 'Video interviews', color: 'pink' },
    { name: 'Katie Johnson Interview', url: 'https://www.epsteinarchive.org/docs/katie-johnson-interview-2016/', description: '2016 interview', color: 'pink' },
  ],
};

// Default fallback resources
const DEFAULT_RESOURCES: ExternalResource[] = [
  { name: 'DOJ Court Records', url: 'https://www.justice.gov/epstein/court-records', description: 'Official DOJ documents', color: 'cyan' },
  { name: 'Epstein Archive', url: 'https://www.epsteinarchive.org/', description: 'Comprehensive document archive', color: 'amber' },
  { name: 'New Epstein Files', url: 'https://journaliststudio.google.com/u/1/pinpoint/search?collection=ea371fdea7a785c0', description: '14,762 searchable documents', color: 'purple' },
];

/**
 * Get relevant external resources based on entity name, document ID, or search context
 */
export function getRelevantExternalResources(
  entityName?: string,
  documentId?: string,
  searchQuery?: string
): ExternalResource[] {
  const resources: ExternalResource[] = [];
  const seen = new Set<string>();

  // Helper to add resources without duplicates
  const addResources = (newResources: ExternalResource[]) => {
    for (const resource of newResources) {
      if (!seen.has(resource.url)) {
        seen.add(resource.url);
        resources.push(resource);
      }
    }
  };

  // 1. Check entity name
  if (entityName) {
    const normalizedEntity = entityName.toLowerCase().trim();
    
    // Direct match
    if (ENTITY_LINKS[normalizedEntity]) {
      addResources(ENTITY_LINKS[normalizedEntity]);
    }
    
    // Partial match
    for (const [key, value] of Object.entries(ENTITY_LINKS)) {
      if (normalizedEntity.includes(key) || key.includes(normalizedEntity)) {
        addResources(value);
      }
    }
  }

  // 2. Check document ID for patterns
  if (documentId) {
    const normalizedDocId = documentId.toLowerCase();
    
    // Check for document type keywords in ID
    for (const [type, typeResources] of Object.entries(DOCUMENT_TYPE_LINKS)) {
      if (normalizedDocId.includes(type)) {
        addResources(typeResources);
      }
    }
    
    // Check for entity names in document ID
    for (const [entity, entityResources] of Object.entries(ENTITY_LINKS)) {
      const firstName = entity.split(' ')[0];
      if (firstName && normalizedDocId.includes(firstName)) { // Check first name
        addResources(entityResources);
      }
    }
  }

  // 3. Check search query
  if (searchQuery) {
    const normalizedQuery = searchQuery.toLowerCase();
    
    // Check entities
    for (const [entity, entityResources] of Object.entries(ENTITY_LINKS)) {
      if (normalizedQuery.includes(entity) || entity.split(' ').some(word => normalizedQuery.includes(word))) {
        addResources(entityResources);
      }
    }
    
    // Check document types
    for (const [type, typeResources] of Object.entries(DOCUMENT_TYPE_LINKS)) {
      if (normalizedQuery.includes(type)) {
        addResources(typeResources);
      }
    }
  }

  // 4. If no specific matches, return defaults
  if (resources.length === 0) {
    return DEFAULT_RESOURCES;
  }

  // 5. Always ensure at least some fallbacks are included
  if (resources.length < 3) {
    addResources(DEFAULT_RESOURCES);
  }

  // Return top 5 most relevant
  return resources.slice(0, 5);
}

/**
 * Build a search URL for external sites based on query
 */
export function buildExternalSearchUrl(query: string, site: 'doj' | 'archive' | 'google'): string {
  const encodedQuery = encodeURIComponent(query);
  
  switch (site) {
    case 'doj':
      return `https://www.justice.gov/search?keys=${encodedQuery}+epstein`;
    case 'archive':
      return `https://www.epsteinarchive.org/?s=${encodedQuery}`;
    case 'google':
      return `https://journaliststudio.google.com/u/1/pinpoint/search?collection=ea371fdea7a785c0&q=${encodedQuery}`;
    default:
      return `https://www.google.com/search?q=${encodedQuery}+epstein+documents`;
  }
}

/**
 * Get the color classes for a resource
 */
export function getResourceColorClasses(color: string): { bg: string; text: string; border: string; hover: string } {
  const defaultColor = { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', hover: 'group-hover:text-cyan-400' };
  
  const colors: Record<string, { bg: string; text: string; border: string; hover: string }> = {
    cyan: defaultColor,
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', hover: 'group-hover:text-amber-400' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', hover: 'group-hover:text-purple-400' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30', hover: 'group-hover:text-pink-400' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', hover: 'group-hover:text-blue-400' },
  };
  
  return colors[color] ?? defaultColor;
}
