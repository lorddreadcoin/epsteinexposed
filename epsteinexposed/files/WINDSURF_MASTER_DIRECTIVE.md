# 🎯 WINDSURF MASTER DIRECTIVE: EPSTEIN EXPOSED V2

## OVERVIEW
Transform the current prototype into a production-grade investigation platform inspired by:
- **Arkham Intelligence** (intel.arkham.ai) - Dark theme, glowing nodes, professional data viz
- **Bubblemaps** (bubblemaps.io) - Smooth bubble physics, gradient fills, organic connections
- **WEBB** (Ian Carroll's tool) - Document-grounded AI, clickable citations, investigation canvas

## CRITICAL FIXES (Do These First)

### Fix 1: Orange "Documents" Text Not Clickable
**Problem:** The orange "documents" text just collapses the panel instead of opening PDFs
**Solution:** Wire up actual click handlers to open PDF viewer modal

### Fix 2: Duplicate Connection Mentions
**Problem:** Same connection showing multiple times
**Solution:** Deduplicate at data aggregation layer using Set() and unique keys

### Fix 3: 3D Graph Too Fast/Erratic
**Problem:** Animations are jarring and unprofessional
**Solution:** Add damping, spring physics, throttle updates to 30fps

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EPSTEIN EXPOSED V2                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     3D NEURAL GRAPH (75% height)                   │ │
│  │                                                                    │ │
│  │  • Arkham-style dark theme with glowing cyan/amber nodes          │ │
│  │  • Smooth spring physics (react-spring integration)               │ │
│  │  • CTRL+Click to select multiple nodes for connection analysis    │ │
│  │  • Hover tooltips with entity preview                             │ │
│  │  • Click node → Side panel shows entity details + documents       │ │
│  │  • Click edge → Shows shared documents between entities           │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ [🔍 Search] [⚡ Auto-Discover] [📊 Stats] [⚙️ Settings]     │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │              INVESTIGATION CHAT PANEL (25% height)                 │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │ 💡 Discovery: "Les Wexner ↔ Jeffrey Epstein appear in 47    │  │ │
│  │  │    documents together. Analyze connection?" [Yes] [Skip]    │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │                                                                    │ │
│  │  User: What connects Bill Clinton to the Lolita Express?          │ │
│  │  ───────────────────────────────────────────────────────────────  │ │
│  │  🔍 Searching 11,622 documents...                                 │ │
│  │  ✓ Found 23 relevant documents                                    │ │
│  │                                                                    │ │
│  │  Based on DOC-003421 (flight_log_march_2002.pdf):                 │ │
│  │  "Bill Clinton appears on 26 flight manifests between 2001-2003"  │ │
│  │  📎 [View Source Document]                                        │ │
│  │                                                                    │ │
│  │  [────────────────────────────────────────] [Send]                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## FILE-BY-FILE IMPLEMENTATION

### 1. Theme & Design System

**File: `apps/web/app/styles/design-system.css`**

```css
:root {
  /* Arkham-inspired dark palette */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a24;
  --bg-elevated: #22222e;
  
  /* Accent colors - cyber/intel aesthetic */
  --accent-cyan: #00d4ff;
  --accent-cyan-glow: rgba(0, 212, 255, 0.4);
  --accent-amber: #ffb800;
  --accent-amber-glow: rgba(255, 184, 0, 0.4);
  --accent-red: #ff3366;
  --accent-red-glow: rgba(255, 51, 102, 0.4);
  --accent-green: #00ff88;
  --accent-green-glow: rgba(0, 255, 136, 0.4);
  
  /* Text hierarchy */
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #606070;
  
  /* Borders & dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-medium: rgba(255, 255, 255, 0.15);
  
  /* Typography - Distinctive choices */
  --font-display: 'JetBrains Mono', 'Fira Code', monospace;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  
  /* Animation */
  --transition-fast: 150ms ease;
  --transition-medium: 300ms ease;
  --transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Shadows & glows */
  --glow-cyan: 0 0 20px var(--accent-cyan-glow), 0 0 40px var(--accent-cyan-glow);
  --glow-amber: 0 0 20px var(--accent-amber-glow), 0 0 40px var(--accent-amber-glow);
  --shadow-elevated: 0 4px 24px rgba(0, 0, 0, 0.5);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-medium);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Terminal-style text animation */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes blink {
  50% { opacity: 0; }
}

.terminal-text {
  font-family: var(--font-mono);
  overflow: hidden;
  white-space: nowrap;
  animation: typewriter 2s steps(40) forwards;
}

.terminal-cursor::after {
  content: '▋';
  animation: blink 1s infinite;
  color: var(--accent-cyan);
}

/* Glow effects for nodes */
.node-glow-cyan {
  filter: drop-shadow(0 0 8px var(--accent-cyan)) drop-shadow(0 0 16px var(--accent-cyan-glow));
}

.node-glow-amber {
  filter: drop-shadow(0 0 8px var(--accent-amber)) drop-shadow(0 0 16px var(--accent-amber-glow));
}

/* Loading states - Matrix/PowerShell style */
@keyframes scan-line {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

.loading-scan::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-cyan), transparent);
  animation: scan-line 2s linear infinite;
}
```

---

### 2. Updated Graph3DCore with Arkham Aesthetic

**File: `apps/web/app/components/graph/Graph3DCore.tsx`**

```tsx
'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

// Types
interface Node {
  id: string;
  label: string;
  type: 'person' | 'location' | 'organization' | 'date';
  position: [number, number, number];
  documentCount: number;
  connections: number;
}

interface Edge {
  from: string;
  to: string;
  strength: number;
  documentIds: string[];
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

// Color mapping for node types
const NODE_COLORS: Record<string, { main: string; glow: string }> = {
  person: { main: '#00d4ff', glow: 'rgba(0, 212, 255, 0.6)' },
  location: { main: '#ffb800', glow: 'rgba(255, 184, 0, 0.6)' },
  organization: { main: '#ff3366', glow: 'rgba(255, 51, 102, 0.6)' },
  date: { main: '#00ff88', glow: 'rgba(0, 255, 136, 0.6)' },
};

// Individual node component with smooth animations
function GraphNode({ 
  node, 
  isSelected, 
  isHovered,
  onHover,
  onClick,
  multiSelectMode,
  isMultiSelected 
}: {
  node: Node;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (node: Node | null) => void;
  onClick: (node: Node, isCtrlHeld: boolean) => void;
  multiSelectMode: boolean;
  isMultiSelected: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const colors = NODE_COLORS[node.type] || NODE_COLORS.person;
  
  // Smooth size based on document count (logarithmic scale)
  const baseSize = 0.15 + Math.log10(node.documentCount + 1) * 0.15;
  const targetSize = isSelected || isMultiSelected ? baseSize * 1.5 : isHovered ? baseSize * 1.2 : baseSize;
  
  // Animate size smoothly
  useFrame((state, delta) => {
    if (meshRef.current) {
      const currentScale = meshRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetSize, delta * 8);
      meshRef.current.scale.setScalar(newScale);
      
      // Subtle floating animation
      meshRef.current.position.y = node.position[1] + Math.sin(state.clock.elapsedTime * 0.5 + node.id.charCodeAt(0)) * 0.02;
    }
    
    // Glow pulse effect
    if (glowRef.current) {
      const pulseIntensity = isSelected || isMultiSelected 
        ? 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2 
        : 0.4;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulseIntensity;
    }
  });
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick(node, e.ctrlKey || e.metaKey);
  };
  
  return (
    <group position={node.position}>
      {/* Outer glow sphere */}
      <mesh ref={glowRef} scale={baseSize * 2.5}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={colors.main}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
      
      {/* Main node sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHover(node);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={colors.main}
          emissive={colors.main}
          emissiveIntensity={isSelected || isMultiSelected ? 0.8 : isHovered ? 0.5 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* Multi-select indicator ring */}
      {isMultiSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={baseSize * 2}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}
      
      {/* Label - only show when hovered or selected */}
      {(isHovered || isSelected || isMultiSelected) && (
        <Text
          position={[0, baseSize + 0.3, 0]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font="/fonts/JetBrainsMono-Regular.ttf"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {node.label}
        </Text>
      )}
      
      {/* Document count badge */}
      {(isHovered || isSelected) && (
        <Text
          position={[0, baseSize + 0.15, 0]}
          fontSize={0.08}
          color={colors.main}
          anchorX="center"
          anchorY="middle"
          font="/fonts/JetBrainsMono-Regular.ttf"
        >
          {node.documentCount} docs
        </Text>
      )}
    </group>
  );
}

// Connection line between nodes
function ConnectionLine({ 
  edge, 
  nodes, 
  isHighlighted,
  onClick 
}: { 
  edge: Edge; 
  nodes: Node[];
  isHighlighted: boolean;
  onClick: (edge: Edge) => void;
}) {
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);
  
  if (!fromNode || !toNode) return null;
  
  // Calculate opacity based on strength
  const opacity = Math.min(0.1 + (edge.strength / 100) * 0.4, 0.5);
  const lineWidth = isHighlighted ? 3 : 1 + (edge.strength / 50);
  
  return (
    <Line
      points={[fromNode.position, toNode.position]}
      color={isHighlighted ? '#00d4ff' : '#ffffff'}
      lineWidth={lineWidth}
      transparent
      opacity={isHighlighted ? 0.8 : opacity}
      onClick={(e) => {
        e.stopPropagation();
        onClick(edge);
      }}
    />
  );
}

// Camera controller with smooth damping
function CameraController({ target }: { target: [number, number, number] | null }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  useFrame((_, delta) => {
    if (target) {
      targetRef.current.lerp(new THREE.Vector3(...target), delta * 2);
    }
  });
  
  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      minDistance={2}
      maxDistance={50}
      target={targetRef.current}
    />
  );
}

// Main graph component
export function Graph3DCore({ 
  onNodeSelect,
  onEdgeSelect,
  onMultiSelect,
}: {
  onNodeSelect: (node: Node | null) => void;
  onEdgeSelect: (edge: Edge | null) => void;
  onMultiSelect: (nodes: Node[]) => void;
}) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [multiSelectedNodes, setMultiSelectedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch graph data
  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const response = await fetch('/api/trpc/graph.getGraph');
        const data = await response.json();
        
        if (data.result?.data) {
          // Add 3D positions if not present
          const nodesWithPositions = data.result.data.nodes.map((node: any, i: number) => ({
            ...node,
            position: node.position || [
              (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 20,
            ],
          }));
          
          setGraphData({
            nodes: nodesWithPositions,
            edges: data.result.data.edges || [],
          });
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to load graph:', err);
        setError('Failed to load graph data');
        setLoading(false);
      }
    };
    
    fetchGraph();
  }, []);
  
  // Handle node click with CTRL for multi-select
  const handleNodeClick = useCallback((node: Node, isCtrlHeld: boolean) => {
    if (isCtrlHeld) {
      // Multi-select mode
      setMultiSelectedNodes(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        
        // Notify parent of multi-selection
        const selectedNodes = graphData.nodes.filter(n => next.has(n.id));
        onMultiSelect(selectedNodes);
        
        return next;
      });
    } else {
      // Single select
      setMultiSelectedNodes(new Set());
      setSelectedNode(prev => prev?.id === node.id ? null : node);
      onNodeSelect(node);
    }
  }, [graphData.nodes, onNodeSelect, onMultiSelect]);
  
  // Handle edge click
  const handleEdgeClick = useCallback((edge: Edge) => {
    onEdgeSelect(edge);
  }, [onEdgeSelect]);
  
  // Memoize highlighted edges
  const highlightedEdges = useMemo(() => {
    if (!selectedNode && multiSelectedNodes.size === 0) return new Set<string>();
    
    const highlighted = new Set<string>();
    graphData.edges.forEach(edge => {
      const isConnected = 
        edge.from === selectedNode?.id || 
        edge.to === selectedNode?.id ||
        multiSelectedNodes.has(edge.from) ||
        multiSelectedNodes.has(edge.to);
      
      if (isConnected) {
        highlighted.add(`${edge.from}-${edge.to}`);
      }
    });
    
    return highlighted;
  }, [selectedNode, multiSelectedNodes, graphData.edges]);
  
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="loading-scan relative w-64 h-1 bg-[#1a1a24] rounded overflow-hidden mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent animate-pulse" />
          </div>
          <p className="font-mono text-[#00d4ff] text-sm terminal-text">
            INITIALIZING NEURAL GRAPH...
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <p className="text-[#ff3366] font-mono">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full relative">
      {/* CTRL+Click instruction overlay */}
      {multiSelectedNodes.size > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#12121a]/90 border border-[#00d4ff]/30 rounded-lg px-4 py-2">
          <p className="text-[#00d4ff] font-mono text-sm">
            {multiSelectedNodes.size} nodes selected • 
            <span className="text-white ml-2">CTRL+Click to add more</span> • 
            <button 
              onClick={() => {
                if (multiSelectedNodes.size >= 2) {
                  const selected = graphData.nodes.filter(n => multiSelectedNodes.has(n.id));
                  onMultiSelect(selected);
                }
              }}
              className="ml-2 px-2 py-0.5 bg-[#00d4ff] text-black rounded text-xs hover:bg-[#00d4ff]/80"
            >
              Analyze Connection
            </button>
          </p>
        </div>
      )}
      
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: '#0a0a0f' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#00d4ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ffb800" />
        
        {/* Fog for depth */}
        <fog attach="fog" args={['#0a0a0f', 15, 50]} />
        
        {/* Camera controls */}
        <CameraController target={selectedNode?.position || null} />
        
        {/* Render edges first (behind nodes) */}
        {graphData.edges.map(edge => (
          <ConnectionLine
            key={`${edge.from}-${edge.to}`}
            edge={edge}
            nodes={graphData.nodes}
            isHighlighted={highlightedEdges.has(`${edge.from}-${edge.to}`)}
            onClick={handleEdgeClick}
          />
        ))}
        
        {/* Render nodes */}
        {graphData.nodes.map(node => (
          <GraphNode
            key={node.id}
            node={node}
            isSelected={selectedNode?.id === node.id}
            isHovered={hoveredNode?.id === node.id}
            isMultiSelected={multiSelectedNodes.has(node.id)}
            multiSelectMode={multiSelectedNodes.size > 0}
            onHover={setHoveredNode}
            onClick={handleNodeClick}
          />
        ))}
      </Canvas>
    </div>
  );
}
```

---

### 3. Investigation Chat Panel

**File: `apps/web/app/components/chat/InvestigationChat.tsx`**

```tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, FileText, ExternalLink, ChevronUp, ChevronDown, Sparkles, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  isStreaming?: boolean;
}

interface Citation {
  documentId: string;
  documentName: string;
  excerpt: string;
  page?: number;
}

interface Discovery {
  id: string;
  entity1: string;
  entity2: string;
  documentCount: number;
  significance: 'high' | 'medium' | 'low';
  summary: string;
}

interface InvestigationChatProps {
  selectedEntities?: string[];
  onViewDocument: (documentId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function InvestigationChat({ 
  selectedEntities = [],
  onViewDocument,
  isCollapsed,
  onToggleCollapse 
}: InvestigationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDiscovery, setPendingDiscovery] = useState<Discovery | null>(null);
  const [discoveryQueue, setDiscoveryQueue] = useState<Discovery[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle entity selection changes - trigger discovery prompt
  useEffect(() => {
    if (selectedEntities.length >= 2) {
      // Create a discovery prompt for the selected entities
      const newDiscovery: Discovery = {
        id: `disc-${Date.now()}`,
        entity1: selectedEntities[0],
        entity2: selectedEntities[1],
        documentCount: 0, // Will be fetched
        significance: 'high',
        summary: `Analyze the connection between ${selectedEntities[0]} and ${selectedEntities[1]}?`,
      };
      setPendingDiscovery(newDiscovery);
    }
  }, [selectedEntities]);
  
  // Send message to Claude API (document-grounded)
  const sendMessage = async (content: string, isDiscoveryQuery = false) => {
    if (!content.trim() && !isDiscoveryQuery) return;
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content || `Analyze the connection between ${selectedEntities.join(' and ')}`,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Add streaming placeholder
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);
    
    try {
      const response = await fetch('/api/chat/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            selectedEntities,
            conversationHistory: messages.slice(-10),
            useWebSearch: false, // Start with docs only
          },
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      
      // Update the streaming message with final content
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? {
              ...msg,
              content: data.response,
              citations: data.citations,
              isStreaming: false,
            }
          : msg
      ));
      
      // If no results found in docs, offer web search
      if (data.noDocumentResults) {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-system`,
          role: 'system',
          content: 'No relevant information found in the DOJ documents. Would you like me to search public sources?',
          timestamp: new Date(),
        }]);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: 'Error: Failed to analyze. Please try again.', isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle discovery acceptance
  const handleAcceptDiscovery = () => {
    if (pendingDiscovery) {
      sendMessage('', true);
      setPendingDiscovery(null);
    }
  };
  
  // Handle discovery skip
  const handleSkipDiscovery = () => {
    setPendingDiscovery(null);
    // Move to next in queue if exists
    if (discoveryQueue.length > 0) {
      setPendingDiscovery(discoveryQueue[0]);
      setDiscoveryQueue(prev => prev.slice(1));
    }
  };
  
  // Render message content with citations
  const renderMessageContent = (message: Message) => {
    if (message.isStreaming) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#00d4ff]" />
          <span className="text-[#606070] font-mono text-sm terminal-text">
            Searching 11,622 documents...
          </span>
        </div>
      );
    }
    
    return (
      <div>
        <p className="text-[#e0e0e0] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        
        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#ffffff10]">
            <p className="text-xs text-[#606070] mb-2 font-mono">SOURCES:</p>
            <div className="space-y-2">
              {message.citations.map((citation, idx) => (
                <button
                  key={idx}
                  onClick={() => onViewDocument(citation.documentId)}
                  className="w-full text-left p-2 rounded bg-[#1a1a24] hover:bg-[#22222e] 
                           border border-[#ffffff10] hover:border-[#00d4ff]/30 
                           transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-sm text-[#00d4ff] font-mono truncate">
                      {citation.documentName}
                    </span>
                    <ExternalLink className="w-3 h-3 text-[#606070] group-hover:text-[#00d4ff] ml-auto" />
                  </div>
                  {citation.excerpt && (
                    <p className="text-xs text-[#a0a0b0] mt-1 line-clamp-2">
                      "{citation.excerpt}"
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div 
      className={`
        bg-[#0a0a0f] border-t border-[#ffffff15] 
        transition-all duration-300 ease-out
        ${isCollapsed ? 'h-12' : 'h-[25vh] min-h-[200px]'}
      `}
    >
      {/* Header bar */}
      <div 
        className="h-12 px-4 flex items-center justify-between border-b border-[#ffffff10] cursor-pointer hover:bg-[#12121a]"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-[#00d4ff]" />
          <span className="font-mono text-sm text-[#a0a0b0]">
            INVESTIGATION ASSISTANT
          </span>
          {messages.length > 0 && (
            <span className="text-xs text-[#606070] font-mono">
              ({messages.length} messages)
            </span>
          )}
        </div>
        <button className="p-1 hover:bg-[#ffffff10] rounded">
          {isCollapsed ? <ChevronUp className="w-4 h-4 text-[#606070]" /> : <ChevronDown className="w-4 h-4 text-[#606070]" />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="flex flex-col h-[calc(100%-48px)]">
          {/* Discovery prompt */}
          {pendingDiscovery && (
            <div className="mx-4 mt-3 p-3 rounded-lg bg-gradient-to-r from-[#00d4ff]/10 to-[#ffb800]/10 border border-[#00d4ff]/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#00d4ff] font-mono mb-1">
                    💡 CONNECTION DETECTED
                  </p>
                  <p className="text-sm text-[#e0e0e0]">
                    Analyze connection between <span className="text-[#00d4ff] font-semibold">{pendingDiscovery.entity1}</span> and{' '}
                    <span className="text-[#ffb800] font-semibold">{pendingDiscovery.entity2}</span>?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptDiscovery}
                    className="px-3 py-1.5 bg-[#00d4ff] text-black text-sm font-mono rounded hover:bg-[#00d4ff]/80 transition-colors"
                  >
                    Analyze
                  </button>
                  <button
                    onClick={handleSkipDiscovery}
                    className="px-3 py-1.5 bg-[#ffffff10] text-[#a0a0b0] text-sm font-mono rounded hover:bg-[#ffffff20] transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 && !pendingDiscovery && (
              <div className="text-center py-8">
                <p className="text-[#606070] font-mono text-sm">
                  Select entities in the graph or ask a question to begin investigating.
                </p>
                <p className="text-[#404050] font-mono text-xs mt-2">
                  Tip: CTRL+Click two nodes to analyze their connection
                </p>
              </div>
            )}
            
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-lg p-3
                    ${message.role === 'user' 
                      ? 'bg-[#00d4ff]/20 border border-[#00d4ff]/30' 
                      : message.role === 'system'
                        ? 'bg-[#ffb800]/10 border border-[#ffb800]/30'
                        : 'bg-[#12121a] border border-[#ffffff10]'
                    }
                  `}
                >
                  {renderMessageContent(message)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="p-4 border-t border-[#ffffff10]">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask about connections, entities, or patterns..."
                className="flex-1 bg-[#12121a] border border-[#ffffff15] rounded-lg px-4 py-2 
                         text-[#e0e0e0] placeholder-[#606070] font-mono text-sm
                         focus:outline-none focus:border-[#00d4ff]/50 resize-none"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-[#00d4ff] text-black rounded-lg font-mono text-sm
                         hover:bg-[#00d4ff]/80 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

This is getting long. Let me continue with the API routes and remaining components in the next file.
