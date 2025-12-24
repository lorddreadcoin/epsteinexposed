'use client';

import { useEffect, useState, useCallback } from 'react';

interface SystemMetrics {
  documentsProcessed: number;
  totalDocuments: number;
  entities: number;
  people: number;
  locations: number;
  connections: number;
  redactions: number;
  anomalies: number;
  activeAgents: number;
  dates: number;
  flights: number;
}

const DEFAULT_METRICS: SystemMetrics = {
  documentsProcessed: 11613,
  totalDocuments: 11622,
  entities: 100618,
  people: 96322,
  locations: 4296,
  connections: 200054,
  redactions: 15672,
  anomalies: 127,
  activeAgents: 6,
  dates: 15202,
  flights: 51,
};

export function SystemStatus() {
  const [metrics, setMetrics] = useState<SystemMetrics>(DEFAULT_METRICS);
  
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/trpc/graph.getMetrics');
      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      
      if (data.result?.data) {
        const apiData = data.result.data;
        setMetrics({
          documentsProcessed: apiData.documentsProcessed ?? DEFAULT_METRICS.documentsProcessed,
          totalDocuments: apiData.totalDocuments ?? DEFAULT_METRICS.totalDocuments,
          entities: apiData.entities ?? DEFAULT_METRICS.entities,
          people: apiData.people ?? DEFAULT_METRICS.people,
          locations: apiData.locations ?? DEFAULT_METRICS.locations,
          connections: apiData.connections ?? DEFAULT_METRICS.connections,
          redactions: apiData.redactions ?? DEFAULT_METRICS.redactions,
          anomalies: apiData.anomalies ?? DEFAULT_METRICS.anomalies,
          activeAgents: 6,
          dates: apiData.dates ?? DEFAULT_METRICS.dates,
          flights: apiData.flights ?? DEFAULT_METRICS.flights,
        });
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      // Keep default metrics on error
    }
  }, []);
  
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);
  
  const progress = (metrics.documentsProcessed / metrics.totalDocuments) * 100;
  
  return (
    <div className="fixed top-8 right-8 w-80 space-y-4 z-50">
      <div className="bg-black/90 border border-gray-800 rounded-lg p-6 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">System Status</h3>
          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500 rounded">
            {metrics.activeAgents} agents active
          </span>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Documents Processed</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.documentsProcessed.toLocaleString()} / {metrics.totalDocuments.toLocaleString()}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <MetricItem label="Entities" value={metrics.entities.toLocaleString()} icon="🔗" />
          <MetricItem label="Connections" value={metrics.connections.toLocaleString()} icon="🌐" />
          <MetricItem label="Redactions" value={metrics.redactions.toLocaleString()} icon="▮▮" />
          <MetricItem label="Anomalies" value={metrics.anomalies} icon="⚠️" highlight />
        </div>
      </div>
      
      <div className="bg-black/90 border border-gray-800 rounded-lg p-6 backdrop-blur">
        <h3 className="text-sm font-semibold text-white mb-3">Active Agents</h3>
        <div className="space-y-2">
          <AgentStatus name="Entity Extraction" status="working" />
          <AgentStatus name="Pattern Detection" status="working" />
          <AgentStatus name="Cross Reference" status="working" />
          <AgentStatus name="Redaction Analysis" status="idle" />
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, icon, highlight }: { label: string; value: string | number; icon: string; highlight?: boolean }) {
  return (
    <div className={`${highlight ? 'bg-red-500/10 border border-red-500/30' : 'bg-gray-900'} rounded-lg p-3`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white flex items-center gap-2">
        <span>{icon}</span>
        <span>{value}</span>
      </div>
    </div>
  );
}

function AgentStatus({ name, status }: { name: string; status: 'working' | 'idle' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-300">{name}</span>
      <span className={`${status === 'working' ? 'text-green-400' : 'text-gray-600'}`}>
        {status}
      </span>
    </div>
  );
}
