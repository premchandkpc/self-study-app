import { useState, useEffect } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { AlgorithmCompiler } from '../../../core/compiler/AlgorithmCompiler';
import { FunctionSignatureParser } from '../../../core/parser/FunctionSignatureParser';
import { EXAMPLES } from '../../../data/dsa-examples';
import { DsaVizRenderer } from '../../renderers/DsaRenderer';
import StepControls from '../../shared/StepControls/StepControls';
import CodePanel from '../../shared/CodePanel/CodePanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import InputFormBuilder from '../../shared/InputFormBuilder/InputFormBuilder';
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

  // Parse code and extract function signature
  useEffect(() => {
    if (!code.trim()) {
      setInputSchema([]);
      return;
    }

    try {
      const params = FunctionSignatureParser.parseParams(code);
      const schema = FunctionSignatureParser.generateSchema(params);
      setInputSchema(schema);

      // Initialize input values from schema defaults
      const defaults = {};
      schema.forEach(field => {
        if (!(field.key in inputValues)) {
          defaults[field.key] = field.default;
        }
      });
      setInputValues(prev => ({ ...prev, ...defaults }));
    } catch (e) {
      // Fail silently; user might still be typing
    }
  }, [code]);

  async function handleRun() {
    setError('');

    try {
      if (!code.trim()) {
        setError('Enter algorithm code');
        return;
      }

      const inputData = { ...inputValues };

      if (language === 'javascript') {
        // Client-side execution
        const algorithmMatch = code.match(/(?:function\s*\w*|const\s+\w+\s*=)\s*\(([^)]*)\)\s*(?:=>)?\s*\{([\s\S]*)\}/);
        if (!algorithmMatch) {
          setError('Algorithm must be a function with (input, tracer) parameters');
          return;
        }

        const fnBody = algorithmMatch[2];
        const algorithm = new Function('input', 'tracer', fnBody);
        const compiler = new AlgorithmCompiler();
        const steps = compiler.compile(algorithm, inputData);

        if (!steps || steps.length === 0) {
          setError('No steps generated. Check algorithm logic.');
          return;
        }

        dispatch({ type: 'RESET' });
        dispatch({ type: 'SET_STEPS', payload: steps });
        setHasRun(true);
      } else {
        // Backend execution
        try {
          const response = await fetch('http://localhost:4000/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language, code, inputData }),
          });

          if (!response.ok) {
            const error = await response.json();
            setError(error.error || 'Backend error');
            return;
          }

          const result = await response.json();
          if (result.error) {
            setError(result.error);
            return;
          }

          if (!result.steps || result.steps.length === 0) {
            setError('No steps generated');
            return;
          }

          dispatch({ type: 'RESET' });
          dispatch({ type: 'SET_STEPS', payload: result.steps });
          setHasRun(true);
        } catch (e) {
          setError(`Backend error: ${e.message}. Make sure API server is running on port 4000.`);
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.examplesBar}>
        <label className={styles.examplesLabel}>📚 Load Example:</label>
        <select className={styles.examplesSelect} onChange={(e) => e.target.value && loadExample(e.target.value)} defaultValue="">
          <option value="">Choose an example...</option>
          {Object.entries(EXAMPLES).map(([id, ex]) => (
            <option key={id} value={id}>{ex.topic} → {ex.title}</option>
          ))}
        </select>
      </div>

      <div className={styles.editorRow}>
        <div className={styles.editorBox}>
          <div className={styles.editorLabel}>ALGORITHM CODE</div>
          <div className={styles.langSelector}>
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                className={`${styles.langBtn} ${language === lang ? styles.langBtnActive : ''}`}
                onClick={() => setLanguage(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
          <textarea
            className={`${styles.editor} ${error ? styles.editorError : ''}`}
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="const algorithm = (input, tracer) => {
  tracer.step('Init', 'description', { ...state });
  // ... algorithm code with tracer calls
  tracer.found(result, { state: { ... } });
  return result;
};"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>

        <div className={styles.paramsBox}>
          <div className={styles.paramsTitle}>INPUTS (AUTO-DETECTED)</div>
          <InputFormBuilder
            schema={inputSchema}
            values={inputValues}
            onChange={setInputValues}
            onRun={handleRun}
          />
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {hasRun && (
        <>
          <div className={styles.body}>
            <div className={styles.vizArea}>
              <DsaVizRenderer viz={currentStep} />
            </div>
            <div className={styles.panels}>
              <CodePanel code={code.split('\n')} language={language} />
              <VariablesPanel
                vars={Object.fromEntries(
                  Object.entries(currentStep?.variables ?? {}).map(([k, v]) => [k, v.value])
                )}
                result={currentStep?.result}
              />
            </div>
          </div>
          <StepControls />
        </>
      )}

      {!hasRun && (
        <div className={styles.noSteps}>Write code → Auto-detect inputs → Compile & Run → Step through</div>
      )}
    </div>
  );
}
