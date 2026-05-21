import { useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { AlgorithmCompiler } from '../../../core/compiler/AlgorithmCompiler';
import { DsaVizRenderer } from '../../renderers/DsaRenderer';
import StepControls from '../../shared/StepControls/StepControls';
import CodePanel from '../../shared/CodePanel/CodePanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './CompilerTemplate.module.css';

const LANGUAGES = ['javascript', 'python', 'go', 'java', 'rust'];

export default function CompilerTemplate() {
  const { state, dispatch } = useSimulation();
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const currentStep = state.steps[state.currentStep];

  function handleRun() {
    setError('');

    try {
      if (!code.trim()) {
        setError('Enter algorithm code');
        return;
      }

      if (!inputText.trim()) {
        setError('Enter input data as JSON');
        return;
      }

      // Parse input
      let inputData;
      try {
        inputData = JSON.parse(inputText);
      } catch {
        setError('Invalid JSON input');
        return;
      }

      // Currently support JavaScript only
      if (language === 'javascript') {
        // Extract algorithm function from code
        const algorithmMatch = code.match(/const\s+algorithm\s*=\s*\((.*?)\)\s*=>\s*\{([\s\S]*)\};/);
        if (!algorithmMatch) {
          setError('Algorithm must follow format: const algorithm = (input, tracer) => { ... };');
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
        setError(`Language support coming soon: ${language}`);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className={styles.wrapper}>
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
            placeholder="Write algorithm with tracer.step(), tracer.move(), tracer.found() calls"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>

        <div className={styles.paramsBox}>
          <div className={styles.paramsTitle}>INPUT (JSON)</div>
          <textarea
            className={styles.inputArea}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder='{"array": [1,2,3], "target": 5}'
            spellCheck={false}
          />
          <button className={styles.runBtn} onClick={handleRun}>
            ▶ Compile & Run
          </button>
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
              <VariablesPanel vars={currentStep?.state ?? {}} result={currentStep?.result} />
            </div>
          </div>
          <StepControls />
        </>
      )}

      {!hasRun && (
        <div className={styles.noSteps}>Code + Input → Compile & Run → Step through</div>
      )}
    </div>
  );
}
