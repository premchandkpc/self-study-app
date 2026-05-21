import { memo } from 'react';
import styles from '../DatabaseVisualizer.module.css';

export const JoinsView = memo(function JoinsView({ viz }) {
  const leftRows = viz.leftTable || [];
  const rightRows = viz.rightTable || [];

  return (
    <div className={styles.joinsContainer}>
      <div className={styles.algorithmBadge}>
        {viz.algorithm === 'hash' ? '⚡ Hash Join — O(n+m)' : '🔄 Nested Loop — O(n×m)'}
      </div>

      <div className={styles.joinsLayout}>
        <div className={styles.joinTable}>
          <div className={styles.joinTableLabel}>employees (left)</div>
          <div className={styles.joinTableHeader}><span>id</span><span>name</span><span>dept_id</span></div>
          {leftRows.map((row) => (
            <div key={row.id} className={`${styles.joinRow} ${row.active ? styles.joinRowActive : ''} ${row.matched ? styles.joinRowMatched : ''}`}>
              <span>{row.id}</span>
              <span>{row.name}</span>
              <span>{row.deptId}</span>
            </div>
          ))}
        </div>

        <div className={styles.joinCenter}>
          <div className={styles.joinCenterLabel}>JOIN ON</div>
          <div className={styles.joinCondition}>dept_id = id</div>
          {Object.keys(viz.hashTable || {}).length > 0 && (
            <div className={styles.hashTableView}>
              <div className={styles.hashTableLabel}>Hash Table</div>
              {Object.entries(viz.hashTable).map(([k, v]) => (
                <div key={k} className={styles.hashEntry}>
                  <span className={styles.hashKey}>{k}</span>
                  <span>→</span>
                  <span className={styles.hashVal}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {(viz.joined || []).length > 0 && (
            <div className={styles.joinedRows}>
              <div className={styles.joinedLabel}>Result</div>
              {viz.joined.map((r, i) => (
                <div key={i} className={styles.joinedRow}>
                  {r.name} | {r.dept}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.joinTable}>
          <div className={styles.joinTableLabel}>departments (right)</div>
          <div className={styles.joinTableHeader}><span>id</span><span>dept</span></div>
          {rightRows.map((row) => (
            <div key={row.id} className={`${styles.joinRow} ${row.active ? styles.joinRowActive : ''} ${row.matched ? styles.joinRowMatched : ''}`}>
              <span>{row.id}</span>
              <span>{row.dept}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
