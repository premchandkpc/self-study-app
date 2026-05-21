// Content Compiler Optimizer - Validation, indexing, precomputation
// Second pass: optimizes compiled IR for production

import { IRLearningUnit, IRScene, IRNode, IREdge } from './schema';

export interface CompileReport {
  valid: boolean;
  errors: CompileError[];
  warnings: CompileWarning[];
  stats: {
    nodes: number;
    edges: number;
    scenes: number;
    cyclicDependencies: number;
    unreachableNodes: number;
    orphanedEdges: number;
  };
  index: SearchIndex;
  layouts: PrecomputedLayouts;
}

export interface CompileError {
  type: string;
  message: string;
  sceneId?: string;
  nodeId?: string;
}

export interface CompileWarning {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SearchIndex {
  byTitle: Map<string, IRScene[]>;
  byType: Map<string, IRScene[]>;
  byNode: Map<string, IRNode[]>;
  fullText: Map<string, IRScene[]>;
}

export interface PrecomputedLayouts {
  [sceneId: string]: {
    algorithm: string;
    nodes: Map<string, { x: number; y: number }>;
    edges: Map<string, { points: number[][] }>;
  };
}

export class ContentCompilerOptimizer {
  // Validate IR structure
  validate(unit: IRLearningUnit): CompileReport {
    const errors: CompileError[] = [];
    const warnings: CompileWarning[] = [];
    const stats = {
      nodes: 0,
      edges: 0,
      scenes: 0,
      cyclicDependencies: 0,
      unreachableNodes: 0,
      orphanedEdges: 0,
    };

    // Basic structure validation
    if (!unit.id || !unit.title) {
      errors.push({
        type: 'MISSING_METADATA',
        message: 'Learning unit missing id or title',
      });
    }

    // Validate scenes
    unit.scenes.forEach((scene) => {
      stats.scenes++;

      if (!scene.id || !scene.type) {
        errors.push({
          type: 'INVALID_SCENE',
          message: `Scene missing id or type`,
          sceneId: scene.id,
        });
      }

      // Validate nodes
      scene.nodes.forEach((node) => {
        stats.nodes++;

        if (!node.id || !node.label) {
          errors.push({
            type: 'INVALID_NODE',
            message: `Node missing id or label`,
            sceneId: scene.id,
            nodeId: node.id,
          });
        }

        // Check for invalid states
        if (
          !['idle', 'active', 'completed', 'error', 'processing'].includes(
            node.state
          )
        ) {
          warnings.push({
            type: 'UNKNOWN_STATE',
            message: `Node ${node.id} has unknown state: ${node.state}`,
            severity: 'low',
          });
        }
      });

      // Validate edges
      scene.edges.forEach((edge) => {
        stats.edges++;

        if (!edge.from || !edge.to) {
          errors.push({
            type: 'INVALID_EDGE',
            message: `Edge missing source or target`,
            sceneId: scene.id,
          });
        }

        // Check edge endpoints exist
        const fromExists = scene.nodes.some((n) => n.id === edge.from);
        const toExists = scene.nodes.some((n) => n.id === edge.to);

        if (!fromExists || !toExists) {
          errors.push({
            type: 'DANGLING_EDGE',
            message: `Edge references non-existent nodes`,
            sceneId: scene.id,
          });
          stats.orphanedEdges++;
        }

        // Check for self-loops
        if (edge.from === edge.to) {
          warnings.push({
            type: 'SELF_LOOP',
            message: `Edge creates self-loop on node ${edge.from}`,
            severity: 'medium',
          });
        }
      });

      // Check for unreachable nodes
      const reachable = this.findReachableNodes(scene);
      const unreachable = scene.nodes.filter((n) => !reachable.has(n.id));
      stats.unreachableNodes += unreachable.length;

      if (unreachable.length > 0) {
        warnings.push({
          type: 'UNREACHABLE_NODES',
          message: `${unreachable.length} nodes unreachable from sources`,
          severity: 'medium',
        });
      }

      // Check for cycles
      const cycles = this.findCycles(scene);
      stats.cyclicDependencies += cycles.length;

      if (cycles.length > 0) {
        warnings.push({
          type: 'CYCLIC_DEPENDENCY',
          message: `Scene contains ${cycles.length} cycle(s)`,
          severity: 'high',
        });
      }
    });

    // Build index
    const index = this.buildSearchIndex(unit);

    // Precompute layouts
    const layouts = this.precomputeLayouts(unit);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats,
      index,
      layouts,
    };
  }

  // Find reachable nodes from sources
  private findReachableNodes(scene: IRScene): Set<string> {
    const reachable = new Set<string>();
    const visited = new Set<string>();

    // Start from source nodes (no incoming edges)
    const sources = scene.nodes.filter(
      (n) => !scene.edges.some((e) => e.to === n.id)
    );

    const queue = [...sources];

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;

      visited.add(node.id);
      reachable.add(node.id);

      // Find children
      const children = scene.edges
        .filter((e) => e.from === node.id)
        .map((e) => scene.nodes.find((n) => n.id === e.to))
        .filter((n) => n !== undefined) as IRNode[];

      queue.push(...children);
    }

