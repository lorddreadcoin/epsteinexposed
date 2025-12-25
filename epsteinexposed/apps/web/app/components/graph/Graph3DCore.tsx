'use client';

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================================
// TYPES
// =============================================================================

interface NodeData {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  size: number;
  connectionCount: number;
  documentCount: number;
}

interface EdgeData {
  source: string;
  target: string;
  weight: number;
}

interface Graph3DCoreProps {
  onNodeSelect?: (node: NodeData | null) => void;
  onAnalyzeConnection?: (entities: string[]) => void;
}

// =============================================================================
// CLEAN COLOR PALETTE
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
// SINGLE NODE COMPONENT - Clean sphere
// =============================================================================

function GraphNode({
  node,
  isSelected,
  isHighlighted,
  showLabel,
  onClick,
}: {
  node: NodeData;
  isSelected: boolean;
  isHighlighted: boolean;
  showLabel: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = ENTITY_COLORS[node.type] || ENTITY_COLORS.other;

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh ref={meshRef} onClick={onClick}>
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshStandardMaterial
          color={isSelected ? '#FFFFFF' : color}
          emissive={isHighlighted ? color : '#000000'}
          emissiveIntensity={isHighlighted ? 0.3 : 0}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {showLabel && (
        <Html position={[0, node.size + 1.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap text-center">
            <div
              className="px-2 py-1 rounded text-white font-bold shadow-lg"
              style={{
                backgroundColor: 'rgba(0,0,0,0.9)',
                fontSize: isSelected ? '14px' : '11px',
                border: `2px solid ${color}`,
              }}
            >
              {node.name}
            </div>
            <div
              className="text-xs mt-1 px-1 rounded"
              style={{ color: color, backgroundColor: 'rgba(0,0,0,0.8)', fontSize: '10px' }}
            >
              {node.documentCount} docs • {node.connectionCount} links
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
}: {
  nodes: NodeData[];
  edges: EdgeData[];
  onNodeSelect: (node: NodeData | null) => void;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const highlightedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    edges.forEach((e) => {
      if (e.source === selectedNodeId) connected.add(e.target);
      if (e.target === selectedNodeId) connected.add(e.source);
    });
    return connected;
  }, [selectedNodeId, edges]);

  const topNodeIds = useMemo(() => {
    return new Set(
      [...nodes]
        .sort((a, b) => b.connectionCount - a.connectionCount)
        .slice(0, 50)
        .map((n) => n.id)
    );
  }, [nodes]);

  const handleNodeClick = useCallback(
    (node: NodeData) => {
      const newSelected = selectedNodeId === node.id ? null : node.id;
      setSelectedNodeId(newSelected);
      onNodeSelect(newSelected ? node : null);
    },
    [selectedNodeId, onNodeSelect]
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[100, 100, 100]} intensity={0.8} />
      <pointLight position={[-100, -100, -100]} intensity={0.4} />

      {edges.map((edge, i) => (
        <ConnectionLine
          key={`${edge.source}-${edge.target}-${i}`}
          edge={edge}
          nodeMap={nodeMap}
          isHighlighted={
            selectedNodeId === edge.source ||
            selectedNodeId === edge.target ||
            highlightedNodeIds.has(edge.source) ||
            highlightedNodeIds.has(edge.target)
          }
        />
      ))}

      {nodes.map((node) => (
        <GraphNode
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          isHighlighted={highlightedNodeIds.has(node.id)}
          showLabel={
            topNodeIds.has(node.id) || selectedNodeId === node.id || highlightedNodeIds.has(node.id)
          }
          onClick={() => handleNodeClick(node)}
        />
      ))}

      <OrbitControls enablePan enableZoom enableRotate minDistance={20} maxDistance={500} />
    </>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export function Graph3DCore({ onNodeSelect }: Graph3DCoreProps) {
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

          return {
            id: node.id,
            name: node.label || node.name || 'Unknown',
            type: node.type || 'other',
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: radius * Math.sin(theta) * Math.sin(phi),
            z: radius * Math.cos(phi),
            size: Math.max(0.8, Math.min(connCount / 15, 6)),
            connectionCount: connCount,
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
        <GraphScene nodes={nodes} edges={edges} onNodeSelect={onNodeSelect || (() => {})} />
      </Canvas>

      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-4 py-2 rounded-lg border border-cyan-500/30 text-sm font-mono">
        <span className="text-cyan-400 font-bold">{nodes.length.toLocaleString()}</span>
        <span className="text-gray-400"> entities • </span>
        <span className="text-purple-400 font-bold">{edges.length.toLocaleString()}</span>
        <span className="text-gray-400"> connections</span>
      </div>

      <div className="absolute bottom-48 left-4 text-xs text-gray-500 bg-black/60 px-3 py-2 rounded">
        <span className="text-cyan-400">Click</span> node to select •
        <span className="text-yellow-400 ml-1">Scroll</span> to zoom •
        <span className="text-pink-400 ml-1">Drag</span> to rotate
      </div>
    </div>
  );
}

export default Graph3DCore;