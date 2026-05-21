/**
 * PrimitiveRenderer — Generic visualization renderer for all primitive types.
 * Takes SceneIR, renders appropriate primitive (graph, array, table, timeline, code).
 * Replaces topic-specific renderers as the universal render layer.
 */

import React from 'react';
import { VisualizationPayload } from '../ir/VisualizationSchema';
import { GraphPrimitive } from './primitives/GraphPrimitive';
import { ArrayPrimitive } from './primitives/ArrayPrimitive';
import { TreePrimitive } from './primitives/TreePrimitive';
import { TablePrimitive } from './primitives/TablePrimitive';
import { TimelinePrimitive } from './primitives/TimelinePrimitive';
import { CodePrimitive } from './primitives/CodePrimitive';

export interface PrimitiveRendererProps {
  visualization: VisualizationPayload;
  className?: string;
  style?: React.CSSProperties;
  onNodeClick?: (nodeId: string, data: unknown) => void;
  onEdgeClick?: (edgeId: string, data: unknown) => void;
  config?: {
    theme?: 'light' | 'dark';
    interactive?: boolean;
    layout?: 'horizontal' | 'vertical' | 'force';
  };
}

export function PrimitiveRenderer({
  visualization,
  className = '',
  style = {},
  onNodeClick,
  onEdgeClick,
  config = {},
}: PrimitiveRendererProps) {
  const { theme = 'light', interactive = true, layout = 'force' } = config;

  // Route to appropriate primitive based on visualization type
  switch (visualization.type) {
    case 'graph':
      if (!visualization.graph) return <EmptyPrimitive message="No graph data provided" />;
      return (
        <GraphPrimitive
          data={visualization.graph}
          className={className}
          style={style}
          interactive={interactive}
          layout={layout}
          theme={theme}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
        />
      );

    case 'dsa-array':
      if (!visualization.array) return <EmptyPrimitive message="No array data provided" />;
      return (
        <ArrayPrimitive
          data={visualization.array}
          className={className}
          style={style}
          interactive={interactive}
          theme={theme}
        />
      );

    case 'dsa-tree':
      if (!visualization.tree) return <EmptyPrimitive message="No tree data provided" />;
      return (
        <TreePrimitive
          data={visualization.tree}
          className={className}
          style={style}
          interactive={interactive}
          theme={theme}
          onNodeClick={onNodeClick}
        />
      );

    case 'table':
      if (!visualization.table) return <EmptyPrimitive message="No table data provided" />;
      return (
        <TablePrimitive
          data={visualization.table}
          className={className}
          style={style}
          interactive={interactive}
          theme={theme}
        />
      );

    case 'timeline':
      if (!visualization.timeline) return <EmptyPrimitive message="No timeline data provided" />;
      return (
        <TimelinePrimitive
          data={visualization.timeline}
          className={className}
          style={style}
          theme={theme}
        />
      );

    case 'code':
      if (!visualization.execution) return <EmptyPrimitive message="No code execution data provided" />;
      return (
        <CodePrimitive
          data={visualization.execution}
          className={className}
          style={style}
          theme={theme}
        />
      );

    case 'custom':
      if (!visualization.custom) return <EmptyPrimitive message="No custom data provided" />;
      return (
        <CustomPrimitive
          data={visualization.custom}
          className={className}
          style={style}
        />
      );

    default:
      return <EmptyPrimitive message={`Unknown visualization type: ${visualization.type}`} />;
  }
}

function EmptyPrimitive({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--text-muted)',
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

function CustomPrimitive({
  data,
  className = '',
  style = {},
}: {
  data: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <pre style={{ fontSize: 12, overflow: 'auto' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// Re-export all primitives for direct use if needed
export { GraphPrimitive, ArrayPrimitive, TreePrimitive, TablePrimitive, TimelinePrimitive, CodePrimitive };
