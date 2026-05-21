import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const PriorityQueueRenderer = memo(function PriorityQueueRenderer({ viz }) {
  const { heap = [], size = 0 } = viz;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)',
    new: 'var(--node-default)',
    active: 'var(--node-comparing)',
    removed: 'var(--pod-crash)',
    swapping: 'var(--node-path)',
  };
  const entries = heap.slice(1, size + 1);
  if (entries.length === 0) return <div className={styles.emptyState}>[ empty PriorityQueue ]</div>;
  const levels = [];
  let idx = 0, levelSize = 1;
  while (idx < entries.length) {
    levels.push(entries.slice(idx, idx + levelSize));
    idx += levelSize;
    levelSize *= 2;
  }
  return (
    <div className={styles.pqContainer}>
      <div className={styles.pqMeta}>
        <span className={styles.metaBadge}>size: {size}</span>
        <span className={styles.metaBadge}>min: {entries[0]?.val}</span>
      </div>
      <div className={styles.pqTree}>
        {levels.map((row, d) => (
          <div key={d} className={styles.tmLevel}>
            {row.map((e, i) => (
              <div key={i} className={styles.pqNode} style={{ background: STATE_COLOR[e.state] || 'var(--bg-tertiary)' }}>
                {e.val}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.pqArray}>
        {entries.map((e, i) => (
          <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[e.state] || 'var(--bg-tertiary)' }}>
            <span className={styles.alVal}>{e.val}</span>
            <span className={styles.alIdx}>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
