import { CanvasTemplate } from '../../templates';
import { SCENARIOS } from './uber-engine';

export default function UberVisualizer({ scenarioId, tabName }) {
  return <CanvasTemplate scenarios={SCENARIOS} initialScenario={scenarioId} initialTab={tabName} />;
}
