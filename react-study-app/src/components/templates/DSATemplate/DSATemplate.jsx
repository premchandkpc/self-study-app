import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import InputPanel from '../../shared/InputPanel/InputPanel';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import DynamicViz from './DynamicViz';
import styles from './DSATemplate.module.css';

// Fields used only for rendering — excluded from auto-extracted variables
const VIZ_STRUCTURAL = new Set([
  // large render arrays
  'cells','arr','nodes','origNext','tree','nodeStates','edgeStates',
  'matrix','buckets','dp','chars','str','text','setA','setB','arr1','arr2','nums',
  // meta fields
  'type','narration','codeLine','events','complexity','vars','result',
  // set viz rendering
  'union','intersect','diff','highlightA','highlightB','visited','cycleTarget',
  // sorting/visual-only render state
  'heapSize','groups','partitionRange','metrics',
  // LL / string / hashmap render fields
  'list1','list2','mergedNodes','reversed','charStates','patternStates',
  'activeBucket','activeIndex','activeOp','resultIndices',
  // pointer/window render objects (vars has the actual values)
  'pointers','window','queue','path','prefix','query',
  // DP render directives (not algo vars — render layout hints)
  'base','active','deps','kind','rowLabels','colLabels','labels','table',
  // index highlight arrays (render only)
  'activeRow','activeCol','activeI','activeJ','windowIndices','foundIndices',
]);

function extractVars(viz) {
  if (!viz) return {};
  const out = {};
  for (const [k, v] of Object.entries(viz)) {
    if (VIZ_STRUCTURAL.has(k)) continue;
    if (v === null || v === undefined) { out[k] = v; continue; }
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') { out[k] = v; continue; }
    if (Array.isArray(v) && v.length <= 16 && v.every((x) => x === null || typeof x !== 'object')) { out[k] = v; continue; }
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= 8) { out[k] = v; continue; }
  }
  // explicit vars field always wins / supplements
  return { ...out, ...(viz.vars || {}) };
}

export default function DSATemplate({ scenarios }) {
  const {
    activeId, active, viz, select,
    metrics, customInputs, rebuild,
  } = useVisualizerScenario(scenarios);

  if (!viz) return null;

  const allVars = extractVars(viz);

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />

      <InputPanel
        key={activeId}
        schema={active.inputs || []}
        current={customInputs}
        onApply={rebuild}
      />

      <NarrationPanel />

      <div className={styles.body}>
        <div className={styles.vizArea}>
          <DynamicViz viz={viz} />
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
