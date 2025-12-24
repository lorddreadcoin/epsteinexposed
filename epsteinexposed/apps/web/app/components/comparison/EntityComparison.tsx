'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Plane, FileText, ArrowRight, Users, Zap } from 'lucide-react';
import { SourceBadges } from '../ui/SourceBadges';

interface Entity {
  id: string;
  name: string;
  type: string;
  sources: {
    blackBook: boolean;
    flightLogs: boolean;
    dojDocs: boolean;
  };
  blackBookCircled?: boolean;
  flightCount?: number;
  dojDocumentCount?: number;
  flightDestinations?: string[];
  topCoPassengers?: Array<{ name: string; count: number }>;
}

interface EntityComparisonProps {
  entities: Entity[];
  isOpen: boolean;
  onClose: () => void;
  onAnalyzeConnection: () => void;
  onRemoveEntity: (entityId: string) => void;
}

export function EntityComparison({
  entities,
  isOpen,
  onClose,
  onAnalyzeConnection,
  onRemoveEntity,
}: EntityComparisonProps) {
  if (!isOpen || entities.length < 2) return null;
  
  const sharedDestinations = entities[0]?.flightDestinations?.filter(
    d => entities[1]?.flightDestinations?.includes(d)
  ) || [];
  
  const sharedCoPassengers = entities[0]?.topCoPassengers?.filter(
    p => entities[1]?.topCoPassengers?.some(p2 => p2.name === p.name)
  ) || [];
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-5xl bg-[#12121a] border border-[#ffffff15] rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#ffffff10] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#00d4ff]" />
              <h3 className="text-lg font-semibold text-white">Entity Comparison</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onAnalyzeConnection}
                className="flex items-center gap-2 px-4 py-2 bg-[#00d4ff] text-black font-semibold 
                         rounded-lg hover:bg-[#00d4ff]/90 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Analyze Connection
              </button>
              <button
                onClick={onClose}
                className="p-2 text-[#606070] hover:text-white hover:bg-[#ffffff10] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Comparison grid */}
          <div className="grid grid-cols-2 divide-x divide-[#ffffff10]">
            {entities.slice(0, 2).map((entity, i) => (
              <motion.div
                key={entity.id}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6"
              >
                {/* Entity header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-white">{entity.name}</h4>
                    <p className="text-sm text-[#606070] capitalize">{entity.type}</p>
                  </div>
                  <button
                    onClick={() => onRemoveEntity(entity.id)}
                    className="p-1 text-[#606070] hover:text-[#ff3366] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Source badges */}
                <div className="mb-4">
                  <SourceBadges
                    sources={entity.sources}
                    blackBookCircled={entity.blackBookCircled}
                    flightCount={entity.flightCount}
                    dojDocCount={entity.dojDocumentCount}
                  />
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[#0a0a0f] rounded-lg">
                    <div className="flex items-center gap-2 text-[#00d4ff] mb-1">
                      <Plane className="w-4 h-4" />
                      <span className="text-xs font-medium">Flights</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{entity.flightCount || 0}</p>
                  </div>
                  
                  <div className="p-3 bg-[#0a0a0f] rounded-lg">
                    <div className="flex items-center gap-2 text-[#00ff88] mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium">Documents</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{entity.dojDocumentCount || 0}</p>
                  </div>
                </div>
                
                {/* Top co-passengers */}
                {entity.topCoPassengers && entity.topCoPassengers.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-[#606070] uppercase tracking-wider mb-2">
                      Top Co-Passengers
                    </h5>
                    <div className="space-y-1">
                      {entity.topCoPassengers.slice(0, 5).map(p => (
                        <div key={p.name} className="flex items-center justify-between text-sm">
                          <span className={`
                            ${sharedCoPassengers.some(sp => sp.name === p.name) 
                              ? 'text-[#ffb800] font-medium' 
                              : 'text-[#a0a0b0]'
                            }
                          `}>
                            {p.name}
                          </span>
                          <span className="text-[#606070]">{p.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Destinations */}
                {entity.flightDestinations && entity.flightDestinations.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-[#606070] uppercase tracking-wider mb-2">
                      Destinations
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {entity.flightDestinations.slice(0, 8).map(dest => (
                        <span 
                          key={dest} 
                          className={`
                            px-2 py-0.5 text-xs rounded
                            ${sharedDestinations.includes(dest)
                              ? 'bg-[#ffb800]/20 text-[#ffb800]'
                              : 'bg-[#ffffff08] text-[#a0a0b0]'
                            }
                          `}
                        >
                          {dest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          
          {/* Shared attributes footer */}
          {(sharedDestinations.length > 0 || sharedCoPassengers.length > 0) && (
            <div className="px-6 py-4 bg-[#ffb800]/10 border-t border-[#ffb800]/20">
              <div className="flex items-center gap-2 text-[#ffb800] mb-2">
                <ArrowRight className="w-4 h-4" />
                <span className="text-sm font-medium">Shared Connections Found</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sharedDestinations.map(dest => (
                  <span key={dest} className="px-2 py-1 text-xs bg-[#ffb800]/20 text-[#ffb800] rounded">
                    📍 {dest}
                  </span>
                ))}
                {sharedCoPassengers.map(p => (
                  <span key={p.name} className="px-2 py-1 text-xs bg-[#ffb800]/20 text-[#ffb800] rounded">
                    👤 {p.name} ({p.count}×)
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
