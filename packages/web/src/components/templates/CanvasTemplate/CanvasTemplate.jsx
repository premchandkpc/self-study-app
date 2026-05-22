import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { useSimulation } from '../../../core/context/useSimulation';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import ConceptPanel from '../../shared/ConceptPanel/ConceptPanel';
import { SvgEventsList } from '../../shared/SvgComponents.jsx';
import CanvasViewport from './CanvasViewport';
import CanvasPanels from './CanvasPanels';
import styles from './CanvasTemplate.module.css';

export default function CanvasTemplate({ scenarios, initialScenario, initialTab }) {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(scenarios, initialScenario);
  const { state: simState } = useSimulation();

  if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No scenarios available.</div>;
  }

  if (!viz) return null;

  const hasConcepts = !!viz.concepts;
  const pktDur = Math.max(0.5, Math.min(simState.speed * 0.02, 2.5));

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />

      <CanvasViewport viz={viz} animKey={simState.currentStep} pktDur={pktDur} />

      <NarrationPanel />
      {hasConcepts && <ConceptPanel concepts={{ ...(viz.concepts || {}), ...(active?.topicContent || {}) }} />}
      <SvgEventsList events={viz.events || []} max={5} styles={styles} />
      {metrics.length > 0 && <MetricsPanel metrics={metrics} />}

      <CanvasPanels activeScenario={active} />
      <StepControls />
    </div>
  );
}
