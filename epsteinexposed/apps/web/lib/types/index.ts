// Core entity types for the investigation platform

export type EntityType = 'person' | 'location' | 'event' | 'document' | 'flight' | 'transaction';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type AnomalyType = 
  | 'timeline_conflict'
  | 'logistics_impossible'
  | 'pattern_break'
  | 'suspicious_redaction'
  | 'financial'
  | 'connection_discovered';

export interface Entity {
  id: string;
  label: string;
  type: EntityType;
  position: [number, number, number];
  connections: string[];
  strength: number; // 0-1, signal strength / importance
  metadata: EntityMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityMetadata {
  description?: string;
  aliases?: string[];
  imageUrl?: string;
  documentCount?: number;
  firstAppearance?: Date;
  lastAppearance?: Date;
  suspicionScore?: number;
  // Type-specific metadata
  role?: string; // for persons
  coordinates?: { lat: number; lng: number }; // for locations
  date?: Date; // for events
  flightDetails?: FlightDetails; // for flights
  amount?: number; // for transactions
  currency?: string;
}

export interface FlightDetails {
  origin: string;
  destination: string;
  date: Date;
  aircraft?: string;
  passengers?: string[];
  flightNumber?: string;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  strength: number; // 0-1
  evidence: string[]; // document IDs
  discoveredAt: Date;
  isNew?: boolean; // for highlighting recent discoveries
}

export type ConnectionType = 
  | 'associated_with'
  | 'traveled_with'
  | 'employed_by'
  | 'mentioned_in'
  | 'present_at'
  | 'financial_link'
  | 'family'
  | 'legal';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  evidence: string[]; // document IDs
  entities: string[]; // entity IDs involved
  hypothesis?: string;
  confidence: number; // 0-1
  discoveredAt: Date;
  agentId: string;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  date?: Date;
  pages: number;
  entities: string[];
  redactions: Redaction[];
  thumbnailUrl?: string;
  pdfUrl?: string;
  processedAt?: Date;
  ocrConfidence?: number;
}

export type DocumentType = 
  | 'court_filing'
  | 'deposition'
  | 'flight_log'
  | 'financial_record'
  | 'correspondence'
  | 'photograph'
  | 'other';

export interface Redaction {
  id: string;
  documentId: string;
  page: number;
  position: { x: number; y: number; width: number; height: number };
  characterCount: number;
  context: string; // surrounding text
  hypotheses: RedactionHypothesis[];
  suspicionLevel: number; // 0-1
}

export interface RedactionHypothesis {
  value: string;
  confidence: number;
  reasoning: string;
  supportingEvidence?: string[];
}

export interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description?: string;
  type: EntityType;
  entities: string[];
  documents: string[];
  suspicionLevel: number;
  thumbnail?: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  type: AgentType;
  status: 'idle' | 'working' | 'error';
  currentTask?: string;
  processedCount: number;
  lastActivity: Date;
}

export type AgentType = 
  | 'entity_extraction'
  | 'pattern_detection'
  | 'cross_reference'
  | 'redaction_analysis'
  | 'osint'
  | 'verification';

export interface SystemMetrics {
  documentsProcessed: number;
  documentsTotal: number;
  entitiesDiscovered: number;
  connectionsFound: number;
  redactionsAnalyzed: number;
  anomaliesDetected: number;
  activeAgents: number;
  lastUpdate: Date;
}

// WebSocket message types
export type WSMessageType = 
  | 'node_discovered'
  | 'connection_discovered'
  | 'anomaly_detected'
  | 'strength_update'
  | 'metrics_update'
  | 'agent_status';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: Date;
}
