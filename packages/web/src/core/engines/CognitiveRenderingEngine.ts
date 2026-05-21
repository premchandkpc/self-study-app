// Cognitive Rendering Engine - Progressive semantic revelation
// Controls WHAT appears, WHEN it appears, HOW MUCH appears
// Solves cognitive overload problem

import { IRScene, IRNode, IREdge } from '../ir/schema';

export type CognitiveLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CognitiveConfig {
  level: CognitiveLevel;
  maxNodesPerScene: number;
  maxEdgesPerScene: number;
  revealDelay: number; // ms between reveals
  groupByImportance: boolean;
}

export interface RevealedScene {
  scene: IRScene;
  revealedNodes: string[]; // IDs of visible nodes
  revealedEdges: string[]; // IDs of visible edges
  hiddenElements: {
    nodes: number;
    edges: number;
  };
  revealOrder: string[]; // Order to reveal hidden elements
  readyToReveal: boolean;
}

export class CognitiveRenderingEngine {
  private config: CognitiveConfig;
  private nodeImportance: Map<string, number> = new Map();
  private edgeImportance: Map<string, number> = new Map();

  constructor(config: CognitiveConfig) {
    this.config = config;
  }

  // Main: Render scene with cognitive filtering
  renderCognitive(scene: IRScene): RevealedScene {
    // Step 1: Score importance
    const nodes = this.scoreNodeImportance(scene);
    const edges = this.scoreEdgeImportance(scene);

    // Step 2: Filter by cognitive level
    const filtered = this.filterByLevel(nodes, edges);

    // Step 3: Generate reveal order
    const revealOrder = this.generateRevealOrder(
      filtered.hiddenNodes,
      filtered.hiddenEdges
    );

    // Step 4: Build revealed scene
    const revealedScene: RevealedScene = {
      scene: {
        ...scene,
        nodes: filtered.visibleNodes,
        edges: filtered.visibleEdges,
      },
      revealedNodes: filtered.visibleNodes.map((n) => n.id),
      revealedEdges: filtered.visibleEdges.map((e) => e.id),
      hiddenElements: {
        nodes: filtered.hiddenNodes.length,
        edges: filtered.hiddenEdges.length,
      },
      revealOrder,
      readyToReveal: revealOrder.length > 0,
    };

    return revealedScene;
  }

  // Progressive reveal: show next hidden element
  revealNext(
    scene: RevealedScene
  ): RevealedScene | { complete: true; scene: IRScene } {
    if (!scene.readyToReveal || scene.revealOrder.length === 0) {
      return { complete: true, scene: scene.scene };
    }

    const nextId = scene.revealOrder.shift();
    if (!nextId) {
      return { complete: true, scene: scene.scene };
    }

    const isNode = nextId.startsWith('node-');
    const isEdge = nextId.startsWith('edge-');

    const updatedScene = { ...scene.scene };

    if (isNode) {
      const hidden = updatedScene.nodes.find(
        (n) => !scene.revealedNodes.includes(n.id) && n.id === nextId
      );
      if (hidden) {
        scene.revealedNodes.push(hidden.id);
      }
    } else if (isEdge) {
      const hidden = updatedScene.edges.find(
        (e) => !scene.revealedEdges.includes(e.id) && e.id === nextId
      );
      if (hidden) {
        scene.revealedEdges.push(hidden.id);
      }
    }

    updatedScene.nodes = updatedScene.nodes.filter((n) =>
      scene.revealedNodes.includes(n.id)
    );
    updatedScene.edges = updatedScene.edges.filter((e) =>
      scene.revealedEdges.includes(e.id)
    );

    return {
      scene: updatedScene,
      revealedNodes: [...scene.revealedNodes],
      revealedEdges: [...scene.revealedEdges],
      hiddenElements: {
        nodes: Math.max(0, scene.hiddenElements.nodes - 1),
        edges: scene.hiddenElements.edges,
      },
      revealOrder: [...scene.revealOrder],
      readyToReveal: scene.revealOrder.length > 1,
    };
  }

