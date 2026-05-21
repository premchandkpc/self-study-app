// NetworkRenderer - Network/connectivity visualization
// Used by: Network topologies, distributed clusters, node connections, peer-to-peer

import { memo } from 'react';
import { IRScene } from '../schema';
import styles from './NetworkRenderer.module.css';

export const NetworkRenderer = memo(function NetworkRenderer({
  scene,
}: {
  scene: IRScene;
}) {
  const nodeCount = scene.nodes.length;
  const edgeCount = scene.edges.length;
  const avgDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;

  // Group nodes by state for better visualization
  const nodesByState = new Map<string, typeof scene.nodes>();
  scene.nodes.forEach((node) => {
    const state = node.state || 'idle';
    if (!nodesByState.has(state)) nodesByState.set(state, []);
    nodesByState.get(state)!.push(node);
  });

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{scene.title}</h4>

      {scene.description && (
        <div className={styles.description}>{scene.description}</div>
      )}

      <div className={styles.networkView}>
        {/* Grid of nodes grouped by state */}
        <div className={styles.grid}>
          {Array.from(nodesByState.entries()).map(([state, nodes]) => (
            <div key={state} className={styles.stateGroup}>
              <div className={styles.stateLabel}>{state}</div>
              <div className={styles.nodeCluster}>
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className={`${styles.networkNode} ${styles[`state-${state}`]}`}
                    title={node.label}
                  >
                    <div className={styles.nodeName}>{node.label.substring(0, 3)}</div>
                    <div className={styles.nodeFull}>{node.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{nodeCount}</div>
          <div className={styles.statLabel}>Nodes</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{edgeCount}</div>
          <div className={styles.statLabel}>Links</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{avgDegree.toFixed(1)}</div>
          <div className={styles.statLabel}>Avg Degree</div>
        </div>
      </div>

      {/* Connection legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-idle']}`} />
          Idle
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-active']}`} />
          Active
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles['state-completed']}`} />
          Complete
        </div>
      </div>
    </div>
  );
});
