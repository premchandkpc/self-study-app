import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './os-engine';
import ScenarioToolbar from '../../../components/shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../../components/shared/StepControls/StepControls';
import ComplexityPanel from '../../../components/shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../../components/shared/CodePanel/CodePanel';
import MetricsPanel from '../../../components/shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../../components/shared/VariablesPanel/VariablesPanel';
import TopicContentSection from '../../../components/shared/TopicContentSection/TopicContentSection';
import styles from './OSVisualizer.module.css';

const STATE_COLORS = {
  running: '#22c55e',
  ready: '#eab308',
  blocked: '#ef4444',
  terminated: '#6b7280',
};

export default function OSVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.mainViz}>
          {activeId === 'scheduler' && <SchedulerView viz={viz} />}
          {activeId === 'paging' && <PagingView viz={viz} />}
          {activeId === 'virtual-memory' && <VirtualMemoryView viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />

          {viz.events?.length > 0 && (
            <div className={styles.events}>
              <div className={styles.eventsLabel}>OS Events</div>
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

/* === SCHEDULER VIEW === */
function SchedulerView({ viz }) {
  const { processes, readyQueue, currentProcess, gantt } = viz;

  return (
    <div className={styles.schedulerLayout}>
      <div className={styles.schedulerRow}>
        <div className={styles.sectionLabel}>Ready Queue (FIFO)</div>
        <div className={styles.readyQueue}>
          {readyQueue?.length > 0 ? readyQueue.map((pid, i) => (
            <div key={i} className={`${styles.readyItem} ${pid === currentProcess ? styles.readyActive : ''}`}>
              {pid}
            </div>
          )) : <div className={styles.emptyState}>Empty</div>}
        </div>
      </div>

      {currentProcess && (
        <div className={styles.currentRunning}>
          <span className={styles.runLabel}>Running:</span>
          <span className={styles.runPid}>{currentProcess}</span>
        </div>
      )}

      <div className={styles.processGrid}>
        {processes?.map((p) => (
          <div
            key={p.id}
            className={styles.processBox}
            style={{ borderColor: STATE_COLORS[p.state] || '#6b7280' }}
          >
            <div className={styles.processPid}>{p.id}</div>
            <div className={styles.processState} style={{ color: STATE_COLORS[p.state] || '#6b7280' }}>
              {p.state}
            </div>
            <div className={styles.processBurst}>burst: {p.burst}ms</div>
            <div className={styles.processRemaining}>rem: {p.remaining}ms</div>
            <div className={styles.processArrival}>arr: t={p.arrival}</div>
          </div>
        ))}
      </div>

      {gantt?.length > 0 && (
        <div className={styles.ganttSection}>
          <div className={styles.sectionLabel}>Gantt Chart</div>
          <div className={styles.ganttChart}>
            {gantt.map((g, i) => (
              <div
                key={i}
                className={styles.ganttBar}
                style={{
                  width: `${(g.end - g.start) * 20}px`,
                  backgroundColor: STATE_COLORS.running,
                }}
              >
                <span className={styles.ganttLabel}>{g.pid}</span>
                <span className={styles.ganttTime}>{g.start}-{g.end}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* === PAGING VIEW === */
function PagingView({ viz }) {
  const { pageTable, tlb, steps: pagingSteps, tlbHit } = viz;

  return (
    <div className={styles.pagingLayout}>
      <div className={styles.tlbSection}>
        <div className={styles.sectionLabel}>TLB ({tlb?.length || 0} entries)</div>
        <div className={styles.pageTable}>
          <div className={styles.ptHeader}>
            <span>VPN</span>
            <span>PFN</span>
          </div>
          {tlb?.map((e, i) => (
            <div key={i} className={styles.ptRow}>
              <span className={styles.ptVpn}>{e.vpn}</span>
              <span className={styles.ptPfn}>{e.pfn}</span>
            </div>
          ))}
          {(!tlb || tlb.length === 0) && <div className={styles.emptyState}>Empty</div>}
        </div>
        {tlbHit !== undefined && (
          <div className={tlbHit ? styles.tlbHit : styles.tlbMiss}>
            {tlbHit ? 'TLB HIT' : 'TLB MISS'}
          </div>
        )}
      </div>

      <div className={styles.ptSection}>
        <div className={styles.sectionLabel}>Page Table</div>
        <div className={styles.pageTable}>
          <div className={styles.ptHeader}>
            <span>VPN</span>
            <span>PFN</span>
            <span>V</span>
            <span>D</span>
          </div>
          {pageTable?.map((e, i) => (
            <div key={i} className={`${styles.ptRow} ${!e.valid ? styles.ptInvalid : ''}`}>
              <span className={styles.ptVpn}>{e.vpn}</span>
              <span className={styles.ptPfn}>{e.pfn}</span>
              <span className={e.valid ? styles.ptValid : styles.ptInvalidBit}>{e.valid ? '1' : '0'}</span>
              <span>{e.dirty ? '1' : '0'}</span>
            </div>
          ))}
        </div>
      </div>

      {pagingSteps?.length > 0 && (
        <div className={styles.pagingSteps}>
          <div className={styles.sectionLabel}>Translation Steps</div>
          {pagingSteps.map((ps, i) => (
            <div key={i} className={styles.pagingStep}>
              <span className={styles.stepType}>{ps.type}</span>
              <span className={styles.stepDetail}>VPN {ps.vpn}</span>
              {ps.pfn !== null && ps.pfn !== undefined && (
                <span className={styles.stepDetail}>→ PFN {ps.pfn}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* === VIRTUAL MEMORY VIEW === */
function VirtualMemoryView({ viz }) {
  const { processes, physFrames, swap } = viz;

  return (
    <div className={styles.vmLayout}>
      <div className={styles.vmSection}>
        <div className={styles.sectionLabel}>Processes (Virtual Address Space)</div>
        <div className={styles.processGrid}>
          {processes?.map((p, i) => (
            <div key={i} className={`${styles.processBox} ${p.state === 'fault' ? styles.processFault : ''}`} style={p.state === 'active' ? { borderColor: STATE_COLORS.running } : {}}>
              <div className={styles.processPid}>{p.id}</div>
              <div className={styles.processState}>{p.state}</div>
              <div className={styles.processVpn}>VPN {p.vpn}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.vmSection}>
        <div className={styles.sectionLabel}>Physical Frames</div>
        <div className={styles.frameGrid}>
          {physFrames?.map((f) => (
            <div
              key={f.id}
              className={`${styles.frameBox} ${f.state === 'free' ? styles.frameFree : f.state === 'swapped' ? styles.frameSwapped : styles.frameUsed}`}
            >
              <div className={styles.frameId}>F{f.id}</div>
              <div className={styles.frameState}>{f.state}</div>
              {f.pid && <div className={styles.framePid}>{f.pid}</div>}
            </div>
          ))}
        </div>
      </div>

      {swap?.length > 0 && (
        <div className={styles.vmSection}>
          <div className={styles.sectionLabel}>Swap File</div>
          <div className={styles.swapList}>
            {swap.map((sw, i) => (
              <div key={i} className={styles.swapEntry}>
                <span className={styles.swapPid}>{sw.pid}</span>
                <span className={styles.swapVpn}>VPN {sw.vpn}</span>
                <span className={styles.swapLabel}>→ swap #{sw.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
