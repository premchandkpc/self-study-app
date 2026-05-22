import { CanvasTemplate } from '../../../../components/templates';
import { SCENARIOS } from './sd-engine';

export default function SystemDesignVisualizer({ scenarioId, tabName }) {
  console.log('[SystemDesignVisualizer] Rendering with', SCENARIOS?.length || 0, 'scenarios');
  if (!SCENARIOS || SCENARIOS.length === 0) {
    return <div style={{ padding: '20px' }}>Error: System design scenarios not loaded. Found {SCENARIOS?.length || 0} scenarios.</div>;
  }
  return <CanvasTemplate scenarios={SCENARIOS} initialScenario={scenarioId} initialTab={tabName} />;
}
