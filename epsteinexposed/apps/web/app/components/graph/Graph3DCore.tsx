'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import { useEffect, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { ConnectionEvidencePanel } from '../evidence/ConnectionEvidencePanel';
import { PDFViewer } from '../evidence/PDFViewer';

interface Node {
  id: string;
  position: [number, number, number];
  label: string;
  type: string;
  occurrences?: number;
  documentCount?: number;
}

interface Edge {
  from: string;
  to: string;
  strength: number;
}

interface NodeDetails {
  id: string;
  name: string;
  type: string;
  occurrences: number;
  documentIds: string[];
  context?: string;
  connections?: Array<{ name: string; id: string; strength: number; documents: number }>;
}

function GraphNode({ node, onClick, isSelected, isHovered, onHover }: {
  node: Node;
  onClick: (node: Node) => void;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (node: Node | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isSelected ? 1.8 : isHovered ? 1.4 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });
  
  const color = useMemo(() => {
    switch (node.type) {
      case 'person': return '#F59E0B';
      case 'location': return '#3B82F6';
      case 'flight': return '#EF4444';
      case 'organization': return '#10B981';
      default: return '#8B5CF6';
    }
  }, [node.type]);
  
  const size = useMemo(() => {
    const base = 0.2;
    const occurrenceBonus = Math.min((node.occurrences || 1) / 100, 0.3);
    return base + occurrenceBonus;
  }, [node.occurrences]);
  
  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(node); }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover(node); }}
        onPointerLeave={() => onHover(null)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={isSelected ? 1 : 0.85} />
      </mesh>
      
      {(isHovered || isSelected) && (
        <Text
          position={[0, size + 0.3, 0]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label}
        </Text>
      )}
    </group>
  );
}

function ConnectionLine({ edge, nodes }: { edge: Edge; nodes: Node[] }) {
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);
  
  const lineGeometry = useMemo(() => {
    if (!fromNode || !toNode) return null;
    const points = [
      new THREE.Vector3(...fromNode.position),
      new THREE.Vector3(...toNode.position),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [fromNode, toNode]);
  
  if (!lineGeometry) return null;
  
  const opacity = Math.min(0.1 + edge.strength * 0.05, 0.5);
  
  return (
    <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: '#F59E0B', transparent: true, opacity }))} />
  );
}

