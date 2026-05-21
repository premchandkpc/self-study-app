import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ensureScenarios, getScenarios, getTemplate } from '@/data/scenarioRegistry';
import { CanvasTemplate, DSATemplate } from '../../templates';
import Loading from '../../shared/Loading/Loading';

const TEMPLATES = { CanvasTemplate, DSATemplate };

export default function GenericVisualizer({ scenarioId, tabName }) {
  const { type } = useParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setReady(false);
    setError(null);
    ensureScenarios(type).then(() => setReady(true)).catch(setError);
  }, [type]);

  if (error) return <p>Error loading scenarios: {error.message}</p>;
  if (!ready) return <Loading label="Loading scenarios…" />;

  const scenarios = getScenarios(type);
  const templateName = getTemplate(type);

  if (!scenarios || scenarios.length === 0) {
    return <p>No scenarios found for: {type}</p>;
  }

  if (!templateName) {
    return <p>No template configured for: {type}</p>;
  }

  const Template = TEMPLATES[templateName];
  if (!Template) {
    return <p>Template not found: {templateName}</p>;
  }

  return <Template scenarios={scenarios} initialScenario={scenarioId} initialTab={tabName} />;
}
