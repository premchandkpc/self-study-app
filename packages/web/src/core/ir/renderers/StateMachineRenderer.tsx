// StateMachineRenderer - Finite State Machine visualization
// Used by: TCP, Raft consensus, JVM thread states, protocols

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './StateMachineRenderer.module.css';

export const StateMachineRenderer = memo(function StateMachineRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  // Find start state (no incoming edges)
  const startNodes = scene.nodes.filter(
    (n) => !scene.edges.some((e) => e.to === n.id)
  );

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      <svg className={styles.fsm} viewBox="0 0 800 400">
        {/* Draw edges (transitions) */}
        {scene.edges.map((edge) => {
          const fromNode = scene.nodes.find((n) => n.id === edge.from);
          const toNode = scene.nodes.find((n) => n.id === edge.to);

          if (!fromNode || !toNode) return null;

          // Simple positions (grid-based for now)
          const fromIndex = scene.nodes.indexOf(fromNode);
          const toIndex = scene.nodes.indexOf(toNode);

          const fromX = 100 + (fromIndex % 4) * 150;
          const fromY = 100 + Math.floor(fromIndex / 4) * 150;

          const toX = 100 + (toIndex % 4) * 150;
          const toY = 100 + Math.floor(toIndex / 4) * 150;

          return (
            <g key={`edge-${edge.id}`}>
              {/* Arrow line */}
              <line
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                className={styles.edgeLine}
              />

              {/* Arrow head */}
              <polygon
                points={`${toX},${toY} ${toX - 8},${toY - 5} ${toX - 8},${toY + 5}`}
                className={styles.arrowHead}
              />

              {/* Edge label */}
              {edge.label && (
                <text
                  x={(fromX + toX) / 2}
                  y={(fromY + toY) / 2 - 5}
                  className={styles.edgeLabel}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Draw states (nodes) */}
        {scene.nodes.map((node, idx) => {
          const x = 100 + (idx % 4) * 150;
          const y = 100 + Math.floor(idx / 4) * 150;
          const isStart = startNodes.includes(node);

          return (
            <g key={`node-${node.id}`}>
              {/* Start indicator */}
              {isStart && (
                <circle cx={x - 30} cy={y} r="5" className={styles.startIndicator} />
              )}

              {/* State circle */}
              <circle
                cx={x}
                cy={y}
                r="35"
                className={`${styles.stateCircle} ${styles[`state-${node.state}`]}`}
              />

              {/* State label */}
              <text x={x} y={y} className={styles.stateLabel}>
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}
    </div>
  );
});
