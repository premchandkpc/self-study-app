import { useEffect, useState } from 'react';
import { useSimulation } from '../context/SimulationContext';

/**
 * Drives any scenario-based visualizer.
 *
 * SCENARIOS item shape:
 *   { id, label, icon, build, code, language,
 *     metrics: [{ key, label, max, unit, color, warn?, critical? }],
 *     inputs?: [{ key, label, type, default, min?, max?, maxLen? }]  // optional
 *   }
 *
 * Returns:
 *   activeId, active, viz, select, metrics,
 *   customInputs,   — current parsed inputs for active scenario
 *   rebuild(params) — re-run build with new params and reset steps
 */
export function useVisualizerScenario(scenarios) {
  const { state, dispatch } = useSimulation();
  const [activeId, setActiveId]       = useState(scenarios[0].id);
  const [viz, setViz]                 = useState(null);
  const [inputsMap, setInputsMap]     = useState({});  // persists inputs per scenario id

  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0];
  const customInputs = inputsMap[activeId] ?? {};

  function _load(scenario, params = {}) {
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEPS', payload: scenario.build(params) });
  }

  function select(id) {
    const found = scenarios.find((s) => s.id === id);
    if (!found) return;
    setActiveId(id);
    _load(found, inputsMap[id] ?? {});
  }

  function rebuild(params) {
    setInputsMap((prev) => ({ ...prev, [activeId]: params }));
    _load(active, params);
  }

  useEffect(() => {
    const first = scenarios[0];
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEPS', payload: first.build({}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional mount-only: scenarios ref is stable, dispatch is stable

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) setViz(step);
  }, [state.currentStep, state.steps]);

  const metrics = (active.metrics || []).map((m) => ({
    label:    m.label,
    value:    viz?.metrics?.[m.key] ?? 0,
    max:      m.max,
    unit:     m.unit   ?? '',
    color:    m.color,
    warn:     m.warn,
    critical: m.critical,
  }));

  return { activeId, active, viz, select, metrics, customInputs, rebuild };
}
