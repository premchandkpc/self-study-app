import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './set-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './SetVisualizer.module.css';

export default function SetVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  const activeOp    = viz.activeOp;
  const setA        = viz.setA || [];
  const setB        = viz.setB || [];
  const union       = viz.union || [];
  const intersect   = viz.intersect || [];
  const diff        = viz.diff || [];
  const highlightA  = viz.highlightA || [];
  const highlightB  = viz.highlightB || [];

  // For two-pointers
  const arr1          = viz.arr1 || [];
  const arr2          = viz.arr2 || [];
  const result        = viz.result || [];
  const activeI       = viz.activeI ?? -1;
  const activeJ       = viz.activeJ ?? -1;

  // For contains-duplicate
  const nums          = viz.nums || [];
  const activeIndex   = viz.activeIndex ?? -1;
  const windowIndices = viz.windowIndices || [];
  const foundIndices  = viz.foundIndices || [];

  const isOpsScenario  = activeId === 'operations';
  const isTwoPtrScenario = activeId === 'two-pointers';
  const isDupScenario  = activeId === 'contains-duplicate';

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.setsPanel}>

          {/* === SET OPERATIONS VIEW === */}
          {isOpsScenario && (
            <div className={styles.vennLayout}>
              <SetCircle
                label="A"
                elements={setA}
                highlighted={highlightA}
                color="var(--node-default)"
              />
              <div className={styles.vennMiddle}>
                {intersect.length > 0 && (
                  <div className={styles.intersectZone}>
                    <span className={styles.zoneLabel}>A∩B</span>
                    {intersect.map((el) => (
                      <span key={el} className={`${styles.element} ${styles.elIntersect}`}>{el}</span>
                    ))}
                  </div>
                )}
                {activeOp && activeOp !== 'none' && (
                  <div className={styles.opBadge}>{activeOp === 'union' ? 'A ∪ B' : activeOp === 'intersect' ? 'A ∩ B' : activeOp === 'diff' ? 'A − B' : 'All Ops'}</div>
                )}
              </div>
              <SetCircle
                label="B"
                elements={setB}
                highlighted={highlightB}
                color="var(--node-done)"
              />
            </div>
          )}

          {isOpsScenario && (union.length > 0 || diff.length > 0) && (
            <div className={styles.resultsRow}>
              {union.length > 0 && (
                <div className={styles.resultBox}>
                  <span className={styles.resultLabel}>A∪B</span>
                  {union.map((el) => <span key={el} className={`${styles.element} ${styles.elUnion}`}>{el}</span>)}
                </div>
              )}
              {diff.length > 0 && (
                <div className={styles.resultBox}>
                  <span className={styles.resultLabel}>A−B</span>
                  {diff.map((el) => <span key={el} className={`${styles.element} ${styles.elDiff}`}>{el}</span>)}
                </div>
              )}
            </div>
          )}

          {/* === TWO POINTERS VIEW === */}
          {isTwoPtrScenario && (
            <div className={styles.mergeLayout}>
              <ArrayRow label="A" arr={arr1} activeIdx={activeI} matchIndices={[]} />
              <ArrayRow label="B" arr={arr2} activeIdx={activeJ} matchIndices={[]} />
              {result.length > 0 && (
                <div className={styles.mergeResult}>
                  <span className={styles.rowLabel}>result</span>
                  {result.map((el, i) => (
                    <span key={i} className={`${styles.element} ${styles.elVisited}`}>{el}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === CONTAINS DUPLICATE VIEW === */}
          {isDupScenario && (
            <div className={styles.dupLayout}>
              <div className={styles.arrayRow}>
                <span className={styles.rowLabel}>nums</span>
                {nums.map((n, i) => {
                  const inWindow  = windowIndices.includes(i);
                  const isActive  = activeIndex === i;
                  const isFound   = foundIndices.includes(i);
                  return (
                    <div key={i} className={styles.arrayCell}>
                      <span
                        className={`${styles.arrayBox}
                          ${isFound ? styles.arrayFound : ''}
                          ${isActive ? styles.arrayActive : ''}
                          ${inWindow && !isActive && !isFound ? styles.arrayWindow : ''}`}
                      >
                        {n}
                      </span>
                      <span className={styles.arrayIdx}>{i}</span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.kBadge}>k = {viz.k}</div>
            </div>
          )}

          {viz.narration && (
            <div className={styles.narration}>{viz.narration}</div>
          )}
        </div>

        <VariablesPanel vars={viz?.vars} result={viz?.result} />
      </div>

      <div className={styles.bottom}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function SetCircle({ label, elements, highlighted, color }) {
  return (
    <div className={styles.setCircle} style={{ '--set-color': color }}>
      <div className={styles.setLabel}>{label}</div>
      <div className={styles.setElements}>
        {elements.map((el) => (
          <span
            key={el}
            className={`${styles.element} ${highlighted.includes(el) ? styles.elHighlighted : styles.elDefault}`}
          >
            {el}
          </span>
        ))}
      </div>
    </div>
  );
}

function ArrayRow({ label, arr, activeIdx, matchIndices }) {
  return (
    <div className={styles.arrayRow}>
      <span className={styles.rowLabel}>{label}</span>
      {arr.map((n, i) => (
        <div key={i} className={styles.arrayCell}>
          <span className={`${styles.arrayBox} ${activeIdx === i ? styles.arrayActive : matchIndices.includes(i) ? styles.arrayFound : ''}`}>
            {n}
          </span>
          <span className={styles.arrayIdx}>{i}</span>
        </div>
      ))}
    </div>
  );
}
