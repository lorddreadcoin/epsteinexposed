'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================================
// TYPES
// =============================================================================

interface NodeData {
  id: string;
  name: string;
  label: string;
  type: string;
  x: number;
  y: number;
  z: number;
  size: number;
  connectionCount: number;
  connections: number;
  documentCount: number;
}

interface EdgeData {
  source: string;
  target: string;
  weight: number;
}

interface Graph3DCoreProps {
  onNodeSelect?: (node: NodeData | null) => void;
  onAnalyzeConnection?: (entities: string[], nodeData: NodeData[]) => void;
}

// =============================================================================
// VIBRANT COLOR PALETTE
// =============================================================================

const ENTITY_COLORS: Record<string, string> = {
  person: '#00D4FF',
  location: '#FF6B35',
  organization: '#9333EA',
  date: '#FBBF24',
  flight: '#10B981',
  phone: '#EC4899',
  email: '#3B82F6',
  other: '#6B7280',
};

// =============================================================================
// GLOBAL ANIMATION CLOCK COMPONENT
// =============================================================================

function useGlobalTime() {
  const [time, setTime] = useState(0);
  useFrame((state) => {
    setTime(state.clock.elapsedTime);
  });
  return time;
}

// =============================================================================
// ANIMATED NODE COMPONENT - Breathing, pulsing, glowing
// =============================================================================

