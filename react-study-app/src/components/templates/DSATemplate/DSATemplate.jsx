import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { buildRenderFields } from '../../../core/constants/renderFields';
import { DsaVizRenderer } from '../../renderers/DsaRenderer';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import InputPanel from '../../shared/InputPanel/InputPanel';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import styles from './DSATemplate.module.css';

function extractVars(viz, renderFields = []) {
  if (!viz) return {};
  const skip = buildRenderFields(renderFields);
  const out = {};
  for (const [k, v] of Object.entries(viz)) {
    if (skip.has(k)) continue;
    if (v === null || v === undefined) { out[k] = v; continue; }
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') { out[k] = v; continue; }
    if (Array.isArray(v) && v.length <= 16 && v.every((x) => x === null || typeof x !== 'object')) { out[k] = v; continue; }
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= 8) { out[k] = v; continue; }
  }
  return { ...out, ...(viz.vars || {}) };
}

export default function DSATemplate({ scenarios }) {
  const { activeId, active, viz, select, metrics, customInputs, rebuild } = useVisualizerScenario(scenarios);

  if (!viz) return null;

  const allVars = extractVars(viz, active.renderFields);

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />
      <InputPanel key={activeId} schema={active.inputs || []} current={customInputs} onApply={rebuild} />
      <NarrationPanel />

      <div className={styles.body}>
        <div className={styles.vizArea}>
          <DsaVizRenderer viz={viz} />
        </div>
        <div className={styles.panels}>
          <CodePanel code={active.code} language={active.language} />
          <VariablesPanel vars={allVars} result={viz?.result} />
          <ComplexityPanel />
          {metrics.length > 0 && <MetricsPanel metrics={metrics} />}
        </div>
      </div>

      <StepControls />
    </div>
  );
}
