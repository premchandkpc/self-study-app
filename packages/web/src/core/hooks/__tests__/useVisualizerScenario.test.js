/**
 * Tests for useVisualizerScenario hook.
 * High coupling: used by 6+ templates. Critical to test thoroughly.
 */

import { renderHook, act } from '@testing-library/react';
import { useVisualizerScenario } from '../useVisualizerScenario';
import { SimulationProvider } from '../../context/SimulationContext';

const mockScenarios = [
  {
    id: 'scenario-1',
    label: 'Scenario 1',
    build: () => [
      { id: 'step-1', visualization: { type: 'graph', graph: { nodes: [], edges: [] } } },
      { id: 'step-2', visualization: { type: 'graph', graph: { nodes: [], edges: [] } } },
    ],
    metrics: [{ key: 'time', label: 'Time', max: 100 }],
    code: ['const x = 5;'],
    language: 'javascript',
  },
  {
    id: 'scenario-2',
    label: 'Scenario 2',
    build: () => [
      { id: 'step-1', visualization: { type: 'dsa-array', array: { cells: [] } } },
    ],
  },
];

describe('useVisualizerScenario', () => {
  it('throws on empty scenarios', () => {
    const wrapper = ({ children }) => <SimulationProvider>{children}</SimulationProvider>;

    expect(() => {
      renderHook(() => useVisualizerScenario([]), { wrapper });
    }).toThrow();
  });

  it('initializes with first scenario', () => {
    const wrapper = ({ children }) => <SimulationProvider>{children}</SimulationProvider>;

    const { result } = renderHook(
      () => useVisualizerScenario(mockScenarios),
      { wrapper }
    );

    expect(result.current.activeId).toBe('scenario-1');
    expect(result.current.active.id).toBe('scenario-1');
  });

  it('switches scenarios on select', () => {
    const wrapper = ({ children }) => <SimulationProvider>{children}</SimulationProvider>;

    const { result } = renderHook(
      () => useVisualizerScenario(mockScenarios),
      { wrapper }
    );

    act(() => {
      result.current.select('scenario-2');
    });

    expect(result.current.activeId).toBe('scenario-2');
  });

  it('rebuilds with custom inputs', () => {
    const wrapper = ({ children }) => <SimulationProvider>{children}</SimulationProvider>;

    const { result } = renderHook(
      () => useVisualizerScenario(mockScenarios),
      { wrapper }
    );

    act(() => {
      result.current.rebuild({ arr: [1, 2, 3], k: 2 });
    });

    expect(result.current.customInputs).toEqual({ arr: [1, 2, 3], k: 2 });
  });

  it('computes metrics correctly', () => {
    const wrapper = ({ children }) => <SimulationProvider>{children}</SimulationProvider>;

    const { result } = renderHook(
      () => useVisualizerScenario(mockScenarios),
      { wrapper }
    );

    expect(Array.isArray(result.current.metrics)).toBe(true);
  });

  it('respects initialScenarioId', () => {
    const wrapper = ({ children }) => <SimulationProvider>{children}</SimulationProvider>;

    const { result } = renderHook(
      () => useVisualizerScenario(mockScenarios, 'scenario-2'),
      { wrapper }
    );

    expect(result.current.activeId).toBe('scenario-2');
  });
});
