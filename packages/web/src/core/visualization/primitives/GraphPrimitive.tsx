/**
 * GraphPrimitive — Renders system design graphs (nodes, edges, packets).
 * Used by SystemTemplate, system design visualizers.
 */

import React from 'react';
import { NodeData, EdgeData, PacketData } from '../../ir/VisualizationSchema';

export interface GraphPrimitiveProps {
  data: { nodes: NodeData[]; edges: EdgeData[]; packets?: PacketData[] };
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  layout?: 'horizontal' | 'vertical' | 'force';
  theme?: 'light' | 'dark';
  onNodeClick?: (nodeId: string, data: unknown) => void;
  onEdgeClick?: (edgeId: string, data: unknown) => void;
}

export function GraphPrimitive({
  data,
  className = '',
  style = {},
  interactive = true,
  layout = 'force',
  theme = 'light',
  onNodeClick,
  onEdgeClick,
}: GraphPrimitiveProps) {
  const { nodes, edges, packets } = data;

  const svgWidth = 700;
  const svgHeight = 380;

  // Calculate node positions if not provided
  const positionedNodes = nodes.map((n, i) => ({
    ...n,
    x: n.x ?? (50 + (i % 5) * 150),
    y: n.y ?? (50 + Math.floor(i / 5) * 150),
  }));

  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node && onNodeClick) {
      onNodeClick(nodeId, node);
    }
  };

  const handleEdgeClick = (edgeId: string) => {
    const edge = edges.find((e) => `${e.from}-${e.to}` === edgeId);
    if (edge && onEdgeClick) {
      onEdgeClick(edgeId, edge);
    }
  };

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{
          width: '100%',
          borderRadius: 12,
          background: `var(--bg-card)`,
          border: '1px solid var(--border)',
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="var(--text-muted)" />
          </marker>
        </defs>

        {/* Render edges */}
        {edges.map((edge) => {
          const fromNode = positionedNodes.find((n) => n.id === edge.from);
          const toNode = positionedNodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const active = packets?.some(
            (p) => (p.from === edge.from && p.to === edge.to) || (p.from === edge.to && p.to === edge.from)
          );

          return (
            <g
              key={`edge-${edge.from}-${edge.to}`}
              onClick={() => handleEdgeClick(`${edge.from}-${edge.to}`)}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={active ? 'var(--color-warning)' : 'var(--border)'}
                strokeWidth={active ? 2 : 1}
                markerEnd="url(#arrowhead)"
              />
              {edge.protocol && (
                <text
                  x={(fromNode.x + toNode.x) / 2}
                  y={(fromNode.y + toNode.y) / 2 - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--text-muted)"
                  style={{ pointerEvents: 'none' }}
                >
                  {edge.protocol}
                </text>
              )}
            </g>
          );
        })}

        {/* Render packets */}
        {packets?.map((pkt) => {
          const fromNode = positionedNodes.find((n) => n.id === pkt.from);
          const toNode = positionedNodes.find((n) => n.id === pkt.to);
          if (!fromNode || !toNode) return null;

          return (
            <circle
              key={`packet-${pkt.id || `${pkt.from}-${pkt.to}`}`}
              cx={(fromNode.x + toNode.x) / 2}
              cy={(fromNode.y + toNode.y) / 2}
              r="4"
              fill="var(--color-success)"
            />
          );
        })}

        {/* Render nodes */}
        {positionedNodes.map((node) => (
          <g
            key={node.id}
            onClick={() => handleNodeClick(node.id)}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
          >
            <rect
              x={node.x - 45}
              y={node.y - 25}
              width="90"
              height="50"
              rx="4"
              fill={getNodeColor(node.state, theme)}
              stroke="var(--border)"
              strokeWidth="1"
            />
            {node.icon && (
              <text
                x={node.x - 30}
                y={node.y + 5}
                fontSize="18"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {node.icon}
              </text>
            )}
            <text
              x={node.x}
              y={node.y + 8}
              fontSize="12"
              fontWeight="600"
              fill="var(--text-primary)"
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function getNodeColor(state: string | undefined, theme: string): string {
  const colors: Record<string, string> = {
    idle: 'var(--bg-subtle)',
    active: 'var(--color-info-bg)',
    error: 'var(--color-error-bg)',
    done: 'var(--color-success-bg)',
  };
  return colors[state || 'idle'] || 'var(--bg-subtle)';
}
