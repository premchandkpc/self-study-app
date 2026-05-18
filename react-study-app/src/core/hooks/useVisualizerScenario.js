import { useEffect, useState } from 'react';
import { useSimulation } from '../context/SimulationContext';

/**
 * Drives any scenario-based visualizer.
 * Accepts a SCENARIOS array from the engine file, owns all
 * scenario/step/viz state, and returns only what the component needs.
 *
 * SCENARIOS item shape:
 *   { id, label, icon, build, code, language, metrics: [{ key, label, max, unit, color, warn?, critical? }] }
 */
export function useVisualizerScenario(scenarios) {
  const { state, dispatch } = useSimulation();
  const [activeId, setActiveId] = useState(scenarios[0].id);
  const [viz, setViz]           = useState(null);

  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0];

  function select(id) {
    const found = scenarios.find((s) => s.id === id);
    if (!found) return;
    setActiveId(id);
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEPS', payload: found.build() });
  }

  useEffect(() => { select(scenarios[0].id); }, []);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) setViz(step);
  }, [state.currentStep, state.steps]);

  const metrics = active.metrics.map((m) => ({
    label:    m.label,
    value:    viz?.metrics?.[m.key] ?? 0,
    max:      m.max,
    unit:     m.unit   ?? '',
    color:    m.color,
    warn:     m.warn,
    critical: m.critical,
  }));

  return { activeId, active, viz, select, metrics };
}
