import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './PlaygroundPage.module.css';

const BASE = '/api';

function splitLines(s) { return s.split('\n'); }

export default function PlaygroundPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    fetch(BASE + '/playground')
      .then(r => r.json())
      .then(setProblems)
      .catch(() => {});
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    if (!slug) return;
    setOutput(null);
    setTestResults([]);
    setShowOutput(false);
    fetch(BASE + '/playground/' + slug)
      .then(r => r.json())
      .then(p => {
        setProblem(p);
        setCode(p.starterCode || '');
      })
      .catch(() => setProblem(null));
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [slug]);

  const runCode = useCallback(async (code, input) => {
    const res = await fetch(BASE + '/playground/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, input }),
    });
    return res.json();
  }, []);

  async function handleRun() {
    if (!code.trim() || !problem) return;
    setRunning(true);
    setShowOutput(true);
    const input = problem.testCases?.[0]
      ? (() => { try { return JSON.parse(problem.testCases[0].input); } catch { return []; } })()
      : [];
    const res = await runCode(code, input);
    setOutput(res);
    setRunning(false);
  }

  async function handleTest(idx) {
    if (!code.trim() || !problem) return;
    const tc = problem.testCases?.[idx];
    if (!tc) return;
    setRunning(true);
    const input = (() => { try { return JSON.parse(tc.input); } catch { return {}; } })();
    const res = await runCode(code, input);
    const passed = JSON.stringify(res.result) === tc.expected;
    const newResults = [...testResults];
    newResults[idx] = { idx, passed, result: res.result, expected: tc.expected, error: res.error };
    setTestResults(newResults);
    setShowOutput(true);
    setRunning(false);
  }

  if (!slug) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Code Playground</h1>
          <p className={styles.subtitle}>Solve coding problems with live test execution</p>
        </div>
        <div className={styles.problemGrid}>
          {['easy','medium','hard'].map(diff => (
            <div key={diff} className={styles.column}>
              <h3 className={styles.columnTitle}>{diff.toUpperCase()}</h3>
              {problems.filter(p => p.difficulty === diff).map(p => (
                <Link key={p.slug} to={'/play/' + p.slug} className={styles.card}>
                  <div className={styles.cardTitle}>{p.title}</div>
                  <div className={styles.cardTags}>
                    {p.tags?.slice(0, 3).map(t => <span key={t} className={styles.tag}>{t}</span>)}
                    <span className={styles.testCount}>{p.testCount} tests</span>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!problem) {
    return <div className={styles.page}><p>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.split}>
        <div className={styles.left}>
          <div className={styles.breadcrumb}>
            <Link to="/play" className={styles.breadcrumbLink}>Playground</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span>{problem.title}</span>
          </div>
          <div className={styles.diffBadge} data-diff={problem.difficulty}>{problem.difficulty}</div>
          <div className={styles.desc}>
            {splitLines(problem.description).map((line, i) => (
              <p key={i}>{line || '\u00A0'}</p>
            ))}
          </div>
          {problem.testCases?.slice(0, 2).map((tc, i) => (
            <div key={i} className={styles.example}>
              <div><strong>Input:</strong> <code>{tc.input}</code></div>
              <div><strong>Output:</strong> <code>{tc.expected}</code></div>
            </div>
          ))}
        </div>
        <div className={styles.right}>
          <div className={styles.editorHeader}>
            <span>solution.js</span>
            <div className={styles.actions}>
              <button className={styles.btnRun} onClick={handleRun} disabled={running}>
                {running ? '\u23F3' : '\u25B6'} Run
              </button>
              {problem.testCases?.map((_, i) => (
                <button key={i} className={styles.btnTest}
                  onClick={() => handleTest(i)} disabled={running}>
                  Test {i + 1}
                </button>
              ))}
            </div>
          </div>
          <textarea
            className={styles.editor}
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
          />
          {showOutput && (
            <div className={styles.output}>
              {testResults.length > 0 && (
                <div className={styles.testSummary}>
                  {testResults.filter(r => r).map(r => (
                    <div key={r.idx} className={styles.testRow} data-passed={r.passed}>
                      <span>{r.passed ? '\u2713' : '\u2717'} Test {r.idx + 1}</span>
                      <span className={styles.testDetail}>
                        {r.error
                          ? 'Error: ' + r.error
                          : 'Expected: ' + r.expected + ' | Got: ' + JSON.stringify(r.result)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {output && !testResults.some(r => r) && (
                output.error
                  ? <pre className={styles.errorText}>{output.error}</pre>
                  : <pre className={styles.successText}>{JSON.stringify(output.result, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
