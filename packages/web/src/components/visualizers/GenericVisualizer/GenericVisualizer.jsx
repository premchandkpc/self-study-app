import { useEffect, useReducer } from 'react';
import { ensureScenarios, getScenarios, getTemplate } from '@/data/scenarioRegistry';
import { CanvasTemplate, DSATemplate } from '../../templates';
import Loading from '../../shared/Loading/Loading';

const TEMPLATES = { CanvasTemplate, DSATemplate };

function loadReducer(state, action) {
  switch (action.type) {
    case 'start': return { ready: false, error: null };
    case 'done': return { ready: true, error: null };
    case 'fail': return { ready: false, error: action.error };
    default: return state;
  }
}

export default function GenericVisualizer({ visualizerType, scenarioId, tabName }) {
  const [{ ready, error }, dispatch] = useReducer(loadReducer, { ready: false, error: null });

  useEffect(() => {
    dispatch({ type: 'start' });
    ensureScenarios(visualizerType).then(
      () => dispatch({ type: 'done' }),
      (e) => dispatch({ type: 'fail', error: e })
    );
  }, [visualizerType]);

  if (error) return <p>Error loading scenarios: {error.message}</p>;
  if (!ready) return <Loading label="Loading scenarios…" />;

  const scenarios = getScenarios(visualizerType);
  const templateName = getTemplate(visualizerType);

  if (!scenarios || scenarios.length === 0) {
    return <p>No scenarios found for: {visualizerType}</p>;
  }

  if (!templateName) {
    return <p>No template configured for: {visualizerType}</p>;
  }

  const Template = TEMPLATES[templateName];
  if (!Template) {
    return <p>Template not found: {templateName}</p>;
  }

  return <Template scenarios={scenarios} initialScenario={scenarioId} initialTab={tabName} />;
}