export function Graph3DCore() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [nodeDetails, setNodeDetails] = useState<NodeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Evidence panel states
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [showConnectionEvidence, setShowConnectionEvidence] = useState(false);
  const [connectionData, setConnectionData] = useState<{ entity1: string; entity2: string; strength: number } | null>(null);
  const [viewingPDF, setViewingPDF] = useState<{ id: string; filename: string; entities: string[] } | null>(null);
  
  useEffect(() => {
    const fetchGraph = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3001/trpc/graph.getGraph?input={}');
        const data = await response.json();
        
        if (data.result?.data) {
          setNodes(data.result.data.nodes);
          setEdges(data.result.data.edges);
          setError(null);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Failed to load graph:', err);
        setError('Failed to connect to API. Make sure the API server is running on port 3001.');
        
        // Fallback to mock data
        const mockNodes: Node[] = Array.from({ length: 50 }, (_, i) => ({
          id: `node-${i}`,
          position: [
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
          ],
          label: `Entity ${i}`,
          type: i % 3 === 0 ? 'location' : 'person',
          occurrences: Math.floor(Math.random() * 50) + 1,
        }));
        setNodes(mockNodes);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGraph();
  }, []);
  
  const handleNodeClick = async (node: Node) => {
    setSelectedNode(node);
    
    try {
      const response = await fetch(
        `http://localhost:3001/trpc/graph.getNodeDetails?input=${encodeURIComponent(JSON.stringify({ nodeId: node.id }))}`
      );
      const data = await response.json();
      
      if (data.result?.data) {
        setNodeDetails(data.result.data);
      }
    } catch (err) {
      console.error('Failed to load node details:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-amber-500 text-xl animate-pulse">Loading entity network...</div>
          <div className="text-gray-500 text-sm mt-2">Connecting to 96,322 extracted entities</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-full relative bg-black">
      <Canvas
        camera={{ position: [0, 0, 25], fov: 75 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        dpr={1}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        
        <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />
        
        {edges.map((edge, i) => (
          <ConnectionLine key={i} edge={edge} nodes={nodes} />
        ))}
        
        {nodes.map(node => (
          <GraphNode
            key={node.id}
            node={node}
            onClick={handleNodeClick}
            isSelected={selectedNode?.id === node.id}
            isHovered={hoveredNode?.id === node.id}
            onHover={setHoveredNode}
          />
        ))}
        
        <OrbitControls enableDamping dampingFactor={0.05} maxDistance={50} minDistance={5} />
      </Canvas>
      
      {/* Header */}
      <div className="absolute top-8 left-8 text-white z-10">
        <h1 className="text-4xl font-bold mb-2">Epstein Files</h1>
        <p className="text-sm text-gray-400">Autonomous Investigation Interface</p>
        <div className="mt-2 text-xs text-green-400">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
          {nodes.length} entities loaded • Click to explore connections
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-8 left-8 text-white z-10 bg-black/80 rounded-lg p-4">
        <div className="text-xs font-semibold mb-2">ENTITY TYPES</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Person</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Flight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Organization</span>
          </div>
        </div>
      </div>
      
      {/* Selected Node Details Panel */}
      {selectedNode && (
        <div className="absolute bottom-8 right-8 w-96 bg-black/95 border border-gray-800 rounded-lg p-4 z-10 max-h-[60vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-white font-bold text-lg">{selectedNode.label}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${
                selectedNode.type === 'person' ? 'bg-amber-500/20 text-amber-400' :
                selectedNode.type === 'location' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {selectedNode.type}
              </span>
            </div>
            <button 
              onClick={() => { setSelectedNode(null); setNodeDetails(null); }}
              className="text-gray-500 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {nodeDetails ? (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500">Mentions</div>
                  <div className="text-xl font-bold text-white">{nodeDetails.occurrences}</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500">Documents</div>
                  <div className="text-xl font-bold text-white">{nodeDetails.documentIds?.length || 0}</div>
                </div>
              </div>
              
              {nodeDetails.context && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-1">Context</div>
                  <div className="text-sm text-gray-300">{nodeDetails.context}</div>
                </div>
              )}
              
              {nodeDetails.connections && nodeDetails.connections.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-2">Connected Entities ({nodeDetails.connections.length})</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {nodeDetails.connections.slice(0, 10).map((conn, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between bg-gray-900/50 rounded px-2 py-1 text-sm cursor-pointer hover:bg-gray-800"
                        onClick={() => {
                          const connNode = nodes.find(n => n.id === conn.id);
                          if (connNode) handleNodeClick(connNode);
                        }}
                      >
                        <span className="text-gray-300 truncate">{conn.name}</span>
                        <span className="text-xs text-amber-500">{conn.strength} docs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => setShowEvidencePanel(true)}
                className="w-full mt-4 bg-amber-500/20 text-amber-400 py-2 rounded text-sm hover:bg-amber-500/30 transition"
              >
                View Source Documents ({nodeDetails.documentIds?.length || 0})
              </button>
              
              {nodeDetails.connections && nodeDetails.connections.length > 0 && nodeDetails.connections[0] && (
                <button 
                  onClick={() => {
                    const topConn = nodeDetails.connections?.[0];
                    if (topConn) {
                      setConnectionData({
                        entity1: selectedNode.label,
                        entity2: topConn.name,
                        strength: topConn.strength,
                      });
                      setShowConnectionEvidence(true);
                    }
                  }}
                  className="w-full mt-2 bg-gray-800 text-gray-300 py-2 rounded text-sm hover:bg-gray-700 transition"
                >
                  View Connection Evidence
                </button>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-sm animate-pulse">Loading details...</div>
          )}
        </div>
      )}
      
      {/* Evidence Panel - Shows all documents for selected entity */}
      {showEvidencePanel && selectedNode && (
        <EvidencePanel
          entityName={selectedNode.label}
          entityType={selectedNode.type}
          onClose={() => setShowEvidencePanel(false)}
          onViewDocument={(doc) => {
            setViewingPDF({
              id: doc.id,
              filename: doc.filename,
              entities: [selectedNode.label],
            });
            setShowEvidencePanel(false);
          }}
        />
      )}
      
      {/* Connection Evidence Panel - Shows documents proving a connection */}
      {showConnectionEvidence && connectionData && (
        <ConnectionEvidencePanel
          entity1={connectionData.entity1}
          entity2={connectionData.entity2}
          connectionStrength={connectionData.strength}
          onClose={() => setShowConnectionEvidence(false)}
          onViewDocument={(doc) => {
            setViewingPDF({
              id: doc.id,
              filename: doc.filename,
              entities: [connectionData.entity1, connectionData.entity2],
            });
            setShowConnectionEvidence(false);
          }}
        />
      )}
      
      {/* PDF Viewer */}
      {viewingPDF && (
        <PDFViewer
          documentId={viewingPDF.id}
          filename={viewingPDF.filename}
          highlightEntities={viewingPDF.entities}
          onClose={() => setViewingPDF(null)}
        />
      )}
    </div>
  );
}
