import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DetailedExplanation from './DetailedExplanation';

vi.mock('../Card/Card', () => ({
  default: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
}));

const mockData = {
  title: 'System Design Patterns',
  deepDive: 'This explains the fundamentals of system design...',
  codeExample: 'const api = new API();',
  visualization: 'graph LR;',
  realWorldScales: 'At Netflix scale...',
  performanceTips: ['Tip 1', 'Tip 2', 'Tip 3'],
};

describe('DetailedExplanation', () => {
  it('returns null when data is not provided', () => {
    const { container } = render(<DetailedExplanation topic="test" data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title and subtitle', () => {
    render(<DetailedExplanation topic="test" data={mockData} />);
    expect(screen.getByText('System Design Patterns')).toBeInTheDocument();
    expect(screen.getByText('Complete technical breakdown with code & visualization')).toBeInTheDocument();
  });

  it('renders all section headers', () => {
    render(<DetailedExplanation topic="test" data={mockData} />);
    expect(screen.getByText('📖 Deep Dive Explanation')).toBeInTheDocument();
    expect(screen.getByText('💻 Code Examples')).toBeInTheDocument();
    expect(screen.getByText('🎨 Visualization')).toBeInTheDocument();
    expect(screen.getByText('🌍 Real-World at Scale')).toBeInTheDocument();
    expect(screen.getByText('⚡ Performance Tips')).toBeInTheDocument();
  });

  it('expands section on click', () => {
    render(<DetailedExplanation topic="test" data={mockData} />);
    const deepDiveHeader = screen.getByText('📖 Deep Dive Explanation');

    expect(screen.queryByText('This explains the fundamentals of system design...')).not.toBeInTheDocument();

    fireEvent.click(deepDiveHeader);
    expect(screen.getByText('This explains the fundamentals of system design...')).toBeInTheDocument();
  });

  it('collapses expanded section on click', () => {
    render(<DetailedExplanation topic="test" data={mockData} />);
    const deepDiveHeader = screen.getByText('📖 Deep Dive Explanation');

    fireEvent.click(deepDiveHeader);
    expect(screen.getByText('This explains the fundamentals of system design...')).toBeInTheDocument();

    fireEvent.click(deepDiveHeader);
    expect(screen.queryByText('This explains the fundamentals of system design...')).not.toBeInTheDocument();
  });

  it('renders code content in code block', () => {
    render(<DetailedExplanation topic="test" data={mockData} />);
    const codeHeader = screen.getByText('💻 Code Examples');

    fireEvent.click(codeHeader);
    const codeBlock = screen.getByText('const api = new API();');
    expect(codeBlock.closest('pre')).toBeInTheDocument();
  });

  it('renders list items for performance tips', () => {
    render(<DetailedExplanation topic="test" data={mockData} />);
    const tipsHeader = screen.getByText('⚡ Performance Tips');

    fireEvent.click(tipsHeader);
    expect(screen.getByText('Tip 1')).toBeInTheDocument();
    expect(screen.getByText('Tip 2')).toBeInTheDocument();
    expect(screen.getByText('Tip 3')).toBeInTheDocument();
  });

  it('only shows one expanded section at a time', () => {
    render(<DetailedExplanation topic="test" data={mockData} />);
    const deepDiveHeader = screen.getByText('📖 Deep Dive Explanation');
    const tipsHeader = screen.getByText('⚡ Performance Tips');

    fireEvent.click(deepDiveHeader);
    expect(screen.getByText('This explains the fundamentals of system design...')).toBeInTheDocument();

    fireEvent.click(tipsHeader);
    expect(screen.queryByText('This explains the fundamentals of system design...')).not.toBeInTheDocument();
    expect(screen.getByText('Tip 1')).toBeInTheDocument();
  });
});
