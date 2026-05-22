import { memo } from 'react';
import styles from '../DatabaseVisualizer.module.css';

const TransactionColumn = memo(function TransactionColumn({ txn, colorVar }) {
  if (!txn) return null;
  const statusColor = {
    idle: 'var(--text-muted)',
    active: colorVar,
    waiting: 'var(--node-comparing)',
    committed: 'var(--pod-running)',
    rolled_back: 'var(--pod-crash)',
  };

  return (
    <div className={styles.txnCol}>
      <div className={styles.txnHeader} style={{ '--txn-color': colorVar }}>
        <span className={styles.txnId}>{txn.id}</span>
        <span className={styles.txnStatus} style={{ color: statusColor[txn.status] || 'var(--text-muted)' }}>
          {txn.status}
        </span>
      </div>
      <div className={styles.txnOps}>
        {(txn.ops || []).map((op, i) => (
          <div key={i} className={styles.txnOp}>
            <span className={styles.txnOpNum}>{i + 1}</span>
            <span className={styles.txnOpText}>{op}</span>
          </div>
        ))}
        {(!txn.ops || txn.ops.length === 0) && (
          <div className={styles.txnEmpty}>— idle —</div>
        )}
      </div>
    </div>
  );
});

export const TransactionsView = memo(function TransactionsView({ viz }) {
  const [t1, t2] = viz.transactions || [{}, {}];
  const row = viz.rows?.[0];

  return (
    <div className={styles.txnLayout}>
      <TransactionColumn txn={t1} colorVar="var(--node-active)" />

      <div className={styles.txnCenter}>
        <div className={styles.txnCenterLabel}>Shared Data</div>
        {row && (
          <div className={`${styles.sharedRow} ${row.lockedBy ? styles.sharedRowLocked : ''}`}>
            <div className={styles.sharedRowHeader}>
              <span className={styles.sharedRowId}>accounts.id={row.id}</span>
              {row.lockedBy && (
                <span className={styles.lockBadge}>🔒 {row.lockedBy}</span>
              )}
            </div>
            <div className={styles.sharedRowVersion}>version: v{row.version}</div>
            <div className={styles.mvccVersions}>
              <div className={styles.mvccRow}>
                <span className={styles.mvccTxn}>T1 sees:</span>
                <span className={styles.mvccVal}>{row.visible?.T1 ?? row.val}</span>
              </div>
              <div className={styles.mvccRow}>
                <span className={styles.mvccTxn}>T2 sees:</span>
                <span className={styles.mvccVal}>{row.visible?.T2 ?? row.val}</span>
              </div>
            </div>
          </div>
        )}

        {viz.locks?.length > 0 && (
          <div className={styles.locksPanel}>
            <div className={styles.locksLabel}>Active Locks</div>
            {viz.locks.map((lock, i) => (
              <div key={i} className={styles.lockEntry}>
                <span className={styles.lockResource}>{lock.resource}</span>
                <span className={styles.lockType}>{lock.type}</span>
                <span className={styles.lockHolder}>{lock.holder}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionColumn txn={t2} colorVar="var(--kafka-producer)" />
    </div>
  );
});
