import { memo } from 'react';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

export const SetViz = memo(function SetViz({ viz }) {
  if (viz.nums && viz.k !== undefined) {
    const { nums = [], activeIndex = -1, windowIndices = [], foundIndices = [] } = viz;
    return (
      <div className={styles.setWrap}>
        <div className={styles.setRow}>
          <span className={styles.setRowLabel}>nums</span>
          {nums.map((n, i) => {
            const cc = foundIndices.includes(i) ? 'var(--node-visited)' : activeIndex === i ? 'var(--node-active)' : windowIndices.includes(i) ? 'var(--node-comparing)' : 'var(--node-default)';
            return (
              <div key={i} className={styles.cell} style={{ '--cc': cc }}>
                <div className={styles.cellVal}>{n}</div>
                <div className={styles.cellIdx}>{i}</div>
              </div>
            );
          })}
        </div>
        <div className={styles.setBadge}>k = {viz.k}</div>
      </div>
    );
  }
  if (viz.arr1) {
    const { arr1 = [], arr2 = [], result = [], activeI = -1, activeJ = -1 } = viz;
    const renderArr = (label, arr, active) => (
      <div className={styles.setRow}>
        <span className={styles.setRowLabel}>{label}</span>
        {arr.map((n, i) => (
          <div key={i} className={styles.cell} style={{ '--cc': active === i ? 'var(--node-active)' : 'var(--node-default)' }}>
            <div className={styles.cellVal}>{n}</div>
            <div className={styles.cellIdx}>{i}</div>
          </div>
        ))}
      </div>
    );
    return (
      <div className={styles.setWrap}>
        {renderArr('A', arr1, activeI)}
        {renderArr('B', arr2, activeJ)}
        {result.length > 0 && (
          <div className={styles.setRow}>
            <span className={styles.setRowLabel}>result</span>
            {result.map((n, i) => <div key={i} className={styles.cell} style={{ '--cc': 'var(--node-visited)' }}><div className={styles.cellVal}>{n}</div></div>)}
          </div>
        )}
      </div>
    );
  }
  const { setA = [], setB = [], union = [], intersect = [], diff = [], highlightA = [], highlightB = [], activeOp } = viz;
  const elColor = (el, isA) => intersect.includes(el) ? 'var(--node-comparing)' : isA ? 'var(--node-active)' : 'var(--node-done)';
  return (
    <div className={styles.setWrap}>
      <div className={styles.vennRow}>
        <div className={styles.setCircle}>
          <div className={styles.setCircleLabel}>A</div>
          <div className={styles.setElems}>
            {setA.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': highlightA.includes(el) ? elColor(el, true) : 'var(--node-default)' }}>{el}</span>)}
          </div>
        </div>
        {activeOp && <div className={styles.setBadge}>{activeOp === 'union' ? 'A ∪ B' : activeOp === 'intersect' ? 'A ∩ B' : activeOp === 'diff' ? 'A − B' : activeOp}</div>}
        <div className={styles.setCircle}>
          <div className={styles.setCircleLabel}>B</div>
          <div className={styles.setElems}>
            {setB.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': highlightB.includes(el) ? elColor(el, false) : 'var(--node-default)' }}>{el}</span>)}
          </div>
        </div>
      </div>
      {(union.length > 0 || diff.length > 0 || intersect.length > 0) && (
        <div className={styles.setResultRow}>
          {union.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A∪B</span>{union.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--node-visited)' }}>{el}</span>)}</div>}
          {intersect.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A∩B</span>{intersect.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--node-comparing)' }}>{el}</span>)}</div>}
          {diff.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A−B</span>{diff.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--pod-crash)' }}>{el}</span>)}</div>}
        </div>
      )}
    </div>
  );
});
