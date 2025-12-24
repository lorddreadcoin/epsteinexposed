# 🏆 GOLD STANDARD UI/UX DIRECTIVE

## MISSION
Transform Epstein Exposed from functional investigation tool to **world-class platform** that media outlets embed and researchers cite. Every interaction should feel premium, intentional, and professional.

---

## DEPENDENCIES TO ADD FIRST

```bash
cd apps/web
pnpm add framer-motion @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-toast cmdk fuse.js lucide-react
```

---

## PHASE 1: DESIGN SYSTEM FOUNDATION

### 1.1: Animation Constants

**File: `apps/web/lib/animations.ts`**

```typescript
export const spring = {
  gentle: { type: "spring", stiffness: 120, damping: 14 },
  snappy: { type: "spring", stiffness: 300, damping: 20 },
  bouncy: { type: "spring", stiffness: 400, damping: 10 },
  smooth: { type: "spring", stiffness: 100, damping: 20 },
};

export const transition = {
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  medium: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  slow: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
};

export const stagger = {
  fast: { staggerChildren: 0.03 },
  medium: { staggerChildren: 0.05 },
  slow: { staggerChildren: 0.1 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const pulseGlow = {
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(0, 212, 255, 0)",
      "0 0 0 8px rgba(0, 212, 255, 0.3)",
      "0 0 0 0 rgba(0, 212, 255, 0)",
    ],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};
```

### 1.2: Theme Colors

**File: `apps/web/lib/theme.ts`**

```typescript
export const colors = {
  // Backgrounds
  bg: {
    primary: "#0a0a0f",
    secondary: "#12121a",
    tertiary: "#1a1a24",
    elevated: "#1e1e2a",
  },
  
  // Accents
  accent: {
    cyan: "#00d4ff",
    cyanMuted: "rgba(0, 212, 255, 0.2)",
    amber: "#ffb800",
    amberMuted: "rgba(255, 184, 0, 0.2)",
    red: "#ff3366",
    redMuted: "rgba(255, 51, 102, 0.2)",
    green: "#00ff88",
    greenMuted: "rgba(0, 255, 136, 0.2)",
    purple: "#a855f7",
    purpleMuted: "rgba(168, 85, 247, 0.2)",
  },
  
  // Text
  text: {
    primary: "#ffffff",
    secondary: "#a0a0b0",
    tertiary: "#606070",
    muted: "#404050",
  },
  
  // Borders
  border: {
    subtle: "rgba(255, 255, 255, 0.06)",
    light: "rgba(255, 255, 255, 0.1)",
    medium: "rgba(255, 255, 255, 0.15)",
  },
  
  // Entity types
  entity: {
    person: "#00d4ff",
    location: "#ffb800",
    organization: "#ff3366",
    date: "#00ff88",
    document: "#a855f7",
  },
  
  // Source badges
  source: {
    blackBook: "#ffb800",
    blackBookCircled: "#ff3366",
    flightLogs: "#00d4ff",
    dojDocs: "#00ff88",
    ocrDocs: "#a855f7",
  },
};

export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.5)",
  md: "0 4px 12px rgba(0, 0, 0, 0.5)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.6)",
  xl: "0 16px 48px rgba(0, 0, 0, 0.7)",
  glow: {
    cyan: "0 0 20px rgba(0, 212, 255, 0.5)",
    amber: "0 0 20px rgba(255, 184, 0, 0.5)",
    red: "0 0 20px rgba(255, 51, 102, 0.5)",
  },
};
```

---

## PHASE 2: ONBOARDING FLOW

### 2.1: Onboarding Modal

