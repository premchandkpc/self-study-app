import { useState, useEffect } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { instrumentFunction } from '../../../core/compiler/instrument';
import { runCode } from '../../../core/compiler/runCode';
import StepControls from '../../shared/StepControls/StepControls';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import styles from './CompilerTemplate.module.css';

const DEFAULT_CODE = `function twoSum(nums, target) {
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map[complement] !== undefined) {
      return [map[complement], i];
    }
    map[nums[i]] = i;
  }
  return null;
}`;

const DEFAULT_PARAMS = {
  nums: '[2, 7, 11, 15]',
  target: '9',
};

// Detect interesting data structures in vars for viz
function detectViz(vars) {
  if (!vars) return null;
  for (const [key, val] of Object.entries(vars)) {
    if (key === '__result' || key === '__s') continue;
    if (Array.isArray(val) && val.length > 0 && Array.isArray(val[0])) {
      return { type: 'matrix', key, val };
    }
  }
  const arrays = Object.entries(vars)
    .filter(([k, v]) => k !== '__result' && Array.isArray(v) && v.length > 0)
    .sort((a, b) => b[1].length - a[1].length);
  if (arrays.length) return { type: 'arrays', arrays };
  return null;
}

function ArrayViz({ name, arr }) {
  return (
    <div>
      <div className={styles.arrayVizLbl}>{name}</div>
      <div className={styles.arrayVizRow}>
        {arr.slice(0, 20).map((v, i) => (
          <div key={i} className={styles.arrayCell}>
            <span className={styles.arrayCellVal}>{v === null ? '∅' : String(v).slice(0, 5)}</span>
            <span className={styles.arrayCellIdx}>{i}</span>
          </div>
        ))}
        {arr.length > 20 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>+{arr.length - 20}</span>}
      </div>
    </div>
  );
}

function MatrixViz({ name, matrix }) {
  return (
    <div>
      <div className={styles.matrixVizLbl}>{name}</div>
      <div className={styles.matrixGrid}>
        {matrix.slice(0, 8).map((row, r) => (
          <div key={r} className={styles.matrixRow}>
            {(Array.isArray(row) ? row : []).slice(0, 10).map((v, c) => (
              <div key={c} className={styles.matrixCell}>{String(v).slice(0, 3)}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AutoViz({ vars }) {
  const viz = detectViz(vars);
  if (!viz) return null;

  return (
    <div className={styles.autoViz}>
      {viz.type === 'matrix' && <MatrixViz name={viz.key} matrix={viz.val} />}
      {viz.type === 'arrays' && viz.arrays.slice(0, 3).map(([k, v]) => (
        <ArrayViz key={k} name={k} arr={v} />
      ))}
    </div>
  );
}

export default function CompilerTemplate() {
  const { state, dispatch } = useSimulation();

  const [code, setCode] = useState(DEFAULT_CODE);
  const [paramInputs, setParamInputs] = useState(DEFAULT_PARAMS);
  const [paramNames, setParamNames] = useState(['nums', 'target']);
  const [codeLines, setCodeLines] = useState(DEFAULT_CODE.split('\n'));
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const currentViz = state.steps[state.currentStep];

  function parseParams(names) {
    return names.map(name => {
      const raw = (paramInputs[name] ?? '').trim();
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return raw; }
    });
  }

  function handleRun() {
    setError('');
    let instrumented;
    try {
      instrumented = instrumentFunction(code);
    } catch (e) {
      setError(e.message);
      return;
    }

    const { code: instrumentedCode, fnName, paramNames: pNames, codeLines: lines } = instrumented;
    setParamNames(pNames);
    setCodeLines(lines);

    const paramValues = parseParams(pNames);
    let steps;
    try {
      steps = runCode({ code: instrumentedCode, fnName, paramValues });
    } catch (e) {
      setError(e.message);
      return;
    }

    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEPS', payload: steps });
    setHasRun(true);
  }

  // Parse param names when code changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const { paramNames: pNames } = instrumentFunction(code);
        setParamNames(pNames);
        setError('');
      } catch {
        // ignore parse errors while typing
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.editorRow}>
        <div className={styles.editorBox}>
          <div className={styles.editorLabel}>JS FUNCTION</div>
          <textarea
            className={`${styles.editor} ${error ? styles.editorError : ''}`}
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>

        <div className={styles.paramsBox}>
          <div className={styles.paramsTitle}>PARAMETERS</div>
          {paramNames.map(name => (
            <div key={name} className={styles.paramRow}>
              <label className={styles.paramLabel}>{name}</label>
              <input
                className={styles.paramInput}
                value={paramInputs[name] ?? ''}
                onChange={e => setParamInputs(p => ({ ...p, [name]: e.target.value }))}
                placeholder="JSON value"
                spellCheck={false}
              />
            </div>
          ))}
          <button className={styles.runBtn} onClick={handleRun}>
            ▶ Run
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {currentViz && (
        <div className={styles.narration}>{currentViz.narration}</div>
      )}

      {hasRun ? (
        <>
          <div className={styles.body}>
            <div className={styles.vizArea}>
              <AutoViz vars={currentViz?.vars} />
            </div>
            <div className={styles.panels}>
              <CodePanel code={codeLines} language="JavaScript" />
              <VariablesPanel vars={currentViz?.vars ?? {}} result={currentViz?.vars?.__result} />
            </div>
          </div>
          <StepControls />
        </>
      ) : (
        <div className={styles.noSteps}>Edit code → set params → click ▶ Run</div>
      )}
    </div>
  );
}
