// GraphRenderer - General graph/network visualization
// Used by: Microservices, distributed systems, dependency graphs, DAGs

import { memo, useState } from 'react';
import { IRScene } from '../schema';
import styles from './GraphRenderer.module.css';

interface GraphNode {
  id: string;
  label: string;
  state: string;
  degree: number;
  x: number;
  y: number;
}

// Simple force-directed layout approximation
function layoutGraph(scene: IRScene, width: number = 400, height: number = 300): GraphNode[] {
  const padding = 40;
  const w = width - 2 * padding;
  const h = height - 2 * padding;

  // Calculate degree (connections)
  const degrees = new Map<string, number>();
  scene.nodes.forEach((n) => degrees.set(n.id, 0));
  scene.edges.forEach((e) => {
    degrees.set(e.from, (degrees.get(e.from) ?? 0) + 1);
    degrees.set(e.to, (degrees.get(e.to) ?? 0) + 1);
  });

  // Simple circular layout based on degree
  const sortedNodes = [...scene.nodes].sort(
    (a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0)
  );

  // High-degree nodes in center, others in circle
  const result: GraphNode[] = [];
  let centerCount = Math.max(1, Math.floor(sortedNodes.length * 0.2));

  sortedNodes.forEach((node, idx) => {
    let x, y;

    if (idx < centerCount) {
      // Center cluster
      x = padding + w / 2 + (Math.random() - 0.5) * 40;
      y = padding + h / 2 + (Math.random() - 0.5) * 40;
    } else {
      // Outer circle
      const angle = ((idx - centerCount) / (sortedNodes.length - centerCount)) * Math.PI * 2;
      const radius = Math.min(w, h) * 0.35;
      x = padding + w / 2 + Math.cos(angle) * radius;
      y = padding + h / 2 + Math.sin(angle) * radius;
    }

    result.push({
      id: node.id,
      label: node.label,
      state: node.state,
      degree: degrees.get(node.id) ?? 0,
      x: Math.max(padding + 20, Math.min(width - padding - 20, x)),
      y: Math.max(padding + 20, Math.min(height - padding - 20, y)),
    });
  });

  return result;
}

export const GraphRenderer = memo(function GraphRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const svgWidth = 500;
  const svgHeight = 350;
  const nodes = layoutGraph(scene, svgWidth, svgHeight);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Edges to render
  const edges = scene.edges.filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to));

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.graphContainer}>
        <svg width={svgWidth} height={svgHeight} className={styles.svg}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#9ca3af" />
            </marker>
          </defs>

          {/* Render edges */}
          {edges.map((edge) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const isSelected =
              selectedNode === edge.from || selectedNode === edge.to;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                {/* Edge line */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={isSelected ? '#3b82f6' : '#d1d5db'}
                  strokeWidth={isSelected ? 2 : 1}
                  markerEnd="url(#arrowhead)"
                  className={styles.edge}
                />

                {/* Edge label */}
                {edge.label && (
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2}
                    className={styles.edgeLabel}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              className={styles.nodeGroup}
              onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
            >
              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r="24"
                className={`${styles.node} ${styles[`state-${node.state}`]}`}
                style={{
                  cursor: 'pointer',
                  stroke: selectedNode === node.id ? '#3b82f6' : undefined,
                  strokeWidth: selectedNode === node.id ? 3 : 2,
                }}
              />

              {/* Node label */}
              <text
                x={node.x}
                y={node.y}
                className={styles.nodeLabel}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {node.label.substring(0, 2)}
              </text>

              {/* Tooltip on hover */}
              <title>{node.label}</title>
            </g>
          ))}
        </svg>
      </div>

      {/* Node legend/stats */}
      {selectedNode && (
        <div className={styles.selectedInfo}>
          <strong>
            {nodes.find((n) => n.id === selectedNode)?.label}
          </strong>{' '}
          ({
          nodes.find((n) => n.id === selectedNode)?.degree ||
            0}{' '}
          connections)
        </div>
      )}

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Nodes:</span> {nodes.length}
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Edges:</span> {edges.length}
        </div>
      </div>
    </div>
  );
});
