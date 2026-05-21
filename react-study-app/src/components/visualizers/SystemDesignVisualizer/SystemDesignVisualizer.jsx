import { CanvasTemplate } from '../../templates';
import { SCENARIOS } from './sd-engine';

export default function SystemDesignVisualizer({ scenarioId, tabName }) {
  return <CanvasTemplate scenarios={SCENARIOS} initialScenario={scenarioId} initialTab={tabName} />;
}
