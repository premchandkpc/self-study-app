import { loadSystemDesignScenarios as loadSD } from './scenarios/system-design/loader';
import { loadDsaScenarios } from './scenarios/dsa/loader';

const registry = {};

export async function ensureScenarios(vizType) {
  if (registry[vizType]) return registry[vizType];

  if (vizType === 'systemdesign') {
    registry[vizType] = { scenarios: await loadSD(), template: 'CanvasTemplate' };
  } else if (vizType === 'uber') {
    const all = await loadSD();
    registry[vizType] = { scenarios: all.filter(s => s.id.startsWith('uber')), template: 'CanvasTemplate' };
  } else {
    const dsa = await loadDsaScenarios(vizType);
    if (dsa) {
      registry[vizType] = { scenarios: dsa, template: 'DSATemplate' };
    } else {
      registry[vizType] = null;
    }
  }

  return registry[vizType];
}

export function getScenarios(vizType) {
  return registry[vizType]?.scenarios ?? null;
}

export function getTemplate(vizType) {
  return registry[vizType]?.template ?? null;
}
