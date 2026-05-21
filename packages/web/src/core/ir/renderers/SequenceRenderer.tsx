// SequenceRenderer - Sequence/interaction diagram visualization
// Used by: RPC calls, message sequences, API interactions, call sequences, distributed tracing

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './SequenceRenderer.module.css';

interface Actor {
  id: string;
  label: string;
}

function extractActors(scene: IRScene): Actor[] {
  const seen = new Set<string>();
  const actors: Actor[] = [];

  scene.nodes.forEach((node) => {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      actors.push({ id: node.id, label: node.label });
    }
  });

  return actors.slice(0, 5); // Limit to 5 actors for readability
}

export const SequenceRenderer = memo(function SequenceRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const actors = extractActors(scene);
  const interactions = scene.edges.slice(0, 10); // Limit interactions for readability

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.sequenceContainer}>
        <svg width="100%" height={Math.max(300, 50 + interactions.length * 40)} viewBox="0 0 600 400">
          {/* Lifelines */}
          {actors.map((actor, idx) => {
            const x = 100 + idx * 100;
            return (
              <g key={actor.id}>
                {/* Actor box */}
                <rect
                  x={x - 40}
                  y="10"
                  width="80"
                  height="40"
                  fill="#f3f4f6"
                  stroke="#d1d5db"
                  strokeWidth="2"
                  rx="4"
                />
                <text
                  x={x}
                  y="35"
                  textAnchor="middle"
                  className={styles.actorLabel}
                >
                  {actor.label.substring(0, 8)}
                </text>

                {/* Lifeline */}
                <line
                  x1={x}
                  y1="50"
                  x2={x}
                  y2="360"
                  stroke="#d1d5db"
                  strokeDasharray="4"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Interactions */}
          {interactions.map((interaction, idx) => {
            const fromIdx = actors.findIndex((a) => a.id === interaction.from) || 0;
            const toIdx = actors.findIndex((a) => a.id === interaction.to) || 1;

            const y = 80 + idx * 30;
            const fromX = 100 + fromIdx * 100;
            const toX = 100 + toIdx * 100;

            return (
              <g key={`${interaction.from}-${interaction.to}-${idx}`}>
                {/* Arrow */}
                <line
                  x1={Math.min(fromX, toX)}
                  y1={y}
                  x2={Math.max(fromX, toX)}
                  y2={y}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />

                {/* Label */}
                {interaction.label && (
                  <text
                    x={(fromX + toX) / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className={styles.interactionLabel}
                  >
                    {interaction.label}
                  </text>
                )}
              </g>
            );
          })}

          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Actors:</span> {actors.length}
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Interactions:</span> {interactions.length}
        </div>
      </div>
    </div>
  );
});
