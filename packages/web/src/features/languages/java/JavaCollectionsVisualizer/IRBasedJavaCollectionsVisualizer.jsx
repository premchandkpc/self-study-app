import { memo, useMemo, useState } from 'react';
import { JavaCollectionsCompiler } from '../../../../core/ir';
import { SceneRenderer } from '../../../../core/ir';
import { JC_SCENARIOS } from './java-collections-engine';
import styles from './JavaCollectionsVisualizer.module.css';

// IR-based renderer that proves the architecture works
const IRBasedJavaCollectionsVisualizer = memo(function IRBasedVisualizer() {
  const [activeId, setActiveId] = useState(JC_SCENARIOS[0]?.id);
  const compiler = useMemo(() => new JavaCollectionsCompiler(), []);

  const activeScenario = useMemo(
    () => JC_SCENARIOS.find((s) => s.id === activeId),
    [activeId]
  );

  // Compile scenario to IR on the fly
  const ir = useMemo(() => {
    if (!activeScenario) return null;
    try {
      return compiler.compileScenario(activeScenario);
    } catch (e) {
      console.error('IR compilation error:', e);
      return null;
    }
  }, [activeScenario, compiler]);

  return (
    <div className={styles.wrapper}>
      <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '8px', marginBottom: '16px' }}>
        <strong>IR-Based Rendering (Proof of Concept)</strong>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          This component uses the IR layer. Content is compiled from Java Collections → Generic IR → Universal Renderer.
          No Java Collections specific rendering logic here.
        </p>
      </div>

      <div className={styles.scenarioRow}>
        {JC_SCENARIOS.slice(0, 5).map((s) => (
          <button
            key={s.id}
            className={`${styles.scenBtn} ${activeId === s.id ? styles.scenBtnActive : ''}`}
            onClick={() => setActiveId(s.id)}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {ir ? (
        <div style={{ marginTop: '20px' }}>
          <h3>{ir.title}</h3>
          <p style={{ fontSize: '12px', color: '#666' }}>Concept: {ir.concept}</p>

          {ir.scenes.map((scene, i) => (
            <div key={scene.id} style={{ marginTop: '16px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>
                {scene.title} (Type: {scene.type})
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#666' }}>
                {scene.description}
              </p>

              {/* Generic IR renderer - works for all primitives */}
              <SceneRenderer scene={scene} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '16px', background: '#fee', color: '#c33', borderRadius: '4px' }}>
          Failed to compile scenario to IR
        </div>
      )}
    </div>
  );
});

export default IRBasedJavaCollectionsVisualizer;
