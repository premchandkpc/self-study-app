import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const ArrayListRenderer = memo(function ArrayListRenderer({ viz }) {
  const { cells = [], size = 0, capacity = 0, iterPos = -1 } = viz;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)',
    new: 'var(--node-default)',
    active: 'var(--node-comparing)',
    removed: 'var(--pod-crash)',
    shifting: 'var(--node-path)',
    visited: 'var(--node-visited)',
    null: 'transparent',
    'null-elem': 'var(--text-muted)',
    window: 'var(--accent-blue)',
    error: 'var(--pod-crash)',
    copying: 'var(--node-path)',
    orphan: 'var(--text-muted)',
    rehashed: 'var(--node-visited)',
  };
  return (
    <div className={styles.alContainer}>
      <div className={styles.alMeta}>
        <span className={styles.metaBadge}>size: {size}</span>
        <span className={styles.metaBadge}>capacity: {capacity}</span>
      </div>
      <div className={styles.alRow}>
        {cells.map((c, i) => (
          <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[c.state] || 'var(--bg-tertiary)', borderColor: i === iterPos ? 'var(--accent-blue)' : 'var(--border)' }}>
            <span className={styles.alVal}>{c.val !== null ? String(c.val) : ''}</span>
            <span className={styles.alIdx}>{i}</span>
          </div>
        ))}
      </div>
      <div className={styles.alLabels}>
        <span className={styles.alLabel}>← logical size ({size}) →</span>
        <span className={styles.alLabel} style={{ color: 'var(--text-muted)' }}>← allocated capacity ({capacity}) →</span>
      </div>
    </div>
  );
});
