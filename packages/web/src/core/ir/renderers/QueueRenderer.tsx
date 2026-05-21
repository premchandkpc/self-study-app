// QueueRenderer - FIFO queue visualization
// Used by: Kafka, Redis Lists, RabbitMQ, job queues, message queues

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './QueueRenderer.module.css';

interface QueueElement {
  id: string;
  label: string;
  state: string;
  position: 'head' | 'tail' | 'middle';
}

function buildQueue(scene: IRScene): QueueElement[] {
  // For queues, typically enqueue is left and dequeue is right
  // Edges might represent enqueue/dequeue operations
  const elements = scene.nodes.map((node, idx) => {
    const position =
      idx === 0 ? ('head' as const) : idx === scene.nodes.length - 1 ? ('tail' as const) : ('middle' as const);

    return {
      id: node.id,
      label: node.label,
      state: node.state,
      position,
    };
  });

  return elements;
}

export const QueueRenderer = memo(function QueueRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const elements = buildQueue(scene);

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.queueContainer}>
        {/* Enqueue arrow */}
        <div className={styles.direction}>
          <div className={styles.directionLabel}>Enqueue</div>
          <div className={styles.arrow}>→</div>
        </div>

        {/* Queue elements */}
        <div className={styles.queue}>
          {elements.map((el) => (
            <div
              key={el.id}
              className={`${styles.element} ${styles[`state-${el.state}`]} ${styles[`pos-${el.position}`]}`}
              title={el.label}
            >
              {el.label}
            </div>
          ))}
        </div>

        {/* Dequeue arrow */}
        <div className={styles.direction}>
          <div className={styles.arrow}>→</div>
          <div className={styles.directionLabel}>Dequeue</div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-idle']}`} />
          Waiting
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-active']}`} />
          Processing
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-completed']}`} />
          Done
        </div>
      </div>
    </div>
  );
});
