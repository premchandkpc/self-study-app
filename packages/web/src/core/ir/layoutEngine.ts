// Layout Engine - Automatic positioning for IR scenes
// Provides hierarchical, circular, force-directed, and grid layouts

import { IRScene, IRNode } from './schema';

export interface Position {
  x: number;
  y: number;
}

export type LayoutAlgorithm = 'hierarchical' | 'circular' | 'force' | 'grid';

interface LayoutResult {
  positions: Map<string, Position>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

// Hierarchical layout (for trees, DAGs)
function hierarchicalLayout(
  scene: IRScene,
  width: number = 800,
  height: number = 600
): LayoutResult {
  const padding = 60;
  const w = width - 2 * padding;
  const h = height - 2 * padding;

  const positions = new Map<string, Position>();

  // Find root nodes (no incoming edges)
  const roots = scene.nodes.filter(
    (n) => !scene.edges.some((e) => e.to === n.id)
  );

  if (roots.length === 0) {
    // Fallback: use first node as root
    roots.push(scene.nodes[0]);
  }

  // Calculate levels
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  function dfs(nodeId: string, level: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    levels.set(nodeId, Math.max(levels.get(nodeId) ?? 0, level));

    const outgoing = scene.edges.filter((e) => e.from === nodeId);
    outgoing.forEach((edge) => dfs(edge.to, level + 1));
  }

  roots.forEach((root, idx) => {
    levels.set(root.id, 0);
    dfs(root.id, 0);
  });

  // Group nodes by level
  const nodesByLevel = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
    nodesByLevel.get(level)!.push(nodeId);
  });

  // Position nodes
  let minX = padding;
  let maxX = padding;
  let minY = padding;
  let maxY = padding;

  const maxLevel = Math.max(...Array.from(levels.values()));

  nodesByLevel.forEach((nodeIds, level) => {
    const y = padding + (level / (maxLevel + 1)) * h;
    const count = nodeIds.length;
    const xSpacing = count > 1 ? w / (count - 1) : 0;

    nodeIds.forEach((nodeId, idx) => {
      const x = count === 1 ? padding + w / 2 : padding + idx * xSpacing;
      positions.set(nodeId, { x, y });

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
  });

  return { positions, bounds: { minX, maxX, minY, maxY } };
}

// Circular layout
function circularLayout(
  scene: IRScene,
  width: number = 800,
  height: number = 600
): LayoutResult {
  const positions = new Map<string, Position>();
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  scene.nodes.forEach((node, idx) => {
    const angle = (idx / scene.nodes.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    positions.set(node.id, { x, y });
  });

  return {
    positions,
    bounds: {
      minX: centerX - radius,
      maxX: centerX + radius,
      minY: centerY - radius,
      maxY: centerY + radius,
    },
  };
}

// Simple force-directed layout (approximation)
function forceDirectedLayout(
  scene: IRScene,
  width: number = 800,
  height: number = 600
): LayoutResult {
  const padding = 60;
  const positions = new Map<string, Position>();
  const velocity = new Map<string, { vx: number; vy: number }>();

  // Initialize random positions
  scene.nodes.forEach((node) => {
    positions.set(node.id, {
      x: padding + Math.random() * (width - 2 * padding),
      y: padding + Math.random() * (height - 2 * padding),
    });
    velocity.set(node.id, { vx: 0, vy: 0 });
  });

  const iterations = 50;
  const k = 50; // Ideal spring length
  const c = 0.1; // Damping

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();

    // Initialize forces
    scene.nodes.forEach((node) => {
      forces.set(node.id, { fx: 0, fy: 0 });
    });

    // Repulsive forces (node-node)
    for (let i = 0; i < scene.nodes.length; i++) {
      for (let j = i + 1; j < scene.nodes.length; j++) {
        const n1 = scene.nodes[i];
        const n2 = scene.nodes[j];
        const pos1 = positions.get(n1.id)!;
        const pos2 = positions.get(n2.id)!;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dist = Math.hypot(dx, dy) || 1;

        const force = 100 / (dist * dist);
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;

        const f1 = forces.get(n1.id)!;
        f1.fx -= fx;
        f1.fy -= fy;

        const f2 = forces.get(n2.id)!;
        f2.fx += fx;
        f2.fy += fy;
      }
    }

    // Attractive forces (edges)
    scene.edges.forEach((edge) => {
      const n1 = positions.get(edge.from);
      const n2 = positions.get(edge.to);

      if (!n1 || !n2) return;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.hypot(dx, dy) || 1;

      const force = ((dist - k) * 0.1) / dist;
      const fx = force * dx;
      const fy = force * dy;

      const f1 = forces.get(edge.from)!;
      f1.fx += fx;
      f1.fy += fy;

      const f2 = forces.get(edge.to)!;
      f2.fx -= fx;
      f2.fy -= fy;
    });

    // Update positions and velocity
    scene.nodes.forEach((node) => {
      const force = forces.get(node.id)!;
      const vel = velocity.get(node.id)!;
      const pos = positions.get(node.id)!;

      vel.vx = (vel.vx + force.fx * 0.01) * c;
      vel.vy = (vel.vy + force.fy * 0.01) * c;

      pos.x = Math.max(padding, Math.min(width - padding, pos.x + vel.vx));
      pos.y = Math.max(padding, Math.min(height - padding, pos.y + vel.vy));
    });
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  });

  return { positions, bounds: { minX, maxX, minY, maxY } };
}

// Grid layout
function gridLayout(
  scene: IRScene,
  width: number = 800,
  height: number = 600
): LayoutResult {
  const padding = 60;
  const w = width - 2 * padding;
  const h = height - 2 * padding;

  const cols = Math.ceil(Math.sqrt(scene.nodes.length));
  const rows = Math.ceil(scene.nodes.length / cols);

  const cellWidth = cols > 0 ? w / cols : 0;
  const cellHeight = rows > 0 ? h / rows : 0;

  const positions = new Map<string, Position>();

  scene.nodes.forEach((node, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    const x = padding + col * cellWidth + cellWidth / 2;
    const y = padding + row * cellHeight + cellHeight / 2;

    positions.set(node.id, { x, y });
  });

  return {
    positions,
    bounds: {
      minX: padding,
      maxX: padding + w,
      minY: padding,
      maxY: padding + h,
    },
  };
}

export function computeLayout(
  scene: IRScene,
  algorithm: LayoutAlgorithm = 'hierarchical',
  width: number = 800,
  height: number = 600
): LayoutResult {
  switch (algorithm) {
    case 'circular':
      return circularLayout(scene, width, height);
    case 'force':
      return forceDirectedLayout(scene, width, height);
    case 'grid':
      return gridLayout(scene, width, height);
    case 'hierarchical':
    default:
      return hierarchicalLayout(scene, width, height);
  }
}

// Normalize positions to fit within bounds with padding
export function normalizePositions(
  positions: Map<string, Position>,
  targetWidth: number = 400,
  targetHeight: number = 300,
  padding: number = 20
): Map<string, Position> {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  });

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  const scaleX = (targetWidth - 2 * padding) / width;
  const scaleY = (targetHeight - 2 * padding) / height;
  const scale = Math.min(scaleX, scaleY);

  const normalized = new Map<string, Position>();

  positions.forEach((pos, nodeId) => {
    normalized.set(nodeId, {
      x: padding + (pos.x - minX) * scale,
      y: padding + (pos.y - minY) * scale,
    });
  });

  return normalized;
}
