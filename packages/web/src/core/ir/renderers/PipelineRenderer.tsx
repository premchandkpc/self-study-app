// PipelineRenderer - Linear flow visualization
// Used by: Kafka (producer → broker → consumer), data pipelines, ETL flows, microservice calls

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './PipelineRenderer.module.css';

interface PipelineStage {
  id: string;
  label: string;
  order: number;
  state: string;
  description?: string;
}

function buildPipeline(scene: IRScene): PipelineStage[] {
  // For pipelines, nodes should be in order (either by their order in the array or by edges)
  // First, try to detect ordering from edges

  if (scene.edges.length > 0) {
    // Build ordering from edges
    const nodeOrder = new Map<string, number>();
    const visited = new Set<string>();

    // Find starting nodes (no incoming edges)
    const startNodes = scene.nodes.filter(
      (n) => !scene.edges.some((e) => e.to === n.id)
    );

    if (startNodes.length > 0) {
      let order = 0;
      let current = startNodes;

      while (current.length > 0 && order < scene.nodes.length) {
        const nextCurrent: typeof current = [];

        for (const node of current) {
          if (!visited.has(node.id)) {
            visited.add(node.id);
            nodeOrder.set(node.id, order);

            // Find outgoing edges
            const outgoing = scene.edges.filter((e) => e.from === node.id);
            for (const edge of outgoing) {
              const target = scene.nodes.find((n) => n.id === edge.to);
              if (target && !visited.has(target.id)) {
                nextCurrent.push(target);
              }
            }
          }
        }

        current = nextCurrent;
        order++;
      }

      return scene.nodes
        .map((node) => ({
          id: node.id,
          label: node.label,
          order: nodeOrder.get(node.id) ?? scene.nodes.length,
          state: node.state,
          description: node.metadata?.description,
        }))
        .sort((a, b) => a.order - b.order);
    }
  }

  // Fallback: use array order
  return scene.nodes.map((node, idx) => ({
    id: node.id,
    label: node.label,
    order: idx,
    state: node.state,
    description: node.metadata?.description,
  }));
}

export const PipelineRenderer = memo(function PipelineRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const stages = buildPipeline(scene);

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.pipeline}>
        {stages.map((stage, idx) => (
          <div key={stage.id} className={styles.stageWrapper}>
            {/* Stage box */}
            <div
              className={`${styles.stage} ${styles[`state-${stage.state}`]}`}
              title={stage.description}
            >
              <div className={styles.stageLabel}>{stage.label}</div>
              {stage.description && (
                <div className={styles.stageDescription}>{stage.description}</div>
              )}
            </div>

            {/* Arrow to next stage */}
            {idx < stages.length - 1 && (
              <div className={styles.arrow}>
                <svg width="30" height="40" viewBox="0 0 30 40" preserveAspectRatio="none">
                  <path
                    d="M 0 0 L 20 20 L 0 40"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
