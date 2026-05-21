import { useState, useEffect } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { AlgorithmCompiler } from '../../../core/compiler/AlgorithmCompiler';
import { FunctionSignatureParser } from '../../../core/parser/FunctionSignatureParser';
import { EXAMPLES } from '../../../data/dsa-examples';
import { DsaVizRenderer } from '../../renderers/DsaRenderer';
import StepControls from '../../shared/StepControls/StepControls';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import InputPanel from '../../shared/InputPanel/InputPanel';
import SyntaxEditor from '../../shared/SyntaxEditor/SyntaxEditor';
import styles from './CompilerTemplate.module.css';

const LANGUAGES = ['javascript'];

export default function CompilerTemplate() {
  const { state, dispatch } = useSimulation();
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [inputSchema, setInputSchema] = useState([]);
  const [inputValues, setInputValues] = useState({});
  const [isCompiling, setIsCompiling] = useState(false);

  const currentStep = state.steps[state.currentStep];
  const currentExample = Object.values(EXAMPLES).find(ex => ex.code === code);
  const hasTestCases = currentExample?.testCases?.length > 0;

  function loadExample(exampleId) {
    const example = EXAMPLES[exampleId];
    if (!example) return;
    setCode(example.code);
    setLanguage(example.language);
    setInputValues(example.defaultInput || {});
    setError('');
    setHasRun(false);
  }

  async function runTestCases() {
    if (!currentExample?.testCases) return;

    setError('');
    setIsCompiling(true);
    const results = [];

    for (const tc of currentExample.testCases) {
      await handleApply(tc.input);
      if (state.steps.length > 0) {
        const lastStep = state.steps[state.steps.length - 1];
        const actual = lastStep.result;
        const expected = tc.expected;
        results.push({
          input: tc.input,
          expected,
          actual,
          passed: JSON.stringify(actual) === JSON.stringify(expected),
        });
      }
    }

    setIsCompiling(false);
    const passed = results.filter(r => r.passed).length;
    const msg = `${passed}/${results.length} test cases passed`;
    if (passed === results.length) {
      setError(`✓ ${msg}`);
    } else {
      setError(`✗ ${msg}`);
    }
  }

  useEffect(() => {
    if (!code.trim()) {
      setInputSchema([]);
      return;
    }

    try {
      const params = FunctionSignatureParser.parseParams(code);
      if (!params || params.length === 0) {
        console.warn('No input parameters extracted from code');
        setInputSchema([]);
        return;
      }

      const schema = FunctionSignatureParser.generateSchema(params);
      setInputSchema(schema);

      setInputValues(prev => {
        const updated = { ...prev };
        schema.forEach(field => {
          if (!(field.key in updated)) {
            updated[field.key] = field.default;
          }
        });
        return updated;
      });
    } catch (e) {
      console.error('Error parsing code:', e);
      setInputSchema([]);
    }
  }, [code]);

  function validateCode() {
    if (!code.trim()) return 'Enter algorithm code';

    if (language === 'javascript') {
      if (!code.includes('algorithm') && !code.includes('function')) {
        return 'Code must define an algorithm function';
      }
      if (!code.includes('tracer')) {
        return 'Code should use tracer.step() or tracer.found() to record steps';
      }
    }

    return null;
  }

  async function handleApply(parsedInputs) {
    setError('');
    setInputValues(parsedInputs);
    setIsCompiling(true);

    try {
      const validationError = validateCode();
      if (validationError) {
        setError(validationError);
        setIsCompiling(false);
        return;
      }

      const algorithmMatch = code.match(/(?:function\s+\w+|const\s+\w+)\s*=\s*\(([^)]*)\)\s*(?:=>)?\s*\{([\s\S]*)\}(?:\s*;)?$/m);
      if (!algorithmMatch) {
        setError('Code must be: function(input, tracer) { ... } or const algorithm = (input, tracer) => { ... }');
        setIsCompiling(false);
        return;
      }

      try {
        const fnBody = algorithmMatch[2];
        const algorithm = new Function('input', 'tracer', fnBody);
        const compiler = new AlgorithmCompiler();
        const steps = compiler.compile(algorithm, parsedInputs);

        if (!steps || steps.length === 0) {
          setError('No steps generated. Make sure to call tracer.step() or tracer.found()');
          setIsCompiling(false);
          return;
        }

        dispatch({ type: 'RESET' });
        dispatch({ type: 'SET_STEPS', payload: steps });
        setHasRun(true);
      } catch (e) {
        setError(`Execution error: ${e.message}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsCompiling(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* Toolbar: examples + language */}
      <div className={styles.toolbar}>
        <div className={styles.section}>
          <label className={styles.label}>📚</label>
          <select className={styles.select} onChange={(e) => e.target.value && loadExample(e.target.value)} defaultValue="">
            <option value="">Load example...</option>
            {Object.entries(EXAMPLES).map(([id, ex]) => (
              <option key={id} value={id}>{ex.title}</option>
            ))}
          </select>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Lang:</span>
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              className={`${styles.langBtn} ${language === lang ? styles.active : ''}`}
              onClick={() => setLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </div>

        {hasTestCases && (
          <button className={styles.testBtn} onClick={runTestCases} disabled={isCompiling}>
            🧪 Test
          </button>
        )}

        {isCompiling && <span className={styles.compiling}>Compiling...</span>}
      </div>

      {/* Input panel (if code exists) */}
      {code.trim() && <InputPanel schema={inputSchema} current={inputValues} onApply={handleApply} />}

      {/* Error message */}
      {error && <div className={styles.errorBox}>{error}</div>}

      {/* Main: code editor (left) + visualization (right) */}
      <div className={styles.body}>
        {/* Code editor */}
        <div className={styles.codePanel}>
          <div className={styles.codePanelHeader}>algorithm.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'java'}</div>
          <SyntaxEditor code={code} onChange={setCode} language={language} />
        </div>

        {/* Visualization area */}
        <div className={styles.vizArea}>
          {hasRun ? (
            <>
              <div className={styles.stepHeader}>
                <div className={styles.stepTitle}>{currentStep?.title}</div>
                <div className={styles.stepDesc}>{currentStep?.description}</div>
                {currentStep?.duration !== undefined && (
                  <div className={styles.stepDuration}>{currentStep.duration}ms</div>
                )}
              </div>
              <div className={styles.vizContainer}>
                <DsaVizRenderer viz={currentStep} />
              </div>
              <VariablesPanel
                vars={Object.fromEntries(
                  Object.entries(currentStep?.variables ?? {}).map(([k, v]) => [k, v.value])
                )}
                result={currentStep?.result}
              />
            </>
          ) : (
            <div className={styles.placeholder}>
              {code.trim() ? 'Set inputs and click Run →' : 'Load example or write code'}
            </div>
          )}
        </div>
      </div>

      {/* Step controls (bottom) */}
      {hasRun && <StepControls />}
    </div>
  );
}
