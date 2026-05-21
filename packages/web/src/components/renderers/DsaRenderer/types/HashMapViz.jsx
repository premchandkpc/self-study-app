import { memo } from 'react';
import { CELL_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

export const HashMapViz = memo(function HashMapViz({ viz }) {
  const { buckets = [], activeBucket = -1, resultIndices = [], nums, activeIndex = -1 } = viz;
  return (
    <div className={styles.hmWrap}>
      {nums?.length > 0 && (
        <div className={styles.hmInputRow}>
          <span className={styles.hmRowLabel}>input</span>
          {nums.map((n, i) => {
            const cc = resultIndices.includes(i) ? 'var(--node-visited)' : i === activeIndex ? 'var(--node-active)' : 'var(--node-default)';
            return (
              <div key={i} className={styles.cell} style={{ '--cc': cc }}>
                <div className={styles.cellVal}>{n}</div>
                <div className={styles.cellIdx}>{i}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.hmTableLabel}>hash table</div>
      {buckets.map((bucket, i) => {
        const isActive = i === activeBucket;
        return (
          <div key={i} className={styles.hmBucket} style={{
            border: isActive ? '1.5px solid var(--node-active)' : undefined,
            background: isActive ? 'color-mix(in srgb, var(--node-active) 10%, transparent)' : undefined,
          }}>
            <span className={styles.hmIdx}>[{i}]</span>
            {bucket.map((entry, j) => (
              <span key={j} className={styles.hmEntry} style={{ background: isActive ? 'var(--node-active)' : undefined }}>
                {entry.key}:{entry.value}
              </span>
            ))}
            {bucket.length === 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>---</span>}
          </div>
        );
      })}
      {resultIndices.length > 0 && <div className={styles.hmResult}>Result: [{resultIndices.join(', ')}]</div>}
    </div>
  );
});
