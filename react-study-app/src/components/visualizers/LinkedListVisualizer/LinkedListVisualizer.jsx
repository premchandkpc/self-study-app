import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './linkedlist-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './LinkedListVisualizer.module.css';

const NODE_STATE_CLASS = {
  idle:    styles.nodeIdle,
  active:  styles.nodeActive,
  prev:    styles.nodePrev,
  curr:    styles.nodeCurr,
  next:    styles.nodeNext,
  slow:    styles.nodeSlow,
  fast:    styles.nodeFast,
  meet:    styles.nodeMeet,
  visited: styles.nodeVisited,
  done:    styles.nodeDone,
};

const POINTER_LABEL = {
  prev: 'prev',
  curr: 'curr',
  next: 'next',
  slow: 'slow',
  fast: 'fast',
  meet: 'slow/fast',
  active: 'tail',
};

export default function LinkedListVisualizer() {
  const { activeId, active, viz, select } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  // Scenario: reverse / cycle-detect use viz.nodes
  // Scenario: merge-sorted uses viz.list1, viz.list2, viz.mergedNodes
  const isMerge = activeId === 'merge-sorted';

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.arena}>
        <div className={styles.listsArea}>
          {isMerge ? (
            <>
              <div className={styles.listLabel}>List 1</div>
              <NodeRow nodes={viz.list1 || []} showCycleBack={false} />
              <div className={styles.listLabel}>List 2</div>
              <NodeRow nodes={viz.list2 || []} showCycleBack={false} />
              {(viz.mergedNodes || []).length > 0 && (
                <>
                  <div className={styles.listLabel}>Merged</div>
                  <NodeRow nodes={viz.mergedNodes || []} showCycleBack={false} />
                </>
              )}
            </>
          ) : (
            <NodeRow nodes={viz.nodes || []} showCycleBack={activeId === 'cycle-detect'} cycleTarget={viz.cycleTarget} />
          )}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />
        </div>
      </div>

      <div className={styles.bottom}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function NodeRow({ nodes, showCycleBack, cycleTarget }) {
  if (!nodes || !nodes.length) return null;
  return (
    <div className={styles.nodeRow}>
      {nodes.map((node, i) => (
        <div key={node.id ?? i} className={styles.nodeWrapper}>
          <Node node={node} />
          {/* Arrow to next */}
          {node.nextIdx !== -1 && node.nextIdx !== undefined && !node.hasCycleArrow && (
            <div className={styles.arrow}>→</div>
          )}
          {/* Cycle back arrow */}
          {node.hasCycleArrow && showCycleBack && (
            <div className={styles.cycleArrow} title={`→ node[${cycleTarget}]`}>
              ↩{cycleTarget}
            </div>
          )}
          {/* Null terminator */}
          {(node.nextIdx === -1 || node.nextIdx === undefined) && !node.hasCycleArrow && (
            <div className={styles.nullLabel}>→ null</div>
          )}
        </div>
      ))}
    </div>
  );
}

function Node({ node }) {
  const extraCls = NODE_STATE_CLASS[node.state] || NODE_STATE_CLASS.idle;
  const label    = POINTER_LABEL[node.state];
  return (
    <div className={`${styles.node} ${extraCls}`}>
      <div className={styles.nodeVal}>{node.val}</div>
      <div className={styles.nodeNext}>next</div>
      {label && <div className={styles.pointerBadge}>{label}</div>}
    </div>
  );
}
