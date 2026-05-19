import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './docker-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './DockerVisualizer.module.css';

export default function DockerVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.mainViz}>
          {activeId === 'layers'     && <LayersView     viz={viz} />}
          {activeId === 'lifecycle'  && <LifecycleView  viz={viz} />}
          {activeId === 'networking' && <NetworkingView viz={viz} />}
          {activeId === 'compose'    && <ComposeView    viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />

          {viz.events?.length > 0 && (
            <div className={styles.events}>
              <div className={styles.eventsLabel}>Docker Events</div>
              {viz.events.slice(-5).map((ev, i) => (
                <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
                  <span className={styles.evDot} />{ev.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viz.narration && (
        <div className={styles.narration}>{viz.narration}</div>
      )}

      <div className={styles.bottomPanels}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

/* === LAYERS VIEW === */
function LayersView({ viz }) {
  const layers = viz.layers || [];
  return (
    <div className={styles.layersContainer}>
      <div className={styles.layersLabel}>Docker Image Layers (bottom = base)</div>
      <div className={styles.layerStack}>
        {[...layers].reverse().map((layer, i) => (
          <div
            key={i}
            className={`${styles.layer} ${layer.cached ? styles.layerCached : styles.layerNew} ${layer.state === 'building' ? styles.layerBuilding : ''}`}
          >
            <div className={styles.layerInstruction}>{layer.instruction}</div>
            <div className={styles.layerMeta}>
              <span className={styles.layerHash}>{layer.hash}</span>
              <span className={styles.layerSize}>{layer.size}</span>
              {layer.cached && <span className={styles.cachedBadge}>CACHED</span>}
            </div>
          </div>
        ))}
        {layers.length === 0 && (
          <div className={styles.emptyState}>Layers will appear as Dockerfile instructions execute.</div>
        )}
      </div>
    </div>
  );
}

/* === LIFECYCLE VIEW === */
const STATE_COLORS = {
  none:    'var(--text-faint)',
  created: 'var(--node-comparing)',
  running: 'var(--pod-running)',
  paused:  'var(--kafka-producer)',
  stopped: 'var(--pod-crash)',
  removed: 'var(--text-muted)',
};

const ALL_STATES = ['created', 'running', 'paused', 'stopped', 'removed'];

function LifecycleView({ viz }) {
  const { container, processes } = viz;
  const currentState = container?.state || 'none';

  return (
    <div className={styles.lifecycleLayout}>
      <div className={styles.stateMachine}>
        {ALL_STATES.map((state, i) => (
          <div key={state} className={styles.stateRow}>
            <div
              className={`${styles.stateBox} ${currentState === state ? styles.stateActive : ''}`}
              style={{ '--state-color': STATE_COLORS[state] }}
            >
              {state.toUpperCase()}
            </div>
            {i < ALL_STATES.length - 1 && <div className={styles.stateArrow}>↓</div>}
          </div>
        ))}
      </div>

      <div className={styles.containerBox}>
        <div className={styles.containerHeader}>
          <span className={styles.containerIcon}>📦</span>
          <span className={styles.containerName}>Container {container?.id || ''}</span>
          <span
            className={styles.containerState}
            style={{ color: STATE_COLORS[currentState] }}
          >
            {currentState.toUpperCase()}
          </span>
        </div>

        {processes?.length > 0 && (
          <div className={styles.processList}>
            <div className={styles.processHeader}>PID  CMD</div>
            {processes.map((proc) => (
              <div key={proc.pid} className={styles.processRow}>
                <span className={styles.processPid}>{proc.pid}</span>
                <span className={styles.processCmd}>{proc.cmd}</span>
                <span className={styles.processStatus}>{proc.status}</span>
              </div>
            ))}
          </div>
        )}

        {container?.uptime !== '0s' && (
          <div className={styles.containerStats}>
            <span>uptime: {container.uptime}</span>
            <span>mem: {container.memory}</span>
            <span>cpu: {container.cpu}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* === NETWORKING VIEW === */
function NetworkingView({ viz }) {
  const { host, bridge, containers, packet } = viz;

  return (
    <div className={styles.networkLayout}>
      <div className={styles.hostBox}>
        <div className={styles.hostLabel}>Host Machine ({host?.ip})</div>

        {host?.ports?.length > 0 && (
          <div className={styles.portMappings}>
            {host.ports.map((pm, i) => (
              <div key={i} className={styles.portMap}>
                <span className={styles.hostPort}>:{pm.hostPort}</span>
                <span className={styles.portArrow}>→</span>
                <span className={styles.containerPort}>{pm.container}:{pm.containerPort}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.bridgeBox}>
          <div className={styles.bridgeLabel}>Bridge: {bridge?.name} ({bridge?.subnet})</div>
          <div className={styles.containerGrid}>
            {containers?.map((c) => (
              <div
                key={c.id}
                className={`${styles.netContainer} ${c.state === 'running' ? styles.netContainerRunning : ''} ${
                  packet && (packet.to === c.name || packet.from === c.name) ? styles.netContainerActive : ''
                }`}
              >
                <div className={styles.netContainerName}>{c.name}</div>
                <div className={styles.netContainerIP}>{c.ip}</div>
                <div className={styles.netContainerPort}>:{c.port}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {packet && (
        <div className={styles.packetInfo}>
          <span className={styles.packetLabel}>Packet</span>
          <span className={styles.packetFlow}>{packet.from} → {packet.to}</span>
          <span className={styles.packetData}>{packet.data}</span>
        </div>
      )}
    </div>
  );
}

/* === COMPOSE VIEW === */
const SERVICE_STATUS_COLOR = {
  pending:  'var(--text-faint)',
  waiting:  'var(--node-comparing)',
  starting: 'var(--kafka-producer)',
  running:  'var(--pod-running)',
};

function ComposeView({ viz }) {
  const { services } = viz;

  return (
    <div className={styles.composeLayout}>
      {services?.map((svc) => (
        <div
          key={svc.name}
          className={`${styles.serviceCard} ${svc.status === 'running' ? styles.serviceRunning : svc.status === 'waiting' ? styles.serviceWaiting : ''}`}
          style={{ '--svc-color': SERVICE_STATUS_COLOR[svc.status] || 'var(--text-faint)' }}
        >
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>{svc.name}</span>
            <span className={styles.serviceStatus}>{svc.status}</span>
          </div>
          <div className={styles.serviceImage}>{svc.image}</div>
          {svc.port && <div className={styles.servicePort}>:{svc.port}</div>}
          {svc.dependsOn?.length > 0 && (
            <div className={styles.serviceDeps}>
              depends: {svc.dependsOn.join(', ')}
            </div>
          )}
          {svc.health !== 'unknown' && (
            <div className={`${styles.serviceHealth} ${svc.health === 'healthy' ? styles.healthOk : styles.healthPending}`}>
              {svc.health === 'healthy' ? '✓ healthy' : '⏳ ' + svc.health}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
