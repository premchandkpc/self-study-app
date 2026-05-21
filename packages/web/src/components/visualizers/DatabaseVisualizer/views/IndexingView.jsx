import { memo } from 'react';
import styles from '../DatabaseVisualizer.module.css';

export const IndexingView = memo(function IndexingView({ viz }) {
  const rows = viz.rows || [];
  const hasIndex = !!viz.index;

  return (
    <div className={styles.indexingContainer}>
      <div className={styles.indexingHeader}>
        <div className={styles.planBadge} data-plan={viz.plan}>
          {viz.plan === 'index-scan' ? '⚡ Index Scan' : '🐢 Sequential Scan'}
        </div>
        {hasIndex && (
          <div className={styles.indexBadge}>
            Index: <span className={styles.indexName}>idx_users_age (B-Tree)</span>
          </div>
        )}
      </div>

      <div className={styles.tableGrid}>
        <div className={styles.tableHeader}>
          <span>id</span><span>name</span><span>age</span><span>state</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className={`${styles.tableRow} ${row.active ? styles.rowActive : ''} ${row.matched ? styles.rowMatched : ''}`}
          >
            <span>{row.id}</span>
            <span>{row.name}</span>
            <span className={row.age === 28 ? styles.targetAge : ''}>{row.age}</span>
            <span>{row.state}</span>
          </div>
        ))}
      </div>

      {hasIndex && (
        <div className={styles.indexView}>
          <div className={styles.indexLabel}>B-Tree Index (age → row pointers)</div>
          <div className={styles.indexEntries}>
            {viz.index.tree.map((entry) => (
              <div key={entry.key} className={`${styles.indexEntry} ${entry.key === 28 ? styles.indexEntryActive : ''}`}>
                <span className={styles.indexKey}>{entry.key}</span>
                <span className={styles.indexArrow}>→</span>
                <span className={styles.indexRowIds}>[{entry.rowIds.join(', ')}]</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
