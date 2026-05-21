import { useState, useEffect } from 'react';
import { ensureScenarios, getScenarios, getTemplate } from '@/data/scenarioRegistry';
import { CanvasTemplate, DSATemplate } from '../../templates';
import Loading from '../../shared/Loading/Loading';

const TEMPLATES = { CanvasTemplate, DSATemplate };

export default function GenericVisualizer({ visualizerType, scenarioId, tabName }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setReady(false);
    setError(null);
    ensureScenarios(visualizerType).then(() => setReady(true)).catch(setError);
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
