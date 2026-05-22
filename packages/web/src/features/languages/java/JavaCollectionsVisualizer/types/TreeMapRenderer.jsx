import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const TreeMapRenderer = memo(function TreeMapRenderer({ viz }) {
  const { nodes = [], root = null, comparePath = [] } = viz;
  if (nodes.length === 0) return <div className={styles.emptyState}>[ empty TreeMap ]</div>;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)',
    new: 'var(--node-default)',
    comparing: 'var(--node-comparing)',
    active: 'var(--node-comparing)',
    visited: 'var(--node-visited)',
    error: 'var(--pod-crash)',
    window: 'var(--accent-blue)',
  };
  const levels = [];
  const buildLevels = (nodeId, depth) => {
    if (nodeId === null) return;
    const n = nodes.find(x => x.id === nodeId);
    if (!n) return;
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(n);
    buildLevels(n.left, depth + 1);
    buildLevels(n.right, depth + 1);
  };
  buildLevels(root, 0);
  return (
    <div className={styles.tmContainer}>
      {levels.map((levelNodes, d) => (
        <div key={d} className={styles.tmLevel}>
          {levelNodes.map(n => (
            <div key={n.id} className={styles.tmNodeWrap}>
              <div
                className={`${styles.tmNode} ${comparePath.includes(n.id) ? styles.tmComparing : ''}`}
                style={{ background: STATE_COLOR[n.state] || 'var(--bg-tertiary)' }}
              >
                <span className={styles.tmKey}>{n.key}</span>
                {n.val && <span className={styles.tmVal}>{n.val}</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});
