import { memo } from 'react';
import { ThreadRow } from '../shared/ThreadRow';
import styles from '../JavaCollectionsVisualizer.module.css';

export const ConcurrentHashMapRenderer = memo(function ConcurrentHashMapRenderer({ viz }) {
  const { segments = [], threads = [] } = viz;
  return (
    <div className={styles.chmContainer}>
      <ThreadRow threads={threads} />
      <div className={styles.chmSegments}>
        {segments.map(seg => (
          <div key={seg.id} className={`${styles.chmSeg} ${seg.locked ? styles.chmSegLocked : ''}`}>
            <div className={styles.chmSegHeader}>
              <span>Seg[{seg.id}]</span>
              {seg.locked && <span className={styles.chmLockBadge}>🔒 {seg.locked}</span>}
            </div>
            <div className={styles.chmBuckets}>
              {seg.buckets.map((chain, j) => (
                <div key={j} className={styles.chmBucket}>
                  <span className={styles.hmBucketIdx}>[{j}]</span>
                  {chain.length === 0
                    ? <span className={styles.hmNull}>∅</span>
                    : chain.map((e, k) => (
                      <span key={k} className={styles.hmEntry} style={{ background: e.state === 'new' ? 'var(--node-default)' : e.state === 'updated' ? 'var(--node-path)' : 'var(--bg-card)' }}>
                        {e.key}→{e.val}
                      </span>
                    ))
                  }
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
