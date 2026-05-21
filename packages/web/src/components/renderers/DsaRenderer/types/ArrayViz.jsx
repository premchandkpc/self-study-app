import { memo } from 'react';
import { CELL_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

export const ArrayViz = memo(function ArrayViz({ viz }) {
  const { cells = [], pointers = {}, window: win } = viz;
  return (
    <div className={styles.arrayWrap}>
      {cells.map((cell, i) => {
        const val = cell.value ?? cell.val;
        const color = CELL_COLORS[cell.state] || CELL_COLORS.idle;
        const inWin = win && i >= win.left && i <= win.right;
        const ptrs = Object.entries(pointers).filter(([, v]) => v === i).map(([k]) => k);
        return (
          <div key={i} className={`${styles.cell} ${inWin ? styles.inWin : ''}`} style={{ '--cc': color }}>
            <div className={styles.cellVal}>{val}</div>
            <div className={styles.cellIdx}>{i}</div>
            {ptrs.length > 0 && <div className={styles.ptr}>{ptrs.join('/')}</div>}
          </div>
        );
      })}
    </div>
  );
});
