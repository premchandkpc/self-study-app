import { useState } from 'react';
import { useVisualizerScenario } from '../../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './jvm-engine';
import ScenarioToolbar from '../../../components/shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../../components/shared/StepControls/StepControls';
import NarrationPanel from '../../../components/shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../../components/shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../../components/shared/CodePanel/CodePanel';
import MetricsPanel from '../../../components/shared/MetricsPanel/MetricsPanel';
import ResultPanel from '../../../components/shared/ResultPanel/ResultPanel';
import styles from './JVMVisualizer.module.css';

export default function JVMVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);
  const [showContent, setShowContent] = useState(false);

  if (!viz) return null;

  const isSTW = viz.stopTheWorld;
  const tc = active.topicContent;

  return (
    <div className={`${styles.wrapper} ${isSTW ? styles.stopWorld : ''}`}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      {isSTW && <div className={styles.stwBanner}>⚠ STOP-THE-WORLD PAUSE</div>}

      <div className={styles.jvmLayout}>
        {/* LEFT: heap zones */}
        <div className={styles.heapSide}>
          <div className={styles.zoneLabel}>Java Heap</div>

          <div className={styles.youngGen}>
            <div className={styles.genLabel}>Young Generation</div>
            <div className={styles.zones}>
              <HeapZone
                label="Eden"
                objects={viz.eden}
                color="var(--heap-eden)"
                gcEvent={viz.gcEvent}
              />
              <HeapZone
                label="Survivor S0"
                objects={viz.survivor0}
                color="var(--heap-survivor)"
                gcEvent={viz.gcEvent}
              />
              <HeapZone
                label="Survivor S1"
                objects={viz.survivor1}
                color="var(--heap-survivor)"
                gcEvent={viz.gcEvent}
              />
            </div>
          </div>

          <HeapZone
            label="Old Generation"
            objects={viz.oldGen}
            color="var(--heap-old)"
            large
            gcEvent={viz.gcEvent === 'full' ? 'full' : null}
          />

          <HeapZone
            label="Metaspace (non-heap)"
            objects={viz.metaspace}
            color="var(--metaspace)"
            gcEvent={null}
          />
        </div>

        {/* RIGHT: stack + panels */}
        <div className={styles.rightSide}>
          <ThreadStack frames={viz.stack} />
          <MetricsPanel metrics={metrics} />
          <ResultPanel result={viz?.result} />
          <ComplexityPanel />
        </div>
      </div>

      <div className={styles.codePanelWrap}>
        <CodePanel code={active.code} language={active.language} />
      </div>

      {tc && (
        <div className={styles.contentSection}>
          <button className={styles.contentToggle} onClick={() => setShowContent(!showContent)}>
            {showContent ? '▾' : '▸'} Topic Content
          </button>
          {showContent && (
            <div className={styles.contentBody}>
              {tc.concept && (
                <div className={styles.contentBlock}>
                  <h4>Concept</h4>
                  {tc.concept.map((c, i) => (
                    <div key={i} className={styles.contentItem}>
                      <strong>{c.title}</strong>
                      <p>{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {tc.why && (
                <div className={styles.contentBlock}>
                  <h4>Why It Matters</h4>
                  <ul>{tc.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}
              {tc.gotcha && (
                <div className={`${styles.contentBlock} ${styles.gotchaBlock}`}>
                  <h4>Gotchas</h4>
                  <ul>{tc.gotcha.map((g, i) => <li key={i}>{g}</li>)}</ul>
                </div>
              )}
              {tc.interview && (
                <div className={styles.contentBlock}>
                  <h4>Interview Q&A</h4>
                  {tc.interview.map((q, i) => (
                    <div key={i} className={styles.qaItem}>
                      <strong>Q: {q.question}</strong>
                      <p>{q.answer}</p>
                      {q.followUps?.length > 0 && (
                        <small>Follow-ups: {q.followUps.join(' · ')}</small>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {tc.tradeoffs && (
                <div className={styles.contentBlock}>
                  <h4>Trade-offs</h4>
                  {tc.tradeoffs.map((t, i) => (
                    <div key={i} className={styles.tradeItem}>
                      <span className={styles.pro}>✓ {t.pro}</span>
                      <span className={styles.con}>✗ {t.con}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <StepControls />
    </div>
  );
}

function HeapZone({ label, objects = [], color, large, gcEvent }) {
  const isSweeping = gcEvent === 'sweep' || gcEvent === 'full';
  return (
    <div className={`${styles.zone} ${large ? styles.zoneLarge : ''}`} style={{ '--zone-color': color }}>
      <div className={styles.zoneHeader}>
        <span className={styles.zoneTitle}>{label}</span>
        <span className={styles.zoneCount}>{objects.length} obj</span>
      </div>
      <div className={styles.zoneObjects}>
        {objects.map((obj) => (
          <div
            key={obj.id}
            className={`${styles.obj} ${!obj.reachable && isSweeping ? styles.objDead : ''} ${obj.age >= 2 ? styles.objOld : ''}`}
            title={`${obj.id} age=${obj.age}`}
          >
            <span className={styles.objId}>{obj.id}</span>
            {obj.age > 0 && <span className={styles.objAge}>×{obj.age}</span>}
          </div>
        ))}
        {objects.length === 0 && <span className={styles.zoneEmpty}>empty</span>}
      </div>
      {isSweeping && objects.some((o) => !o.reachable) && (
        <div className={styles.sweepOverlay}>GC sweeping…</div>
      )}
    </div>
  );
}

function ThreadStack({ frames = [] }) {
  return (
    <div className={styles.stack}>
      <div className={styles.stackLabel}>Thread Stack</div>
      {[...frames].reverse().map((f, i) => (
        <div key={i} className={`${styles.stackFrame} ${f.active ? styles.frameActive : ''}`}>
          {f.frame}
        </div>
      ))}
      {frames.length === 0 && <div className={styles.zoneEmpty}>no frames</div>}
    </div>
  );
}
