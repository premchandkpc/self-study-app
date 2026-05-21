import { memo } from 'react';
import { CELL_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

const INF_VAL = 999;

function dpColor(i, active, base, deps) {
  if (i === active) return CELL_COLORS.active;
  if (deps.includes(i)) return CELL_COLORS.comparing;
  if (base.includes(i)) return CELL_COLORS.done;
  return CELL_COLORS.idle;
}

export const DPViz = memo(function DPViz({ viz }) {
  const is2D = viz.kind === '2d' || (viz.table && !viz.dp);
  if (is2D) {
    const table = viz.table || [];
    const aR = viz.activeRow ?? -1;
    const aC = viz.activeCol ?? -1;
    const deps = viz.deps || [];
    const rowLabels = viz.rowLabels || [];
    const colLabels = viz.colLabels || [];
    if (!table.length) return null;
    return (
      <div className={styles.dpGrid} style={{ overflowX: 'auto' }}>
        <div className={styles.dpGridRow}>
          <div className={styles.dpHdr} style={{ minWidth: 52, background: 'transparent', border: 'none' }} />
          {colLabels.map((lbl, c) => <div key={c} className={styles.dpHdr}>{lbl}</div>)}
        </div>
        {table.map((row, r) => (
          <div key={r} className={styles.dpGridRow}>
            <div className={styles.dpHdr}>{rowLabels[r] ?? r}</div>
            {row.map((val, c) => {
              const isDep = deps.some((d) => d.r === r && d.c === c);
              const isActive = r === aR && c === aC;
              let color = CELL_COLORS.idle;
              if (isActive) color = CELL_COLORS.active;
              else if (isDep) color = CELL_COLORS.comparing;
              return <div key={c} className={styles.dpCell} style={{ '--cc': color }}>{val === INF_VAL ? '∞' : val}</div>;
            })}
          </div>
        ))}
      </div>
    );
  }
  const dp = viz.dp || [];
  const active = viz.active ?? -1;
  const base = viz.base || [];
  const deps = viz.deps || [];
  const labels = viz.labels || dp.map((_, i) => `[${i}]`);
  if (!dp.length) return null;
  return (
    <div style={{ padding: 12, overflowX: 'auto' }}>
      <div className={styles.dpRow}>
        {dp.map((val, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div className={styles.dpHdr}>{labels[i]}</div>
            <div className={styles.dpCell} style={{ '--cc': dpColor(i, active, base, deps) }}>
              {val === INF_VAL ? '∞' : val ?? '?'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
