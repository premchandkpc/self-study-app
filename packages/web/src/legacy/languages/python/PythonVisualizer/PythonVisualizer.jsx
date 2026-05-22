import { useVisualizerScenario } from '../../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './python-engine';
import ScenarioToolbar from '../../../../components/shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../../../components/shared/StepControls/StepControls';
import ComplexityPanel from '../../../../components/shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../../../components/shared/CodePanel/CodePanel';
import MetricsPanel from '../../../../components/shared/MetricsPanel/MetricsPanel';
import ResultPanel from '../../../../components/shared/ResultPanel/ResultPanel';
import styles from './PythonVisualizer.module.css';

const THREAD_STATE_COLOR = {
  idle:    'var(--text-muted)',
  running: 'var(--node-default)',
  blocked: 'var(--pod-crash)',
  done:    'var(--pod-running)',
  pending: 'var(--node-comparing)',
};

const CORO_STATE_COLOR = {
  pending: 'var(--text-muted)',
  running: 'var(--node-default)',
  done:    'var(--pod-running)',
};

export default function PythonVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.arena}>
        {activeId === 'gil'        && <GILView viz={viz} />}
        {activeId === 'asyncio'    && <AsyncioView viz={viz} />}
        {activeId === 'decorators' && <DecoratorView viz={viz} />}
      </div>

      {viz.events?.length > 0 && (
        <div className={styles.events}>
          <div className={styles.eventsLabel}>Runtime Events</div>
          {viz.events.slice(-4).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
              <span className={styles.evDot} /> {ev.msg}
            </div>
          ))}
        </div>
      )}

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

function GILView({ viz }) {
  return (
    <>
      <div className={styles.gilBadge}>
        <span className={styles.gilLabel}>GIL</span>
        <span className={styles.gilHolder}>{viz.gil?.holder ? `held by ${viz.gil.holder}` : 'free'}</span>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Threads</div>
        <div className={styles.threadRow}>
          {viz.threads?.map((t) => (
            <div
              key={t.id}
              className={`${styles.threadCard} ${t.holdingGIL ? styles.threadGIL : ''}`}
              style={{ '--t-color': THREAD_STATE_COLOR[t.state] || 'var(--text-muted)' }}
            >
              <div className={styles.threadHeader}>
                <span className={styles.threadId}>{t.id}</span>
                {t.holdingGIL && <span className={styles.gilBadgeSmall}>GIL ✓</span>}
              </div>
              <div className={styles.threadFn}>{t.fn}</div>
              <div className={styles.threadState} style={{ color: THREAD_STATE_COLOR[t.state] }}>
                {t.state.toUpperCase()}
              </div>
              {t.opsCompleted > 0 && <div className={styles.threadOps}>{t.opsCompleted} bytecodes</div>}
            </div>
          ))}
        </div>
      </div>

      {viz.ioPool?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>I/O Operations (GIL released)</div>
          <div className={styles.ioPool}>
            {viz.ioPool.map((op, i) => <div key={i} className={styles.ioOp}>{op}</div>)}
          </div>
        </div>
      )}

      {viz.output?.length > 0 && (
        <div className={styles.outputBox}>
          {viz.output.map((line, i) => <div key={i} className={styles.outputLine}>{line}</div>)}
        </div>
      )}
    </>
  );
}

function AsyncioView({ viz }) {
  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Event Loop</div>
        <div className={styles.eventLoopCard}>
          <span className={styles.loopStatus}>{viz.eventLoop?.running ? '▶ Running' : '■ Idle'}</span>
          {viz.eventLoop?.queue?.length > 0 && (
            <div className={styles.loopQueue}>
              Ready: {viz.eventLoop.queue.map((id) => <span key={id} className={styles.queueTask}>{id}</span>)}
            </div>
          )}
          {viz.eventLoop?.ioCallbacks?.length > 0 && (
            <div className={styles.loopIO}>
              I/O: {viz.eventLoop.ioCallbacks.map((cb, i) => <span key={i} className={styles.ioCallback}>{cb}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Coroutines</div>
        <div className={styles.coroGrid}>
          {viz.coroutines?.map((c) => (
            <div key={c.id} className={`${styles.coroCard} ${c.state === 'running' ? styles.coroRunning : ''} ${c.state === 'done' ? styles.coroDone : ''}`}
              style={{ '--c-color': CORO_STATE_COLOR[c.state] }}>
              <div className={styles.coroHeader}>
                <span className={styles.coroId}>{c.id}</span>
                <span className={styles.coroState}>{c.state.toUpperCase()}</span>
              </div>
              <div className={styles.coroFn}>{c.fn}</div>
              {c.awaitingOn && <div className={styles.coroAwait}>await: {c.awaitingOn}</div>}
              {c.result && <div className={styles.coroResult}>→ {c.result}</div>}
            </div>
          ))}
        </div>
      </div>

      {viz.output?.length > 0 && (
        <div className={styles.outputBox}>
          {viz.output.map((line, i) => <div key={i} className={styles.outputLine}>{line}</div>)}
        </div>
      )}
    </>
  );
}

function DecoratorView({ viz }) {
  return (
    <>
      {viz.decorators?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Applied Decorators</div>
          <div className={styles.decoratorList}>
            {viz.decorators.map((d, i) => (
              <div key={i} className={styles.decoratorChip}>
                <span className={styles.decName}>{d.name}</span>
                <span className={styles.decTarget}>→ {d.target}</span>
                <span className={styles.decDesc}>{d.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {viz.callStack?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Call Stack</div>
          <div className={styles.callStackBox}>
            {[...viz.callStack].reverse().map((frame, i) => (
              <div key={i} className={`${styles.stackFrame} ${i === 0 ? styles.stackFrameTop : ''}`}>{frame}</div>
            ))}
          </div>
        </div>
      )}

      {viz.output?.length > 0 && (
        <div className={styles.outputBox}>
          {viz.output.map((line, i) => <div key={i} className={styles.outputLine}>{line}</div>)}
        </div>
      )}
    </>
  );
}
