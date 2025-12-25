'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================================
// TYPES
// =============================================================================

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
  documentIds?: string[];
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface Graph3DCoreProps {
  onNodeSelect?: (node: Node | null) => void;
  onEdgeSelect?: (edge: Edge | null) => void;
  onAnalyzeConnection?: (entities: string[]) => void;
}

// =============================================================================
// CONSTANTS - Arkham/Bubblemaps Aesthetic
// =============================================================================

const DEFAULT_COLOR = { main: '#00d4ff', glow: 'rgba(0, 212, 255, 0.6)' };

const NODE_COLORS: Record<string, { main: string; glow: string }> = {
  person: { main: '#00d4ff', glow: 'rgba(0, 212, 255, 0.6)' },
  location: { main: '#ffb800', glow: 'rgba(255, 184, 0, 0.6)' },
  organization: { main: '#ff3366', glow: 'rgba(255, 51, 102, 0.6)' },
  date: { main: '#00ff88', glow: 'rgba(0, 255, 136, 0.6)' },
};

function getNodeColor(type: string) {
  return NODE_COLORS[type] || DEFAULT_COLOR;
}

const ANIMATION_CONFIG = {
  dampingFactor: 0.05,
  hoverScale: 1.2,
  selectedScale: 1.5,
  transitionSpeed: 8,
  floatAmplitude: 0.02,
  floatSpeed: 0.5,
  pulseSpeed: 3,
};

// =============================================================================
// GRAPH NODE COMPONENT
// =============================================================================

