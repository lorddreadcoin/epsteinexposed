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
  connectedEntities?: string[];
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
// LOCALSTORAGE CACHING FOR INSTANT SUBSEQUENT LOADS
// =============================================================================

const CACHE_KEY = 'epstein_graph_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CachedGraphData {
  nodes: NodeData[];
  edges: EdgeData[];
  timestamp: number;
  offset: number;
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
  const baseSize = (node.size || 1) * 2.5; // 2.5x larger nodes for better visibility

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
        <Html position={[0, baseSize + 2, 0]} center style={{ pointerEvents: 'none', zIndex: 1 }}>
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
              zIndex: 1,
            }}
          >
            {isSelected && (
              <div className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5">
                ✓ Selected
              </div>
            )}
            {node.name}
            <div className="text-[10px] opacity-80 font-normal mt-0.5">
              {node.documentCount} docs · {node.connectionCount} links
            </div>
          </div>
        </Html>
      )}
      
      {/* SELECTED INDICATOR - Always visible when selected */}
      {isSelected && !showLabel && (
        <Html position={[0, baseSize + 1.5, 0]} center style={{ pointerEvents: 'none', zIndex: 1 }}>
          <div 
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(0,255,255,0.9)',
              color: '#000',
              boxShadow: '0 0 15px rgba(0,255,255,0.5)',
              zIndex: 1,
            }}
          >
            ✓ Selected
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
        
        // Update single node select for sidebar - include connected entity names
        if (newSet.size === 1) {
          const singleId = Array.from(newSet)[0] as string;
          const selectedNode = nodeMap.get(singleId);
          if (selectedNode) {
            // Find all entities connected to this node
            const connectedEntityNames: string[] = [];
            edges.forEach(edge => {
              if (edge.source === singleId) {
                const targetNode = nodeMap.get(edge.target);
                if (targetNode) connectedEntityNames.push(targetNode.name);
              } else if (edge.target === singleId) {
                const sourceNode = nodeMap.get(edge.source);
                if (sourceNode) connectedEntityNames.push(sourceNode.name);
              }
            });
            // Pass node with connected entities
            onNodeSelect({
              ...selectedNode,
              connectedEntities: connectedEntityNames
            });
          } else {
            onNodeSelect(null);
          }
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

function getCachedGraph(offset: number): CachedGraphData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_${offset}`);
    if (!cached) return null;
    const data: CachedGraphData = JSON.parse(cached);
    // Check if cache is still valid
    if (Date.now() - data.timestamp < CACHE_EXPIRY) {
      console.log('[GRAPH] Using cached data, age:', Math.round((Date.now() - data.timestamp) / 1000), 'seconds');
      return data;
    }
    // Cache expired, remove it
    localStorage.removeItem(`${CACHE_KEY}_${offset}`);
    return null;
  } catch {
    return null;
  }
}

function setCachedGraph(nodes: NodeData[], edges: EdgeData[], offset: number): void {
  if (typeof window === 'undefined') return;
  try {
    const data: CachedGraphData = { nodes, edges, timestamp: Date.now(), offset };
    localStorage.setItem(`${CACHE_KEY}_${offset}`, JSON.stringify(data));
    console.log('[GRAPH] Cached', nodes.length, 'nodes,', edges.length, 'edges');
  } catch (e) {
    // localStorage might be full, clear old caches
    console.warn('[GRAPH] Cache write failed, clearing old caches');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY)) {
        localStorage.removeItem(key);
      }
    }
  }
}

export function Graph3DCore({ onNodeSelect, onAnalyzeConnection }: Graph3DCoreProps) {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphOffset, setGraphOffset] = useState(0);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    async function loadGraph() {
      // Try to load from cache first for instant display
      const cached = getCachedGraph(graphOffset);
      if (cached) {
        setNodes(cached.nodes);
        setEdges(cached.edges);
        setLoading(false);
        setFromCache(true);
        // Still fetch fresh data in background
        fetchFreshData(graphOffset, true);
        return;
      }
      
      await fetchFreshData(graphOffset, false);
    }
    
    async function fetchFreshData(offset: number, isBackgroundRefresh: boolean) {
      if (!isBackgroundRefresh) setLoading(true);
      
      try {
        // Request 2000 nodes and 8000 connections for a DENSE, impressive graph
        const res = await fetch(`/api/graph?nodeLimit=2000&connectionLimit=8000&offset=${offset}`);
        
        if (!res.ok) {
          console.error('[GRAPH] API returned status:', res.status);
          setError(`API error: ${res.status}`);
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        
        console.log('[GRAPH] Raw API response:', data);
        
        // Check for error in response
        if (data.error) {
          console.error('[GRAPH] API error:', data.error);
          setError(data.error);
          setLoading(false);
          return;
        }
        
        const rawNodes = data.nodes || data.result?.data?.nodes || [];
        const rawEdges = data.edges || data.result?.data?.edges || [];
        
        if (rawNodes.length === 0) {
          console.error('[GRAPH] No nodes in response');
          setError('No nodes returned from API');
          setLoading(false);
          return;
        }

        console.log('[GRAPH] Received:', rawNodes.length, 'nodes,', rawEdges.length, 'edges');

        // SIMPLE SPHERE POSITIONING (more reliable)
        const maxConn = Math.max(...rawNodes.map((n: any) => n.connectionCount || n.connections || 1));
        
        const positionedNodes: NodeData[] = rawNodes.map((node: any, i: number) => {
          const total = rawNodes.length;
          const phi = Math.acos(-1 + (2 * i + 1) / total);
          const theta = Math.sqrt(total * Math.PI) * phi;
          
          const connCount = node.connectionCount || node.connections || 1;
          const connRatio = connCount / maxConn;
          const radius = 80 + (1 - connRatio) * 40; // More connected = closer to center
          
          const nodeName = node.label || node.name || 'Unknown';
          
          return {
            id: node.id,
            name: nodeName,
            label: nodeName,
            type: node.type || 'other',
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: radius * Math.sin(theta) * Math.sin(phi),
            z: radius * Math.cos(phi),
            size: Math.max(0.5, Math.min(connRatio * 4 + 0.5, 3)),
            connectionCount: connCount,
            connections: connCount,
            documentCount: node.documentCount || node.document_count || 0,
          };
        });

        const mappedEdges: EdgeData[] = rawEdges.map((e: any) => ({
          source: e.from || e.source || e.entity_a_id,
          target: e.to || e.target || e.entity_b_id,
          weight: e.strength || e.weight || 1,
        }));

        console.log('[GRAPH] Positioned:', positionedNodes.length, 'nodes,', mappedEdges.length, 'edges');
        setNodes(positionedNodes);
        setEdges(mappedEdges);
        setLoading(false);
        setFromCache(false);
        
        // Cache the data for instant subsequent loads
        setCachedGraph(positionedNodes, mappedEdges, offset);
      } catch (err: any) {
        console.error('[GRAPH] Load error:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    loadGraph();
  }, [graphOffset]);

  // Refresh with new offset to get different entities
  const handleRefreshGraph = () => {
    setLoading(true);
    // Cycle through different offsets (0, 100, 200, 300, 400, then back to 0)
    setGraphOffset(prev => (prev + 100) % 500);
  };

  // Load more entities (add to existing) - fetch DIFFERENT entities using exclude list
  const handleLoadMore = async () => {
    try {
      // Get IDs of entities we already have to exclude them
      const currentIds = nodes.map(n => n.id);
      const excludeParam = currentIds.slice(0, 100).join(','); // Limit to avoid URL too long
      const newOffset = graphOffset + nodes.length;
      
      const res = await fetch(`/api/graph?nodeLimit=200&connectionLimit=600&offset=${newOffset}&exclude=${excludeParam}`);
      if (!res.ok) return;
      
      const data = await res.json();
      const rawNodes = data.nodes || [];
      const rawEdges = data.edges || [];
      
      if (rawNodes.length === 0) return;
      
      // Get existing node IDs to avoid duplicates
      const existingIds = new Set(currentIds);
      
      const maxConn = Math.max(...rawNodes.map((n: any) => n.connectionCount || n.connections || 1));
      const newNodes: NodeData[] = rawNodes
        .filter((node: any) => !existingIds.has(node.id))
        .map((node: any, i: number) => {
          const total = rawNodes.length;
          const phi = Math.acos(-1 + (2 * i + 1) / total);
          const theta = Math.sqrt(total * Math.PI) * phi;
          const connCount = node.connectionCount || node.connections || 1;
          const connRatio = connCount / maxConn;
          const radius = 100 + (1 - connRatio) * 50;
          const nodeName = node.label || node.name || 'Unknown';
          
          return {
            id: node.id,
            name: nodeName,
            label: nodeName,
            type: node.type || 'other',
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: radius * Math.sin(theta) * Math.sin(phi),
            z: radius * Math.cos(phi),
            size: Math.max(0.5, Math.min(connRatio * 4 + 0.5, 3)),
            connectionCount: connCount,
            connections: connCount,
            documentCount: node.documentCount || node.document_count || 0,
          };
        });
      
      // Filter edges to only include nodes we have
      const allNodeIds = new Set([...existingIds, ...newNodes.map(n => n.id)]);
      const newEdges: EdgeData[] = rawEdges
        .filter((e: any) => {
          const source = e.from || e.source || e.entity_a_id;
          const target = e.to || e.target || e.entity_b_id;
          return allNodeIds.has(source) && allNodeIds.has(target);
        })
        .map((e: any) => ({
          source: e.from || e.source || e.entity_a_id,
          target: e.to || e.target || e.entity_b_id,
          weight: e.strength || e.weight || 1,
        }));
      
      // Merge with existing
      setNodes(prev => [...prev, ...newNodes]);
      setEdges(prev => {
        const existingEdgeKeys = new Set(prev.map(e => `${e.source}-${e.target}`));
        const uniqueNewEdges = newEdges.filter(e => !existingEdgeKeys.has(`${e.source}-${e.target}`));
        return [...prev, ...uniqueNewEdges];
      });
      setGraphOffset(newOffset);
      
      console.log('[GRAPH] Loaded more:', newNodes.length, 'nodes,', newEdges.length, 'edges');
    } catch (err) {
      console.error('[GRAPH] Load more error:', err);
    }
  };

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

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="bg-black/80 backdrop-blur px-4 py-2 rounded-lg border border-cyan-500/30 text-sm font-mono">
          <span className="text-cyan-400 font-bold">{nodes.length.toLocaleString()}</span>
          <span className="text-gray-400"> entities • </span>
          <span className="text-purple-400 font-bold">{edges.length.toLocaleString()}</span>
          <span className="text-gray-400"> connections</span>
        </div>
        <button
          onClick={handleLoadMore}
          className="bg-black/80 backdrop-blur px-3 py-2 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400 transition-all text-sm font-mono flex items-center gap-2"
          title="Add more entities to the graph"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Load More</span>
        </button>
        <button
          onClick={handleRefreshGraph}
          className="bg-black/80 backdrop-blur px-3 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all text-sm font-mono flex items-center gap-2"
          title="Load different entities"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Command Center - How to Use - Mobile Responsive */}
      <div className="absolute bottom-96 left-4 right-4 md:right-auto bg-black/90 backdrop-blur border border-cyan-500/30 rounded-lg p-3 md:p-4 max-w-sm">
        <div className="flex items-center gap-2 mb-2 md:mb-3 pb-2 border-b border-cyan-500/20">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-cyan-400 font-bold text-xs md:text-sm font-mono">COMMAND CENTER</h3>
        </div>
        
        <div className="space-y-1.5 md:space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-cyan-400 font-bold flex-shrink-0">1.</span>
            <div>
              <span className="text-white font-semibold">Tap any node</span>
              <span className="text-gray-400 hidden sm:inline"> to view entity details & documents</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-green-400 font-bold flex-shrink-0">2.</span>
            <div>
              <span className="text-white font-semibold hidden sm:inline">Ctrl+Click multiple</span>
              <span className="text-white font-semibold sm:hidden">Tap multiple</span>
              <span className="text-gray-400 hidden sm:inline"> then hit &quot;Investigate&quot; to analyze connections</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 font-bold flex-shrink-0">3.</span>
            <div>
              <span className="text-white font-semibold">Use Search</span>
              <span className="text-gray-400 hidden sm:inline"> (Ctrl+K) to find specific people, places, or organizations</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-purple-400 font-bold flex-shrink-0">4.</span>
            <div>
              <span className="text-white font-semibold">Load More</span>
              <span className="text-gray-400 hidden sm:inline"> (top right) to expand the network</span>
            </div>
          </div>
        </div>

        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-cyan-500/20 text-xs">
          <div className="text-gray-500">
            <span className="text-cyan-400">Pinch</span> zoom •
            <span className="text-pink-400 ml-1">Drag</span> rotate
          </div>
        </div>
      </div>
    </div>
  );
}

export default Graph3DCore;