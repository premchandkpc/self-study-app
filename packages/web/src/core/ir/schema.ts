// Intermediate Representation (IR) - Universal learning visualization schema
// Decouples content from rendering

export type PrimitiveType =
  | 'queue'
  | 'stack'
  | 'tree'
  | 'graph'
  | 'timeline'
  | 'pipeline'
  | 'state_machine'
  | 'network'
  | 'matrix'
  | 'table'
  | 'flowchart'
  | 'sequence';

export type NodeState =
  | 'idle'
  | 'active'
  | 'completed'
  | 'error'
  | 'processing';

export type EdgeType =
  | 'flow'
  | 'dependency'
  | 'reference'
  | 'bidirectional';

export interface TechnologyContent {
  id: string;
  title: string;
  technology: string;
  description?: string;
  scenes: Array<{
    id: string;
    type: PrimitiveType;
    title: string;
    nodes: Array<{
      id: string;
      label: string;
      metadata?: Record<string, any>;
    }>;
    edges: Array<{
      from: string;
      to: string;
      label?: string;
    }>;
  }>;
  metadata?: Record<string, any>;
}

export interface IRNode {
  id: string;
  type: PrimitiveType;
  label: string;
  state: NodeState;
  metadata?: Record<string, any>;
  data?: any;
}

export interface IREdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
  metadata?: Record<string, any>;
}

export interface IRScene {
  id: string;
  type: PrimitiveType;
  title: string;
  description?: string;
  nodes: IRNode[];
  edges: IREdge[];
  layout?: 'hierarchical' | 'circular' | 'force' | 'grid';
  animation?: IRAnimation;
}

export interface IRAnimation {
  duration: number;
  steps: IRAnimationStep[];
  loop?: boolean;
}

export interface IRAnimationStep {
  target: 'node' | 'edge' | 'scene';
  id: string;
  action: 'highlight' | 'fade' | 'move' | 'transform' | 'reveal';
  duration: number;
  delay?: number;
  metadata?: Record<string, any>;
}

export interface IRInteraction {
  type: 'click' | 'hover' | 'drag' | 'scroll';
  target: string;
  action: 'expand' | 'collapse' | 'navigate' | 'trigger' | 'reveal';
  payload?: Record<string, any>;
}

export interface IRLearningUnit {
  id: string;
  title: string;
  concept: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];
  scenes: IRScene[];
  interactions: IRInteraction[];
  metadata?: {
    technology?: string;
    domain?: string;
    misconceptions?: string[];
    keywords?: string[];
  };
}
