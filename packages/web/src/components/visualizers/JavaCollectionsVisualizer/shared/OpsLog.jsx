import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const OpsLog = memo(function OpsLog({ ops = [] }) {
  if (!ops.length) return null;
  return (
    <div className={styles.opsLog}>
      {ops.slice(-5).map((op, i) => (
        <div key={i} className={`${styles.opEntry} ${styles[`op-${op.type}`]}`}>
          <span className={styles.opDot} /> {op.msg}
        </div>
      ))}
    </div>
  );
});
