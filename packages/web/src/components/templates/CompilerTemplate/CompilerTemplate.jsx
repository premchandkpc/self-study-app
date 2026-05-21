import { useState, useEffect } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { AlgorithmCompiler } from '../../../core/compiler/AlgorithmCompiler';
import { FunctionSignatureParser } from '../../../core/parser/FunctionSignatureParser';
import { EXAMPLES } from '../../../data/dsa-examples';
import { DsaVizRenderer } from '../../renderers/DsaRenderer';
import StepControls from '../../shared/StepControls/StepControls';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import InputPanel from '../../shared/InputPanel/InputPanel';
import styles from './CompilerTemplate.module.css';

const LANGUAGES = ['javascript', 'python', 'go', 'java', 'rust'];

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

  function loadExample(exampleId) {
    const example = EXAMPLES[exampleId];
    if (!example) return;
    setCode(example.code);
    setLanguage(example.language);
    setInputValues(example.defaultInput || {});
    setError('');
    setHasRun(false);
  }

  useEffect(() => {
    if (!code.trim()) {
      setInputSchema([]);
      return;
    }

    try {
      const params = FunctionSignatureParser.parseParams(code);
      const schema = FunctionSignatureParser.generateSchema(params);
      setInputSchema(schema);

      const defaults = {};
      schema.forEach(field => {
        if (!(field.key in inputValues)) {
          defaults[field.key] = field.default;
        }
      });
      setInputValues(prev => ({ ...prev, ...defaults }));
    } catch (e) {
      // Fail silently
    }
  }, [code]);

  async function handleApply(parsedInputs) {
    setError('');
    setInputValues(parsedInputs);
    setIsCompiling(true);

    try {
      if (!code.trim()) {
        setError('Enter algorithm code');
        setIsCompiling(false);
        return;
      }

      if (language === 'javascript') {
        const algorithmMatch = code.match(/(?:function\s*\w*|const\s+\w+\s*=)\s*\(([^)]*)\)\s*(?:=>)?\s*\{([\s\S]*)\}/);
        if (!algorithmMatch) {
          setError('Algorithm must be a function');
          setIsCompiling(false);
          return;
        }

        const fnBody = algorithmMatch[2];
        const algorithm = new Function('input', 'tracer', fnBody);
        const compiler = new AlgorithmCompiler();
        const steps = compiler.compile(algorithm, parsedInputs);

        if (!steps || steps.length === 0) {
          setError('No steps generated');
          setIsCompiling(false);
          return;
        }

        dispatch({ type: 'RESET' });
        dispatch({ type: 'SET_STEPS', payload: steps });
        setHasRun(true);
      } else {
        try {
          const response = await fetch('http://localhost:4000/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language, code, inputData: parsedInputs }),
          });

          if (!response.ok) {
            const err = await response.json();
            setError(err.error || 'Backend error');
            setIsCompiling(false);
            return;
          }

          const result = await response.json();
          if (result.error) {
            setError(result.error);
            setIsCompiling(false);
            return;
          }

          if (!result.steps || result.steps.length === 0) {
            setError('No steps generated');
            setIsCompiling(false);
            return;
          }

          dispatch({ type: 'RESET' });
          dispatch({ type: 'SET_STEPS', payload: result.steps });
          setHasRun(true);
        } catch (e) {
          setError(`Backend error: ${e.message}`);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsCompiling(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* Toolbar */}
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

        {isCompiling && <span className={styles.compiling}>Compiling...</span>}
      </div>

      {/* Main: code (left) + viz (right) */}
      <div className={styles.main}>
        <div className={styles.codePanel}>
          <div className={styles.codePanelHeader}>algorithm.js</div>
          <textarea
            className={styles.codeEditor}
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="const algorithm = (input, tracer) => {
  const { array, target } = input;
  tracer.step('Init', 'description', { array, target });
  // ... code
  return result;
};"
            spellCheck={false}
          />
        </div>

        <div className={styles.vizSection}>
          {hasRun ? (
            <>
              <div className={styles.vizContainer}>
                <DsaVizRenderer viz={currentStep} />
              </div>
              <VariablesPanel
                vars={Object.fromEntries(
                  Object.entries(currentStep?.variables ?? {}).map(([k, v]) => [k, v.value])
                )}
                result={currentStep?.result}
              />
              <StepControls />
            </>
          ) : (
            <div className={styles.placeholder}>
              {code.trim() ? 'Set inputs → Run' : 'Load example or write code'}
            </div>
          )}
        </div>
      </div>

      {/* Input panel + error */}
      {code.trim() && <InputPanel schema={inputSchema} current={inputValues} onApply={handleApply} />}
      {error && <div className={styles.errorBox}>{error}</div>}
    </div>
  );
}
