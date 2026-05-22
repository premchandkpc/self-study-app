import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const ThreadRow = memo(function ThreadRow({ threads = [] }) {
  if (!threads.length) return null;
  const STATE_COLOR = {
    running: 'var(--node-default)',
    waiting: 'var(--node-comparing)',
    idle: 'var(--text-muted)',
    blocking: 'var(--pod-crash)',
  };
  return (
    <div className={styles.threadRow}>
      {threads.map(t => (
        <div key={t.id} className={styles.threadChip} style={{ borderColor: STATE_COLOR[t.state] || 'var(--border)' }}>
          <span className={styles.threadDot} style={{ background: STATE_COLOR[t.state] || 'var(--text-muted)' }} />
          <span className={styles.threadName}>{t.name}</span>
          {t.action && <span className={styles.threadAction}>{t.action}</span>}
        </div>
      ))}
    </div>
  );
});
