/**
 * Graph Builder Service
 * Builds a knowledge graph from extracted entities
 * Finds connections, clusters, and anomalies
 */

import { EntityDataLoaderService } from './entity-data-loader.service';

export interface NetworkCluster {
  id: string;
  members: string[];
  memberNames: string[];
  totalConnections: number;
  avgStrength: number;
  documents: string[];
}

export interface Discovery {
  id: string;
  type: 'network_cluster' | 'geographic_pattern' | 'timeline_anomaly' | 'redaction_pattern' | 'suspicious_absence';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entities: string[];
  documents: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface GeographicPattern {
  location: string;
  people: string[];
  dates: string[];
  documents: string[];
}

export class GraphBuilderService {
  private entityLoader: EntityDataLoaderService;
  private discoveries: Discovery[] = [];
  
  constructor() {
    this.entityLoader = new EntityDataLoaderService();
  }
  
  /**
   * Discovery #1: Find tight network clusters
   * People who appear together frequently across documents
   */
  async findNetworkClusters(minStrength = 3, minSize = 3): Promise<NetworkCluster[]> {
    console.log('🔍 Finding network clusters...');
    
    const connections = await this.entityLoader.buildConnectionGraph();
    const entities = await this.entityLoader.loadAllEntities();
    
    // Build adjacency map
    const adjacency = new Map<string, Map<string, number>>();
    
    for (const conn of connections) {
      if (conn.strength < minStrength) continue;
      
      if (!adjacency.has(conn.from)) {
        adjacency.set(conn.from, new Map());
      }
      if (!adjacency.has(conn.to)) {
        adjacency.set(conn.to, new Map());
      }
      
      adjacency.get(conn.from)!.set(conn.to, conn.strength);
      adjacency.get(conn.to)!.set(conn.from, conn.strength);
    }
    
    // Find clusters using simple connected components
    const visited = new Set<string>();
    const clusters: NetworkCluster[] = [];
    
    for (const [nodeId] of adjacency) {
      if (visited.has(nodeId)) continue;
      
      // BFS to find cluster
      const cluster = new Set<string>();
      const queue = [nodeId];
      let totalStrength = 0;
      let connectionCount = 0;
      const docs = new Set<string>();
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        
        visited.add(current);
        cluster.add(current);
        
        const neighbors = adjacency.get(current);
        if (neighbors) {
          for (const [neighbor, strength] of neighbors) {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
              totalStrength += strength;
              connectionCount++;
            }
          }
        }
        
        // Get documents for this entity
        const entity = entities.find(e => e.id === current);
        if (entity) {
          entity.documentIds.forEach(d => docs.add(d));
        }
      }
      
      if (cluster.size >= minSize) {
        const memberNames = Array.from(cluster).map(id => {
          const entity = entities.find(e => e.id === id);
          return entity?.name || id;
        });
        
        clusters.push({
          id: `cluster_${clusters.length}`,
          members: Array.from(cluster),
          memberNames,
          totalConnections: connectionCount,
          avgStrength: connectionCount > 0 ? totalStrength / connectionCount : 0,
          documents: Array.from(docs),
        });
      }
    }
    
    // Sort by size and strength
    clusters.sort((a, b) => {
      const sizeScore = b.members.length - a.members.length;
      if (sizeScore !== 0) return sizeScore;
      return b.avgStrength - a.avgStrength;
    });
    
    console.log(`✅ Found ${clusters.length} network clusters`);
    
