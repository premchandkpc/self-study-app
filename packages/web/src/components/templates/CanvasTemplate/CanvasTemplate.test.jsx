import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CanvasTemplate from './CanvasTemplate';
import * as VisualizerHook from '../../../core/hooks/useVisualizerScenario';
import { useSimulation } from '../../../core/context/useSimulation';

vi.mock('../../../core/hooks/useVisualizerScenario');
vi.mock('../../../core/context/useSimulation');
vi.mock('../../shared/ScenarioToolbar/ScenarioToolbar', () => ({
  default: () => <div data-testid="scenario-toolbar">Toolbar</div>,
}));
vi.mock('../../shared/StepControls/StepControls', () => ({
  default: () => <div data-testid="step-controls">Controls</div>,
}));
vi.mock('../../shared/NarrationPanel/NarrationPanel', () => ({
  default: () => <div data-testid="narration-panel">Narration</div>,
}));
vi.mock('../../shared/MetricsPanel/MetricsPanel', () => ({
  default: () => <div data-testid="metrics-panel">Metrics</div>,
}));
vi.mock('../../shared/ConceptPanel/ConceptPanel', () => ({
  default: () => <div data-testid="concept-panel">Concept</div>,
}));
vi.mock('../../shared/SvgComponents.jsx', () => ({
  SvgArrowDefs: () => null,
  SvgEventsList: () => null,
  SvgEdgeTooltip: () => null,
  SvgSharedStyles: () => null,
}));

const mockViz = {
  nodes: [
    { id: 'n1', x: 100, y: 100, label: 'Node 1', type: 'service' },
    { id: 'n2', x: 300, y: 100, label: 'Node 2', type: 'db' },
  ],
  edges: [{ from: 'n1', to: 'n2', label: 'request' }],
  packets: [],
  events: [],
};

describe('CanvasTemplate', () => {
  beforeEach(() => {
    vi.mocked(VisualizerHook.useVisualizerScenario).mockReturnValue({
      activeId: 'scenario1',
      active: { id: 'scenario1', name: 'Test Scenario' },
      viz: mockViz,
      select: vi.fn(),
      metrics: {},
    });

    vi.mocked(useSimulation).mockReturnValue({
      state: { currentStep: 0 },
      actions: {},
    });
  });

  it('renders null when viz is not available', () => {
    vi.mocked(VisualizerHook.useVisualizerScenario).mockReturnValue({
      activeId: 'scenario1',
      active: null,
      viz: null,
      select: vi.fn(),
      metrics: {},
    });

    const { container } = render(<CanvasTemplate scenarios={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders canvas and panels when viz is available', () => {
    render(<CanvasTemplate scenarios={[]} />);
    expect(screen.getByTestId('scenario-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('step-controls')).toBeInTheDocument();
  });

  it('renders visualization components', () => {
    const { container } = render(<CanvasTemplate scenarios={[]} />);
    const canvas = container.querySelector('svg');
    expect(canvas).toBeInTheDocument();
  });

  it('accepts scenarios prop', () => {
    const scenarios = [
      { id: 'scenario1', name: 'Test Scenario 1' },
      { id: 'scenario2', name: 'Test Scenario 2' },
    ];
    render(<CanvasTemplate scenarios={scenarios} />);
    expect(VisualizerHook.useVisualizerScenario).toHaveBeenCalledWith(scenarios);
  });
});
