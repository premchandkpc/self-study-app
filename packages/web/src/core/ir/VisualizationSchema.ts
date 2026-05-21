/**
 * SceneIR — Unified intermediate representation for all visualization types.
 * Decouples scenario builders from renderers. Supports serialization (worker offload).
 */

export type VisualizationType =
  | 'graph'           // System design, network topology
  | 'dsa-array'       // Array/list visualizations
  | 'dsa-tree'        // Tree/graph data structures
  | 'table'           // Metrics, comparison tables
  | 'timeline'        // Event sequences, flow
  | 'code'            // Code execution state
  | 'custom';         // Plugin-defined

export interface NodeData {
  id: string;
  label: string;
  x?: number;
  y?: number;
  icon?: string;
  state?: 'idle' | 'active' | 'error' | 'done' | 'visited' | 'window' | 'adding' | 'removing';
  desc?: string;
  healthy?: boolean;
  metadata?: Record<string, unknown>;
}

export interface EdgeData {
  from: string;
  to: string;
  protocol?: string;
  async?: boolean;
  desc?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PacketData {
  id?: string;
  from: string;
  to: string;
  label?: string;
  type?: 'request' | 'replication' | 'notification';
  metadata?: Record<string, unknown>;
}

export interface ArrayCellData {
  value?: number | string | boolean | null;
  state?: 'idle' | 'active' | 'error' | 'done' | 'visited' | 'window' | 'adding' | 'removing';
  metadata?: Record<string, unknown>;
}

export interface Metric {
  key: string;
  label: string;
  value: number | string;
  max?: number;
  unit?: string;
  color?: string;
  warn?: number;
  critical?: number;
}

export interface CodeBlock {
  lines: string[];
  language: string;
  title?: string;
}

export interface ConceptNode {
  id: string;
  title: string;
  description?: string;
  examples?: string[];
}

export interface VariableSnapshot {
  [key: string]: unknown;
}

// Visualization payload — renderer-agnostic
export interface VisualizationPayload {
  type: VisualizationType;

  // Graph visualization (system design, networks)
  graph?: {
    nodes: NodeData[];
    edges: EdgeData[];
    packets?: PacketData[];
  };

  // Array-like visualization
  array?: {
    cells: ArrayCellData[];
    window?: { left: number; right: number };
    indices?: { [key: string]: number | number[] };
  };

  // Tree/DAG visualization
  tree?: {
    nodes: NodeData[];
    edges: EdgeData[];
  };

  // Table visualization
  table?: {
    headers: string[];
    rows: (string | number | boolean)[][];
  };

  // Timeline/event sequence
  timeline?: {
    events: Array<{
      id: string;
      time: number;
      label: string;
      type?: 'ok' | 'warn' | 'error';
    }>;
  };

  // Code execution state
  execution?: {
    lineNumber?: number;
    callStack?: Array<{ fn: string; line: number }>;
    state?: VariableSnapshot;
  };

  // Custom payload for plugins
  custom?: Record<string, unknown>;
}

// Unified scene intermediate representation
export interface SceneIR {
  // Identity
  id: string;
  title?: string;

  // Semantic classification
  type: 'concept' | 'simulation' | 'system-design' | 'dsa' | 'algorithm' | 'custom';

  // Visualization primitive(s)
  visualization: VisualizationPayload;

  // Content: structured, reusable across renderers
  content: {
    concepts?: ConceptNode[];
    code?: CodeBlock[];
    metrics?: Metric[];
    variables?: VariableSnapshot;
    result?: unknown;
    narration?: string;
    explanation?: string;
  };

  // Metadata for analysis/filtering
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    timeMs?: number;
    complexity?: { time?: string; space?: string; ops?: number };
    tags?: string[];
  };
}

// Scenario descriptor: what a visualizer provides
export interface ScenarioDescriptor {
  id: string;
  label: string;
  icon?: string;
  description?: string;

  // Builder: takes params, returns scenes
  build: (params?: Record<string, unknown>) => Promise<SceneIR[]> | SceneIR[];

  // Template metadata
  template?: 'detailed' | 'canvas' | 'dsa' | 'system' | 'custom';

  // Input parameters for customization
  inputs?: Array<{
    key: string;
    label: string;
    type: 'number' | 'string' | 'boolean' | 'array-num' | 'array-str';
    default: unknown;
    min?: number;
    max?: number;
    maxLen?: number;
  }>;

  // Metadata
  language?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  metrics?: Array<{
    key: string;
    label: string;
    max?: number;
    unit?: string;
    color?: string;
    warn?: number;
    critical?: number;
  }>;

  // Legacy support: map old scenario shape to SceneIR
  legacyAdapter?: (oldViz: Record<string, unknown>) => SceneIR;
}

// Runtime state for scenario navigation
export interface SceneNavigationState {
  sceneIndex: number;
  totalScenes: number;
  currentScene: SceneIR | null;
  canNext: boolean;
  canPrev: boolean;
}

export interface SceneNavigatorMethods {
  next: () => void;
  prev: () => void;
  select: (index: number) => void;
  jump: (filter: (scene: SceneIR) => boolean) => void;
}

export type SceneNavigator = SceneNavigationState & SceneNavigatorMethods;
