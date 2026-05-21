import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('./pages/Home/Home', () => ({
  default: () => <div>Home Page</div>,
}));
vi.mock('./pages/Topics/Topics', () => ({
  default: () => <div>Topics Page</div>,
}));
vi.mock('./pages/Topics/SubtopicDetail', () => ({
  default: () => <div>SubtopicDetail Page</div>,
}));
vi.mock('./pages/Collections/Collections', () => ({
  default: () => <div>Collections Page</div>,
}));
vi.mock('./pages/StudyHub/StudyHub', () => ({
  default: () => <div>StudyHub Page</div>,
}));
vi.mock('./pages/Visualizer/VisualizerPage', () => ({
  default: () => <div>Visualizer Page</div>,
}));
vi.mock('./pages/InterviewMode/InterviewMode', () => ({
  default: () => <div>Interview Mode Page</div>,
}));
vi.mock('./pages/Compiler/CompilerPage', () => ({
  default: () => <div>Compiler Page</div>,
}));
vi.mock('./pages/NotFound/NotFound', () => ({
  default: () => <div>Not Found Page</div>,
}));
vi.mock('./components/layout/MainLayout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));
vi.mock('./components/shared/AgentWidget/AgentWidget', () => ({
  default: () => <div data-testid="agent-widget">Agent Widget</div>,
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('agent-widget')).toBeInTheDocument();
  });

  it('renders MainLayout and AgentWidget', () => {
    render(<App />);
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    expect(screen.getByTestId('agent-widget')).toBeInTheDocument();
  });
});
