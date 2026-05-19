import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './dp-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import InputPanel from '../../shared/InputPanel/InputPanel';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './DPVisualizer.module.css';

const INF = 999;

export default function DPVisualizer() {
  const { activeId, active, viz, select, metrics, customInputs, rebuild } =
    useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      {active.inputs?.length > 0 && (
        <InputPanel
          key={activeId}
          schema={active.inputs}
          current={customInputs}
          onApply={rebuild}
        />
      )}

      <div className={styles.vizArea}>
        <div className={styles.mainViz}>
          {viz.kind === '1d' && <DP1DView viz={viz} activeId={activeId} />}
          {viz.kind === '2d' && <DP2DView viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />
        </div>
      </div>

      {viz.narration && (
        <div className={styles.narration}>{viz.narration}</div>
      )}

      <div className={styles.bottomPanels}>
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

/* === 1D DP VIEW === */
function DP1DView({ viz, activeId }) {
  const { dp, labels, active, deps, arr, checking } = viz;

  return (
    <div className={styles.dpLayout1d}>
      {(activeId === 'lis' || activeId === 'house-robber') && arr && (
        <div className={styles.arrRow}>
          <div className={styles.rowLabel}>{activeId === 'house-robber' ? 'Houses' : 'Array'}</div>
          <div className={styles.cells}>
            {arr.map((v, i) => (
              <div
                key={i}
                className={`${styles.cell} ${i === active ? styles.cellActive : i === checking ? styles.cellChecking : ''}`}
              >
                <div className={styles.cellVal}>{v}</div>
                <div className={styles.cellIdx}>{i}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.arrRow}>
        <div className={styles.rowLabel}>dp[ ]</div>
        <div className={styles.cells}>
          {dp.map((v, i) => {
            const isDep    = Array.isArray(deps) && deps.includes(i);
            const isActive = i === active;
            const isBase   = Array.isArray(viz.base) ? viz.base.includes(i) : false;
            const isDone   = !isActive && !isDep && !isBase && v !== INF && v !== '?';
            const val      = v === INF ? '∞' : v;
            // Priority: active > dep > base > done > plain
            const stateClass = isActive ? styles.cellActive
                             : isDep    ? styles.cellDep
                             : isBase   ? styles.cellBase
                             : isDone   ? styles.cellDone
                             : '';
            return (
              <div key={i} className={`${styles.cell} ${stateClass}`}>
                <div className={styles.cellVal}>{val}</div>
                <div className={styles.cellIdx}>{labels?.[i] ?? i}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* === 2D DP VIEW === */
function DP2DView({ viz }) {
  const { table, rowLabels, colLabels, activeRow, activeCol, deps } = viz;
  const depSet = new Set((deps || []).map((d) => `${d.r},${d.c}`));

  return (
    <div className={styles.dpLayout2d}>
      <div className={styles.tableWrap}>
        <table className={styles.dpTable}>
          <thead>
            <tr>
              <th className={styles.thCorner} />
              {colLabels.map((cl, j) => (
                <th key={j} className={styles.th}>{cl}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i}>
                <td className={styles.tdLabel}>{rowLabels?.[i] ?? i}</td>
                {row.map((val, j) => {
                  const isActive = i === activeRow && j === activeCol;
                  const isDep    = depSet.has(`${i},${j}`);
                  return (
                    <td
                      key={j}
                      className={`
                        ${styles.td}
                        ${isActive ? styles.tdActive : ''}
                        ${isDep    ? styles.tdDep    : ''}
                        ${i === activeRow && !isActive ? styles.tdRowHighlight : ''}
                        ${j === activeCol && !isActive ? styles.tdColHighlight : ''}
                        ${val > 0 && !isActive && !isDep ? styles.tdFilled : ''}
                      `}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
