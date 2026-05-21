// TimelineRenderer - Sequential temporal visualization
// Used by: GC pauses, event sequences, TCP handshakes, scheduling

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './TimelineRenderer.module.css';

export const TimelineRenderer = memo(function TimelineRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  // Sort nodes by some order (default: encounter order)
  const sortedNodes = [...scene.nodes];

  // Build timeline: node → edges (outgoing) → target nodes
  const timelineItems = sortedNodes.map((node, idx) => {
    const outgoing = scene.edges.filter((e) => e.from === node.id);
    return {
      index: idx,
      node,
      nextLabel: outgoing[0]?.label || '→',
    };
  });

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      <div className={styles.timeline}>
        {timelineItems.map((item, idx) => (
          <div key={item.node.id} className={styles.timelineItem}>
            {/* Event bubble */}
            <div
              className={`${styles.eventBubble} ${styles[`state-${item.node.state}`]}`}
            >
              {item.node.label}
            </div>

            {/* Arrow to next event */}
            {idx < timelineItems.length - 1 && (
              <div className={styles.arrow}>{item.nextLabel}</div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}
    </div>
  );
});
