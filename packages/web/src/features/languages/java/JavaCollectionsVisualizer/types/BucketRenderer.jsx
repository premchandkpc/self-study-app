import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const BucketRenderer = memo(function BucketRenderer({ viz }) {
  const { buckets = [], capacity = 8, size = 0, threshold = 0, activeBucket = -1, resizing = false } = viz;
  const isSet = viz.collectionType === 'hashset';
  const STATE_COLOR = {
    idle: 'var(--bg-card)',
    new: 'var(--node-default)',
    active: 'var(--node-comparing)',
    updated: 'var(--node-path)',
    removed: 'var(--pod-crash)',
    error: 'var(--pod-crash)',
    duplicate: 'var(--node-comparing)',
    'null-elem': 'var(--text-muted)',
    copying: 'var(--node-path)',
    rehashed: 'var(--node-visited)',
    orphan: 'var(--text-muted)',
  };
  const visible = buckets.slice(0, Math.min(capacity, 12));
  return (
    <div className={styles.hmContainer}>
      <div className={styles.hmMeta}>
        <span className={styles.metaBadge}>size: {size}</span>
        <span className={styles.metaBadge}>capacity: {capacity}</span>
        <span className={styles.metaBadge}>threshold: {threshold}</span>
        {resizing && <span className={`${styles.metaBadge} ${styles.badgeWarn}`}>⚡ RESIZING</span>}
      </div>
      <div className={styles.hmGrid}>
        {visible.map((chain, i) => (
          <div key={i} className={`${styles.hmBucket} ${i === activeBucket ? styles.hmBucketActive : ''}`}>
            <div className={styles.hmBucketIdx}>[{i}]</div>
            <div className={styles.hmChain}>
              {chain.length === 0
                ? <span className={styles.hmNull}>∅</span>
                : chain.map((e, j) => (
                  <span key={j} className={styles.hmEntry} style={{ background: STATE_COLOR[e.state] || 'var(--bg-card)' }}>
                    {isSet ? `${e.key}` : `${e.key}→${e.val}`}
                  </span>
                ))
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