**File: `apps/web/app/components/onboarding/OnboardingModal.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, MousePointer, MessageSquare, FileText } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string; // CSS selector to highlight
  position?: 'center' | 'top-right' | 'bottom-left' | 'bottom-center';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Epstein Exposed',
    description: 'The most comprehensive public investigation platform. We\'ve processed 11,622 DOJ documents and cross-referenced them with leaked flight logs and the infamous Black Book.',
    icon: <Sparkles className="w-8 h-8" />,
    position: 'center',
  },
  {
    id: 'graph',
    title: 'Interactive Entity Graph',
    description: 'Each node represents a person, location, or organization extracted from the documents. Node size indicates how many documents mention them. Connections show co-occurrences.',
    icon: <div className="w-8 h-8 rounded-full bg-[#00d4ff]/30 border-2 border-[#00d4ff]" />,
    highlight: '[data-graph]',
    position: 'top-right',
  },
  {
    id: 'select',
    title: 'Select & Analyze',
    description: 'Click a node to see details. CTRL+Click multiple nodes, then hit "Analyze Connection" to discover how they\'re linked across thousands of documents.',
    icon: <MousePointer className="w-8 h-8" />,
    highlight: '[data-graph]',
    position: 'top-right',
  },
  {
    id: 'chat',
    title: 'AI-Powered Investigation',
    description: 'Ask questions in natural language. Our AI searches through all documents and responds with citations you can click to view the actual source PDFs.',
    icon: <MessageSquare className="w-8 h-8" />,
    highlight: '[data-chat]',
    position: 'bottom-center',
  },
  {
    id: 'sources',
    title: 'Cross-Referenced Sources',
    description: 'Look for source badges: 📓 Black Book (1,971 contacts), ✈️ Flight Logs (700+ flights), 📄 DOJ Documents. Entities in multiple sources are HIGH-VALUE TARGETS.',
    icon: <FileText className="w-8 h-8" />,
    position: 'center',
  },
];

const STORAGE_KEY = 'epstein-exposed-onboarding-complete';

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Slight delay for better UX
      setTimeout(() => setIsOpen(true), 500);
    }
  }, []);
  
  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };
  
  const handleSkip = () => {
    handleComplete();
  };
  
  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const step = ONBOARDING_STEPS[currentStep];
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />
          
          {/* Spotlight effect for highlighted elements */}
          {step.highlight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), transparent 200px, rgba(0,0,0,0.9) 400px)',
              }}
            />
          )}
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`
              fixed z-50 w-full max-w-lg bg-[#12121a] border border-[#ffffff15] rounded-2xl shadow-2xl
              ${step.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
              ${step.position === 'top-right' ? 'top-8 right-8' : ''}
              ${step.position === 'bottom-left' ? 'bottom-8 left-8' : ''}
              ${step.position === 'bottom-center' ? 'bottom-8 left-1/2 -translate-x-1/2' : ''}
            `}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 text-[#606070] hover:text-white rounded-lg hover:bg-[#ffffff10] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Content */}
            <div className="p-8">
              {/* Icon */}
              <motion.div
                key={step.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 to-[#a855f7]/20 
                           border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] mb-6"
              >
                {step.icon}
              </motion.div>
              
              {/* Title */}
              <motion.h2
                key={`title-${step.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold text-white mb-3"
              >
                {step.title}
              </motion.h2>
              
              {/* Description */}
              <motion.p
                key={`desc-${step.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[#a0a0b0] leading-relaxed"
              >
                {step.description}
              </motion.p>
              
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mt-8">
                {ONBOARDING_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`
                      w-2 h-2 rounded-full transition-all duration-300
                      ${i === currentStep 
                        ? 'w-6 bg-[#00d4ff]' 
                        : i < currentStep 
                          ? 'bg-[#00d4ff]/50' 
                          : 'bg-[#ffffff20]'
                      }
                    `}
                  />
                ))}
              </div>
              
              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#ffffff10]">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                    ${currentStep === 0
                      ? 'text-[#404050] cursor-not-allowed'
                      : 'text-[#a0a0b0] hover:text-white hover:bg-[#ffffff10]'
                    }
                  `}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-[#606070] hover:text-white transition-colors"
                  >
                    Skip tour
                  </button>
                  
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#00d4ff] text-black font-semibold 
                             rounded-lg hover:bg-[#00d4ff]/90 transition-colors"
                  >
                    {currentStep === ONBOARDING_STEPS.length - 1 ? 'Start Investigating' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to reset onboarding (for testing or user preference)
export function useResetOnboarding() {
  return () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };
}
```

---

## PHASE 3: COMMAND PALETTE

### 3.1: Command Palette Component

**File: `apps/web/app/components/command/CommandPalette.tsx`**

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import Fuse from 'fuse.js';
import { 
  Search, User, MapPin, Building2, FileText, Plane, 
  BookOpen, Zap, Clock, Download, Settings, HelpCircle,
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

interface CommandPaletteProps {
  entities?: any[];
  onSelectEntity?: (entity: any) => void;
  onOpenDocument?: (docId: string) => void;
  onAnalyzeConnection?: () => void;
  onShowTimeline?: () => void;
  onShowComparison?: () => void;
}

export function CommandPalette({
  entities = [],
  onSelectEntity,
  onOpenDocument,
  onAnalyzeConnection,
  onShowTimeline,
  onShowComparison,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Toggle with ⌘K or /
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.target?.toString().includes('input'))) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  // Build command items
  const commandItems: CommandItem[] = [
    // Actions
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
      action: () => { /* TODO */ setOpen(false); },
    },
    {
      id: 'filters',
      label: 'Open Filters',
      description: 'Filter by source, date, type',
      icon: <Filter className="w-4 h-4" />,
      category: 'action',
      action: () => { /* TODO */ setOpen(false); },
    },
    {
      id: 'stats',
      label: 'View Statistics',
      description: 'Document and entity statistics',
      icon: <BarChart3 className="w-4 h-4" />,
      category: 'action',
      action: () => { /* TODO */ setOpen(false); },
    },
    {
      id: 'help',
      label: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: <HelpCircle className="w-4 h-4" />,
      category: 'navigation',
      action: () => { /* TODO: Open shortcuts modal */ setOpen(false); },
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Configure preferences',
      icon: <Settings className="w-4 h-4" />,
      category: 'navigation',
      action: () => { /* TODO */ setOpen(false); },
    },
    
    // Entities (dynamically added)
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
  
  // Fuzzy search
  const fuse = new Fuse(commandItems, {
    keys: ['label', 'description'],
    threshold: 0.4,
  });
  
  const filteredItems = search
    ? fuse.search(search).map(r => r.item)
    : commandItems;
  
  // Group by category
  const grouped = {
    action: filteredItems.filter(i => i.category === 'action'),
    entity: filteredItems.filter(i => i.category === 'entity'),
    navigation: filteredItems.filter(i => i.category === 'navigation'),
  };
  
  return (
    <>
      {/* Trigger hint */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#12121a]/80 backdrop-blur-sm 
                     border border-[#ffffff15] rounded-lg text-[#606070] text-sm
                     hover:text-white hover:border-[#ffffff30] transition-all"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="px-1.5 py-0.5 bg-[#ffffff10] rounded text-[10px] font-mono">⌘K</kbd>
        </button>
      </div>
      
      {/* Command palette */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            
            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
            >
              <Command
                className="bg-[#12121a] border border-[#ffffff15] rounded-xl shadow-2xl overflow-hidden"
                loop
              >
                {/* Search input */}
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
                
                {/* Results */}
                <Command.List className="max-h-[400px] overflow-y-auto p-2">
                  <Command.Empty className="py-8 text-center text-[#606070]">
                    No results found
                  </Command.Empty>
                  
                  {/* Actions */}
                  {grouped.action.length > 0 && (
                    <Command.Group heading="Actions" className="mb-4">
                      <div className="px-2 py-1 text-xs text-[#606070] font-medium uppercase tracking-wider">
                        Actions
                      </div>
                      {grouped.action.map(item => (
                        <CommandItem key={item.id} item={item} />
                      ))}
                    </Command.Group>
                  )}
                  
                  {/* Entities */}
                  {grouped.entity.length > 0 && (
                    <Command.Group heading="Entities" className="mb-4">
                      <div className="px-2 py-1 text-xs text-[#606070] font-medium uppercase tracking-wider">
                        Entities
                      </div>
                      {grouped.entity.slice(0, 10).map(item => (
                        <CommandItem key={item.id} item={item} />
                      ))}
                      {grouped.entity.length > 10 && (
                        <div className="px-4 py-2 text-xs text-[#606070]">
                          +{grouped.entity.length - 10} more results...
                        </div>
                      )}
                    </Command.Group>
                  )}
                  
                  {/* Navigation */}
                  {grouped.navigation.length > 0 && (
                    <Command.Group heading="Navigation">
                      <div className="px-2 py-1 text-xs text-[#606070] font-medium uppercase tracking-wider">
                        Navigation
                      </div>
                      {grouped.navigation.map(item => (
                        <CommandItem key={item.id} item={item} />
                      ))}
                    </Command.Group>
                  )}
                </Command.List>
                
                {/* Footer */}
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

function CommandItem({ item }: { item: CommandItem }) {
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
      {item.metadata?.flightCount && (
        <span className="text-xs px-2 py-0.5 bg-[#00d4ff]/20 text-[#00d4ff] rounded">
          ✈️ {item.metadata.flightCount}
        </span>
      )}
      {item.metadata?.docCount && (
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

function getEntityDescription(entity: any): string {
  const parts = [];
  if (entity.sources?.blackBook) parts.push('📓 Black Book');
  if (entity.sources?.flightLogs) parts.push(`✈️ ${entity.flightCount} flights`);
  if (entity.sources?.dojDocs) parts.push(`📄 ${entity.dojDocumentCount} docs`);
  return parts.join(' • ') || entity.type;
}
```

---

## PHASE 4: TIMELINE VIEW

### 4.1: Timeline Component

**File: `apps/web/app/components/timeline/TimelineView.tsx`**

```tsx
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, Filter, Plane, FileText, User } from 'lucide-react';

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
  onEventClick?: (event: TimelineEvent) => void;
  onEntityClick?: (entityName: string) => void;
}

export function TimelineView({ events, onEventClick, onEntityClick }: TimelineViewProps) {
  const [filter, setFilter] = useState<'all' | 'flight' | 'document'>('all');
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set(['1999', '2000', '2001']));
  
  // Group events by year and month
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
  
  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#ffffff10] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#00d4ff]" />
          <h2 className="text-lg font-semibold text-white">Timeline</h2>
          <span className="text-sm text-[#606070]">
            {events.length} events
          </span>
        </div>
        
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-[#12121a] rounded-lg p-1">
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
      </div>
    </div>
  );
}
```

---

## PHASE 5: ENTITY COMPARISON MODE

### 5.1: Comparison Component

**File: `apps/web/app/components/comparison/EntityComparison.tsx`**

```tsx
'use client';

import { motion } from 'framer-motion';
import { X, Plane, FileText, BookOpen, ArrowRight, Users } from 'lucide-react';
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
  phones?: string[];
  emails?: string[];
}

interface EntityComparisonProps {
  entities: Entity[];
  onClose: () => void;
  onAnalyzeConnection: () => void;
  onRemoveEntity: (entityId: string) => void;
}

export function EntityComparison({
  entities,
  onClose,
  onAnalyzeConnection,
  onRemoveEntity,
}: EntityComparisonProps) {
  if (entities.length < 2) return null;
  
  // Find shared attributes
  const sharedDestinations = entities[0].flightDestinations?.filter(
    d => entities[1].flightDestinations?.includes(d)
  ) || [];
  
  const sharedCoPassengers = entities[0].topCoPassengers?.filter(
    p => entities[1].topCoPassengers?.some(p2 => p2.name === p.name)
  ) || [];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-0 left-0 right-0 z-40 p-4"
    >
      <div className="max-w-5xl mx-auto bg-[#12121a] border border-[#ffffff15] rounded-2xl shadow-2xl overflow-hidden">
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
      </div>
    </motion.div>
  );
}

// Need to import Zap
import { Zap } from 'lucide-react';
```

---

## PHASE 6: TOAST NOTIFICATIONS

### 6.1: Toast Provider

**File: `apps/web/app/components/ui/Toast.tsx`**

```tsx
'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 5000);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[#00ff88]" />,
    error: <XCircle className="w-5 h-5 text-[#ff3366]" />,
    warning: <AlertCircle className="w-5 h-5 text-[#ffb800]" />,
    info: <Info className="w-5 h-5 text-[#00d4ff]" />,
  };
  
  const colors = {
    success: 'border-[#00ff88]/30 bg-[#00ff88]/10',
    error: 'border-[#ff3366]/30 bg-[#ff3366]/10',
    warning: 'border-[#ffb800]/30 bg-[#ffb800]/10',
    info: 'border-[#00d4ff]/30 bg-[#00d4ff]/10',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      className={`
        pointer-events-auto w-80 p-4 rounded-lg border backdrop-blur-sm
        ${colors[toast.type]}
      `}
    >
      <div className="flex items-start gap-3">
        {icons[toast.type]}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white">{toast.title}</p>
          {toast.description && (
            <p className="text-sm text-[#a0a0b0] mt-1">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="p-1 text-[#606070] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
```

---

## PHASE 7: SKELETON LOADING STATES

### 7.1: Skeleton Components

**File: `apps/web/app/components/ui/Skeleton.tsx`**

```tsx
'use client';

import { motion } from 'framer-motion';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`bg-[#ffffff08] rounded ${className}`}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 bg-[#12121a] rounded-lg border border-[#ffffff10]">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function SkeletonEntityList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGraph() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center">
        {/* Animated rings */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-[#00d4ff]/30"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                delay: i * 0.4,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#00d4ff] animate-pulse" />
          </div>
        </div>
        
        {/* Loading text */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <p className="text-[#00d4ff] font-mono text-sm mb-1">INITIALIZING NEURAL GRAPH</p>
          <p className="text-[#606070] font-mono text-xs">Loading 96,322 entities...</p>
        </motion.div>
      </div>
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="p-4 space-y-4">
      {/* Assistant message skeleton */}
      <div className="flex gap-3">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
      
      {/* User message skeleton */}
      <div className="flex gap-3 justify-end">
        <div className="flex-1 max-w-[80%]">
          <Skeleton className="h-12 w-full rounded-lg ml-auto" />
        </div>
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      </div>
    </div>
  );
}
```

---

## PHASE 8: KEYBOARD SHORTCUTS MODAL

### 8.1: Shortcuts Modal

**File: `apps/web/app/components/ui/KeyboardShortcuts.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { category: 'Navigation', shortcuts: [
    { keys: ['⌘', 'K'], description: 'Open command palette' },
    { keys: ['/'], description: 'Focus search' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modal / Deselect' },
  ]},
  { category: 'Graph', shortcuts: [
    { keys: ['Click'], description: 'Select entity' },
    { keys: ['Ctrl', 'Click'], description: 'Multi-select entities' },
    { keys: ['Scroll'], description: 'Zoom in/out' },
    { keys: ['Drag'], description: 'Rotate view' },
    { keys: ['R'], description: 'Reset camera' },
  ]},
  { category: 'Chat', shortcuts: [
    { keys: ['Enter'], description: 'Send message' },
    { keys: ['Shift', 'Enter'], description: 'New line' },
    { keys: ['↑'], description: 'Previous message' },
  ]},
  { category: 'Document Viewer', shortcuts: [
    { keys: ['←', '→'], description: 'Previous/Next page' },
    { keys: ['+', '-'], description: 'Zoom in/out' },
    { keys: ['Esc'], description: 'Close viewer' },
    { keys: ['Ctrl', 'F'], description: 'Search in PDF' },
  ]},
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.target?.toString().includes('input')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                       w-full max-w-2xl bg-[#12121a] border border-[#ffffff15] 
                       rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#ffffff10] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-[#00d4ff]" />
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-[#606070] hover:text-white hover:bg-[#ffffff10] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Shortcuts grid */}
            <div className="p-6 grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
              {SHORTCUTS.map(category => (
                <div key={category.category}>
                  <h3 className="text-sm font-medium text-[#00d4ff] mb-3">{category.category}</h3>
                  <div className="space-y-2">
                    {category.shortcuts.map((shortcut, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-[#a0a0b0]">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, j) => (
                            <span key={j}>
                              <kbd className="px-2 py-1 bg-[#0a0a0f] border border-[#ffffff15] 
                                            rounded text-xs text-white font-mono min-w-[24px] 
                                            inline-block text-center">
                                {key}
                              </kbd>
                              {j < shortcut.keys.length - 1 && (
                                <span className="text-[#606070] mx-0.5">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#ffffff10] bg-[#0a0a0f]/50">
              <p className="text-xs text-[#606070] text-center">
                Press <kbd className="px-1.5 py-0.5 bg-[#ffffff10] rounded text-[10px]">?</kbd> anytime to show this panel
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## PHASE 9: MOBILE RESPONSIVE LAYOUT

### 9.1: Update Tailwind Config

**File: `apps/web/tailwind.config.ts`** (add to existing)

```typescript
// Add these to your existing tailwind config
module.exports = {
  // ... existing config
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        // existing: sm, md, lg, xl, 2xl
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
    },
  },
};
```

### 9.2: Mobile Navigation

**File: `apps/web/app/components/mobile/MobileNav.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Network, MessageSquare, Clock, Search, Settings } from 'lucide-react';

interface MobileNavProps {
  activeView: 'graph' | 'chat' | 'timeline';
  onViewChange: (view: 'graph' | 'chat' | 'timeline') => void;
  onOpenSearch: () => void;
}

export function MobileNav({ activeView, onViewChange, onOpenSearch }: MobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const navItems = [
    { id: 'graph', label: 'Graph', icon: Network },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ] as const;
  
  return (
    <>
      {/* Bottom navigation bar - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden 
                      bg-[#12121a]/95 backdrop-blur-lg border-t border-[#ffffff10]
                      pb-safe-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  flex flex-col items-center justify-center w-16 h-full
                  transition-colors
                  ${isActive ? 'text-[#00d4ff]' : 'text-[#606070]'}
                `}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 w-12 h-0.5 bg-[#00d4ff] rounded-full"
                  />
                )}
              </button>
            );
          })}
          
          <button
            onClick={onOpenSearch}
            className="flex flex-col items-center justify-center w-16 h-full text-[#606070]"
          >
            <Search className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-full text-[#606070]"
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
      
      {/* Mobile menu drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-[#12121a] z-50 md:hidden"
            >
              <div className="p-4 border-b border-[#ffffff10] flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-[#606070] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-2">
                <button className="w-full p-3 flex items-center gap-3 text-[#a0a0b0] 
                                 hover:bg-[#ffffff08] rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                {/* Add more menu items */}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

---

## PHASE 10: WIRE EVERYTHING INTO PAGE.TSX

### 10.1: Updated Page with All Components

**Add these imports and components to `apps/web/app/page.tsx`:**

```tsx
// Add to existing imports
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { CommandPalette } from './components/command/CommandPalette';
import { TimelineView } from './components/timeline/TimelineView';
import { EntityComparison } from './components/comparison/EntityComparison';
import { ToastProvider, useToast } from './components/ui/Toast';
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';
import { MobileNav } from './components/mobile/MobileNav';
import { SkeletonGraph } from './components/ui/Skeleton';

// Add to component state
const [activeView, setActiveView] = useState<'graph' | 'chat' | 'timeline'>('graph');
const [showComparison, setShowComparison] = useState(false);
const [comparisonEntities, setComparisonEntities] = useState<any[]>([]);
const [entities, setEntities] = useState<any[]>([]);

// Add to JSX (wrap everything in ToastProvider)
return (
  <ToastProvider>
    <div className="h-screen w-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Onboarding */}
      <OnboardingModal />
      
      {/* Command Palette */}
      <CommandPalette
        entities={entities}
        onSelectEntity={handleNodeSelect}
        onAnalyzeConnection={handleAnalyzeConnection}
        onShowTimeline={() => setActiveView('timeline')}
        onShowComparison={() => setShowComparison(true)}
      />
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
      
      {/* Header */}
      {/* ... existing header ... */}
      
      {/* Main content with view switching */}
      <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0">
        {activeView === 'graph' && (
          <Graph3DCore {...graphProps} />
        )}
        {activeView === 'timeline' && (
          <TimelineView events={[]} onEventClick={() => {}} />
        )}
        {activeView === 'chat' && (
          <div className="flex-1">
            <InvestigationChat {...chatProps} />
          </div>
        )}
      </div>
      
      {/* Entity Comparison */}
      <AnimatePresence>
        {showComparison && comparisonEntities.length >= 2 && (
          <EntityComparison
            entities={comparisonEntities}
            onClose={() => setShowComparison(false)}
            onAnalyzeConnection={handleAnalyzeConnection}
            onRemoveEntity={(id) => setComparisonEntities(prev => prev.filter(e => e.id !== id))}
          />
        )}
      </AnimatePresence>
      
      {/* Mobile Navigation */}
      <MobileNav
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenSearch={() => {/* trigger command palette */}}
      />
      
      {/* Document Viewer */}
      {viewingDocument && <DocumentViewer {...viewerProps} />}
    </div>
  </ToastProvider>
);
```

---

## DEPENDENCIES SUMMARY

```bash
cd apps/web
pnpm add framer-motion @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-toast cmdk fuse.js lucide-react
```

---

## FILES CREATED

```
apps/web/lib/animations.ts           # Animation constants
apps/web/lib/theme.ts                # Theme colors
apps/web/app/components/
├── onboarding/OnboardingModal.tsx   # First-time user tour
├── command/CommandPalette.tsx       # ⌘K search
├── timeline/TimelineView.tsx        # Chronological view
├── comparison/EntityComparison.tsx  # Side-by-side compare
├── ui/Toast.tsx                     # Notification system
├── ui/Skeleton.tsx                  # Loading states
├── ui/KeyboardShortcuts.tsx         # ? shortcut modal
└── mobile/MobileNav.tsx             # Bottom nav for mobile
```

---

## WHAT THIS GIVES YOU

| Feature | Keyboard | Description |
|---------|----------|-------------|
| **Onboarding** | Auto | First-time user guided tour |
| **Command Palette** | ⌘K or / | Fuzzy search everything |
| **Timeline View** | Via menu | Chronological event view |
| **Entity Comparison** | Via menu | Side-by-side analysis |
| **Toast Notifications** | Auto | Action feedback |
| **Skeleton Loading** | Auto | Premium loading states |
| **Keyboard Shortcuts** | ? | Show all shortcuts |
| **Mobile Navigation** | Touch | Bottom nav + drawer |

---

## RUN AFTER CREATING

```bash
pnpm add framer-motion @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-toast cmdk fuse.js lucide-react
pnpm dev
```

🏆 This is Gold Standard. Ship it.