    // Generate discoveries from top clusters
    for (const cluster of clusters.slice(0, 5)) {
      if (cluster.members.length >= 5) {
        this.discoveries.push({
          id: `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'network_cluster',
          severity: cluster.members.length >= 10 ? 'critical' : 'high',
          title: `Network Cluster: ${cluster.members.length} Connected Individuals`,
          description: `Analysis reveals a tight network of ${cluster.members.length} individuals with ${cluster.totalConnections} co-occurrences across ${cluster.documents.length} documents. Key members: ${cluster.memberNames.slice(0, 5).join(', ')}${cluster.memberNames.length > 5 ? '...' : ''}`,
          entities: cluster.members,
          documents: cluster.documents.slice(0, 10),
          timestamp: new Date(),
          metadata: {
            avgStrength: cluster.avgStrength,
            memberNames: cluster.memberNames,
          },
        });
      }
    }
    
    return clusters;
  }
  
  /**
   * Discovery #2: Find geographic patterns
   * Who was at the same locations?
   */
  async findGeographicPatterns(): Promise<GeographicPattern[]> {
    console.log('🌍 Finding geographic patterns...');
    
    const entities = await this.entityLoader.loadAllEntities();
    const locations = entities.filter(e => e.type === 'location');
    const people = entities.filter(e => e.type === 'person');
    
    const patterns: GeographicPattern[] = [];
    
    // For each location, find who was mentioned in the same documents
    for (const location of locations) {
      const peopleAtLocation: string[] = [];
      const datesAtLocation: string[] = [];
      
      for (const person of people) {
        // Check if person and location share documents
        const sharedDocs = person.documentIds.filter(d => 
          location.documentIds.includes(d)
        );
        
        if (sharedDocs.length > 0) {
          peopleAtLocation.push(person.name);
        }
      }
      
      // Find dates in same documents
      const dates = entities.filter(e => e.type === 'date');
      for (const date of dates) {
        const sharedDocs = date.documentIds.filter(d => 
          location.documentIds.includes(d)
        );
        if (sharedDocs.length > 0) {
          datesAtLocation.push(date.name);
        }
      }
      
      if (peopleAtLocation.length >= 3) {
        patterns.push({
          location: location.name,
          people: peopleAtLocation,
          dates: datesAtLocation.slice(0, 10),
          documents: location.documentIds,
        });
      }
    }
    
    // Sort by number of people
    patterns.sort((a, b) => b.people.length - a.people.length);
    
    console.log(`✅ Found ${patterns.length} geographic patterns`);
    
    // Generate discoveries
    for (const pattern of patterns.slice(0, 3)) {
      if (pattern.people.length >= 5) {
        this.discoveries.push({
          id: `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'geographic_pattern',
          severity: pattern.people.length >= 10 ? 'high' : 'medium',
          title: `Geographic Pattern: ${pattern.location}`,
          description: `${pattern.people.length} individuals connected to ${pattern.location} across ${pattern.documents.length} documents. Notable names: ${pattern.people.slice(0, 5).join(', ')}`,
          entities: pattern.people.slice(0, 20),
          documents: pattern.documents.slice(0, 10),
          timestamp: new Date(),
          metadata: {
            location: pattern.location,
            dates: pattern.dates,
          },
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Discovery #3: Find most connected individuals
   * The "hubs" of the network
   */
  async findMostConnected(limit = 20): Promise<Array<{ name: string; connections: number; documents: number }>> {
    console.log('🔗 Finding most connected individuals...');
    
    const connections = await this.entityLoader.buildConnectionGraph();
    const entities = await this.entityLoader.loadAllEntities();
    
    // Count connections per entity
    const connectionCount = new Map<string, number>();
    
    for (const conn of connections) {
      connectionCount.set(conn.from, (connectionCount.get(conn.from) || 0) + conn.strength);
      connectionCount.set(conn.to, (connectionCount.get(conn.to) || 0) + conn.strength);
    }
    
    // Sort and get top
    const sorted = Array.from(connectionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    const result = sorted.map(([id, count]) => {
      const entity = entities.find(e => e.id === id);
      return {
        name: entity?.name || id,
        connections: count,
        documents: entity?.documentIds.length || 0,
      };
    });
    
    console.log(`✅ Top connected: ${result[0]?.name} (${result[0]?.connections} connections)`);
    
    return result;
  }
  
  /**
   * Discovery #4: Find co-occurrence anomalies
   * Unusual pairs that appear together
   */
  async findCoOccurrenceAnomalies(): Promise<Discovery[]> {
    console.log('🔍 Finding co-occurrence anomalies...');
    
    const connections = await this.entityLoader.getStrongestConnections(100);
    const anomalies: Discovery[] = [];
    
    // Strong connections are potential anomalies worth investigating
    for (const conn of connections.slice(0, 10)) {
      if (conn.strength >= 5) {
        const discovery: Discovery = {
          id: `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'network_cluster',
          severity: conn.strength >= 10 ? 'high' : 'medium',
          title: `Strong Connection: ${conn.fromName} ↔ ${conn.toName}`,
          description: `These two individuals appear together in ${conn.strength} documents, indicating a significant relationship. Document analysis recommended.`,
          entities: [conn.from, conn.to],
          documents: conn.documentIds,
          timestamp: new Date(),
          metadata: {
            strength: conn.strength,
            fromName: conn.fromName,
            toName: conn.toName,
          },
        };
        
        anomalies.push(discovery);
        this.discoveries.push(discovery);
      }
    }
    
    console.log(`✅ Found ${anomalies.length} co-occurrence anomalies`);
    return anomalies;
  }
  
  /**
   * Get all discoveries
   */
  async getAllDiscoveries(): Promise<Discovery[]> {
    return this.discoveries;
  }
  
  /**
   * Run all discovery algorithms
   */
  async runAllDiscoveries(): Promise<Discovery[]> {
    console.log('🚀 Running all discovery algorithms...');
    
    this.discoveries = [];
    
    await this.findNetworkClusters();
    await this.findGeographicPatterns();
    await this.findCoOccurrenceAnomalies();
    
    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    this.discoveries.sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );
    
    console.log(`✅ Total discoveries: ${this.discoveries.length}`);
    return this.discoveries;
  }
  
  /**
   * Get graph data for 3D visualization
   */
  async getGraphVisualizationData(nodeLimit = 100, edgeLimit = 200) {
    console.log('📊 Generating graph visualization data...');
    
    const topEntities = await this.entityLoader.getTopEntities(nodeLimit, 'person');
    const connections = await this.entityLoader.getStrongestConnections(edgeLimit);
    
    // Create node set for filtering edges
    const nodeIds = new Set(topEntities.map(e => e.id));
    
    // Filter connections to only include nodes we're showing
    const filteredConnections = connections.filter(c => 
      nodeIds.has(c.from) && nodeIds.has(c.to)
    );
    
    // Generate 3D positions using force-directed-like layout
    const nodes = topEntities.map((entity, i) => {
      // Spiral layout for better distribution
      const angle = (i / nodeLimit) * Math.PI * 6;
      const radius = 5 + (i / nodeLimit) * 15;
      const height = (Math.random() - 0.5) * 10;
      
      return {
        id: entity.id,
        label: entity.name,
        type: entity.type,
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        occurrences: entity.occurrences,
        documentCount: entity.documentIds.length,
      };
    });
    
    const edges = filteredConnections.map(c => ({
      from: c.from,
      to: c.to,
      strength: c.strength,
      documents: c.documentIds.length,
    }));
    
    console.log(`✅ Graph data: ${nodes.length} nodes, ${edges.length} edges`);
    
    return { nodes, edges };
  }
}
