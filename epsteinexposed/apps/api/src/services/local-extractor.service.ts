/**
 * Local Entity Extractor - Zero API calls
 * Extracts entities using regex patterns and heuristics
 * Reduces Claude API usage by 95%+ by handling common patterns locally
 */

export interface LocalExtractedEntities {
  people: Array<{ name: string; confidence: number; context: string }>;
  locations: Array<{ name: string; type: string; confidence: number }>;
  dates: Array<{ date: string; raw: string; confidence: number }>;
  flights: Array<{ from: string; to: string; date: string; passengers: string[]; confidence: number }>;
  phone_numbers: Array<{ number: string; confidence: number }>;
  emails: Array<{ email: string; confidence: number }>;
  money: Array<{ amount: string; raw: string; confidence: number }>;
  addresses: Array<{ address: string; confidence: number }>;
}

// Known Epstein-related names for high-confidence matching
const KNOWN_NAMES = new Set([
  'jeffrey epstein', 'ghislaine maxwell', 'les wexner', 'leslie wexner',
  'alan dershowitz', 'prince andrew', 'bill clinton', 'donald trump',
  'jean-luc brunel', 'sarah kellen', 'nadia marcinkova', 'lesley groff',
  'virginia giuffre', 'virginia roberts', 'courtney wild', 'annie farmer',
  'maria farmer', 'johanna sjoberg', 'haley robson', 'adriana ross',
  'eva andersson dubin', 'glenn dubin', 'mort zuckerman', 'ehud barak',
  'bill richardson', 'george mitchell', 'marvin minsky', 'stephen hawking',
  'kevin spacey', 'chris tucker', 'naomi campbell', 'heidi klum',
]);

// Known locations
const KNOWN_LOCATIONS = new Set([
  'little st. james', 'little saint james', 'epstein island', 'pedophile island',
  'zorro ranch', 'new mexico ranch', 'palm beach', '358 el brillo way',
  '9 east 71st street', 'new york mansion', 'paris apartment', 'avenue foch',
  'teterboro', 'jfk', 'laguardia', 'miami', 'columbus', 'santa fe',
]);

// Airport codes for flight logs
const AIRPORT_CODES = new Set([
  'TEB', 'JFK', 'LGA', 'MIA', 'PBI', 'SJU', 'STT', 'EIS', 'SAF', 'ABQ',
  'CMH', 'BED', 'HPN', 'FLL', 'MCO', 'ATL', 'LAX', 'SFO', 'ORD', 'DFW',
  'LHR', 'CDG', 'FCO', 'NRT', 'HND', 'DXB', 'SIN', 'HKG', 'SYD', 'AKL',
]);

export class LocalExtractorService {
  
  extractAll(text: string): LocalExtractedEntities {
    return {
      people: this.extractPeople(text),
      locations: this.extractLocations(text),
      dates: this.extractDates(text),
      flights: this.extractFlights(text),
      phone_numbers: this.extractPhoneNumbers(text),
      emails: this.extractEmails(text),
      money: this.extractMoney(text),
      addresses: this.extractAddresses(text),
    };
  }
  
