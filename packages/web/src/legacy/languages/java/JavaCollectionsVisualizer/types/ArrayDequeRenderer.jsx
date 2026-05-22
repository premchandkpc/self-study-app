import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const ArrayDequeRenderer = memo(function ArrayDequeRenderer({ viz }) {
  const { slots = [], head = 0, tail = 0, size = 0, capacity = 8 } = viz;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)',
    new: 'var(--node-default)',
    empty: 'transparent',
    active: 'var(--node-comparing)',
    error: 'var(--pod-crash)',
  };
  return (
    <div className={styles.adContainer}>
      <div className={styles.hmMeta}>
        <span className={styles.metaBadge}>size: {size}</span>
        <span className={styles.metaBadge}>head: {head}</span>
        <span className={styles.metaBadge}>tail: {tail}</span>
      </div>
      <div className={styles.alRow}>
        {slots.map((s, i) => (
          <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[s.state] || 'var(--bg-tertiary)', borderColor: i === head ? 'var(--node-comparing)' : i === (tail - 1 + capacity) % capacity ? 'var(--node-default)' : 'var(--border)' }}>
            <span className={styles.alVal}>{s.val !== null ? String(s.val) : ''}</span>
            <span className={styles.alIdx}>{i === head ? 'H' : i === (tail - 1 + capacity) % capacity && size > 0 ? 'T' : i}</span>
          </div>
        ))}
      </div>
      <div className={styles.alLabels}>
        <span style={{ color: 'var(--node-comparing)', fontWeight: 600 }}>H=head</span>
        <span style={{ color: 'var(--node-default)', fontWeight: 600, marginLeft: 'var(--space-md)' }}>T=tail</span>
      </div>
    </div>
  );
});
