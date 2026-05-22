import { useVisualizerScenario } from '../../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './thread-engine';
import ScenarioToolbar from '../../../components/shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../../components/shared/StepControls/StepControls';
import ComplexityPanel from '../../../components/shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../../components/shared/CodePanel/CodePanel';
import ResultPanel from '../../../components/shared/ResultPanel/ResultPanel';
import styles from './ThreadVisualizer.module.css';

const STATE_COLOR = {
  new:        'var(--text-muted)',
  runnable:   'var(--node-visited)',
  running:    'var(--node-default)',
  blocked:    'var(--pod-crash)',
  waiting:    'var(--node-comparing)',
  terminated: 'var(--text-muted)',
};

const STATE_LABEL = {
  new:        'NEW',
  runnable:   'RUNNABLE',
  running:    'RUNNING',
  blocked:    'BLOCKED',
  waiting:    'WAITING',
  terminated: 'DONE',
};

export default function ThreadVisualizer() {
  const { activeId, active, viz, select } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  const isDeadlock = viz.deadlock === true;

  return (
    <div className={`${styles.wrapper} ${isDeadlock ? styles.deadlockActive : ''}`}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      {isDeadlock && (
        <div className={styles.deadlockBanner}>💀 DEADLOCK — Circular Wait Detected</div>
      )}

      <div className={styles.arena}>
        <div className={styles.threadsCol}>
          <div className={styles.colLabel}>Threads</div>
          {(viz.threads || []).map((t) => <ThreadCard key={t.id} thread={t} />)}
        </div>

        <div className={styles.locksCol}>
          {viz.semaphore ? (
            <SemaphoreView sem={viz.semaphore} />
          ) : (
            <>
              <div className={styles.colLabel}>Locks</div>
              {(viz.locks || []).map((lk) => <LockCard key={lk.id} lock={lk} isDeadlock={isDeadlock} />)}
            </>
          )}
        </div>
      </div>

      {viz.events?.length > 0 && (
        <div className={styles.events}>
          <div className={styles.eventsLabel}>Events</div>
          {viz.events.slice(-5).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
              <span className={styles.evDot} />
              {ev.msg}
            </div>
          ))}
        </div>
      )}

      <div className={styles.bottom}>
        <CodePanel code={active.code} language={active.language} />
        <div>
          <ResultPanel result={viz?.result} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function ThreadCard({ thread }) {
  const color     = STATE_COLOR[thread.state] || 'var(--text-muted)';
  const isRunning = thread.state === 'running';
  const isBlocked = thread.state === 'blocked';
  const isDone    = thread.state === 'terminated';
  return (
    <div
      className={`${styles.threadCard} ${isRunning ? styles.threadRunning : ''} ${isBlocked ? styles.threadBlocked : ''} ${isDone ? styles.threadDone : ''}`}
      style={{ '--t-color': color }}
    >
      <div className={styles.threadHeader}>
        <span className={styles.threadDot} />
        <span className={styles.threadName}>{thread.name}</span>
        <span className={styles.threadId}>{thread.id}</span>
      </div>
      <div className={styles.threadState} style={{ color }}>
        {STATE_LABEL[thread.state] || thread.state.toUpperCase()}
      </div>
      <div className={styles.threadMeta}>
        {thread.holds.length > 0 && <span className={styles.holds}>holds: {thread.holds.join(', ')}</span>}
        {thread.wants && <span className={styles.wants}>wants: {thread.wants}</span>}
        {thread.ops > 0 && <span className={styles.ops}>ops: {thread.ops}</span>}
      </div>
    </div>
  );
}

function LockCard({ lock, isDeadlock }) {
  const held = !!lock.holder;
  return (
    <div className={`${styles.lockCard} ${held ? styles.lockHeld : styles.lockFree} ${isDeadlock && held ? styles.lockDeadlock : ''}`}>
      <div className={styles.lockIcon}>{held ? '🔒' : '🔓'}</div>
      <div className={styles.lockId}>{lock.id}</div>
      <div className={styles.lockHolder}>{lock.holder ? `held by ${lock.holder}` : 'available'}</div>
      {lock.queue.length > 0 && <div className={styles.lockQueue}>queue: {lock.queue.join(' → ')}</div>}
    </div>
  );
}

function SemaphoreView({ sem }) {
  const pct = sem.count / sem.max;
  return (
    <div className={styles.semView}>
      <div className={styles.colLabel}>Semaphore</div>
      <div className={styles.semCard}>
        <div className={styles.semName}>{sem.name}</div>
        <div className={styles.semCount}>
          <span className={styles.semCurrent}>{sem.count}</span>
          <span className={styles.semMax}>/ {sem.max}</span>
        </div>
        <div className={styles.semBar}>
          <div
            className={styles.semBarFill}
            style={{ width: `${pct * 100}%`, background: pct === 0 ? 'var(--pod-crash)' : pct < 0.5 ? 'var(--node-comparing)' : 'var(--pod-running)' }}
          />
        </div>
        <div className={styles.semLabel}>
          {sem.count === 0 ? 'FULL — callers blocked' : `${sem.count} slot${sem.count !== 1 ? 's' : ''} available`}
        </div>
        {sem.queue.length > 0 && <div className={styles.semQueue}>waiting: {sem.queue.join(', ')}</div>}
        <div className={styles.semSlots}>
          {Array.from({ length: sem.max }, (_, i) => (
            <div key={i} className={`${styles.semSlot} ${i < (sem.max - sem.count) ? styles.semSlotUsed : styles.semSlotFree}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
