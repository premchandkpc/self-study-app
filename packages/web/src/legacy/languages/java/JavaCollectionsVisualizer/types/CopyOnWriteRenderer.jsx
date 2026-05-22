import { memo } from 'react';
import { ThreadRow } from '../shared/ThreadRow';
import styles from '../JavaCollectionsVisualizer.module.css';

export const CopyOnWriteRenderer = memo(function CopyOnWriteRenderer({ viz }) {
  const { main = [], copy = null, threads = [] } = viz;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)',
    new: 'var(--node-default)',
    copying: 'var(--node-path)',
    active: 'var(--node-comparing)',
    error: 'var(--pod-crash)',
  };
  return (
    <div className={styles.cowContainer}>
      <ThreadRow threads={threads} />
      <div className={styles.cowLabel}>Main array (committed):</div>
      <div className={styles.alRow}>
        {main.map((c, i) => (
          <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[c.state] || 'var(--bg-tertiary)' }}>
            <span className={styles.alVal}>{c.val}</span>
            <span className={styles.alIdx}>{i}</span>
          </div>
        ))}
        {main.length === 0 && <span className={styles.emptyState}>[ empty ]</span>}
      </div>
      {copy !== null && (
        <>
          <div className={styles.cowLabel} style={{ color: 'var(--node-default)' }}>Write copy (in progress):</div>
          <div className={styles.alRow}>
            {copy.map((c, i) => (
              <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[c.state] || 'var(--bg-tertiary)', borderColor: 'var(--node-default)' }}>
                <span className={styles.alVal}>{c.val}</span>
                <span className={styles.alIdx}>{i}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
});