function AnimatedNode({
  node,
  isSelected,
  isConnected,
  showLabel,
  onClick,
  onHover,
  globalTime,
}: {
  node: NodeData;
  isSelected: boolean;
  isConnected: boolean;
  showLabel: boolean;
  onClick: (e: React.MouseEvent) => void;
  onHover: (hovering: boolean) => void;
  globalTime: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = new THREE.Color(ENTITY_COLORS[node.type] || ENTITY_COLORS.other);
  const baseSize = node.size || 1;

  // BREATHING - All nodes gently pulse
  const breathe = Math.sin(globalTime * 0.5 + node.x * 0.1) * 0.08 + 1;
  
  // HEARTBEAT for selected nodes
  const heartbeat = isSelected ? Math.sin(globalTime * 3) * 0.2 + 1.15 : 1;
  
  // RIPPLE for connected nodes
  const ripple = isConnected ? Math.sin(globalTime * 4 - node.y * 0.05) * 0.12 + 1.08 : 1;
  
  const finalScale = baseSize * breathe * heartbeat * ripple;

  // Animate mesh
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(finalScale);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(finalScale * (isSelected ? 2.8 : isConnected ? 2.2 : 1.6));
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 
        isSelected ? 0.5 : isConnected ? 0.3 : 0.12;
    }
    if (ringRef.current && isSelected) {
      ringRef.current.rotation.z = globalTime * 0.8;
      ringRef.current.scale.setScalar(finalScale * 3.5 + Math.sin(globalTime * 2) * 0.6);
    }
  });

  return (
    <group position={[node.x, node.y, node.z]}>
      {/* OUTER GLOW */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {/* SELECTION RING - Spinning ring around selected nodes */}
      {isSelected && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.5, 0.08, 8, 32]} />
          <meshBasicMaterial color="#00FFFF" transparent opacity={0.9} />
        </mesh>
      )}

      {/* MAIN NODE */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={isSelected ? '#FFFFFF' : color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.9 : isConnected ? 0.6 : 0.25}
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* PULSE RINGS - Emanate from connected nodes */}
      {isConnected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={1 + (globalTime % 2)}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={Math.max(0, 1 - (globalTime % 2) / 2)}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* LABEL */}
      {showLabel && (
        <Html position={[0, baseSize + 2, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            className="whitespace-nowrap px-3 py-1.5 rounded-lg font-bold transition-all duration-200"
            style={{
              backgroundColor: isSelected ? 'rgba(0,255,255,0.95)' : 'rgba(0,0,0,0.92)',
              color: isSelected ? '#000' : '#fff',
              fontSize: isSelected ? '14px' : '12px',
              border: `2px solid ${isSelected ? '#00FFFF' : color.getStyle()}`,
              boxShadow: isSelected 
                ? '0 0 25px rgba(0,255,255,0.6), 0 0 50px rgba(0,255,255,0.3)' 
                : '0 4px 12px rgba(0,0,0,0.5)',
              transform: `scale(${isSelected ? 1.15 : 1})`,
            }}
          >
            {node.name}
            <div className="text-[10px] opacity-80 font-normal mt-0.5">
              {node.documentCount} docs · {node.connectionCount} links
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// =============================================================================
// CONNECTION LINES
// =============================================================================

function ConnectionLine({
  edge,
  nodeMap,
  isHighlighted,
}: {
  edge: EdgeData;
  nodeMap: Map<string, NodeData>;
  isHighlighted: boolean;
}) {
  const source = nodeMap.get(edge.source);
  const target = nodeMap.get(edge.target);
  if (!source || !target) return null;

  const strengthNorm = Math.min(edge.weight / 50, 1);
  const opacity = isHighlighted ? 0.9 : 0.2 + strengthNorm * 0.4;
  const lineWidth = isHighlighted ? 3 : 1 + strengthNorm * 1.5;
  const color = isHighlighted ? '#00FFFF' : `hsl(200, ${50 + strengthNorm * 50}%, ${40 + strengthNorm * 30}%)`;

  return (
    <Line
      points={[
        [source.x, source.y, source.z],
        [target.x, target.y, target.z],
      ]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
}

// =============================================================================
// MAIN GRAPH SCENE
// =============================================================================

function GraphScene({
  nodes,
  edges,
  onNodeSelect,
  onAnalyzeConnection,
}: {
  nodes: NodeData[];
  edges: EdgeData[];
  onNodeSelect: (node: NodeData | null) => void;
  onAnalyzeConnection: (entities: string[], nodeData: NodeData[]) => void;
}) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const highlightedNodeIds = useMemo(() => {
    if (selectedNodeIds.size === 0) return new Set<string>();
    const connected = new Set<string>();
    edges.forEach((e) => {
      if (selectedNodeIds.has(e.source)) connected.add(e.target);
      if (selectedNodeIds.has(e.target)) connected.add(e.source);
    });
    return connected;
  }, [selectedNodeIds, edges]);

  // Check if there's a direct connection between selected nodes
  const selectedNodesConnection = useMemo(() => {
    if (selectedNodeIds.size < 2) return null;
    const ids = Array.from(selectedNodeIds);
    for (const edge of edges) {
      if (ids.includes(edge.source) && ids.includes(edge.target)) {
        return edge;
      }
    }
    return null;
  }, [selectedNodeIds, edges]);

  void useMemo(() => {
    return new Set(
      [...nodes]
        .sort((a, b) => b.connectionCount - a.connectionCount)
        .slice(0, 50)
        .map((n) => n.id)
    );
  }, [nodes]);

  const handleNodeClick = useCallback(
    (node: NodeData, e: React.MouseEvent) => {
      const ctrlKey = e.ctrlKey || e.metaKey;
      
      setSelectedNodeIds(prev => {
        const newSet = new Set(prev);
        
        if (ctrlKey) {
          // Multi-select: toggle this node
          if (newSet.has(node.id)) {
            newSet.delete(node.id);
          } else {
            newSet.add(node.id);
          }
        } else {
          // Single select: clear and select only this
          if (newSet.size === 1 && newSet.has(node.id)) {
            newSet.clear(); // Deselect if clicking same node
          } else {
            newSet.clear();
            newSet.add(node.id);
          }
        }
        
        // Trigger connection analysis when 2+ nodes selected
        if (newSet.size >= 2) {
          const selectedNodes = Array.from(newSet).map(id => nodeMap.get(id)).filter(Boolean) as NodeData[];
          const names = selectedNodes.map(n => n.name);
          setTimeout(() => onAnalyzeConnection(names, selectedNodes), 100);
        }
        
        // Update single node select for sidebar
        if (newSet.size === 1) {
          const singleId = Array.from(newSet)[0] as string;
          onNodeSelect(nodeMap.get(singleId) || null);
        } else if (newSet.size === 0) {
          onNodeSelect(null);
        }
        
        return newSet;
      });
    },
    [nodeMap, onNodeSelect, onAnalyzeConnection]
  );

  const handleNodeHover = useCallback((nodeId: string, hovering: boolean) => {
    setHoveredNodeId(hovering ? nodeId : null);
  }, []);

  // Global animation time
  const globalTime = useGlobalTime();

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[100, 100, 100]} intensity={0.7} />
      <pointLight position={[-100, -100, 50]} intensity={0.4} color="#00D4FF" />

      {/* All connection lines - always visible */}
      {edges.map((edge, i) => (
        <ConnectionLine
          key={`${edge.source}-${edge.target}-${i}`}
          edge={edge}
          nodeMap={nodeMap}
          isHighlighted={
            selectedNodeIds.has(edge.source) ||
            selectedNodeIds.has(edge.target) ||
            highlightedNodeIds.has(edge.source) ||
            highlightedNodeIds.has(edge.target) ||
            hoveredNodeId === edge.source ||
            hoveredNodeId === edge.target
          }
        />
      ))}

      {/* Special highlight line between selected nodes */}
      {selectedNodeIds.size >= 2 && (() => {
        const ids = Array.from(selectedNodeIds) as string[];
        const lines: React.ReactNode[] = [];
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const idA = ids[i] as string;
            const idB = ids[j] as string;
            const nodeA = nodeMap.get(idA);
            const nodeB = nodeMap.get(idB);
            if (nodeA && nodeB) {
              lines.push(
                <Line
                  key={`selected-${idA}-${idB}`}
                  points={[[nodeA.x, nodeA.y, nodeA.z], [nodeB.x, nodeB.y, nodeB.z]]}
                  color={selectedNodesConnection ? '#00FF00' : '#FF6B35'}
                  lineWidth={4}
                  dashed={!selectedNodesConnection}
                  dashSize={2}
                  gapSize={1}
                />
              );
            }
          }
        }
        return lines;
      })()}

      {nodes.map((node) => (
        <AnimatedNode
          key={node.id}
          node={node}
          isSelected={selectedNodeIds.has(node.id)}
          isConnected={highlightedNodeIds.has(node.id)}
          showLabel={
            selectedNodeIds.has(node.id) || 
            hoveredNodeId === node.id || 
            highlightedNodeIds.has(node.id)
          }
          onClick={(e) => handleNodeClick(node, e)}
          onHover={(hovering) => handleNodeHover(node.id, hovering)}
          globalTime={globalTime}
        />
      ))}

      <OrbitControls 
        enablePan 
        enableZoom 
        enableRotate 
        minDistance={20} 
        maxDistance={500}
        autoRotate={selectedNodeIds.size === 0}
        autoRotateSpeed={0.3}
      />
      
      {/* Fog for depth perception */}
      <fog attach="fog" args={['#0a0a0f', 150, 400]} />
    </>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export function Graph3DCore({ onNodeSelect, onAnalyzeConnection }: Graph3DCoreProps) {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGraph() {
      try {
        const res = await fetch('/api/graph?nodeLimit=500&connectionLimit=5000');
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const graphData = data.result?.data || data;
        const rawNodes = graphData.nodes || [];
        const rawEdges = graphData.edges || [];

        console.log('[GRAPH] Raw API data:', { nodes: rawNodes.length, edges: rawEdges.length });

        if (rawNodes.length === 0) throw new Error('No nodes returned from API');

        const maxConn = Math.max(...rawNodes.map((n: any) => n.connections || n.connectionCount || 1));

        const positionedNodes: NodeData[] = rawNodes.map((node: any, i: number) => {
          const phi = Math.acos(-1 + (2 * i) / rawNodes.length);
          const theta = Math.sqrt(rawNodes.length * Math.PI) * phi;
          const connCount = node.connections || node.connectionCount || 1;
          const connRatio = connCount / maxConn;
          const radius = 120 - connRatio * 80;

          const nodeName = node.label || node.name || 'Unknown';
          return {
            id: node.id,
            name: nodeName,
            label: nodeName, // Alias for page.tsx compatibility
            type: node.type || 'other',
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: radius * Math.sin(theta) * Math.sin(phi),
            z: radius * Math.cos(phi),
            size: Math.max(0.8, Math.min(connCount / 15, 6)),
            connectionCount: connCount,
            connections: connCount, // Alias for page.tsx compatibility
            documentCount: node.documentCount || node.document_count || 0,
          };
        });

        const mappedEdges: EdgeData[] = rawEdges.map((e: any) => ({
          source: e.from || e.source || e.entity_a_id,
          target: e.to || e.target || e.entity_b_id,
          weight: e.strength || e.weight || 1,
        }));

        console.log('[GRAPH] Final:', positionedNodes.length, 'nodes,', mappedEdges.length, 'edges');
        setNodes(positionedNodes);
        setEdges(mappedEdges);
        setLoading(false);
      } catch (err: any) {
        console.error('[GRAPH] Error:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    loadGraph();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-400 text-lg font-mono">Loading Intelligence Network...</p>
          <p className="text-gray-500 text-sm mt-2">33,824 entities • 1.3M connections</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center text-red-400">
          <p className="text-xl mb-2">Failed to load graph</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500/20 rounded">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 180], fov: 60 }} style={{ background: '#0a0a0f' }}>
        <GraphScene 
          nodes={nodes} 
          edges={edges} 
          onNodeSelect={onNodeSelect || (() => {})} 
          onAnalyzeConnection={onAnalyzeConnection || (() => {})}
        />
      </Canvas>

      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-4 py-2 rounded-lg border border-cyan-500/30 text-sm font-mono">
        <span className="text-cyan-400 font-bold">{nodes.length.toLocaleString()}</span>
        <span className="text-gray-400"> entities • </span>
        <span className="text-purple-400 font-bold">{edges.length.toLocaleString()}</span>
        <span className="text-gray-400"> connections</span>
      </div>

      <div className="absolute bottom-48 left-4 text-xs text-gray-500 bg-black/60 px-3 py-2 rounded">
        <span className="text-cyan-400">Click</span> select •
        <span className="text-green-400 ml-1">Ctrl+Click</span> multi-select •
        <span className="text-yellow-400 ml-1">Scroll</span> zoom •
        <span className="text-pink-400 ml-1">Drag</span> rotate
      </div>
    </div>
  );
}

export default Graph3DCore;