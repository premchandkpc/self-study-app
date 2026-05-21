import { memo } from 'react';
import styles from '../RedisVisualizer.module.css';

const ClusterNode = memo(function ClusterNode({ node, isTarget }) {
  const isDown  = node.state === 'down';
  const isMaster = node.role === 'master';

  return (
    <div
      className={`${styles.clusterNode} ${isTarget ? styles.clusterNodeTarget : ''} ${isDown ? styles.clusterNodeDown : ''}`}
      style={{ '--cn-color': isDown ? 'var(--pod-crash)' : isMaster ? 'var(--node-active)' : 'var(--node-default)' }}
    >
      <div className={styles.cnHeader}>
        <span className={styles.cnId}>{node.id}</span>
        {isDown && <span className={styles.cnDown}>DOWN</span>}
        {!isDown && isMaster && <span className={styles.cnRole}>M</span>}
        {!isDown && !isMaster && <span className={styles.cnRoleReplica}>R</span>}
      </div>
      <div className={styles.cnSlots}>
        slots {node.slots[0]}–{node.slots[1]}
      </div>
      <div className={styles.cnKeys}>{node.keys} keys</div>
    </div>
  );
});

export const ClusterView = memo(function ClusterView({ viz }) {
  const masters  = (viz.nodes || []).filter((n) => n.role === 'master');
  const replicas = (viz.nodes || []).filter((n) => n.role === 'replica');

  return (
    <div className={styles.clusterLayout}>
      {viz.hashSlot !== null && (
        <div className={styles.routingBar}>
          <span className={styles.routingKey}>Key: <b>{viz.key}</b></span>
          <span className={styles.routingArrow}>→</span>
          <span className={styles.routingSlot}>slot {viz.hashSlot}</span>
          <span className={styles.routingArrow}>→</span>
          <span className={styles.routingNode}>{viz.targetNode}</span>
        </div>
      )}

      <div className={styles.clusterTier}>
        <div className={styles.clusterTierLabel}>Masters</div>
        <div className={styles.clusterNodes}>
          {masters.map((node) => (
            <ClusterNode key={node.id} node={node} isTarget={node.id === viz.targetNode} />
          ))}
        </div>
      </div>

      <div className={styles.clusterReplication}>
        <div className={styles.repLabel}>Async Replication</div>
        <div className={styles.repLines}>
          {masters.map((m) => (
            <div key={m.id} className={styles.repLine}>{m.id} → R{m.id.slice(1)}</div>
          ))}
        </div>
      </div>

      <div className={styles.clusterTier}>
        <div className={styles.clusterTierLabel}>Replicas</div>
        <div className={styles.clusterNodes}>
          {replicas.map((node) => (
            <ClusterNode key={node.id} node={node} isTarget={false} />
          ))}
        </div>
      </div>
    </div>
  );
});
