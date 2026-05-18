import { useEffect, useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { NODE_COLORS } from '../../../core/constants/colors';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import styles from './ArrayVisualizer.module.css';

const SLIDING_WINDOW_CODE = [
  'function maxSumWindow(arr, k) {',
  '  let windowSum = 0, maxSum = 0;',
  '  for (let i = 0; i < k; i++) {',
  '    windowSum += arr[i];',
  '  }',
  '  maxSum = windowSum;',
  '  for (let i = k; i < arr.length; i++) {',
  '    windowSum += arr[i] - arr[i - k];',
  '    maxSum = Math.max(maxSum, windowSum);',
  '  }',
  '  return maxSum;',
  '}',
];

function buildSteps(arr, k) {
  const steps = [];
  const cells = arr.map((v, i) => ({ value: v, state: 'default', index: i }));

  let windowSum = 0;
  for (let i = 0; i < k; i++) {
    windowSum += arr[i];
    const snapshot = cells.map((c) => ({ ...c, state: i <= i ? 'active' : 'default' }));
    steps.push({
      cells: cells.map((c, idx) => ({ ...c, state: idx <= i ? 'active' : 'default' })),
      window: { left: 0, right: i },
      narration: `Building first window: add ${arr[i]} → sum = ${windowSum}`,
      codeLine: 3,
      complexity: { ops: i + 1, label: 'O(n)', space: 'O(1)' },
    });
  }

  let maxSum = windowSum;
  steps.push({
    cells: cells.map((c, idx) => ({ ...c, state: idx < k ? 'visiting' : 'default' })),
    window: { left: 0, right: k - 1 },
    narration: `First window sum = ${windowSum}. This is our initial maxSum.`,
    codeLine: 6,
    complexity: { ops: k, label: 'O(n)', space: 'O(1)' },
  });

  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k];
    maxSum = Math.max(maxSum, windowSum);
    steps.push({
      cells: cells.map((c, idx) => {
        if (idx === i - k) return { ...c, state: 'removing' };
        if (idx === i) return { ...c, state: 'adding' };
        if (idx > i - k && idx <= i) return { ...c, state: 'visiting' };
        if (idx < i - k) return { ...c, state: 'visited' };
        return { ...c, state: 'default' };
      }),
      window: { left: i - k + 1, right: i },
      narration: `Slide window [${i - k + 1}..${i}]: sum = ${windowSum}, max = ${maxSum}`,
      codeLine: 8,
      complexity: { ops: k + (i - k + 1), label: 'O(n)', space: 'O(1)' },
    });
  }

  steps.push({
    cells: cells.map((c) => ({ ...c, state: 'done' })),
    window: null,
    narration: `Done! Maximum window sum = ${maxSum}`,
    codeLine: 11,
    complexity: { ops: arr.length, label: 'O(n)', space: 'O(1)' },
  });

  return steps;
}

const STATE_COLOR_MAP = {
  default:  NODE_COLORS.DEFAULT,
  active:   NODE_COLORS.ACTIVE,
  visiting: NODE_COLORS.COMPARING,
  visited:  NODE_COLORS.VISITED,
  adding:   NODE_COLORS.ACTIVE,
  removing: NODE_COLORS.BLOCKED,
  done:     NODE_COLORS.DONE,
};

export default function ArrayVisualizer({ arr = [2, 1, 5, 1, 3, 2], k = 3 }) {
  const { state, dispatch } = useSimulation();
  const [currentCells, setCurrentCells] = useState(arr.map((v, i) => ({ value: v, state: 'default', index: i })));
  const [window, setWindow] = useState(null);

  useEffect(() => {
    const steps = buildSteps(arr, k);
    dispatch({ type: 'SET_STEPS', payload: steps });
  }, [arr, k, dispatch]);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) {
      setCurrentCells(step.cells || []);
      setWindow(step.window || null);
    }
  }, [state.currentStep, state.steps]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.vizArea}>
        <NarrationPanel />

        <div className={styles.arrayContainer}>
          {currentCells.map((cell, i) => {
            const color = STATE_COLOR_MAP[cell.state] || NODE_COLORS.DEFAULT;
            const inWindow = window && i >= window.left && i <= window.right;
            return (
              <div
                key={i}
                className={`${styles.cell} ${inWindow ? styles.inWindow : ''} ${styles[`state-${cell.state}`]}`}
                style={{ '--cell-color': color }}
              >
                <div className={styles.cellValue}>{cell.value}</div>
                <div className={styles.cellIndex}>{i}</div>
              </div>
            );
          })}
        </div>

        {window && (
          <div className={styles.windowLabel}>
            Window [{window.left}..{window.right}] — size {k}
          </div>
        )}

        <div className={styles.panels}>
          <CodePanel code={SLIDING_WINDOW_CODE} language="javascript" />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}
