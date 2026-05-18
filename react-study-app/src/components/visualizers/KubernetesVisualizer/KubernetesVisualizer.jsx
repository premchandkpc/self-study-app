import { useEffect, useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { buildK8sSteps, K8S_CODE } from './k8s-engine';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import Button from '../../shared/Button/Button';
import styles from './KubernetesVisualizer.module.css';

const SCENARIOS = [
  { id: 'schedule', label: 'Scheduling',  icon: '📅' },
  { id: 'hpa',      label: 'HPA Scale',   icon: '📈' },
  { id: 'rolling',  label: 'Rolling',     icon: '🔄' },
  { id: 'crash',    label: 'Crash Loop',  icon: '💥' },
];

const POD_STATE_COLOR = {
  pending:          'var(--pod-pending)',
  running:          'var(--pod-running)',
  terminating:      'var(--pod-terminating)',
  error:            'var(--pod-crash)',
  crashloopbackoff: 'var(--pod-crash)',
};

export default function KubernetesVisualizer() {
  const { state, dispatch } = useSimulation();
  const [scenario, setScenario] = useState('schedule');
  const [viz, setViz] = useState(null);

  function init(sc) {
    setScenario(sc);
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEPS', payload: buildK8sSteps(sc) });
  }

  useEffect(() => { init('schedule'); }, []);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) setViz(step);
  }, [state.currentStep, state.steps]);

  if (!viz) return null;

  const metrics = [
    { label: 'Pods',     value: viz.metrics?.pods     || 0, max: 8,   unit: '',  color: 'var(--pod-running)' },
    { label: 'CPU avg',  value: viz.metrics?.cpu      || 0, max: 100, unit: '%', color: 'var(--node-comparing)', warn: 60, critical: 85 },
    { label: 'Restarts', value: viz.metrics?.restarts || 0, max: 10,  unit: '',  color: 'var(--pod-crash)', warn: 30, critical: 60 },
  ];

  return (
    <div className={styles.wrapper}>
      {/* toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {SCENARIOS.map((sc) => (
            <Button
              key={sc.id}
              variant={scenario === sc.id ? 'primary' : 'ghost'}
              size="sm"
              icon={sc.icon}
              onClick={() => init(sc.id)}
            >
              {sc.label}
            </Button>
          ))}
        </div>
        <NarrationPanel />
      </div>

      {/* cluster viz */}
      <div className={styles.cluster}>
        <div className={styles.controlPlane}>
          <span className={styles.planeLabel}>⚙ Control Plane</span>
          <div className={styles.components}>
            {['API Server', 'Scheduler', 'etcd', 'Controller'].map((c) => (
              <div key={c} className={styles.component}>{c}</div>
            ))}
          </div>
        </div>

        <div className={styles.nodes}>
          {(viz.nodes || []).map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              pods={(viz.pods || []).filter((p) => p.node === node.id)}
            />
          ))}
        </div>

        {/* event log */}
        {viz.events?.length > 0 && (
          <div className={styles.events}>
            <div className={styles.eventsLabel}>Events</div>
            {viz.events.slice(-4).map((ev, i) => (
              <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
                <span className={styles.evDot} />
                {ev.msg}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HPA indicator */}
      {viz.hpa && (
        <div className={styles.hpaBar}>
          <span className={styles.hpaLabel}>HPA</span>
          <span>min:{viz.hpa.min}</span>
          <div className={styles.hpaPods}>
            {Array.from({ length: viz.hpa.max }, (_, i) => (
              <div
                key={i}
                className={`${styles.hpaDot} ${i < viz.hpa.current ? styles.hpaDotActive : ''} ${i < viz.hpa.target && i >= viz.hpa.current ? styles.hpaDotTarget : ''}`}
              />
            ))}
          </div>
          <span>max:{viz.hpa.max}</span>
          <span className={styles.hpaCurrent}>current: {viz.hpa.current}</span>
        </div>
      )}

      <div className={styles.bottom}>
        <CodePanel code={K8S_CODE[scenario] || []} language="YAML/Shell" />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function NodeCard({ node, pods }) {
  const cpuPct = Math.min(100, (node.cpu / node.maxCpu) * 100);
  const memPct = Math.min(100, (node.mem / node.maxMem) * 100);
  return (
    <div className={styles.node}>
      <div className={styles.nodeHeader}>
        <span className={styles.nodeId}>🖥 {node.id}</span>
        <div className={styles.nodeRes}>
          <span className={cpuPct > 80 ? styles.resWarn : styles.resOk}>
            CPU {Math.round(cpuPct)}%
          </span>
        </div>
      </div>
      <div className={styles.nodeBar}>
        <div className={styles.nodeBarFill} style={{ width: `${cpuPct}%`, background: cpuPct > 80 ? 'var(--pod-crash)' : 'var(--pod-running)' }} />
      </div>
      <div className={styles.podSlots}>
        {pods.map((pod) => (
          <PodChip key={pod.id} pod={pod} />
        ))}
        {pods.length === 0 && <span className={styles.empty}>no pods</span>}
      </div>
    </div>
  );
}

function PodChip({ pod }) {
  const color = POD_STATE_COLOR[pod.state] || 'var(--text-muted)';
  const isActive = pod.state === 'running';
  const isCrash = pod.state === 'error' || pod.state === 'crashloopbackoff';
  return (
    <div
      className={`${styles.pod} ${isActive ? styles.podRunning : ''} ${isCrash ? styles.podCrash : ''} ${pod.state === 'terminating' ? styles.podTerminating : ''}`}
      style={{ '--pod-color': color }}
      title={`${pod.id} [${pod.state}] v${pod.version || ''} restarts:${pod.restarts}`}
    >
      <span className={styles.podDot} />
      <span className={styles.podId}>{pod.id}</span>
      {pod.version && <span className={styles.podVersion}>{pod.version}</span>}
      {pod.restarts > 0 && <span className={styles.podRestarts}>↺{pod.restarts}</span>}
    </div>
  );
}