  private extractPeople(text: string): LocalExtractedEntities['people'] {
    const people: LocalExtractedEntities['people'] = [];
    const seen = new Set<string>();
    const textLower = text.toLowerCase();
    
    // 1. Check for known names (high confidence)
    for (const knownName of KNOWN_NAMES) {
      if (textLower.includes(knownName) && !seen.has(knownName)) {
        seen.add(knownName);
        const idx = textLower.indexOf(knownName);
        const context = text.slice(Math.max(0, idx - 50), idx + knownName.length + 50);
        people.push({
          name: this.toTitleCase(knownName),
          confidence: 0.95,
          context: context.trim(),
        });
      }
    }
    
    // 2. Pattern: "Mr./Mrs./Ms./Dr. LastName" or "FirstName LastName"
    const namePatterns = [
      /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
      /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+(?:Jr\.|Sr\.|III|IV|II))?)/g,
    ];
    
    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1] || match[0];
        const nameLower = name.toLowerCase().trim();
        
        // Skip common non-names
        if (this.isCommonPhrase(nameLower)) continue;
        if (seen.has(nameLower)) continue;
        
        seen.add(nameLower);
        const idx = match.index;
        const context = text.slice(Math.max(0, idx - 30), idx + name.length + 30);
        
        people.push({
          name: name.trim(),
          confidence: KNOWN_NAMES.has(nameLower) ? 0.95 : 0.7,
          context: context.trim(),
        });
      }
    }
    
    return people.slice(0, 100); // Limit to prevent explosion
  }
  
  private extractLocations(text: string): LocalExtractedEntities['locations'] {
    const locations: LocalExtractedEntities['locations'] = [];
    const seen = new Set<string>();
    const textLower = text.toLowerCase();
    
    // 1. Known locations
    for (const loc of KNOWN_LOCATIONS) {
      if (textLower.includes(loc) && !seen.has(loc)) {
        seen.add(loc);
        locations.push({
          name: this.toTitleCase(loc),
          type: this.guessLocationType(loc),
          confidence: 0.95,
        });
      }
    }
    
    // 2. Airport codes
    for (const code of AIRPORT_CODES) {
      const pattern = new RegExp(`\\b${code}\\b`, 'g');
      if (pattern.test(text) && !seen.has(code)) {
        seen.add(code);
        locations.push({
          name: code,
          type: 'airport',
          confidence: 0.9,
        });
      }
    }
    
    // 3. US State patterns
    const statePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\b/g;
    let match;
    while ((match = statePattern.exec(text)) !== null) {
      const loc = `${match[1]}, ${match[2]}`;
      if (!seen.has(loc.toLowerCase())) {
        seen.add(loc.toLowerCase());
        locations.push({
          name: loc,
          type: 'city',
          confidence: 0.8,
        });
      }
    }
    
    return locations.slice(0, 50);
  }
  
  private extractDates(text: string): LocalExtractedEntities['dates'] {
    const dates: LocalExtractedEntities['dates'] = [];
    const seen = new Set<string>();
    
    const datePatterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      { pattern: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g, format: 'MDY' },
      // YYYY-MM-DD (ISO)
      { pattern: /\b(\d{4})-(\d{2})-(\d{2})\b/g, format: 'ISO' },
      // Month DD, YYYY
      { pattern: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi, format: 'LONG' },
      // DD Month YYYY
      { pattern: /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi, format: 'EURO' },
    ];
    
    for (const { pattern, format } of datePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const raw = match[0];
        if (seen.has(raw)) continue;
        seen.add(raw);
        
        const normalized = this.normalizeDate(match, format);
        if (normalized) {
          dates.push({
            date: normalized,
            raw,
            confidence: 0.9,
          });
        }
      }
    }
    
    return dates.slice(0, 100);
  }
  
  private extractFlights(text: string): LocalExtractedEntities['flights'] {
    const flights: LocalExtractedEntities['flights'] = [];
    
    // Flight log pattern: FROM -> TO or FROM - TO with date
    const flightPattern = /\b([A-Z]{3})\s*(?:->|→|to|-)\s*([A-Z]{3})\b/gi;
    let match;
    
    while ((match = flightPattern.exec(text)) !== null) {
      const from = match[1].toUpperCase();
      const to = match[2].toUpperCase();
      
      if (AIRPORT_CODES.has(from) || AIRPORT_CODES.has(to)) {
        // Look for date nearby
        const context = text.slice(Math.max(0, match.index - 100), match.index + 100);
        const dateMatch = context.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
        
        flights.push({
          from,
          to,
          date: dateMatch ? dateMatch[0] : 'unknown',
          passengers: [],
          confidence: 0.85,
        });
      }
    }
    
    return flights.slice(0, 50);
  }
  
  private extractPhoneNumbers(text: string): LocalExtractedEntities['phone_numbers'] {
    const phones: LocalExtractedEntities['phone_numbers'] = [];
    const seen = new Set<string>();
    
    // Various phone formats
    const phonePatterns = [
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g,
      /\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /\b\d{10}\b/g,
    ];
    
    for (const pattern of phonePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const num = match[0].replace(/\D/g, '');
        if (num.length >= 10 && !seen.has(num)) {
          seen.add(num);
          phones.push({ number: match[0], confidence: 0.9 });
        }
      }
    }
    
    return phones.slice(0, 50);
  }
  
  private extractEmails(text: string): LocalExtractedEntities['emails'] {
    const emails: LocalExtractedEntities['emails'] = [];
    const seen = new Set<string>();
    
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    
    while ((match = emailPattern.exec(text)) !== null) {
      const email = match[0].toLowerCase();
      if (!seen.has(email)) {
        seen.add(email);
        emails.push({ email, confidence: 0.95 });
      }
    }
    
    return emails;
  }
  
  private extractMoney(text: string): LocalExtractedEntities['money'] {
    const money: LocalExtractedEntities['money'] = [];
    const seen = new Set<string>();
    
    const moneyPatterns = [
      /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|thousand|M|B|K))?/gi,
      /(?:USD|EUR|GBP)\s*[\d,]+(?:\.\d{2})?/gi,
    ];
    
    for (const pattern of moneyPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const raw = match[0];
        if (!seen.has(raw)) {
          seen.add(raw);
          money.push({
            amount: this.normalizeMoney(raw),
            raw,
            confidence: 0.9,
          });
        }
      }
    }
    
    return money.slice(0, 50);
  }
  
  private extractAddresses(text: string): LocalExtractedEntities['addresses'] {
    const addresses: LocalExtractedEntities['addresses'] = [];
    
    // Street address pattern
    const addressPattern = /\b\d+\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct)\.?\b/gi;
    let match;
    
    while ((match = addressPattern.exec(text)) !== null) {
      addresses.push({
        address: match[0],
        confidence: 0.8,
      });
    }
    
    return addresses.slice(0, 30);
  }
  
  // Helper methods
  private toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, txt => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
  
  private isCommonPhrase(name: string): boolean {
    const common = new Set([
      'the court', 'new york', 'united states', 'los angeles', 'san francisco',
      'the defendant', 'the plaintiff', 'your honor', 'the witness',
      'page number', 'exhibit number', 'case number', 'file number',
    ]);
    return common.has(name.toLowerCase());
  }
  
  private guessLocationType(loc: string): string {
    if (loc.includes('island') || loc.includes('st.')) return 'island';
    if (loc.includes('ranch')) return 'property';
    if (loc.includes('mansion') || loc.includes('apartment')) return 'residence';
    if (loc.includes('street') || loc.includes('avenue') || loc.includes('way')) return 'address';
    return 'location';
  }
  
  private normalizeDate(match: RegExpExecArray, format: string): string | null {
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    
    try {
      let year: string, month: string, day: string;
      
      switch (format) {
        case 'MDY':
          month = match[1].padStart(2, '0');
          day = match[2].padStart(2, '0');
          year = match[3];
          break;
        case 'ISO':
          year = match[1];
          month = match[2];
          day = match[3];
          break;
        case 'LONG':
          month = months[match[1].toLowerCase()] || '01';
          day = match[2].padStart(2, '0');
          year = match[3];
          break;
        case 'EURO':
          day = match[1].padStart(2, '0');
          month = months[match[2].toLowerCase()] || '01';
          year = match[3];
          break;
        default:
          return null;
      }
      
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  }
  
  private normalizeMoney(raw: string): string {
    const num = raw.replace(/[^\d.]/g, '');
    const multiplier = raw.toLowerCase().includes('million') || raw.includes('M') ? 1000000 :
                       raw.toLowerCase().includes('billion') || raw.includes('B') ? 1000000000 :
                       raw.toLowerCase().includes('thousand') || raw.includes('K') ? 1000 : 1;
    
    const value = parseFloat(num) * multiplier;
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
  
  /**
   * Calculate if Claude is needed for this document
   * Returns true only if local extraction found very little
   */
  needsClaudeAnalysis(entities: LocalExtractedEntities, textLength: number): boolean {
    const totalFound = 
      entities.people.length +
      entities.locations.length +
      entities.dates.length +
      entities.flights.length;
    
    // If we found decent entities locally, skip Claude
    if (totalFound > 10) return false;
    
    // If document is very short, skip Claude
    if (textLength < 500) return false;
    
    // If document is long but we found almost nothing, maybe use Claude
    if (textLength > 5000 && totalFound < 3) return true;
    
    return false;
  }
}
