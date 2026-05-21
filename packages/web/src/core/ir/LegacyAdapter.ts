/**
 * LegacyAdapter — Converts old scenario viz shapes to SceneIR.
 * Allows incremental migration. Each visualizer can opt-in to native SceneIR
 * while legacy renderers continue to work.
 */

import { SceneIR, VisualizationPayload } from './VisualizationSchema';

/**
 * Detect visualization type and adapt to SceneIR.
 * Looks for telltale keys in the viz object.
 */
export function adaptLegacyViz(
  viz: Record<string, unknown>,
  metadata?: { type?: string; title?: string }
): SceneIR {
  const type = detectVisualizationType(viz);

  // Parse ID from metadata or generate
  const id = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const title = metadata?.title || type;

  let visualization: VisualizationPayload;

  // Route to appropriate adapter
  switch (type) {
    case 'system-design':
      visualization = adaptSystemDesignViz(viz);
      break;

    case 'dsa-array':
      visualization = adaptArrayViz(viz);
      break;

    case 'dsa-tree':
      visualization = adaptTreeViz(viz);
      break;

    case 'code-execution':
      visualization = adaptCodeViz(viz);
      break;

    default:
      visualization = { type: 'custom', custom: viz };
  }

  // Extract content from viz
  const content = {
    concepts: viz.concepts ? (Array.isArray(viz.concepts) ? viz.concepts : Object.values(viz.concepts as object).filter(isConceptNode)) : undefined,
    code: viz.code ? [{ lines: Array.isArray(viz.code) ? viz.code : [], language: viz.language || 'javascript' }] : undefined,
    metrics: viz.metrics && Array.isArray(viz.metrics) ? viz.metrics : undefined,
    variables: viz.vars ? (viz.vars as object) : undefined,
    result: viz.result !== undefined ? viz.result : undefined,
    narration: viz.narration || viz.explanation ? String(viz.narration || viz.explanation) : undefined,
  };

  // Extract metadata
  const sceneMetadata = {
    complexity: viz.complexity ? (viz.complexity as object) : undefined,
    timeMs: typeof viz.timeMs === 'number' ? viz.timeMs : undefined,
    tags: viz.tags ? (Array.isArray(viz.tags) ? viz.tags : [String(viz.tags)]) : undefined,
  };

  return {
    id,
    title,
    type: 'simulation',
    visualization,
    content: Object.fromEntries(
      Object.entries(content)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, v])
    ) as any,
    metadata: Object.fromEntries(
      Object.entries(sceneMetadata)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, v])
    ) as any,
  };
}

function detectVisualizationType(viz: Record<string, unknown>): string {
  // System design: has nodes + edges
  if (viz.nodes && viz.edges) return 'system-design';

  // DSA array: has cells
  if (viz.cells) return 'dsa-array';

  // Tree: has tree structure
  if (Array.isArray(viz.nodes) && Array.isArray(viz.edges) && !viz.packets) return 'dsa-tree';

  // Code execution: has callStack or execution
  if (viz.callStack || viz.execution || viz.lineNumber) return 'code-execution';

  return 'custom';
}

function adaptSystemDesignViz(viz: Record<string, unknown>): VisualizationPayload {
  return {
    type: 'graph',
    graph: {
      nodes: Array.isArray(viz.nodes) ? viz.nodes : [],
      edges: Array.isArray(viz.edges) ? viz.edges : [],
      packets: Array.isArray(viz.packets) ? viz.packets : undefined,
    },
  };
}

function adaptArrayViz(viz: Record<string, unknown>): VisualizationPayload {
  return {
    type: 'dsa-array',
    array: {
      cells: Array.isArray(viz.cells) ? viz.cells : [],
      window: viz.window as { left: number; right: number } | undefined,
      indices: viz.indices as Record<string, number | number[]> | undefined,
    },
  };
}

function adaptTreeViz(viz: Record<string, unknown>): VisualizationPayload {
  return {
    type: 'dsa-tree',
    tree: {
      nodes: Array.isArray(viz.nodes) ? viz.nodes : [],
      edges: Array.isArray(viz.edges) ? viz.edges : [],
    },
  };
}

function adaptCodeViz(viz: Record<string, unknown>): VisualizationPayload {
  return {
    type: 'code',
    execution: {
      lineNumber: typeof viz.lineNumber === 'number' ? viz.lineNumber : undefined,
      callStack: Array.isArray(viz.callStack) ? viz.callStack : undefined,
      state: viz.state as Record<string, unknown> | undefined,
    },
  };
}

function isConceptNode(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const node = obj as Record<string, unknown>;
  return typeof node.title === 'string' || typeof node.name === 'string';
}

/**
 * Batch-adapt legacy scenarios to SceneIR.
 * Called once per visualizer setup.
 */
export function adaptLegacyScenarioBuilder(
  legacyBuilder: (params?: Record<string, unknown>) => Record<string, unknown>[]
): (params?: Record<string, unknown>) => SceneIR[] {
  return (params?: Record<string, unknown>) => {
    const legacySteps = legacyBuilder(params);
    return legacySteps.map((step, idx) =>
      adaptLegacyViz(step, { title: `Step ${idx + 1}` })
    );
  };
}
