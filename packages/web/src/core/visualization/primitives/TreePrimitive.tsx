import React from 'react';
import type { NodeData, EdgeData } from '../../ir/VisualizationSchema';

export interface TreePrimitiveProps {
  data: { nodes: NodeData[]; edges: EdgeData[] };
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  theme?: 'light' | 'dark';
  onNodeClick?: (nodeId: string, data: unknown) => void;
}

export function TreePrimitive({
  data,
  className = '',
  style = {},
  interactive = true,
  theme = 'light',
  onNodeClick,
}: TreePrimitiveProps) {
  return (
    <div className={className} style={{ padding: 16, ...style }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Tree Primitive: {data.nodes.length} nodes, {data.edges.length} edges
      </div>
    </div>
  );
}
