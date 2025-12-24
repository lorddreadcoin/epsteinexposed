'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, Plane, FileText } from 'lucide-react';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'flight' | 'document' | 'event';
  title: string;
  description?: string;
  entities: string[];
  source: 'flight_logs' | 'doj_docs' | 'black_book';
  metadata?: {
    origin?: string;
    destination?: string;
    passengers?: string[];
    documentId?: string;
  };
}

interface TimelineViewProps {
  events: TimelineEvent[];
  isOpen: boolean;
  onClose: () => void;
  onEventClick?: (event: TimelineEvent) => void;
  onEntityClick?: (entityName: string) => void;
}

export function TimelineView({ events, isOpen, onClose, onEventClick, onEntityClick }: TimelineViewProps) {
  const [filter, setFilter] = useState<'all' | 'flight' | 'document'>('all');
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set(['1999', '2000', '2001']));
  
  const groupedEvents = useMemo(() => {
    const filtered = events.filter(e => filter === 'all' || e.type === filter);
    
    const grouped: Record<string, Record<string, TimelineEvent[]>> = {};
    
    for (const event of filtered) {
      const date = new Date(event.date);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString('default', { month: 'long' });
      
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(event);
    }
    
    return grouped;
  }, [events, filter]);
  
  const years = Object.keys(groupedEvents).sort((a, b) => parseInt(a) - parseInt(b));
  
  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute top-0 right-0 bottom-0 w-full max-w-lg bg-[#0a0a0f] border-l border-[#ffffff10] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#ffffff10] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#00d4ff]" />
              <h2 className="text-lg font-semibold text-white">Timeline</h2>
              <span className="text-sm text-[#606070]">
                {events.length} events
              </span>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-[#606070] hover:text-white hover:bg-[#ffffff10] rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Filter tabs */}
          <div className="px-6 py-3 border-b border-[#ffffff10] shrink-0">
            <div className="flex items-center gap-1 bg-[#12121a] rounded-lg p-1 w-fit">
              {(['all', 'flight', 'document'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all
                    ${filter === f
                      ? 'bg-[#00d4ff] text-black'
                      : 'text-[#606070] hover:text-white hover:bg-[#ffffff10]'
                    }
                  `}
                >
                  {f === 'all' ? 'All' : f === 'flight' ? '✈️ Flights' : '📄 Documents'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Timeline */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {years.length === 0 ? (
              <div className="text-center py-12 text-[#606070]">
                <p>No events to display</p>
                <p className="text-sm mt-2">Run data integration to load flight logs</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00d4ff] via-[#00d4ff]/50 to-transparent" />
                
                {years.map(year => (
                  <div key={year} className="mb-6">
                    {/* Year header */}
                    <button
                      onClick={() => toggleYear(year)}
                      className="flex items-center gap-3 mb-4 group"
                    >
                      <div className="w-4 h-4 rounded-full bg-[#00d4ff] flex items-center justify-center z-10">
                        <ChevronDown 
                          className={`w-3 h-3 text-black transition-transform ${expandedYears.has(year) ? '' : '-rotate-90'}`} 
                        />
                      </div>
                      <span className="text-xl font-bold text-white group-hover:text-[#00d4ff] transition-colors">
                        {year}
                      </span>
                      <span className="text-sm text-[#606070]">
                        {Object.values(groupedEvents[year] || {}).flat().length} events
                      </span>
                    </button>
                    
                    {/* Months */}
                    {expandedYears.has(year) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-8 space-y-4"
                      >
                        {Object.entries(groupedEvents[year] || {}).map(([month, monthEvents]) => (
                          <div key={`${year}-${month}`}>
                            <h4 className="text-sm font-medium text-[#a0a0b0] mb-2">{month}</h4>
                            
                            <div className="space-y-2">
                              {monthEvents.map((event, i) => (
                                <motion.div
                                  key={event.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  onClick={() => onEventClick?.(event)}
                                  className="relative pl-6 cursor-pointer group"
                                >
                                  {/* Connector line */}
                                  <div className="absolute left-0 top-3 w-4 h-0.5 bg-[#ffffff20]" />
                                  
                                  {/* Event card */}
                                  <div className="p-3 bg-[#12121a] rounded-lg border border-[#ffffff10] 
                                                hover:border-[#00d4ff]/30 transition-all group-hover:bg-[#12121a]/80">
                                    <div className="flex items-start gap-3">
                                      {/* Icon */}
                                      <div className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                        ${event.type === 'flight' 
                                          ? 'bg-[#00d4ff]/20 text-[#00d4ff]' 
                                          : 'bg-[#00ff88]/20 text-[#00ff88]'
                                        }
                                      `}>
                                        {event.type === 'flight' ? <Plane className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        {/* Date */}
                                        <div className="text-xs text-[#606070] mb-1">
                                          {new Date(event.date).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric',
                                          })}
                                        </div>
                                        
                                        {/* Title */}
                                        <h5 className="text-sm font-medium text-white group-hover:text-[#00d4ff] transition-colors">
                                          {event.title}
                                        </h5>
                                        
                                        {/* Description */}
                                        {event.description && (
                                          <p className="text-xs text-[#606070] mt-1 line-clamp-2">
                                            {event.description}
                                          </p>
                                        )}
                                        
                                        {/* Entities */}
                                        {event.entities.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {event.entities.slice(0, 5).map(entity => (
                                              <button
                                                key={entity}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onEntityClick?.(entity);
                                                }}
                                                className="px-1.5 py-0.5 text-[10px] bg-[#ffffff08] text-[#a0a0b0] 
                                                         rounded hover:bg-[#00d4ff]/20 hover:text-[#00d4ff] transition-colors"
                                              >
                                                {entity}
                                              </button>
                                            ))}
                                            {event.entities.length > 5 && (
                                              <span className="px-1.5 py-0.5 text-[10px] text-[#606070]">
                                                +{event.entities.length - 5}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
