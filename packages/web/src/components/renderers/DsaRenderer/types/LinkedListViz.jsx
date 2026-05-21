import { memo } from 'react';
import { DSA_NODE_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

const LL_PTR_LABEL = {
  prev: 'prev', curr: 'curr', next: 'next',
  slow: 'slow', fast: 'fast', meet: 'slow=fast',
  active: '●', done: '✓',
};

const LLNode = memo(function LLNode({ n }) {
  const color = DSA_NODE_COLORS[n.state] || DSA_NODE_COLORS.idle;
  const lbl = LL_PTR_LABEL[n.state];
  return (
    <div className={styles.llNode} style={{ '--nc': color }}>
      <div className={styles.llVal}>{n.val}</div>
      {lbl && <div className={styles.llPtr}>{lbl}</div>}
    </div>
  );
});

const LLRow = memo(function LLRow({ nodes, label, cycleTarget = -1 }) {
  const isCyclic = cycleTarget >= 0;
  return (
    <div className={styles.llSection}>
      {label && <span className={styles.llSectionLbl}>{label}</span>}
      <div className={styles.llWrap}>
        {nodes.map((n, i) => {
          const isLast = i === nodes.length - 1;
          return (
            <div key={n.id ?? i} className={styles.llItem}>
              <LLNode n={n} />
              {isLast
                ? isCyclic
                  ? <span className={styles.llCycleArrow}>↩ [{cycleTarget}]</span>
                  : <span className={styles.llNull}>→ ∅</span>
                : <span className={styles.llArrow}>→</span>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const LinkedListViz = memo(function LinkedListViz({ viz }) {
  if (viz.list1 !== undefined) {
    const list1 = viz.list1 || [];
    const list2 = viz.list2 || [];
    const merged = viz.mergedNodes || [];
    return (
      <div className={styles.llMultiWrap}>
        <LLRow nodes={list1} label="L1" />
        <LLRow nodes={list2} label="L2" />
        {merged.length > 0 && <LLRow nodes={merged} label="Merged" />}
      </div>
    );
  }
  const nodes = viz.nodes || [];
  const cycleTarget = viz.cycleTarget ?? -1;
  return (
    <div className={styles.llMultiWrap}>
      <LLRow nodes={nodes} cycleTarget={cycleTarget} />
    </div>
  );
});
