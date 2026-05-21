import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExplanationCard from './ExplanationCard';

vi.mock('../Card/Card', () => ({
  default: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
}));

const mockData = {
  explanation: 'A queue is a FIFO data structure...',
  useCases: ['Task scheduling', 'BFS traversal', 'Printer queue'],
  realWorld: 'Real-world example at Netflix...',
  complexity: {
    'Time (enqueue)': 'O(1)',
    'Time (dequeue)': 'O(1)',
    'Space': 'O(n)',
  },
};

describe('ExplanationCard', () => {
  it('returns null when data is not provided', () => {
    const { container } = render(
      <ExplanationCard topic="dsa" subtopic="Queue" data={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders subtopic as title', () => {
    render(<ExplanationCard topic="dsa" subtopic="Queue" data={mockData} />);
    expect(screen.getByText('Queue')).toBeInTheDocument();
  });

  it('renders explanation section', () => {
    render(<ExplanationCard topic="dsa" subtopic="Queue" data={mockData} />);
    expect(screen.getByText('💡 Explanation')).toBeInTheDocument();
    expect(screen.getByText('A queue is a FIFO data structure...')).toBeInTheDocument();
  });

  it('renders use cases when provided', () => {
    render(<ExplanationCard topic="dsa" subtopic="Queue" data={mockData} />);
    expect(screen.getByText('🎯 Use Cases')).toBeInTheDocument();
    expect(screen.getByText('Task scheduling')).toBeInTheDocument();
    expect(screen.getByText('BFS traversal')).toBeInTheDocument();
    expect(screen.getByText('Printer queue')).toBeInTheDocument();
  });

  it('renders real-world example when provided', () => {
    render(<ExplanationCard topic="dsa" subtopic="Queue" data={mockData} />);
    expect(screen.getByText('🌍 Real-World Example')).toBeInTheDocument();
    expect(screen.getByText('Real-world example at Netflix...')).toBeInTheDocument();
  });

  it('renders complexity section when provided', () => {
    render(<ExplanationCard topic="dsa" subtopic="Queue" data={mockData} />);
    expect(screen.getByText('⏱️ Complexity')).toBeInTheDocument();
    expect(screen.getByText('Time (enqueue):')).toBeInTheDocument();
    expect(screen.getByText('O(1)')).toBeInTheDocument();
  });

  it('does not render optional sections when not provided', () => {
    const minimalData = {
      explanation: 'Basic explanation',
    };
    render(<ExplanationCard topic="dsa" subtopic="Queue" data={minimalData} />);
    expect(screen.queryByText('🎯 Use Cases')).not.toBeInTheDocument();
    expect(screen.queryByText('🌍 Real-World Example')).not.toBeInTheDocument();
    expect(screen.queryByText('⏱️ Complexity')).not.toBeInTheDocument();
  });

  it('renders all complexity entries', () => {
    render(<ExplanationCard topic="dsa" subtopic="Queue" data={mockData} />);
    expect(screen.getByText('Time (enqueue):')).toBeInTheDocument();
    expect(screen.getByText('Time (dequeue):')).toBeInTheDocument();
    expect(screen.getByText('Space:')).toBeInTheDocument();
  });
});
