'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Anomaly {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: Date;
  expanded: boolean;
  entities?: string[];
  documents?: string[];
  type?: string;
}

interface Discovery {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entities: string[];
  documents: string[];
  timestamp: string;
}

export function AnomalyStream() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  
  const fetchDiscoveries = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/trpc/graph.getDiscoveries');
      const data = await response.json();
      
      if (data.result?.data) {
        const discoveries: Discovery[] = data.result.data;
        
        // Convert to anomalies and filter duplicates
        const newAnomalies: Anomaly[] = [];
        const newSeenIds = new Set(seenIds);
        
        for (const discovery of discoveries) {
          if (!newSeenIds.has(discovery.id)) {
            newSeenIds.add(discovery.id);
            newAnomalies.push({
              id: discovery.id,
              severity: discovery.severity,
              title: discovery.title,
              description: discovery.description,
              timestamp: new Date(discovery.timestamp),
              expanded: false,
              entities: discovery.entities,
              documents: discovery.documents,
              type: discovery.type,
            });
          }
        }
        
        if (newAnomalies.length > 0) {
          setSeenIds(newSeenIds);
          setAnomalies(prev => [...newAnomalies, ...prev].slice(0, 20));
        }
      }
    } catch (err) {
      console.error('Failed to fetch discoveries:', err);
    }
  }, [seenIds]);
  
  useEffect(() => {
    fetchDiscoveries();
    
    // Refresh discoveries every 30 seconds
    const interval = setInterval(fetchDiscoveries, 30000);
    return () => clearInterval(interval);
  }, [fetchDiscoveries]);
  
  const toggleExpand = (id: string) => {
    setAnomalies(prev => prev.map(a => 
      a.id === id ? { ...a, expanded: !a.expanded } : a
    ));
  };
  
  return (
    <div className="fixed bottom-8 right-8 w-96 max-h-[600px] overflow-hidden z-50">
      <div className="bg-black/95 border border-gray-800 rounded-lg backdrop-blur">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Anomaly Stream
          </h3>
          <div className="text-xs text-gray-400 mt-1 flex gap-3">
            <span>All</span>
            <span className="text-red-400">Critical</span>
            <span className="text-orange-400">High</span>
            <span className="text-yellow-400">Medium</span>
            <span className="text-gray-500">Low</span>
          </div>
          {anomalies.length > 0 && (
            <div className="text-xs text-green-400 mt-2">
              {anomalies.length} discoveries
            </div>
          )}
        </div>
        
        <div className="overflow-y-auto max-h-[500px]" style={{ scrollbarWidth: 'none' }}>
          <AnimatePresence>
            {anomalies.map(anomaly => (
              <motion.div
                key={anomaly.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-gray-800 last:border-b-0"
              >
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-900/50 transition-colors"
                  onClick={() => toggleExpand(anomaly.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded border ${getSeverityClass(anomaly.severity)}`}>
                      {anomaly.severity}
                    </span>
                    <span className="text-xs text-gray-500">
                      {getTimeAgo(anomaly.timestamp)}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-semibold text-white mb-1">
                    {anomaly.title}
                  </h4>
                  
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {anomaly.description}
                  </p>
                  
                  <button className="flex items-center gap-1 text-xs text-amber-500 mt-2 hover:text-amber-400">
                    <svg 
                      className={`w-3 h-3 transition-transform ${anomaly.expanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Expand
                  </button>
                  
                  {anomaly.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 pt-3 border-t border-gray-800"
                    >
                      <div className="text-xs text-gray-300 space-y-2">
                        <p>{anomaly.description}</p>
                        <div className="flex gap-2">
                          <button className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                            View Documents
                          </button>
                          <button className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                            Related Entities
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {anomalies.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              Waiting for discoveries...
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-800 text-center text-xs text-gray-500">
          Real-time analysis active • <span className="text-green-400">6 agents online</span>
        </div>
      </div>
    </div>
  );
}

function getSeverityClass(severity: string) {
  const classes: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
    low: 'bg-gray-500/20 text-gray-400 border-gray-500',
  };
  return classes[severity] || classes.low;
}

function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
