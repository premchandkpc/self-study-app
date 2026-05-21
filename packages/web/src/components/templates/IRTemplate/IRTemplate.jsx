// IR-based Template: Renders legacy scenarios as compiled IR
// Decoupled from topic-specific visualizers
// Proof-of-concept for semantic rendering architecture

import { useState, useMemo } from 'react';
import { useLegacyScenarioIR } from '../../../core/hooks/useLegacyScenarioIR';
import { useIRSceneNavigator } from '../../../core/hooks/useIRSceneNavigator';
import { SceneRenderer } from '../../../core/ir/sceneRenderer';
import { LegacyMigration } from '../../../core/ir/adapters/legacyMigration';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import CodePanel from '../../shared/CodePanel/CodePanel';
import styles from './IRTemplate.module.css';

export default function IRTemplate({ scenarios, technology = 'generic' }) {
  const { compile } = useLegacyScenarioIR();
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios?.[0]?.id);

  // Compile legacy scenarios to IR (one-time, memoized)
  const irUnits = useMemo(() => {
    if (!scenarios) return [];
    return LegacyMigration.migrateScenarioGroup(scenarios, technology);
  }, [scenarios, technology]);

  // Find currently selected IR unit
  const currentIrUnit = useMemo(() => {
    return irUnits.find((u) => u.id === selectedScenarioId);
  }, [irUnits, selectedScenarioId]);

  // Navigate through scenes within current IR unit
  const { currentScene, sceneIndex, totalScenes, next, prev, canNext, canPrev } =
    useIRSceneNavigator(currentIrUnit);

  const currentScenario = scenarios?.find((s) => s.id === selectedScenarioId);

  if (!scenarios || scenarios.length === 0 || !currentScene) {
    return <div className={styles.empty}>No scenarios available</div>;
  }

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar
        scenarios={scenarios}
        active={selectedScenarioId}
        onChange={setSelectedScenarioId}
      />

      <div className={styles.body}>
        <div className={styles.diagramWrap}>
          {currentScene ? (
            <SceneRenderer scene={currentScene} />
          ) : (
            <div className={styles.placeholder}>Loading scene...</div>
          )}
        </div>

        <div className={styles.right}>
          {currentScenario?.code && (
            <CodePanel code={currentScenario.code} language={currentScenario.language} />
          )}
          <div className={styles.sceneInfo}>
            <div>
              Scene {sceneIndex + 1} of {totalScenes}
            </div>
            {currentScene?.description && <p>{currentScene.description}</p>}
          </div>
        </div>
      </div>

      {/* Scene navigation */}
      <div className={styles.sceneNav}>
        <button onClick={prev} disabled={!canPrev}>
          ← Previous Scene
        </button>
        <span className={styles.counter}>
          {sceneIndex + 1} / {totalScenes}
        </span>
        <button onClick={next} disabled={!canNext}>
          Next Scene →
        </button>
      </div>

      <StepControls />
    </div>
  );
}
