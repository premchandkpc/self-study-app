import { memo } from 'react';
import styles from '../RedisVisualizer.module.css';

export const KeyValue = memo(function KeyValue({ entry }) {
  if (entry.type === 'string') {
    return <span className={styles.strVal}>"{entry.val}"</span>;
  }
  if (entry.type === 'list') {
    return (
      <div className={styles.listVal}>
        {entry.val.map((v, i) => (
          <span key={i} className={styles.listItem}>{v}</span>
        ))}
      </div>
    );
  }
  if (entry.type === 'hash') {
    return (
      <div className={styles.hashVal}>
        {Object.entries(entry.val).map(([k, v]) => (
          <div key={k} className={styles.hashField}>
            <span className={styles.hashFieldKey}>{k}:</span>
            <span className={styles.hashFieldVal}>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (entry.type === 'set') {
    return (
      <div className={styles.setVal}>
        {'{'}
        {entry.val.map((v, i) => (
          <span key={i} className={styles.setMember}>{v}{i < entry.val.length - 1 ? ', ' : ''}</span>
        ))}
        {'}'}
      </div>
    );
  }
  if (entry.type === 'zset') {
    return (
      <div className={styles.zsetVal}>
        {entry.val.map((item, i) => (
          <div key={i} className={styles.zsetItem}>
            <span className={styles.zsetRank}>#{i + 1}</span>
            <span className={styles.zsetMember}>{item.member}</span>
            <span className={styles.zsetScore}>{item.score}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
});
