import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { TechDiagramRenderer } from '../../renderers/TechDiagramRenderer';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import { SvgEventsList } from '../../shared/SvgComponents.jsx';
import styles from './TechTemplate.module.css';

export default function TechTemplate({ scenarios }) {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(scenarios);

  if (!viz) return null;

  const events = viz.events || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />
      <NarrationPanel />

      <div className={styles.body}>
        <div className={styles.diagramWrap}>
          <TechDiagramRenderer viz={viz} styles={styles} />
        </div>
        <div className={styles.right}>
          <CodePanel code={active.code} language={active.language} />
          {metrics.length > 0 && <MetricsPanel metrics={metrics} />}
        </div>
      </div>

      <SvgEventsList events={events} max={4} styles={styles} />
      <StepControls />
    </div>
  );
}
