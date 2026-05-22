import { useVisualizerScenario } from '../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './concurrency-engine';
import ScenarioToolbar from '../../components/shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../components/shared/StepControls/StepControls';
import CodePanel from '../../components/shared/CodePanel/CodePanel';
import MetricsPanel from '../../components/shared/MetricsPanel/MetricsPanel';
import ComplexityPanel from '../../components/shared/ComplexityPanel/ComplexityPanel';
import TopicContentSection from '../../components/shared/TopicContentSection/TopicContentSection';
import styles from './ConcurrencyVisualizer.module.css';

const STATE_COLORS = {
  running: 'var(--pod-running)',
  blocked: 'var(--pod-crash)',
  waiting: 'var(--node-comparing)',
  terminated: 'var(--text-muted)',
  new: 'var(--text-faint)',
  idle: 'var(--text-faint)',
};

export default function ConcurrencyVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.mainViz}>
          {activeId === 'mutex' && <MutexView viz={viz} />}
          {activeId === 'semaphore' && <SemaphoreView viz={viz} />}
          {activeId === 'producer-consumer' && <ProducerConsumerView viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          {viz.events?.length > 0 && (
            <div className={styles.events}>
              <div className={styles.eventsLabel}>Events</div>
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

      <TopicContentSection topicContent={active.topicContent} />
    </div>
  );
}

function ThreadStateBox({ thread, style }) {
  return (
    <div
      className={styles.threadBox}
      style={{ '--thread-color': STATE_COLORS[thread.state] || 'var(--text-faint)', ...style }}
    >
      <div className={styles.threadId}>{thread.id}</div>
      <div className={styles.threadState}>{thread.state}</div>
      {thread.holds && <div className={styles.threadHolds}>holds: {thread.holds}</div>}
    </div>
  );
}

function MutexView({ viz }) {
  const { threads, mutex } = viz;

  return (
    <div className={styles.mutexLayout}>
      <div className={styles.threadGrid}>
        {threads.map((t) => (
          <ThreadStateBox key={t.id} thread={t} />
        ))}
      </div>

      <div className={styles.mutexSection}>
        <div className={styles.sectionLabel}>Mutex</div>
        <div className={`${styles.mutexBox} ${mutex.owner ? styles.mutexLocked : styles.mutexFree}`}>
          <div className={styles.mutexIcon}>{mutex.owner ? '\uD83D\uDD12' : '\uD83D\uDD13'}</div>
          <div className={styles.mutexOwner}>owner: {mutex.owner || 'none'}</div>
        </div>
      </div>

      <div className={styles.queueSection}>
        <div className={styles.sectionLabel}>Blocked Queue</div>
        <div className={styles.queueSlots}>
          {mutex.queue.length > 0 ? (
            mutex.queue.map((tid, i) => (
              <div key={i} className={styles.queueSlot}>{tid}</div>
            ))
          ) : (
            <div className={styles.queueEmpty}>empty</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SemaphoreView({ viz }) {
  const { semaphore, threads } = viz;

  return (
    <div className={styles.semaphoreLayout}>
      <div className={styles.threadGrid}>
        {threads.map((t) => (
          <ThreadStateBox key={t.id} thread={t} />
        ))}
      </div>

      <div className={styles.semSection}>
        <div className={styles.sectionLabel}>Counting Semaphore</div>
        <div className={styles.semCounter}>
          <div className={styles.semValue}>{semaphore.count}</div>
          <div className={styles.semBar}>
            {Array.from({ length: semaphore.max }, (_, i) => (
              <div
                key={i}
                className={`${styles.semPermit} ${i < semaphore.count ? styles.permitAvailable : styles.permitUsed}`}
              />
            ))}
          </div>
          <div className={styles.semMax}>max: {semaphore.max}</div>
        </div>
      </div>

      <div className={styles.queueSection}>
        <div className={styles.sectionLabel}>Waiting Threads</div>
        <div className={styles.queueSlots}>
          {semaphore.queue.length > 0 ? (
            semaphore.queue.map((tid, i) => (
              <div key={i} className={styles.queueSlot}>{tid}</div>
            ))
          ) : (
            <div className={styles.queueEmpty}>none</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProducerConsumerView({ viz }) {
  const { buffer, producer, consumer, empty, full, mutex } = viz;

  return (
    <div className={styles.pcLayout}>
      <div className={styles.bufSection}>
        <div className={styles.sectionLabel}>Bounded Buffer (ring)</div>
        <div className={styles.bufferSlots}>
          {buffer.map((slot) => (
            <div
              key={slot.slot}
              className={`${styles.bufferSlot} ${slot.state === 'full' ? styles.slotFull : styles.slotEmpty}`}
            >
              <div className={styles.slotData}>{slot.state === 'full' ? slot.data : ''}</div>
              <div className={styles.slotIndex}>[{slot.slot}]</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.threadStates}>
        <div className={styles.threadStatesRow}>
          <div className={styles.threadStateBox} style={{ '--thread-color': STATE_COLORS[producer.state] }}>
            <span className={styles.threadStateLabel}>Producer</span>
            <span className={styles.threadStateVal}>{producer.state}</span>
            <span className={styles.threadStatePos}>pos={producer.pos}</span>
          </div>
          <div className={styles.threadStateBox} style={{ '--thread-color': STATE_COLORS[consumer.state] }}>
            <span className={styles.threadStateLabel}>Consumer</span>
            <span className={styles.threadStateVal}>{consumer.state}</span>
            <span className={styles.threadStatePos}>pos={consumer.pos}</span>
          </div>
        </div>
      </div>

      <div className={styles.semCounters}>
        <div className={styles.semCountBox}>
          <span className={styles.semCountLabel}>empty</span>
          <span className={styles.semCountVal}>{empty.count}</span>
        </div>
        <div className={styles.semCountBox}>
          <span className={styles.semCountLabel}>full</span>
          <span className={styles.semCountVal}>{full.count}</span>
        </div>
        <div className={styles.semCountBox}>
          <span className={styles.semCountLabel}>mutex owner</span>
          <span className={styles.semCountVal}>{mutex.owner || 'none'}</span>
        </div>
      </div>
    </div>
  );
}