    return reachable;
  }

  // Detect cycles using DFS
  private findCycles(scene: IRScene): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const edges = scene.edges.filter((e) => e.from === nodeId);

      edges.forEach((edge) => {
        if (!visited.has(edge.to)) {
          dfs(edge.to, [...path]);
        } else if (recursionStack.has(edge.to)) {
          // Found cycle
          const cycleStart = path.indexOf(edge.to);
          const cycle = path.slice(cycleStart);
          cycles.push(cycle);
        }
      });

      recursionStack.delete(nodeId);
    };

    scene.nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return cycles;
  }

  // Build search index
  private buildSearchIndex(unit: IRLearningUnit): SearchIndex {
    const index: SearchIndex = {
      byTitle: new Map(),
      byType: new Map(),
      byNode: new Map(),
      fullText: new Map(),
    };

    unit.scenes.forEach((scene) => {
      // Index by title
      if (!index.byTitle.has(scene.title)) {
        index.byTitle.set(scene.title, []);
      }
      index.byTitle.get(scene.title)!.push(scene);

      // Index by type
      if (!index.byType.has(scene.type)) {
        index.byType.set(scene.type, []);
      }
      index.byType.get(scene.type)!.push(scene);

      // Index nodes
      scene.nodes.forEach((node) => {
        if (!index.byNode.has(node.label)) {
          index.byNode.set(node.label, []);
        }
        // Create pseudo-scene for search results
        index.byNode.get(node.label)!.push(scene);
      });

      // Full-text index
      const searchText = `${scene.title} ${scene.description || ''}`.toLowerCase();
      if (!index.fullText.has(searchText)) {
        index.fullText.set(searchText, []);
      }
      index.fullText.get(searchText)!.push(scene);
    });

    return index;
  }

  // Precompute node layouts
  private precomputeLayouts(unit: IRLearningUnit): PrecomputedLayouts {
    const layouts: PrecomputedLayouts = {};

    unit.scenes.forEach((scene) => {
      const algorithm = scene.layout || 'hierarchical';

      const nodePositions = this.computeLayout(
        scene.nodes,
        scene.edges,
        algorithm
      );

      const edgePoints = this.computeEdgeRouting(
        scene.edges,
        nodePositions
      );

      layouts[scene.id] = {
        algorithm,
        nodes: nodePositions,
        edges: edgePoints,
      };
    });

    return layouts;
  }

  // Simple hierarchical layout
  private computeLayout(
    nodes: IRNode[],
    edges: IREdge[],
    algorithm: string
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // Find layers (BFS from sources)
    const layers: Map<number, string[]> = new Map();
    const visited = new Set<string>();
    const layer = new Map<string, number>();

    const sources = nodes.filter(
      (n) => !edges.some((e) => e.to === n.id)
    );

    const queue: Array<[IRNode, number]> = sources.map((n) => [n, 0]);

    while (queue.length > 0) {
      const [node, currentLayer] = queue.shift()!;
      if (visited.has(node.id)) continue;

      visited.add(node.id);
      layer.set(node.id, currentLayer);

      if (!layers.has(currentLayer)) {
        layers.set(currentLayer, []);
      }
      layers.get(currentLayer)!.push(node.id);

      // Find children
      const children = edges
        .filter((e) => e.from === node.id)
        .map((e) => nodes.find((n) => n.id === e.to))
        .filter((n) => n !== undefined) as IRNode[];

      children.forEach((child) => {
        queue.push([child, currentLayer + 1]);
      });
    }

    // Position nodes
    const maxLayers = Math.max(...layer.values(), 0) + 1;
    const maxNodesInLayer = Math.max(
      ...Array.from(layers.values()).map((l) => l.length)
    );

    const width = 800;
    const height = 600;
    const hSpacing = width / (maxLayers + 1);
    const vSpacing = height / (maxNodesInLayer + 1);

    layers.forEach((nodeIds, layerIdx) => {
      nodeIds.forEach((nodeId, idx) => {
        positions.set(nodeId, {
          x: (layerIdx + 1) * hSpacing,
          y: (idx + 1) * vSpacing,
        });
      });
    });

    return positions;
  }

  // Simple edge routing (straight lines with offset)
  private computeEdgeRouting(
    edges: IREdge[],
    nodePositions: Map<string, { x: number; y: number }>
  ): Map<string, { points: number[][] }> {
    const routes = new Map<string, { points: number[][] }>();

    edges.forEach((edge, idx) => {
      const from = nodePositions.get(edge.from);
      const to = nodePositions.get(edge.to);

      if (!from || !to) {
        routes.set(edge.id, { points: [] });
        return;
      }

      // Simple curve: straight line with control point
      const controlX = (from.x + to.x) / 2;
      const controlY = (from.y + to.y) / 2 + idx * 10; // Offset for overlaps

      routes.set(edge.id, {
        points: [
          [from.x, from.y],
          [controlX, controlY],
          [to.x, to.y],
        ],
      });
    });

    return routes;
  }
}
