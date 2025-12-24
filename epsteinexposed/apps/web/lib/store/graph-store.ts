'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Entity, Connection, Anomaly, SystemMetrics, AgentStatus } from '../types';

interface GraphState {
  // Data
  nodes: Entity[];
  connections: Connection[];
  anomalies: Anomaly[];
  
  // Selection
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  
  // Filters
  visibleEntityTypes: Set<string>;
  timeRange: { start: Date; end: Date } | null;
  minStrength: number;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // System metrics
  metrics: SystemMetrics | null;
  agents: AgentStatus[];
  
  // Actions
  setNodes: (nodes: Entity[]) => void;
  addNode: (node: Entity) => void;
  updateNode: (nodeId: string, updates: Partial<Entity>) => void;
  removeNode: (nodeId: string) => void;
  
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnectionStrength: (connectionId: string, strength: number) => void;
  
  addAnomaly: (anomaly: Anomaly) => void;
  clearAnomalies: () => void;
  
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  
  setVisibleEntityTypes: (types: Set<string>) => void;
  toggleEntityType: (type: string) => void;
  setTimeRange: (range: { start: Date; end: Date } | null) => void;
  setMinStrength: (strength: number) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  updateMetrics: (metrics: SystemMetrics) => void;
  updateAgentStatus: (agent: AgentStatus) => void;
  
  // Computed
  getSelectedNode: () => Entity | null;
  getNodeConnections: (nodeId: string) => Connection[];
  getFilteredNodes: () => Entity[];
}

export const useGraphStore = create<GraphState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: [],
    connections: [],
    anomalies: [],
    selectedNodeId: null,
    hoveredNodeId: null,
    visibleEntityTypes: new Set(['person', 'location', 'event', 'document', 'flight', 'transaction']),
    timeRange: null,
    minStrength: 0,
    isLoading: true,
    error: null,
    metrics: null,
    agents: [],

    // Node actions
    setNodes: (nodes) => set({ nodes, isLoading: false }),
    
    addNode: (node) => set((state) => {
      // Check if node already exists
      if (state.nodes.some(n => n.id === node.id)) {
        return state;
      }
      return { nodes: [...state.nodes, node] };
    }),
    
    updateNode: (nodeId, updates) => set((state) => ({
      nodes: state.nodes.map(n => 
        n.id === nodeId ? { ...n, ...updates, updatedAt: new Date() } : n
      )
    })),
    
    removeNode: (nodeId) => set((state) => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      connections: state.connections.filter(
        c => c.sourceId !== nodeId && c.targetId !== nodeId
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId
    })),

    // Connection actions
    setConnections: (connections) => set({ connections }),
    
    addConnection: (connection) => set((state) => {
      if (state.connections.some(c => c.id === connection.id)) {
        return state;
      }
      return { connections: [...state.connections, { ...connection, isNew: true }] };
    }),
    
    updateConnectionStrength: (connectionId, strength) => set((state) => ({
      connections: state.connections.map(c =>
        c.id === connectionId ? { ...c, strength } : c
      )
    })),

    // Anomaly actions
    addAnomaly: (anomaly) => set((state) => ({
      anomalies: [anomaly, ...state.anomalies].slice(0, 100) // Keep last 100
    })),
    
    clearAnomalies: () => set({ anomalies: [] }),

    // Selection actions
    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
    hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),

    // Filter actions
    setVisibleEntityTypes: (types) => set({ visibleEntityTypes: types }),
    
    toggleEntityType: (type) => set((state) => {
      const newTypes = new Set(state.visibleEntityTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { visibleEntityTypes: newTypes };
    }),
    
    setTimeRange: (range) => set({ timeRange: range }),
    setMinStrength: (strength) => set({ minStrength: strength }),

    // UI state
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    // System state
    updateMetrics: (metrics) => set({ metrics }),
    
    updateAgentStatus: (agent) => set((state) => {
      const existingIndex = state.agents.findIndex(a => a.id === agent.id);
      if (existingIndex >= 0) {
        const newAgents = [...state.agents];
        newAgents[existingIndex] = agent;
        return { agents: newAgents };
      }
      return { agents: [...state.agents, agent] };
    }),

    // Computed getters
    getSelectedNode: () => {
      const state = get();
      return state.nodes.find(n => n.id === state.selectedNodeId) || null;
    },
    
    getNodeConnections: (nodeId) => {
      const state = get();
      return state.connections.filter(
        c => c.sourceId === nodeId || c.targetId === nodeId
      );
    },
    
    getFilteredNodes: () => {
      const state = get();
      return state.nodes.filter(node => {
        // Filter by entity type
        if (!state.visibleEntityTypes.has(node.type)) return false;
        
        // Filter by strength
        if (node.strength < state.minStrength) return false;
        
        // Filter by time range
        if (state.timeRange) {
          const nodeDate = node.metadata.firstAppearance || node.createdAt;
          if (nodeDate < state.timeRange.start || nodeDate > state.timeRange.end) {
            return false;
          }
        }
        
        return true;
      });
    },
  }))
);

// Subscribe to store changes for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  useGraphStore.subscribe(
    (state) => state.nodes.length,
    (nodeCount) => console.log(`[GraphStore] Node count: ${nodeCount}`)
  );
}
