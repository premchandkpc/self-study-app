import { useState, useEffect, useMemo } from 'react';
import { useSimulation } from '../../../core/context/useSimulation';
import { AlgorithmCompiler } from '../../../core/compiler/AlgorithmCompiler';
import { FunctionSignatureParser } from '../../../core/parser/FunctionSignatureParser';
import { EXAMPLES } from '../../../data/dsa-examples';
import { DsaVizRenderer } from '../../renderers/DsaRenderer';
import StepControls from '../../shared/StepControls/StepControls';
import VariablesChip from '../../shared/VariablesChip/VariablesChip';
import InputPanel from '../../shared/InputPanel/InputPanel';
import SyntaxEditor from '../../shared/SyntaxEditor/SyntaxEditor';
import Button from '../../shared/Button/Button';
import styles from './CompilerTemplate.module.css';

export default function CompilerTemplate() {
  const { state, dispatch } = useSimulation();
  const [language] = useState('javascript');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [inputValues, setInputValues] = useState({});
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedExample, setSelectedExample] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [showOutput, setShowOutput] = useState(false);

  const currentStep = state.steps[state.currentStep];
  const example = selectedExample ? EXAMPLES[selectedExample] : null;
  const hasTestCases = example?.testCases?.length > 0;

  function loadExample(exampleId) {
    const ex = EXAMPLES[exampleId];
    if (!ex) return;
    setSelectedExample(exampleId);
    setCode(ex.code);
    setInputValues(ex.defaultInput || {});
    setError('');
    setHasRun(false);
    setTestResults([]);
    setShowOutput(false);
    dispatch({ type: 'RESET' });
  }

  const inputSchema = useMemo(() => {
    if (!code.trim()) return [];
    try {
      const params = FunctionSignatureParser.parseParams(code);
      if (!params || params.length === 0) return [];
      return FunctionSignatureParser.generateSchema(params);
    } catch {
      return [];
    }
  }, [code]);

  useEffect(() => {
    if (inputSchema.length === 0) return;
    setInputValues(prev => {
      const updated = { ...prev };
      inputSchema.forEach(field => {
        if (!(field.key in updated)) {
          updated[field.key] = field.default;
        }
      });
      return updated;
    });
  }, [inputSchema]); // eslint-disable-line react-hooks/set-state-in-effect

  function compileCode(inputs) {
    const algorithmMatch = code.match(
      /(?:function\s+\w+|const\s+\w+)\s*=\s*\(([^)]*)\)\s*(?:=>)?\s*\{([\s\S]*)\}(?:\s*;)?$/m
    );
    if (!algorithmMatch) throw new Error('Code must define: function(input, tracer) { ... } or const fn = (input, tracer) => { ... }');
    const fnBody = algorithmMatch[2];
    const algorithm = new Function('input', 'tracer', fnBody);
    const compiler = new AlgorithmCompiler();
    return compiler.compile(algorithm, inputs);
  }

  async function handleRun() {
    if (!code.trim()) { setError('Enter algorithm code'); return; }
    setError('');
    setIsCompiling(true);
    setShowOutput(false);
    try {
      const steps = compileCode(inputValues);
      if (!steps || steps.length === 0) {
        setError('No steps generated. Use tracer.step() or tracer.found()');
        setIsCompiling(false);
        return;
      }
      dispatch({ type: 'RESET' });
      dispatch({ type: 'SET_STEPS', payload: steps });
      setHasRun(true);
    } catch (e) {
      setError(`Error: ${e.message}`);
    } finally {
      setIsCompiling(false);
    }
  }

  function handleApply(parsed) {
    setInputValues(parsed);
    handleRunWithInputs(parsed);
  }

  async function handleRunWithInputs(inputs) {
    setError('');
    setIsCompiling(true);
    setShowOutput(false);
    try {
      const steps = compileCode(inputs);
      if (!steps || steps.length === 0) {
        setError('No steps generated. Use tracer.step() or tracer.found()');
        setIsCompiling(false);
        return;
      }
      dispatch({ type: 'RESET' });
      dispatch({ type: 'SET_STEPS', payload: steps });
      setHasRun(true);
    } catch (e) {
      setError(`Error: ${e.message}`);
    } finally {
      setIsCompiling(false);
    }
  }

  async function runTestCases() {
    if (!hasTestCases) return;
    setError('');
    setIsCompiling(true);
    setShowOutput(true);
    const results = [];

    try {
      for (const tc of example.testCases) {
        const startTime = performance.now();
        try {
          const steps = compileCode(tc.input);
          const elapsed = Math.round((performance.now() - startTime) * 100) / 100;
          if (steps?.length > 0) {
            const lastStep = steps[steps.length - 1];
            results.push({
              index: results.length,
              input: tc.input,
              expected: tc.expected,
              actual: lastStep.result,
              passed: JSON.stringify(lastStep.result) === JSON.stringify(tc.expected),
              elapsed,
            });
          } else {
            results.push({ index: results.length, input: tc.input, expected: tc.expected, actual: null, passed: false, elapsed: 0, error: 'No steps' });
          }
        } catch (e) {
          results.push({ index: results.length, input: tc.input, expected: tc.expected, actual: e.message, passed: false, elapsed: 0 });
        }
      }

      setTestResults(results);
      const passed = results.filter(r => r.passed).length;
      setError(passed === results.length ? `✓ All ${results.length} tests passed` : `✗ ${passed}/${results.length} tests passed`);
    } catch (e) {
      setError(`Error: ${e.message}`);
    } finally {
      setIsCompiling(false);
    }
  }

  return (
    <div className={styles.layout}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.logo}>⚙️</span>
          <select className={styles.exampleSelect} onChange={e => e.target.value && loadExample(e.target.value)} value={selectedExample || ''}>
            <option value="">Select problem...</option>
            {Object.entries(EXAMPLES).map(([id, ex]) => (
              <option key={id} value={id}>{ex.topic} — {ex.title}</option>
            ))}
          </select>
        </div>
        <div className={styles.toolbarRight}>
          <span className={styles.langBadge}>JS</span>
          <Button variant="primary" size="sm" onClick={handleRun} disabled={isCompiling || !code.trim()}>
            ▶ Run
          </Button>
          {hasTestCases && (
            <Button variant="secondary" size="sm" onClick={runTestCases} disabled={isCompiling}>
              🧪 Test
            </Button>
          )}
          {isCompiling && <span className={styles.spinner}>◌</span>}
        </div>
      </div>

      {/* Error bar */}
      {error && <div className={styles.errorBar}>{error}</div>}

      {/* Main split: description + code/output */}
      <div className={styles.main}>
        {/* Left: Description panel */}
        <aside className={styles.description}>
          {example ? (
            <>
              <div className={styles.descHeader}>
                <h2 className={styles.descTitle}>{example.title}</h2>
                <span className={styles.descTopic}>{example.topic}</span>
              </div>
              <p className={styles.descText}>{example.explanation}</p>

              {example.testCases?.length > 0 && (
                <div className={styles.examples}>
                  <h3 className={styles.sectionTitle}>Examples</h3>
                  {example.testCases.slice(0, 3).map((tc, i) => (
                    <div key={i} className={styles.exampleCard}>
                      <div className={styles.exampleRow}>
                        <span className={styles.exampleLabel}>Input:</span>
                        <code className={styles.exampleValue}>{JSON.stringify(tc.input)}</code>
                      </div>
                      <div className={styles.exampleRow}>
                        <span className={styles.exampleLabel}>Output:</span>
                        <code className={styles.exampleValue}>{JSON.stringify(tc.expected)}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.constraints}>
                <h3 className={styles.sectionTitle}>Complexity</h3>
                <div className={styles.constraintRow}>
                  <span className={styles.constraintIcon}>⏱</span>
                  <span>{example.explanation?.match(/Time: O\([^)]+\)/)?.[0] || 'N/A'}</span>
                </div>
                <div className={styles.constraintRow}>
                  <span className={styles.constraintIcon}>💾</span>
                  <span>{example.explanation?.match(/Space: O\([^)]+\)/)?.[0] || 'N/A'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.descEmpty}>
              <span className={styles.descEmptyIcon}>⚙️</span>
              <p>Select a problem from the dropdown to begin</p>
              <p className={styles.descEmptySub}>Write code with tracer.step() calls and see algorithms visualized step by step</p>
            </div>
          )}
        </aside>

        {/* Right: Editor + Output */}
        <div className={styles.rightPane}>
          {/* Input controls */}
          {code.trim() && inputSchema.length > 0 && (
            <div className={styles.inputSection}>
              <InputPanel schema={inputSchema} current={inputValues} onApply={handleApply} hideRunButton />
              <div className={styles.inputActions}>
                <Button variant="primary" size="sm" onClick={handleRun} disabled={isCompiling}>
                  ▶ Run
                </Button>
              </div>
            </div>
          )}

          {/* Code editor */}
          <div className={styles.editor}>
            <div className={styles.editorHeader}>solution.js</div>
            <SyntaxEditor code={code} onChange={setCode} language={language} />
          </div>

          {/* Output panel */}
          {showOutput && (
            <div className={styles.output}>
              <div className={styles.outputHeader}>
                <span className={styles.outputTitle}>Test Results</span>
                <span className={styles.outputCount}>{testResults.filter(r => r.passed).length}/{testResults.length} passed</span>
              </div>
              <div className={styles.outputBody}>
                {testResults.length > 0 ? (
                  <div className={styles.testResults}>
                    {testResults.map(r => (
                      <div key={r.index} className={`${styles.testCard} ${r.passed ? styles.testCardPassed : styles.testCardFailed}`}>
                        <div className={styles.testCardHeader}>
                          <span className={r.passed ? styles.passIcon : styles.failIcon}>{r.passed ? '✓' : '✗'}</span>
                          <span className={styles.testCardName}>Test {r.index + 1}</span>
                          <span className={styles.testCardTime}>{r.elapsed}ms</span>
                        </div>
                        <div className={styles.testCardBody}>
                          <div className={styles.testDetail}>
                            <span className={styles.testDetailLabel}>Input:</span>
                            <code>{JSON.stringify(r.input)}</code>
                          </div>
                          <div className={styles.testDetail}>
                            <span className={styles.testDetailLabel}>Expected:</span>
                            <code>{JSON.stringify(r.expected)}</code>
                          </div>
                          <div className={styles.testDetail}>
                            <span className={styles.testDetailLabel}>Actual:</span>
                            <code>{r.passed ? JSON.stringify(r.actual) : String(r.actual)}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.outputEmpty}>Running tests...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visualization panel */}
      {hasRun && state.steps.length > 0 && (
        <div className={styles.vizPanel}>
          <StepControls />
          <div className={styles.vizContent}>
            <DsaVizRenderer viz={currentStep} />
            {currentStep?.variables && (
              <VariablesChip
                vars={Object.fromEntries(
                  Object.entries(currentStep.variables).map(([k, v]) => [k, v.value])
                )}
                result={currentStep.result}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
