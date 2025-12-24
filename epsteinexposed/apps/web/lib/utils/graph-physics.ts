import type { Entity, Connection } from '../types';

// Force-directed graph physics for organic node movement
export interface PhysicsConfig {
  repulsionStrength: number;
  attractionStrength: number;
  centerGravity: number;
  damping: number;
  maxVelocity: number;
}

export const DEFAULT_PHYSICS: PhysicsConfig = {
  repulsionStrength: 50,
  attractionStrength: 0.01,
  centerGravity: 0.001,
  damping: 0.95,
  maxVelocity: 2,
};

interface NodePhysics {
  velocity: [number, number, number];
  force: [number, number, number];
}

const nodePhysics = new Map<string, NodePhysics>();

export function initializeNodePhysics(nodeId: string): NodePhysics {
  const physics: NodePhysics = {
    velocity: [0, 0, 0],
    force: [0, 0, 0],
  };
  nodePhysics.set(nodeId, physics);
  return physics;
}

export function getNodePhysics(nodeId: string): NodePhysics {
  return nodePhysics.get(nodeId) || initializeNodePhysics(nodeId);
}

// Calculate repulsion between nodes (Coulomb's law)
function calculateRepulsion(
  pos1: [number, number, number],
  pos2: [number, number, number],
  strength: number
): [number, number, number] {
  const dx = pos1[0] - pos2[0];
  const dy = pos1[1] - pos2[1];
  const dz = pos1[2] - pos2[2];
  
  const distSq = dx * dx + dy * dy + dz * dz;
  const dist = Math.sqrt(distSq) || 0.1;
  
  // Prevent extreme forces at very close distances
  const minDist = 1;
  const effectiveDist = Math.max(dist, minDist);
  
  const force = strength / (effectiveDist * effectiveDist);
  
  return [
    (dx / dist) * force,
    (dy / dist) * force,
    (dz / dist) * force,
  ];
}

// Calculate attraction along edges (Hooke's law)
function calculateAttraction(
  pos1: [number, number, number],
  pos2: [number, number, number],
  strength: number,
  connectionStrength: number
): [number, number, number] {
  const dx = pos2[0] - pos1[0];
  const dy = pos2[1] - pos1[1];
  const dz = pos2[2] - pos1[2];
  
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
  const force = strength * dist * connectionStrength;
  
  return [
    (dx / dist) * force,
    (dy / dist) * force,
    (dz / dist) * force,
  ];
}

// Calculate gravity toward center
function calculateCenterGravity(
  pos: [number, number, number],
  strength: number
): [number, number, number] {
  return [
    -pos[0] * strength,
    -pos[1] * strength,
    -pos[2] * strength,
  ];
}

// Main physics simulation step
export function simulatePhysics(
  nodes: Entity[],
  connections: Connection[],
  config: PhysicsConfig = DEFAULT_PHYSICS
): Map<string, [number, number, number]> {
  const newPositions = new Map<string, [number, number, number]>();
  
  // Reset forces
  nodes.forEach(node => {
    const physics = getNodePhysics(node.id);
    physics.force = [0, 0, 0];
  });
  
  // Calculate repulsion forces between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i]!;
      const node2 = nodes[j]!;
      
      const repulsion = calculateRepulsion(
        node1.position,
        node2.position,
        config.repulsionStrength
      );
      
      const physics1 = getNodePhysics(node1.id);
      const physics2 = getNodePhysics(node2.id);
      
      physics1.force[0] += repulsion[0];
      physics1.force[1] += repulsion[1];
      physics1.force[2] += repulsion[2];
      
      physics2.force[0] -= repulsion[0];
      physics2.force[1] -= repulsion[1];
      physics2.force[2] -= repulsion[2];
    }
  }
  
  // Calculate attraction forces along connections
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  connections.forEach(conn => {
    const source = nodeMap.get(conn.sourceId);
    const target = nodeMap.get(conn.targetId);
    
    if (!source || !target) return;
    
    const attraction = calculateAttraction(
      source.position,
      target.position,
      config.attractionStrength,
      conn.strength
    );
    
    const sourcePhysics = getNodePhysics(source.id);
    const targetPhysics = getNodePhysics(target.id);
    
    sourcePhysics.force[0] += attraction[0];
    sourcePhysics.force[1] += attraction[1];
    sourcePhysics.force[2] += attraction[2];
    
    targetPhysics.force[0] -= attraction[0];
    targetPhysics.force[1] -= attraction[1];
    targetPhysics.force[2] -= attraction[2];
  });
  
  // Apply center gravity and update positions
  nodes.forEach(node => {
    const physics = getNodePhysics(node.id);
    
    // Add center gravity
    const gravity = calculateCenterGravity(node.position, config.centerGravity);
    physics.force[0] += gravity[0];
    physics.force[1] += gravity[1];
    physics.force[2] += gravity[2];
    
    // Update velocity with damping
    physics.velocity[0] = (physics.velocity[0] + physics.force[0]) * config.damping;
    physics.velocity[1] = (physics.velocity[1] + physics.force[1]) * config.damping;
    physics.velocity[2] = (physics.velocity[2] + physics.force[2]) * config.damping;
    
    // Clamp velocity
    const speed = Math.sqrt(
      physics.velocity[0] ** 2 +
      physics.velocity[1] ** 2 +
      physics.velocity[2] ** 2
    );
    
    if (speed > config.maxVelocity) {
      const scale = config.maxVelocity / speed;
      physics.velocity[0] *= scale;
      physics.velocity[1] *= scale;
      physics.velocity[2] *= scale;
    }
    
    // Calculate new position
    const newPos: [number, number, number] = [
      node.position[0] + physics.velocity[0],
      node.position[1] + physics.velocity[1],
      node.position[2] + physics.velocity[2],
    ];
    
    newPositions.set(node.id, newPos);
  });
  
  return newPositions;
}

// Generate initial positions using spherical distribution
export function generateInitialPositions(
  count: number,
  radius: number = 10
): [number, number, number][] {
  const positions: [number, number, number][] = [];
  
  // Golden spiral distribution for even spacing
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const angleIncrement = Math.PI * 2 * goldenRatio;
  
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = angleIncrement * i;
    
    const r = radius * (0.5 + Math.random() * 0.5); // Add some randomness
    
    positions.push([
      r * Math.sin(inclination) * Math.cos(azimuth),
      r * Math.sin(inclination) * Math.sin(azimuth),
      r * Math.cos(inclination),
    ]);
  }
  
  return positions;
}

// Get color for entity type
export function getEntityColor(type: string): string {
  const colors: Record<string, string> = {
    person: '#F59E0B',
    location: '#3B82F6',
    event: '#EF4444',
    document: '#10B981',
    flight: '#8B5CF6',
    transaction: '#EC4899',
  };
  return colors[type] || '#6B7280';
}

// Calculate node size based on importance/connections
export function calculateNodeSize(
  node: Entity,
  connectionCount: number
): number {
  const baseSize = 0.3;
  const strengthBonus = node.strength * 0.3;
  const connectionBonus = Math.min(connectionCount * 0.05, 0.4);
  
  return baseSize + strengthBonus + connectionBonus;
}
