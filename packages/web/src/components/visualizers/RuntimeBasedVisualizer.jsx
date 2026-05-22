import { memo } from 'react';
import { SceneRenderer } from '@/core/ir';
import { useSimulationRuntime } from '@/core/hooks/useSimulationRuntime';
import styles from './RuntimeBasedVisualizer.module.css';

// Proof of concept: React becomes ONLY visualization
// All simulation logic lives in runtime (pure JS)
// Result: React component is ~50 lines instead of 300+

const RuntimeBasedVisualizer = memo(function RuntimeBasedVisualizer({
  learningUnit,
  userId,
}) {
  const {
    scene,
    progress,
    state,
    sceneIndex,
    advance,
    rewind,
    jumpToScene,
  } = useSimulationRuntime({
    learningUnit,
    userId,
    onMastery: (conceptId) => console.log(`Mastered: ${conceptId}`),
  });

  if (!scene) {
    return <div className={styles.loading}>Loading scene...</div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>{learningUnit.title}</h2>
        <div className={styles.progress}>
          <div
            className={styles.progressBar}
            style={{ width: `${progress}%` }}
          />
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Scene description */}
      <div className={styles.description}>
        <h3>{scene.title}</h3>
        {scene.description && <p>{scene.description}</p>}
      </div>

      {/* Generic IR renderer - works for ANY primitive type */}
      <div className={styles.visualization}>
        <SceneRenderer scene={scene} />
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          onClick={rewind}
          disabled={sceneIndex === 0}
          className={styles.btn}
        >
          ← Previous
        </button>

        <div className={styles.sceneSelector}>
          {learningUnit.scenes.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpToScene(i)}
              className={`${styles.dotBtn} ${
                sceneIndex === i ? styles.active : ''
              }`}
              title={`Scene ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={advance}
          disabled={sceneIndex === learningUnit.scenes.length - 1}
          className={styles.btn}
        >
          Next →
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <span>Scene {sceneIndex + 1} / {learningUnit.scenes.length}</span>
        <span>{state}</span>
      </div>
    </div>
  );
});

export default RuntimeBasedVisualizer;