function GraphNode({
  node,
  isSelected,
  isHovered,
  isMultiSelected,
  onHover,
  onClick,
}: {
  node: Node;
  isSelected: boolean;
  isHovered: boolean;
  isMultiSelected: boolean;
  onHover: (node: Node | null) => void;
  onClick: (node: Node, event: ThreeEvent<MouseEvent>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  const colors = getNodeColor(node.type);
  const baseSize = 0.15 + Math.log10(Math.max(node.documentCount, 1) + 1) * 0.15;
  
  const targetScale = useMemo(() => {
    if (isSelected || isMultiSelected) return baseSize * ANIMATION_CONFIG.selectedScale;
    if (isHovered) return baseSize * ANIMATION_CONFIG.hoverScale;
    return baseSize;
  }, [isSelected, isMultiSelected, isHovered, baseSize]);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const currentScale = meshRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * ANIMATION_CONFIG.transitionSpeed);
    meshRef.current.scale.setScalar(newScale);
    
    const floatOffset = Math.sin(
      state.clock.elapsedTime * ANIMATION_CONFIG.floatSpeed + node.id.charCodeAt(0)
    ) * ANIMATION_CONFIG.floatAmplitude;
    meshRef.current.position.y = node.position[1] + floatOffset;
    
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      if (isSelected || isMultiSelected) {
        material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * ANIMATION_CONFIG.pulseSpeed) * 0.15;
      } else {
        material.opacity = THREE.MathUtils.lerp(material.opacity, 0.1, delta * 5);
      }
    }
    
    if (ringRef.current && isMultiSelected) {
      ringRef.current.rotation.z += delta * 0.5;
    }
  });
  
  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onClick(node, event);
  }, [node, onClick]);
  
  const handlePointerEnter = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onHover(node);
    document.body.style.cursor = 'pointer';
  }, [node, onHover]);
  
  const handlePointerLeave = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onHover(null);
    document.body.style.cursor = 'default';
  }, [onHover]);
  
  return (
    <group position={node.position}>
      {/* Reduced glow effect - much smaller and less intense */}
      <mesh ref={glowRef} scale={baseSize * 1.5}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={colors.main} transparent opacity={0.05} depthWrite={false} />
      </mesh>
      
      <mesh ref={meshRef} onClick={handleClick} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={colors.main}
          emissive={colors.main}
          emissiveIntensity={isSelected || isMultiSelected ? 0.8 : isHovered ? 0.5 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {isMultiSelected && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} scale={baseSize * 2.2}>
          <ringGeometry args={[0.85, 1.0, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {isSelected && !isMultiSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={baseSize * 1.8}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color={colors.main} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {(isHovered || isSelected || isMultiSelected) && (
        <>
          <Text position={[0, baseSize * 2 + 0.3, 0]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000000">
            {node.label}
          </Text>
          <Text position={[0, baseSize * 2 + 0.1, 0]} fontSize={0.08} color={colors.main} anchorX="center" anchorY="middle">
            {node.documentCount} docs • {node.connections} connections
          </Text>
        </>
      )}
    </group>
  );
}

// =============================================================================
// CONNECTION LINE COMPONENT
// =============================================================================

function ConnectionLine({ edge, nodes, isHighlighted }: { edge: Edge; nodes: Node[]; isHighlighted: boolean }) {
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);
  
  if (!fromNode || !toNode) return null;
  
  const baseOpacity = Math.min(0.08 + (edge.strength / 100) * 0.3, 0.4);
  const opacity = isHighlighted ? 0.8 : baseOpacity;
  const lineWidth = isHighlighted ? 2 : 0.5 + (edge.strength / 50);
  const color = isHighlighted ? '#00d4ff' : '#ffffff';
  
  return (
    <Line points={[fromNode.position, toNode.position]} color={color} lineWidth={lineWidth} transparent opacity={opacity} />
  );
}

// =============================================================================
// CAMERA CONTROLLER
// =============================================================================

function CameraController({ target }: { target: [number, number, number] | null }) {
  const controlsRef = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);
  
  useFrame(() => {
    if (controlsRef.current && target) {
      controlsRef.current.target.lerp(new THREE.Vector3(...target), 0.02);
      controlsRef.current.update();
    }
  });
  
  return (
    <OrbitControls
      // @ts-expect-error - OrbitControls ref typing is complex
      ref={controlsRef}
      enableDamping
      dampingFactor={ANIMATION_CONFIG.dampingFactor}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      minDistance={3}
      maxDistance={50}
    />
  );
}

// =============================================================================
// MAIN GRAPH COMPONENT
// =============================================================================

export function Graph3DCore({ onNodeSelect, onAnalyzeConnection }: Graph3DCoreProps) {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [multiSelectedNodes, setMultiSelectedNodes] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const response = await fetch('/api/graph');
        const data = await response.json();
        
        if (data.result?.data) {
          const nodesWithPositions = data.result.data.nodes.map((node: Node, i: number) => {
            if (node.position) return node;
            const phi = Math.acos(-1 + (2 * i) / data.result.data.nodes.length);
            const theta = Math.sqrt(data.result.data.nodes.length * Math.PI) * phi;
            const radius = 8 + Math.random() * 4;
            return {
              ...node,
              position: [
                radius * Math.cos(theta) * Math.sin(phi),
                radius * Math.sin(theta) * Math.sin(phi),
                radius * Math.cos(phi),
              ] as [number, number, number],
            };
          });
          setGraphData({ nodes: nodesWithPositions, edges: data.result.data.edges || [] });
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to load graph:', err);
        setError('Failed to load graph data');
        setLoading(false);
        
        // Generate mock data for demo
        const mockNodes: Node[] = Array.from({ length: 50 }, (_, i) => ({
          id: `node-${i}`,
          label: `Entity ${i}`,
          type: ['person', 'location', 'organization', 'date'][i % 4] as Node['type'],
          position: [(Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15] as [number, number, number],
          documentCount: Math.floor(Math.random() * 100) + 1,
          connections: Math.floor(Math.random() * 20) + 1,
        }));
        setGraphData({ nodes: mockNodes, edges: [] });
        setError(null);
      }
    };
    fetchGraph();
  }, []);
  
  const handleNodeClick = useCallback((node: Node, event: ThreeEvent<MouseEvent>) => {
    const isCtrlHeld = event.nativeEvent.ctrlKey || event.nativeEvent.metaKey;
    
    if (isCtrlHeld) {
      setMultiSelectedNodes(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
      setSelectedNode(null);
    } else {
      setMultiSelectedNodes(new Set());
      const newSelected = selectedNode?.id === node.id ? null : node;
      setSelectedNode(newSelected);
      onNodeSelect?.(newSelected);
    }
  }, [selectedNode, onNodeSelect]);
  
  const handleAnalyzeConnection = useCallback(() => {
    if (multiSelectedNodes.size < 2) return;
    const entities = [...multiSelectedNodes].map(nodeId => {
      const node = graphData.nodes.find(n => n.id === nodeId);
      return node?.label || nodeId;
    });
    
    // Call prop handler
    onAnalyzeConnection?.(entities);
    
    // Also dispatch CustomEvent for decoupled components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analyzeConnection', { 
        detail: { entities, nodeIds: [...multiSelectedNodes] }
      }));
    }
  }, [multiSelectedNodes, graphData.nodes, onAnalyzeConnection]);
  
  const handleClearMultiSelect = useCallback(() => {
    setMultiSelectedNodes(new Set());
  }, []);
  
  const highlightedEdges = useMemo(() => {
    const highlighted = new Set<string>();
    const relevantNodes = new Set([selectedNode?.id, ...multiSelectedNodes].filter(Boolean) as string[]);
    if (relevantNodes.size === 0) return highlighted;
    graphData.edges.forEach(edge => {
      if (relevantNodes.has(edge.from) || relevantNodes.has(edge.to)) {
        highlighted.add(`${edge.from}-${edge.to}`);
      }
    });
    return highlighted;
  }, [selectedNode, multiSelectedNodes, graphData.edges]);
  
  const cameraTarget = useMemo(() => {
    if (selectedNode) return selectedNode.position;
    if (multiSelectedNodes.size === 1) {
      const nodeId = [...multiSelectedNodes][0];
      const node = graphData.nodes.find(n => n.id === nodeId);
      return node?.position || null;
    }
    return null;
  }, [selectedNode, multiSelectedNodes, graphData.nodes]);
  
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="relative w-64 h-1 bg-[#1a1a24] rounded overflow-hidden mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent animate-pulse" />
          </div>
          <p className="font-mono text-[#00d4ff] text-sm">INITIALIZING NEURAL GRAPH...</p>
          <p className="font-mono text-[#606070] text-xs mt-2">Loading entities</p>
        </div>
      </div>
    );
  }
  
  if (error && graphData.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <p className="text-[#ff3366] font-mono mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#ff3366]/20 text-[#ff3366] rounded font-mono text-sm hover:bg-[#ff3366]/30">
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full relative">
      {multiSelectedNodes.size > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-[#12121a]/95 backdrop-blur-sm border border-[#00d4ff]/30 rounded-lg px-5 py-3 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
                <span className="text-[#00d4ff] font-mono text-sm font-medium">{multiSelectedNodes.size} ENTITIES SELECTED</span>
              </div>
              <div className="h-4 w-px bg-[#ffffff20]" />
              <span className="text-[#606070] font-mono text-xs">CTRL+Click to add more</span>
              <div className="h-4 w-px bg-[#ffffff20]" />
              {multiSelectedNodes.size >= 2 && (
                <button onClick={handleAnalyzeConnection} className="px-4 py-1.5 bg-[#00d4ff] text-[#0a0a0f] rounded font-mono text-xs font-bold hover:bg-[#00d4ff]/90 transition-colors flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  ANALYZE CONNECTION
                </button>
              )}
              <button onClick={handleClearMultiSelect} className="p-1.5 text-[#606070] hover:text-[#ff3366] transition-colors" title="Clear selection">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {[...multiSelectedNodes].map(nodeId => {
                const node = graphData.nodes.find(n => n.id === nodeId);
                const colors = getNodeColor(node?.type || 'person');
                return (
                  <span key={nodeId} className="px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: `${colors.main}20`, color: colors.main, border: `1px solid ${colors.main}40` }}>
                    {node?.label || nodeId}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {multiSelectedNodes.size === 0 && !selectedNode && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-[#12121a]/80 backdrop-blur-sm border border-[#ffffff10] rounded-lg px-4 py-2">
            <p className="text-[#606070] font-mono text-xs">
              <span className="text-[#00d4ff]">Click</span> node to select • 
              <span className="text-[#ffb800] ml-2">CTRL+Click</span> to multi-select • 
              <span className="text-[#ff3366] ml-2">Scroll</span> to zoom
            </p>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-[#12121a]/80 backdrop-blur-sm border border-[#ffffff10] rounded-lg px-3 py-2">
          <p className="text-[#606070] font-mono text-xs">
            <span className="text-[#00d4ff]">{graphData.nodes.length.toLocaleString()}</span> entities • 
            <span className="text-[#ffb800] ml-2">{graphData.edges.length.toLocaleString()}</span> connections
          </p>
        </div>
      </div>
      
      <Canvas camera={{ position: [0, 0, 20], fov: 60 }} gl={{ antialias: true, alpha: true }} style={{ background: '#0a0a0f' }} onPointerMissed={() => { if (!multiSelectedNodes.size) { setSelectedNode(null); onNodeSelect?.(null); } }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.6} color="#00d4ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.4} color="#ffb800" />
        <pointLight position={[0, 15, 0]} intensity={0.3} color="#ffffff" />
        <fog attach="fog" args={['#0a0a0f', 20, 60]} />
        <CameraController target={cameraTarget} />
        {graphData.edges.map(edge => (
          <ConnectionLine key={`${edge.from}-${edge.to}`} edge={edge} nodes={graphData.nodes} isHighlighted={highlightedEdges.has(`${edge.from}-${edge.to}`)} />
        ))}
        {graphData.nodes.map(node => (
          <GraphNode key={node.id} node={node} isSelected={selectedNode?.id === node.id} isHovered={hoveredNode?.id === node.id} isMultiSelected={multiSelectedNodes.has(node.id)} onHover={setHoveredNode} onClick={handleNodeClick} />
        ))}
      </Canvas>
    </div>
  );
}

export default Graph3DCore;
