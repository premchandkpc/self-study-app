import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './k8s-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import ResultPanel from '../../shared/ResultPanel/ResultPanel';
import styles from './KubernetesVisualizer.module.css';

const POD_STATE_COLOR = {
  pending:          'var(--pod-pending)',
  running:          'var(--pod-running)',
  terminating:      'var(--pod-terminating)',
  error:            'var(--pod-crash)',
  crashloopbackoff: 'var(--pod-crash)',
};

const SERVICE_TYPE_COLOR = {
  ClusterIP:    'var(--node-default)',
  NodePort:     'var(--node-comparing)',
  LoadBalancer: 'var(--pod-running)',
};

export default function KubernetesVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

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

      {viz.hpa && <HPABar hpa={viz.hpa} />}

      {viz.services?.length > 0 && <ServicesView services={viz.services} />}

      <div className={styles.bottom}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ResultPanel result={viz?.result} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function NodeCard({ node, pods }) {
  const cpuPct = Math.min(100, (node.cpu / node.maxCpu) * 100);
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
        {pods.map((pod) => <PodChip key={pod.id} pod={pod} />)}
        {pods.length === 0 && <span className={styles.empty}>no pods</span>}
      </div>
    </div>
  );
}

function PodChip({ pod }) {
  const color    = POD_STATE_COLOR[pod.state] || 'var(--text-muted)';
  const isActive = pod.state === 'running';
  const isCrash  = pod.state === 'error' || pod.state === 'crashloopbackoff';
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

function HPABar({ hpa }) {
  return (
    <div className={styles.hpaBar}>
      <span className={styles.hpaLabel}>HPA</span>
      <span>min:{hpa.min}</span>
      <div className={styles.hpaPods}>
        {Array.from({ length: hpa.max }, (_, i) => (
          <div
            key={i}
            className={`${styles.hpaDot} ${i < hpa.current ? styles.hpaDotActive : ''} ${i < hpa.target && i >= hpa.current ? styles.hpaDotTarget : ''}`}
          />
        ))}
      </div>
      <span>max:{hpa.max}</span>
      <span className={styles.hpaCurrent}>current: {hpa.current}</span>
    </div>
  );
}

function ServicesView({ services }) {
  return (
    <div className={styles.servicesView}>
      <div className={styles.servicesLabel}>Services</div>
      <div className={styles.servicesRow}>
        {services.map((svc) => (
          <div key={svc.id} className={styles.serviceCard} style={{ '--svc-color': SERVICE_TYPE_COLOR[svc.type] || 'var(--node-default)' }}>
            <div className={styles.svcHeader}>
              <span className={styles.svcName}>{svc.id}</span>
              <span className={styles.svcType}>{svc.type}</span>
            </div>
            <div className={styles.svcIp}>{svc.ip}:{svc.port}</div>
            <div className={styles.svcEndpoints}>→ {svc.endpoints?.join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