  // Score node importance
  private scoreNodeImportance(scene: IRScene): IRNode[] {
    scene.nodes.forEach((node) => {
      let score = 0;

      // Central nodes (many edges)
      const degree = scene.edges.filter(
        (e) => e.from === node.id || e.to === node.id
      ).length;
      score += degree * 10;

      // Source/sink nodes (important boundaries)
      const isSource = !scene.edges.some((e) => e.to === node.id);
      const isSink = !scene.edges.some((e) => e.from === node.id);
      if (isSource || isSink) score += 20;

      // Node state (active/new = important)
      if (node.state === 'active' || node.state === 'new') score += 15;

      // Metadata importance
      if (node.metadata?.importance) score += node.metadata.importance * 5;

      this.nodeImportance.set(node.id, score);
    });

    return scene.nodes.sort(
      (a, b) => (this.nodeImportance.get(b.id) || 0) - (this.nodeImportance.get(a.id) || 0)
    );
  }

  // Score edge importance
  private scoreEdgeImportance(scene: IRScene): IREdge[] {
    scene.edges.forEach((edge) => {
      let score = 0;

      // Primary flow edges (usually left-to-right)
      if (edge.type === 'flow') score += 20;

      // Dependency edges (critical path)
      if (edge.type === 'dependency') score += 15;

      // Labeled edges (more information)
      if (edge.label) score += 5;

      // Metadata importance
      if (edge.metadata?.importance) score += edge.metadata.importance * 5;

      this.edgeImportance.set(edge.id, score);
    });

    return scene.edges.sort(
      (a, b) => (this.edgeImportance.get(b.id) || 0) - (this.edgeImportance.get(a.id) || 0)
    );
  }

  // Filter scene by cognitive level
  private filterByLevel(
    nodes: IRNode[],
    edges: IREdge[]
  ): {
    visibleNodes: IRNode[];
    visibleEdges: IREdge[];
    hiddenNodes: IRNode[];
    hiddenEdges: IREdge[];
  } {
    const limits = this.getLimitsForLevel(this.config.level);

    const visibleNodes = nodes.slice(0, limits.maxNodes);
    const hiddenNodes = nodes.slice(limits.maxNodes);

    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

    // Only show edges between visible nodes
    const validEdges = edges.filter(
      (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)
    );

    const visibleEdges = validEdges.slice(0, limits.maxEdges);
    const hiddenEdges = edges.filter(
      (e) =>
        !validEdges.includes(e) ||
        validEdges.indexOf(e) >= limits.maxEdges
    );

    return { visibleNodes, visibleEdges, hiddenNodes, hiddenEdges };
  }

  // Generate reveal order (importance-based)
  private generateRevealOrder(
    hiddenNodes: IRNode[],
    hiddenEdges: IREdge[]
  ): string[] {
    const order: string[] = [];

    // Interleave nodes and edges by importance
    hiddenNodes.forEach((node) => {
      order.push(`node-${node.id}`);
    });

    hiddenEdges.forEach((edge) => {
      order.push(`edge-${edge.id}`);
    });

    return order;
  }

  // Cognitive level → display limits
  private getLimitsForLevel(level: CognitiveLevel): {
    maxNodes: number;
    maxEdges: number;
  } {
    const limits = {
      beginner: { maxNodes: 3, maxEdges: 2 },
      intermediate: { maxNodes: 6, maxEdges: 5 },
      advanced: { maxNodes: 10, maxEdges: 10 },
      expert: { maxNodes: 999, maxEdges: 999 },
    };

    return limits[level] || limits.beginner;
  }

  // Adapt cognitive level based on performance
  recommendLevel(
    userProgress: {
      masteredConcepts: number;
      struggledWith: string[];
      averageTimePerScene: number;
      errorRate: number;
    }
  ): CognitiveLevel {
    // If user masters concepts quickly
    if (
      userProgress.masteredConcepts > 10 &&
      userProgress.averageTimePerScene < 60000 &&
      userProgress.errorRate < 0.1
    ) {
      return 'advanced';
    }

    // If user struggles
    if (userProgress.errorRate > 0.3 || userProgress.averageTimePerScene > 180000) {
      return 'beginner';
    }

    // Default
    return 'intermediate';
  }
}
