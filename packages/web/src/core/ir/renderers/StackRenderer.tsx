// StackRenderer - LIFO stack visualization
// Used by: Function call stacks, browser history, undo/redo, parser stacks

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './StackRenderer.module.css';

interface StackFrame {
  id: string;
  label: string;
  state: string;
  depth: number;
}

function buildStack(scene: IRScene): StackFrame[] {
  // For stacks, typically the last node is the top
  return scene.nodes.map((node, idx) => ({
    id: node.id,
    label: node.label,
    state: node.state,
    depth: scene.nodes.length - 1 - idx, // Reverse index for stack visualization
  }));
}

export const StackRenderer = memo(function StackRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const frames = buildStack(scene);

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.stackContainer}>
        <div className={styles.operations}>
          <div className={styles.op}>Push ↓</div>
        </div>

        <div className={styles.stack}>
          {frames.map((frame) => (
            <div
              key={frame.id}
              className={`${styles.frame} ${styles[`state-${frame.state}`]}`}
              style={{ zIndex: 100 - frame.depth }}
              title={frame.label}
            >
              <div className={styles.frameLabel}>{frame.label}</div>
              <div className={styles.frameDepth}>Depth: {frame.depth}</div>
            </div>
          ))}
        </div>

        <div className={styles.operations}>
          <div className={styles.op}>Pop ↑</div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-idle']}`} />
          Ready
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-active']}`} />
          Current
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-completed']}`} />
          Returned
        </div>
      </div>
    </div>
  );
});
