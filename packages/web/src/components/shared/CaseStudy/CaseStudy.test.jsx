import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CaseStudy from './CaseStudy';

vi.mock('../Card/Card', () => ({
  default: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
}));

describe('CaseStudy', () => {
  it('returns null when caseStudy is not provided', () => {
    const { container } = render(<CaseStudy name="Test" caseStudy={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders name as title', () => {
    const caseStudy = {};
    render(<CaseStudy name="Uber System" caseStudy={caseStudy} />);
    expect(screen.getByText('Uber System')).toBeInTheDocument();
  });

  it('renders components section when provided', () => {
    const caseStudy = {
      components: [
        { name: 'API Gateway', desc: 'Rate limiting and routing' },
        { name: 'Database', desc: 'Persistent storage' },
      ],
    };
    render(<CaseStudy name="Test" caseStudy={caseStudy} />);
    expect(screen.getByText('⚙️ Component Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('API Gateway')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('renders flow section when provided', () => {
    const caseStudy = {
      flow: [
        'User requests a ride',
        'System matches driver',
        'Notification sent',
      ],
    };
    render(<CaseStudy name="Test" caseStudy={caseStudy} />);
    expect(screen.getByText('🔄 Request Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('User requests a ride')).toBeInTheDocument();
  });

  it('renders challenges section when provided', () => {
    const caseStudy = {
      challenges: [
        'Scalability',
        'Data consistency',
        'Real-time sync',
      ],
    };
    render(<CaseStudy name="Test" caseStudy={caseStudy} />);
    expect(screen.getByText('⚡ Key Challenges')).toBeInTheDocument();
    expect(screen.getByText('Scalability')).toBeInTheDocument();
  });

  it('renders multiple sections together', () => {
    const caseStudy = {
      components: [{ name: 'API Gateway', desc: 'Routing' }],
      flow: ['Step 1', 'Step 2'],
      challenges: ['Challenge 1'],
    };
    render(<CaseStudy name="Test" caseStudy={caseStudy} />);
    expect(screen.getByText('⚙️ Component Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('🔄 Request Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('⚡ Key Challenges')).toBeInTheDocument();
  });
});
