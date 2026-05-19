import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './dp-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './DPVisualizer.module.css';

const INF = 999;

export default function DPVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.mainViz}>
          {viz.kind === '1d' && <DP1DView viz={viz} activeId={activeId} />}
          {viz.kind === '2d' && <DP2DView viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} />
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

/* === 1D DP VIEW (Fibonacci, Coin Change, LIS) === */
function DP1DView({ viz, activeId }) {
  const { dp, labels, active, deps, arr, checking } = viz;

  return (
    <div className={styles.dpLayout1d}>
      {activeId === 'lis' && arr && (
        <div className={styles.arrRow}>
          <div className={styles.rowLabel}>Array</div>
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
            const isDep = deps?.includes(i);
            const isActive = i === active;
            const val = v === INF ? '∞' : v;
            return (
              <div
                key={i}
                className={`
                  ${styles.cell}
                  ${isActive ? styles.cellActive : ''}
                  ${isDep ? styles.cellDep : ''}
                  ${v === 0 && i === 0 ? styles.cellBase : ''}
                  ${v !== INF && v !== '?' && !isActive ? styles.cellDone : ''}
                `}
              >
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

/* === 2D DP VIEW (Knapsack, LCS) === */
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
                  const isDep = depSet.has(`${i},${j}`);
                  const isActiveRow = i === activeRow && !isActive;
                  const isActiveCol = j === activeCol && !isActive;
                  return (
                    <td
                      key={j}
                      className={`
                        ${styles.td}
                        ${isActive ? styles.tdActive : ''}
                        ${isDep ? styles.tdDep : ''}
                        ${isActiveRow ? styles.tdRowHighlight : ''}
                        ${isActiveCol ? styles.tdColHighlight : ''}
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
