import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './go-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import styles from './GoVisualizer.module.css';

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

const LOCK_STATE_COLOR = {
  free:  'var(--pod-running)',
  held:  'var(--pod-crash)',
  read:  'var(--node-comparing)',
  write: 'var(--pod-crash)',
};

export default function GoVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.arena}>
        {active.layout === 'scheduler' ? (
          <SchedulerView viz={viz} />
        ) : active.layout === 'mutex' ? (
          <MutexView viz={viz} />
        ) : (
          <RuntimeView viz={viz} />
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

function RuntimeView({ viz }) {
  return (
    <>
      {viz.processors?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Processors (P) + OS Threads (M)</div>
          <div className={styles.processorRow}>
            {viz.processors.map((p) => (
              <ProcessorCard key={p.id} p={p} goroutines={viz.goroutines || []} />
            ))}
          </div>
        </div>
      )}

      {viz.goroutines?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Goroutines</div>
          <div className={styles.goroutineGrid}>
            {viz.goroutines.map((g) => <GoroutineChip key={g.id} g={g} />)}
          </div>
        </div>
      )}

      {viz.globalQueue?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Global Run Queue</div>
          <div className={styles.queue}>
            {viz.globalQueue.map((gid, i) => <span key={i} className={styles.queueItem}>{gid}</span>)}
          </div>
        </div>
      )}

      {viz.channels?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Channels</div>
          <div className={styles.channelRow}>
            {viz.channels.map((ch) => <ChannelCard key={ch.id} ch={ch} />)}
          </div>
        </div>
      )}

      {viz.selected && (
        <div className={styles.selectedCase}>
          <span className={styles.selectedLabel}>Selected:</span>
          <span className={styles.selectedVal}>case &lt;-{viz.selected}</span>
        </div>
      )}

      {viz.output?.length > 0 && (
        <div className={styles.outputBox}>
          <div className={styles.outputLabel}>Output</div>
          {viz.output.map((line, i) => <div key={i} className={styles.outputLine}>{line}</div>)}
        </div>
      )}
    </>
  );
}

function MutexView({ viz }) {
  return (
    <>
      {viz.locks?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Locks</div>
          <div className={styles.channelRow}>
            {viz.locks.map((lk) => (
              <div key={lk.id} className={styles.lockCard} style={{ '--lock-color': LOCK_STATE_COLOR[lk.state] || 'var(--text-muted)' }}>
                <div className={styles.lockHeader}>
                  <span className={styles.lockName}>{lk.id}</span>
                  <span className={styles.lockState}>{lk.state.toUpperCase()}</span>
                </div>
                {lk.holder && <div className={styles.lockHolder}>held by: {lk.holder}</div>}
                {lk.waiters?.length > 0 && <div className={styles.lockWaiters}>waiting: {lk.waiters.join(', ')}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {viz.goroutines?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Goroutines</div>
          <div className={styles.goroutineGrid}>
            {viz.goroutines.map((g) => <GoroutineChip key={g.id} g={g} />)}
          </div>
        </div>
      )}

      {viz.counter !== undefined && (
        <div className={styles.counterDisplay}>
          <span className={styles.counterLabel}>counter</span>
          <span className={styles.counterValue}>{viz.counter}</span>
        </div>
      )}

      {viz.output?.length > 0 && (
        <div className={styles.outputBox}>
          <div className={styles.outputLabel}>Output</div>
          {viz.output.map((line, i) => <div key={i} className={styles.outputLine}>{line}</div>)}
        </div>
      )}
    </>
  );
}

function SchedulerView({ viz }) {
  return (
    <div className={styles.schedulerGrid}>
      {viz.threads?.length > 0 && (
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

      {viz.processors?.length > 0 && (
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
                    {p.localQ.map((gid) => <span key={gid} className={styles.queueItem}>{gid}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
  const color    = G_STATE_COLOR[g.state] || 'var(--text-muted)';
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
  const pct  = ch.cap > 0 ? ch.items.length / ch.cap : 0;
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
              {ch.items.map((item, i) => <span key={i} className={styles.chItem}>{item}</span>)}
              {ch.items.length === 0 && <span className={styles.chEmpty}>empty</span>}
            </div>
            <span className={styles.chLen}>{ch.items.length}/{ch.cap}</span>
          </>
        )}
      </div>
      {ch.senders.length   > 0 && <div className={styles.chBlocked}>blocked: {ch.senders.join(', ')}</div>}
      {ch.receivers.length > 0 && <div className={styles.chBlocked}>waiting recv: {ch.receivers.join(', ')}</div>}
    </div>
  );
}
