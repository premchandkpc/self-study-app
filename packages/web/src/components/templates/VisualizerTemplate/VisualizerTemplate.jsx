import { memo } from 'react';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import StepControls from '../../shared/StepControls/StepControls';
import styles from './VisualizerTemplate.module.css';

export const VisualizerTemplate = memo(function VisualizerTemplate({ scenarios, activeId, active, viz, metrics, onScenarioChange, children, showVariables = true, showEvents = false, eventsLabel, events, EventsComponent }) {
  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={onScenarioChange} />

      <div className={styles.mainArea}>
        <div className={styles.vizArea}>
          {children}
        </div>

        {(showVariables || showEvents) && (
          <div className={styles.sidePanel}>
            {showVariables && <VariablesPanel vars={viz?.vars} result={viz?.result} />}
            {showEvents && events?.length > 0 && (
              <div className={styles.events}>
                <div className={styles.eventsLabel}>{eventsLabel || 'Events'}</div>
                {EventsComponent ? <EventsComponent events={events} /> : (
                  events.slice(-5).map((ev, i) => (
                    <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
                      <span className={styles.evDot} />
                      <span className={styles.evMsg}>{ev.msg}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.bottomPanels}>
        <CodePanel code={active?.code} language={active?.language} />
        <div className={styles.rightPanels}>
          {metrics && <MetricsPanel metrics={metrics} />}
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
});
