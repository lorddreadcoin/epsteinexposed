import fs from 'fs/promises';
import path from 'path';

export interface DocumentReference {
  id: string;
  filename: string;
  path: string;
  pageCount: number;
  dataset: string;
  mentions: Array<{
    entity: string;
    type: string;
    context?: string;
  }>;
}

interface DocumentEntity {
  document: {
    id: string;
    filename: string;
    path: string;
    pageCount: number;
    dataset: string;
  };
  entities: {
    people?: Array<{ name: string; role?: string; context?: string }>;
    locations?: Array<{ name: string; type?: string }>;
    dates?: Array<{ date: string; event?: string }>;
    flights?: Array<{ from: string; to: string; date?: string }>;
  };
}

export class DocumentMapperService {
  private entitiesPath: string;
  private docsBasePath: string;
  private cache: Map<string, DocumentReference[]> = new Map();
  
  constructor() {
    this.entitiesPath = path.join(__dirname, '../../data/entities');
    this.docsBasePath = path.join(__dirname, '../../../web');
  }
  
  async getDocumentsForEntity(entityName: string): Promise<DocumentReference[]> {
    const normalizedName = entityName.toLowerCase().trim();
    
    // Check cache
    if (this.cache.has(normalizedName)) {
      return this.cache.get(normalizedName)!;
    }
    
    console.log(`📄 Finding documents for entity: ${entityName}`);
    const docs: DocumentReference[] = [];
    
    let files: string[];
    try {
      files = await fs.readdir(this.entitiesPath);
    } catch (error) {
      console.error('Entity directory not found');
      return [];
    }
    
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(this.entitiesPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data: DocumentEntity = JSON.parse(content);
        
        const mentions: Array<{ entity: string; type: string; context?: string }> = [];
        
        // Check people
        if (data.entities?.people) {
          for (const person of data.entities.people) {
            if (person.name.toLowerCase().trim().includes(normalizedName) ||
                normalizedName.includes(person.name.toLowerCase().trim())) {
              mentions.push({
                entity: person.name,
                type: 'person',
                context: person.context || person.role,
              });
            }
          }
        }
        
        // Check locations
        if (data.entities?.locations) {
          for (const location of data.entities.locations) {
            if (location.name.toLowerCase().trim().includes(normalizedName) ||
                normalizedName.includes(location.name.toLowerCase().trim())) {
              mentions.push({
                entity: location.name,
                type: 'location',
              });
            }
          }
        }
        
        if (mentions.length > 0) {
          docs.push({
            id: data.document.id,
            filename: data.document.filename,
            path: data.document.path,
            pageCount: data.document.pageCount || 0,
            dataset: data.document.dataset || 'Unknown',
            mentions,
          });
        }
        
      } catch (error) {
        // Skip failed files
      }
    }
    
    // Cache results
    this.cache.set(normalizedName, docs);
    
    console.log(`✅ Found ${docs.length} documents for ${entityName}`);
    return docs;
  }
  
  async getDocumentsForConnection(entity1: string, entity2: string): Promise<DocumentReference[]> {
    const normalized1 = entity1.toLowerCase().trim();
    const normalized2 = entity2.toLowerCase().trim();
    
    console.log(`🔗 Finding documents connecting: ${entity1} ↔ ${entity2}`);
    const docs: DocumentReference[] = [];
    
    let files: string[];
    try {
      files = await fs.readdir(this.entitiesPath);
    } catch (error) {
      return [];
    }
    
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(this.entitiesPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data: DocumentEntity = JSON.parse(content);
        
        const entity1Present = this.entityInDocument(data, normalized1);
        const entity2Present = this.entityInDocument(data, normalized2);
        
        if (entity1Present && entity2Present) {
          docs.push({
            id: data.document.id,
            filename: data.document.filename,
            path: data.document.path,
            pageCount: data.document.pageCount || 0,
            dataset: data.document.dataset || 'Unknown',
            mentions: [
              { entity: entity1, type: 'person' },
              { entity: entity2, type: 'person' },
            ],
          });
        }
        
      } catch (error) {
        // Skip
      }
    }
    
    console.log(`✅ Found ${docs.length} documents connecting ${entity1} ↔ ${entity2}`);
    return docs;
  }
  
  private entityInDocument(data: DocumentEntity, normalizedName: string): boolean {
    if (data.entities?.people) {
      for (const person of data.entities.people) {
        const personName = person.name.toLowerCase().trim();
        if (personName.includes(normalizedName) || normalizedName.includes(personName)) {
          return true;
        }
      }
    }
    
    if (data.entities?.locations) {
      for (const location of data.entities.locations) {
        const locName = location.name.toLowerCase().trim();
        if (locName.includes(normalizedName) || normalizedName.includes(locName)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  async getDocumentById(documentId: string): Promise<DocumentReference | null> {
    let files: string[];
    try {
      files = await fs.readdir(this.entitiesPath);
    } catch (error) {
      return null;
    }
    
    // Find the JSON file for this document
    for (const file of files) {
      if (file.includes(documentId) || file.startsWith(documentId)) {
        try {
          const filePath = path.join(this.entitiesPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data: DocumentEntity = JSON.parse(content);
          
          if (data.document.id === documentId || data.document.id.includes(documentId)) {
            const mentions: Array<{ entity: string; type: string; context?: string }> = [];
            
            if (data.entities?.people) {
              for (const person of data.entities.people) {
                mentions.push({
                  entity: person.name,
                  type: 'person',
                  context: person.context || person.role,
                });
              }
            }
            
            if (data.entities?.locations) {
              for (const location of data.entities.locations) {
                mentions.push({
                  entity: location.name,
                  type: 'location',
                });
              }
            }
            
            return {
              id: data.document.id,
              filename: data.document.filename,
              path: data.document.path,
              pageCount: data.document.pageCount || 0,
              dataset: data.document.dataset || 'Unknown',
              mentions,
            };
          }
        } catch (error) {
          // Continue searching
        }
      }
    }
    
    return null;
  }
  
  async getDocumentPath(documentId: string): Promise<string | null> {
    const doc = await this.getDocumentById(documentId);
    return doc?.path || null;
  }
  
  async getDocumentEntities(documentId: string): Promise<{
    people: string[];
    locations: string[];
    dates: string[];
  }> {
    const doc = await this.getDocumentById(documentId);
    
    if (!doc) {
      return { people: [], locations: [], dates: [] };
    }
    
    const people = doc.mentions
      .filter(m => m.type === 'person')
      .map(m => m.entity);
    
    const locations = doc.mentions
      .filter(m => m.type === 'location')
      .map(m => m.entity);
    
    return {
      people,
      locations,
      dates: [],
    };
  }
}
