import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SystemDiagramRenderer } from '../../renderers/SystemDiagramRenderer';
import { SvgEventsList } from '../../shared/SvgComponents.jsx';
import ConceptPanel from '../../shared/ConceptPanel/ConceptPanel';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import styles from './ConceptTemplate.module.css';

export default function ConceptTemplate({ scenarios }) {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(scenarios);

  if (!viz) return null;

  const events = viz.events || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />
      <NarrationPanel />

      <div className={styles.body}>
        <div className={styles.diagramArea}>
          <div className={styles.diagramWrap}>
            <SystemDiagramRenderer viz={viz} styles={styles} svgW={800} svgH={380} />
          </div>
          <SvgEventsList events={events} max={4} styles={styles} />
        </div>

        <div className={styles.conceptArea}>
          <ConceptPanel concepts={{ ...(viz.concepts || {}), ...(active.topicContent || {}) }} />
        </div>
      </div>

      <div className={styles.footer}>
        {metrics.length > 0 && <MetricsPanel metrics={metrics} />}
        <StepControls />
      </div>
    </div>
  );
}
