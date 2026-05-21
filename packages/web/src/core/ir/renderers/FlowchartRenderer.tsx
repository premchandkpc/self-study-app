// FlowchartRenderer - Control flow and decision visualization
// Used by: Algorithms, workflows, processes, decision trees, conditional logic

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './FlowchartRenderer.module.css';

interface FlowNode {
  id: string;
  label: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'default';
  state: string;
}

function categorizeNodes(scene: IRScene): FlowNode[] {
  return scene.nodes.map((node) => {
    let type: FlowNode['type'] = 'process';

    const label = node.label.toLowerCase();
    if (label.includes('start')) type = 'start';
    else if (label.includes('end')) type = 'end';
    else if (label.includes('if') || label.includes('?')) type = 'decision';

    return { id: node.id, label: node.label, type, state: node.state };
  });
}

export const FlowchartRenderer = memo(function FlowchartRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const nodes = categorizeNodes(scene);

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.flowchartContainer}>
        <div className={styles.flowchart}>
          {nodes.map((node, idx) => (
            <div key={node.id} className={styles.nodeWrapper}>
              {/* Node shape */}
              <div
                className={`${styles.node} ${styles[`type-${node.type}`]} ${styles[`state-${node.state}`]}`}
              >
                <div className={styles.nodeLabel}>{node.label}</div>
              </div>

              {/* Arrow to next node */}
              {idx < nodes.length - 1 && (
                <div className={styles.arrow}>↓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.shapeBadge} ${styles['type-start']}`} />
          Start
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.shapeBadge} ${styles['type-process']}`} />
          Process
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.shapeBadge} ${styles['type-decision']}`} />
          Decision
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.shapeBadge} ${styles['type-end']}`} />
          End
        </div>
      </div>
    </div>
  );
});
