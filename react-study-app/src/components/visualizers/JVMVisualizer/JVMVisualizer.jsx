import { useEffect, useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { buildJVMSteps, JVM_CODE } from './jvm-engine';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import styles from './JVMVisualizer.module.css';

export default function JVMVisualizer() {
  const { state, dispatch } = useSimulation();
  const [viz, setViz] = useState(null);

  useEffect(() => {
    dispatch({ type: 'SET_STEPS', payload: buildJVMSteps() });
  }, [dispatch]);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) setViz(step);
  }, [state.currentStep, state.steps]);

  if (!viz) return null;

  const metrics = [
    { label: 'Heap Used', value: viz.metrics?.heapUsed || 0, max: 200, unit: 'MB', color: 'var(--heap-eden)', warn: 60, critical: 85 },
    { label: 'GC Count',  value: viz.metrics?.gcCount  || 0, max: 10,  unit: '',   color: 'var(--node-visited)' },
    { label: 'GC Pause',  value: viz.metrics?.gcPause  || 0, max: 300, unit: 'ms', color: 'var(--gc-sweep)', warn: 50, critical: 80 },
  ];

  const isSTW = viz.stopTheWorld;

  return (
    <div className={`${styles.wrapper} ${isSTW ? styles.stopWorld : ''}`}>
      {isSTW && <div className={styles.stwBanner}>⚠ STOP-THE-WORLD PAUSE</div>}

      <div className={styles.narration}>
        <NarrationPanel />
      </div>

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
          <ComplexityPanel />
        </div>
      </div>

      <div className={styles.codePanelWrap}>
        <CodePanel code={JVM_CODE} language="Java" />
      </div>

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
