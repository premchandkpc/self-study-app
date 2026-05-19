import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SystemDiagramRenderer } from '../../renderers/SystemDiagramRenderer';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import { SvgEventsList } from '../../shared/SvgComponents.jsx';
import styles from './SystemTemplate.module.css';

export default function SystemTemplate({ scenarios }) {
  const { activeId, viz, select, metrics } = useVisualizerScenario(scenarios);

  if (!viz) return null;

  const events = viz.events || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />
      <NarrationPanel />

      <div className={styles.diagramWrap}>
        <SystemDiagramRenderer viz={viz} styles={styles} />
      </div>

      <SvgEventsList events={events} max={5} styles={styles} />
      {metrics.length > 0 && <MetricsPanel metrics={metrics} />}
      <StepControls />
    </div>
  );
}
