import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const LinkedListRenderer = memo(function LinkedListRenderer({ viz }) {
  const { nodes = [], head, cursor } = viz;
  if (nodes.length === 0) {
    return <div className={styles.emptyState}>[ empty list ] head=null tail=null</div>;
  }
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)',
    new: 'var(--node-default)',
    active: 'var(--node-comparing)',
    visited: 'var(--node-visited)',
    removed: 'var(--pod-crash)',
    error: 'var(--pod-crash)',
  };
  const ordered = [];
  let cur = head;
  const seen = new Set();
  while (cur !== null && !seen.has(cur)) {
    const n = nodes.find(x => x.id === cur);
    if (!n) break;
    ordered.push(n);
    seen.add(cur);
    cur = n.next;
  }
  return (
    <div className={styles.llContainer}>
      <div className={styles.llPointers}>
        <span className={styles.llPointer}>head</span>
        <span className={styles.llArrow}>→</span>
      </div>
      <div className={styles.llRow}>
        {ordered.map((n, i) => (
          <div key={n.id} className={styles.llNodeWrap}>
            <div
              className={`${styles.llNode} ${n.id === cursor ? styles.llCursor : ''}`}
              style={{ background: STATE_COLOR[n.state] || 'var(--bg-tertiary)' }}
            >
              <div className={styles.llNodeVal}>{n.val}</div>
              <div className={styles.llNodeId}>node</div>
            </div>
            {i < ordered.length - 1 && <span className={styles.llArrow}>⟷</span>}
          </div>
        ))}
        <span className={styles.llNull}>null</span>
      </div>
      <div className={styles.llPointers} style={{ justifyContent: 'flex-end', paddingRight: '120px' }}>
        <span className={styles.llArrow}>→</span>
        <span className={styles.llPointer}>tail</span>
      </div>
    </div>
  );
});
