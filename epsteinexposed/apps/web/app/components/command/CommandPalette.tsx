'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import Fuse from 'fuse.js';
import { 
  Search, User, MapPin, Building2, 
  Zap, Clock, Download, Settings, HelpCircle,
  GitCompare, BarChart3, Filter
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'entity' | 'document' | 'action' | 'navigation';
  metadata?: {
    type?: string;
    flightCount?: number;
    docCount?: number;
    isCircled?: boolean;
  };
  action: () => void;
}

interface Entity {
  id: string;
  name: string;
  type?: string;
  flightCount?: number;
  dojDocumentCount?: number;
  blackBookCircled?: boolean;
  sources?: {
    blackBook?: boolean;
    flightLogs?: boolean;
    dojDocs?: boolean;
  };
}

interface CommandPaletteProps {
  entities?: Entity[];
  onSelectEntity?: (entity: Entity) => void;
  onAnalyzeConnection?: () => void;
  onShowTimeline?: () => void;
  onShowComparison?: () => void;
  onShowShortcuts?: () => void;
}

export function CommandPalette({
  entities = [],
  onSelectEntity,
  onAnalyzeConnection,
  onShowTimeline,
  onShowComparison,
  onShowShortcuts,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setOpen(true);
      }
      
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const commandItems: CommandItem[] = [
    {
      id: 'analyze',
      label: 'Analyze Connection',
      description: 'Find connections between selected entities',
      icon: <Zap className="w-4 h-4" />,
      category: 'action',
      action: () => { onAnalyzeConnection?.(); setOpen(false); },
    },
    {
      id: 'timeline',
      label: 'Show Timeline View',
      description: 'View events chronologically',
      icon: <Clock className="w-4 h-4" />,
      category: 'action',
      action: () => { onShowTimeline?.(); setOpen(false); },
    },
    {
      id: 'compare',
      label: 'Compare Entities',
      description: 'Side-by-side entity comparison',
      icon: <GitCompare className="w-4 h-4" />,
      category: 'action',
      action: () => { onShowComparison?.(); setOpen(false); },
    },
    {
      id: 'export',
      label: 'Export Current View',
      description: 'Download as PNG or JSON',
      icon: <Download className="w-4 h-4" />,
      category: 'action',
      action: () => { setOpen(false); },
    },
    {
      id: 'filters',
      label: 'Open Filters',
      description: 'Filter by source, date, type',
      icon: <Filter className="w-4 h-4" />,
      category: 'action',
      action: () => { setOpen(false); },
    },
    {
      id: 'stats',
      label: 'View Statistics',
      description: 'Document and entity statistics',
      icon: <BarChart3 className="w-4 h-4" />,
      category: 'action',
      action: () => { setOpen(false); },
    },
    {
      id: 'help',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: <HelpCircle className="w-4 h-4" />,
      category: 'navigation',
      action: () => { onShowShortcuts?.(); setOpen(false); },
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Configure preferences',
      icon: <Settings className="w-4 h-4" />,
      category: 'navigation',
      action: () => { setOpen(false); },
    },
    
    ...entities.slice(0, 100).map(entity => ({
      id: entity.id,
      label: entity.name,
      description: getEntityDescription(entity),
      icon: getEntityIcon(entity.type),
      category: 'entity' as const,
      metadata: {
        type: entity.type,
        flightCount: entity.flightCount,
        docCount: entity.dojDocumentCount,
        isCircled: entity.blackBookCircled,
      },
      action: () => { onSelectEntity?.(entity); setOpen(false); },
    })),
  ];
  
  const fuse = new Fuse(commandItems, {
    keys: ['label', 'description'],
    threshold: 0.4,
  });
  
  const filteredItems = search
    ? fuse.search(search).map(r => r.item)
    : commandItems;
  
  const grouped = {
    action: filteredItems.filter(i => i.category === 'action'),
    entity: filteredItems.filter(i => i.category === 'entity'),
    navigation: filteredItems.filter(i => i.category === 'navigation'),
  };
  
  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 hidden sm:block">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#12121a]/80 backdrop-blur-sm 
                     border border-[#ffffff15] rounded-lg text-[#606070] text-sm
                     hover:text-white hover:border-[#ffffff30] transition-all"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
          <kbd className="px-1.5 py-0.5 bg-[#ffffff10] rounded text-[10px] font-mono">⌘K</kbd>
        </button>
      </div>
      
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
            >
              <Command
                className="bg-[#12121a] border border-[#ffffff15] rounded-xl shadow-2xl overflow-hidden"
                loop
              >
                <div className="flex items-center gap-3 px-4 py-4 border-b border-[#ffffff10]">
                  <Search className="w-5 h-5 text-[#606070]" />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder="Search entities, documents, or commands..."
                    className="flex-1 bg-transparent text-white placeholder-[#606070] outline-none text-lg"
                    autoFocus
                  />
                  <kbd className="px-2 py-1 bg-[#ffffff10] rounded text-xs text-[#606070] font-mono">
                    ESC
                  </kbd>
                </div>
                
                <Command.List className="max-h-[400px] overflow-y-auto p-2">
                  <Command.Empty className="py-8 text-center text-[#606070]">
                    No results found
                  </Command.Empty>
                  
                  {grouped.action.length > 0 && (
                    <Command.Group heading="Actions" className="mb-4">
                      <div className="px-2 py-1 text-xs text-[#606070] font-medium uppercase tracking-wider">
                        Actions
                      </div>
                      {grouped.action.map(item => (
                        <CommandItemComponent key={item.id} item={item} />
                      ))}
                    </Command.Group>
                  )}
                  
                  {grouped.entity.length > 0 && (
                    <Command.Group heading="Entities" className="mb-4">
                      <div className="px-2 py-1 text-xs text-[#606070] font-medium uppercase tracking-wider">
                        Entities
                      </div>
                      {grouped.entity.slice(0, 10).map(item => (
                        <CommandItemComponent key={item.id} item={item} />
                      ))}
                      {grouped.entity.length > 10 && (
                        <div className="px-4 py-2 text-xs text-[#606070]">
                          +{grouped.entity.length - 10} more results...
                        </div>
                      )}
                    </Command.Group>
                  )}
                  
                  {grouped.navigation.length > 0 && (
                    <Command.Group heading="Navigation">
                      <div className="px-2 py-1 text-xs text-[#606070] font-medium uppercase tracking-wider">
                        Navigation
                      </div>
                      {grouped.navigation.map(item => (
                        <CommandItemComponent key={item.id} item={item} />
                      ))}
                    </Command.Group>
                  )}
                </Command.List>
                
                <div className="px-4 py-3 border-t border-[#ffffff10] flex items-center justify-between text-xs text-[#606070]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-[#ffffff10] rounded">↑↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-[#ffffff10] rounded">↵</kbd>
                      select
                    </span>
                  </div>
                  <span>Powered by Claude AI</span>
                </div>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function CommandItemComponent({ item }: { item: CommandItem }) {
  return (
    <Command.Item
      value={item.label}
      onSelect={item.action}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer
                 text-[#a0a0b0] hover:bg-[#ffffff08] hover:text-white
                 data-[selected=true]:bg-[#ffffff10] data-[selected=true]:text-white
                 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-[#ffffff08] flex items-center justify-center text-[#00d4ff]">
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.label}</span>
          {item.metadata?.isCircled && (
            <span className="text-[#ff3366]">⭐</span>
          )}
        </div>
        {item.description && (
          <div className="text-xs text-[#606070] truncate">
            {item.description}
          </div>
        )}
      </div>
      {item.metadata?.flightCount && item.metadata.flightCount > 0 && (
        <span className="text-xs px-2 py-0.5 bg-[#00d4ff]/20 text-[#00d4ff] rounded">
          ✈️ {item.metadata.flightCount}
        </span>
      )}
      {item.metadata?.docCount && item.metadata.docCount > 0 && (
        <span className="text-xs px-2 py-0.5 bg-[#00ff88]/20 text-[#00ff88] rounded">
          📄 {item.metadata.docCount}
        </span>
      )}
    </Command.Item>
  );
}

function getEntityIcon(type?: string) {
  switch (type) {
    case 'person': return <User className="w-4 h-4" />;
    case 'location': return <MapPin className="w-4 h-4" />;
    case 'organization': return <Building2 className="w-4 h-4" />;
    default: return <User className="w-4 h-4" />;
  }
}

function getEntityDescription(entity: Entity): string {
  const parts: string[] = [];
  if (entity.sources?.blackBook) parts.push('Black Book');
  if (entity.sources?.flightLogs) parts.push(`${entity.flightCount || 0} flights`);
  if (entity.sources?.dojDocs) parts.push(`${entity.dojDocumentCount || 0} docs`);
  return parts.join(' • ') || entity.type || 'Entity';
}
