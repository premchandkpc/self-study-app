import { useEffect, useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { buildGoSteps, GO_CODE } from './go-engine';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import Button from '../../shared/Button/Button';
import styles from './GoVisualizer.module.css';

const SCENARIOS = [
  { id: 'goroutine', label: 'Goroutines', icon: '🐹' },
  { id: 'channel',   label: 'Channels',   icon: '📡' },
  { id: 'select',    label: 'Select',     icon: '🔀' },
  { id: 'scheduler', label: 'Scheduler',  icon: '⚙️' },
];

const G_STATE_COLOR = {
  runnable: 'var(--node-visited)',
  running:  'var(--node-default)',
  waiting:  'var(--node-comparing)',
  dead:     'var(--text-muted)',
  syscall:  'var(--pod-crash)',
};
const G_STATE_LABEL = {
  runnable: 'RUNNABLE',
  running:  'RUNNING',
  waiting:  'WAITING',
  dead:     'DEAD',
  syscall:  'SYSCALL',
};

export default function GoVisualizer() {
  const { state, dispatch } = useSimulation();
  const [scenario, setScenario] = useState('goroutine');
  const [viz, setViz] = useState(null);

  function init(sc) {
    setScenario(sc);
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEPS', payload: buildGoSteps(sc) });
  }

  useEffect(() => { init('goroutine'); }, []);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) setViz(step);
  }, [state.currentStep, state.steps]);

  if (!viz) return null;

  const metrics = buildMetrics(scenario, viz.metrics || {});

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {SCENARIOS.map((sc) => (
            <Button key={sc.id} variant={scenario === sc.id ? 'primary' : 'ghost'} size="sm" icon={sc.icon} onClick={() => init(sc.id)}>
              {sc.label}
            </Button>
          ))}
        </div>
        <NarrationPanel />
      </div>

      <div className={styles.arena}>
        {/* Goroutine / Channel / Select view */}
        {(scenario === 'goroutine' || scenario === 'channel' || scenario === 'select') && (
          <>
            {/* Processors */}
            {viz.processors && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Processors (P) + OS Threads (M)</div>
                <div className={styles.processorRow}>
                  {viz.processors.map((p) => (
                    <ProcessorCard key={p.id} p={p} goroutines={viz.goroutines || []} />
                  ))}
                </div>
              </div>
            )}

            {/* Goroutines */}
            {viz.goroutines?.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Goroutines</div>
                <div className={styles.goroutineGrid}>
                  {viz.goroutines.map((g) => (
                    <GoroutineChip key={g.id} g={g} />
                  ))}
                </div>
              </div>
            )}

            {/* Global queue */}
            {viz.globalQueue?.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Global Run Queue</div>
                <div className={styles.queue}>
                  {viz.globalQueue.map((gid, i) => (
                    <span key={i} className={styles.queueItem}>{gid}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Channels */}
            {viz.channels?.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Channels</div>
                <div className={styles.channelRow}>
                  {viz.channels.map((ch) => (
                    <ChannelCard key={ch.id} ch={ch} />
                  ))}
                </div>
              </div>
            )}

            {/* Selected case */}
            {viz.selected && (
              <div className={styles.selectedCase}>
                <span className={styles.selectedLabel}>Selected:</span>
                <span className={styles.selectedVal}>case &lt;-{viz.selected}</span>
              </div>
            )}

            {/* Output */}
            {viz.output?.length > 0 && (
              <div className={styles.outputBox}>
                <div className={styles.outputLabel}>Output</div>
                {viz.output.map((line, i) => (
                  <div key={i} className={styles.outputLine}>{line}</div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Scheduler view */}
        {scenario === 'scheduler' && (
          <SchedulerView viz={viz} />
        )}
      </div>

      {viz.events?.length > 0 && (
        <div className={styles.events}>
          <div className={styles.eventsLabel}>Runtime Events</div>
          {viz.events.slice(-4).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
              <span className={styles.evDot} />
              {ev.msg}
            </div>
          ))}
        </div>
      )}

      <div className={styles.bottom}>
        <CodePanel code={GO_CODE[scenario] || []} language="Go" />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function ProcessorCard({ p, goroutines }) {
  const runningG = goroutines.find((g) => g.id === p.g);
  return (
    <div className={`${styles.processorCard} ${p.g ? styles.procActive : ''}`}>
      <div className={styles.procHeader}>
        <span className={styles.procId}>{p.id}</span>
        <span className={styles.procThread}>on {p.m}</span>
      </div>
      {runningG ? (
        <div className={styles.procRunning}>
          <span className={styles.procGDot} />
          <span className={styles.procGName}>{runningG.id}</span>
          <span className={styles.procGFn}>{runningG.fn}</span>
        </div>
      ) : (
        <div className={styles.procIdle}>idle</div>
      )}
    </div>
  );
}

function GoroutineChip({ g }) {
  const color = G_STATE_COLOR[g.state] || 'var(--text-muted)';
  const isRunning = g.state === 'running';
  const isBlocked = g.state === 'waiting' || g.state === 'syscall';
  return (
    <div
      className={`${styles.goroutineChip} ${isRunning ? styles.gRunning : ''} ${isBlocked ? styles.gBlocked : ''} ${g.state === 'dead' ? styles.gDead : ''}`}
      style={{ '--g-color': color }}
    >
      <span className={styles.gDot} />
      <span className={styles.gId}>{g.id}</span>
      <span className={styles.gFn}>{g.fn}</span>
      <span className={styles.gState} style={{ color }}>{G_STATE_LABEL[g.state] || g.state}</span>
    </div>
  );
}

function ChannelCard({ ch }) {
  const pct = ch.cap > 0 ? ch.items.length / ch.cap : 0;
  const full = ch.items.length === ch.cap && ch.cap > 0;
  return (
    <div className={`${styles.channelCard} ${full ? styles.channelFull : ''}`}>
      <div className={styles.chHeader}>
        <span className={styles.chName}>ch={ch.id}</span>
        <span className={styles.chCap}>cap={ch.cap}</span>
      </div>
      <div className={styles.chBuffer}>
        {ch.cap === 0 ? (
          <span className={styles.chUnbuffered}>unbuffered (sync)</span>
        ) : (
          <>
            <div className={styles.chBar}>
              <div className={styles.chBarFill} style={{ width: `${pct * 100}%`, background: full ? 'var(--pod-crash)' : 'var(--pod-running)' }} />
            </div>
            <div className={styles.chItems}>
              {ch.items.map((item, i) => (
                <span key={i} className={styles.chItem}>{item}</span>
              ))}
              {ch.items.length === 0 && <span className={styles.chEmpty}>empty</span>}
            </div>
            <span className={styles.chLen}>{ch.items.length}/{ch.cap}</span>
          </>
        )}
      </div>
      {ch.senders.length > 0 && <div className={styles.chBlocked}>blocked: {ch.senders.join(', ')}</div>}
      {ch.receivers.length > 0 && <div className={styles.chBlocked}>waiting recv: {ch.receivers.join(', ')}</div>}
    </div>
  );
}

function SchedulerView({ viz }) {
  return (
    <div className={styles.schedulerGrid}>
      {/* OS Threads */}
      {viz.threads && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>OS Threads (M)</div>
          <div className={styles.threadRow}>
            {viz.threads.map((m) => (
              <div key={m.id} className={`${styles.threadCard} ${m.state === 'running' ? styles.threadRunning : m.state === 'syscall' ? styles.threadSyscall : ''}`}>
                <span className={styles.threadId}>{m.id}</span>
                <span className={styles.threadState}>{m.state.toUpperCase()}</span>
                {m.p && <span className={styles.threadP}>→ {m.p}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processors with local queues */}
      {viz.processors && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Processors (P) + Local Run Queues</div>
          <div className={styles.processorRow}>
            {viz.processors.map((p) => (
              <div key={p.id} className={`${styles.processorCard} ${p.g ? styles.procActive : ''}`}>
                <div className={styles.procHeader}>
                  <span className={styles.procId}>{p.id}</span>
                  <span className={styles.procThread}>{p.m}</span>
                </div>
                {p.g && (
                  <div className={styles.procRunning}>
                    <span className={styles.procGDot} />
                    <span className={styles.procGName}>Running: {p.g}</span>
                  </div>
                )}
                {p.localQ?.length > 0 && (
                  <div className={styles.localQ}>
                    <span className={styles.localQLabel}>LocalQ:</span>
                    {p.localQ.map((gid) => (
                      <span key={gid} className={styles.queueItem}>{gid}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goroutines summary */}
      {viz.goroutines?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>All Goroutines</div>
          <div className={styles.goroutineGrid}>
            {viz.goroutines.map((g) => <GoroutineChip key={g.id} g={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function buildMetrics(scenario, m) {
  if (scenario === 'goroutine') return [
    { label: 'Created',  value: m.created || 0, max: 8,  unit: '', color: 'var(--node-default)' },
    { label: 'Running',  value: m.running  || 0, max: 4,  unit: '', color: 'var(--pod-running)' },
    { label: 'Done',     value: m.done     || 0, max: 8,  unit: '', color: 'var(--text-muted)' },
  ];
  if (scenario === 'channel') return [
    { label: 'Sent',     value: m.sent     || 0, max: 10, unit: '', color: 'var(--node-default)' },
    { label: 'Received', value: m.received || 0, max: 10, unit: '', color: 'var(--pod-running)' },
    { label: 'Blocked',  value: m.blocked  || 0, max: 3,  unit: '', color: 'var(--pod-crash)' },
  ];
  if (scenario === 'select') return [
    { label: 'Loops',    value: m.loops    || 0, max: 5,  unit: '', color: 'var(--node-default)' },
    { label: 'Selected', value: m.selected || 0, max: 5,  unit: '', color: 'var(--pod-running)' },
    { label: 'Timeouts', value: m.timeouts || 0, max: 3,  unit: '', color: 'var(--node-comparing)' },
  ];
  if (scenario === 'scheduler') return [
    { label: 'Goroutines', value: m.goroutines || 0, max: 6, unit: '', color: 'var(--node-default)' },
    { label: 'Threads',    value: m.threads    || 0, max: 4, unit: '', color: 'var(--node-comparing)' },
    { label: 'Steals',     value: m.steals     || 0, max: 3, unit: '', color: 'var(--pod-running)' },
  ];
  return [];
}
