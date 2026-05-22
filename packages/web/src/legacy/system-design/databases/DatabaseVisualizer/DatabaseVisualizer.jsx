import { memo } from 'react';
import { useVisualizerScenario } from '../../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './database-engine';
import { createView } from './viewFactory.jsx';
import { VisualizerTemplate } from '../../../../components/templates/VisualizerTemplate/VisualizerTemplate';

const DatabaseVisualizerComponent = memo(function DatabaseVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <VisualizerTemplate
      scenarios={SCENARIOS}
      activeId={activeId}
      active={active}
      viz={viz}
      metrics={metrics}
      onScenarioChange={select}
      showVariables={true}
      showEvents={true}
      eventsLabel="SQL Operations"
      events={viz.events}
    >
      {createView(activeId, viz)}
    </VisualizerTemplate>
  );
});

export default DatabaseVisualizerComponent;
