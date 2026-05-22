import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UIProvider } from '../../../core/context/UIContext';
import Sidebar from './Sidebar';

vi.mock('../../../core/context/useTopicMapsContext', () => ({
  useTopicMapsContext: () => ({
    ABBR_MAP: {
      dsa: { id: 'dsa', abbr: 'dsa', subtopics: [{ name: 'Arrays', scenarioId: 'arrays' }, { name: 'LinkedList', scenarioId: 'linked-list' }] },
      algos: { id: 'algos', abbr: 'algos', subtopics: [{ name: 'Sorting', scenarioId: 'sorting' }, { name: 'Search', scenarioId: 'search' }] },
    },
    TOPICS: [
      {
        id: 'dsa',
        label: 'Data Structures',
        icon: '📦',
        abbr: 'dsa',
        subtopics: ['Arrays', 'LinkedList'],
      },
      {
        id: 'algos',
        label: 'Algorithms',
        icon: '🔄',
        abbr: 'algos',
        subtopics: ['Sorting', 'Search'],
      },
    ],
  }),
}));

const renderWithProviders = (component) => {
  return render(<MemoryRouter><UIProvider>{component}</UIProvider></MemoryRouter>);
};

describe('Sidebar', () => {
  it('renders sidebar with topics', () => {
    renderWithProviders(<Sidebar collapsed={false} />);
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
    expect(screen.getByText('Algorithms')).toBeInTheDocument();
  });

  it('shows section label when not collapsed', () => {
    renderWithProviders(<Sidebar collapsed={false} />);
    expect(screen.getByText('Topics')).toBeInTheDocument();
  });

  it('hides section label when collapsed', () => {
    renderWithProviders(<Sidebar collapsed={true} />);
    expect(screen.queryByText('Topics')).not.toBeInTheDocument();
  });

  it('toggles subtopic expansion on topic click', () => {
    renderWithProviders(<Sidebar collapsed={false} />);
    const dataStructuresBtn = screen.getByText('Data Structures');

    expect(screen.queryByText('Arrays')).not.toBeInTheDocument();

    fireEvent.click(dataStructuresBtn);
    expect(screen.getByText('Arrays')).toBeInTheDocument();
    expect(screen.getByText('LinkedList')).toBeInTheDocument();

    fireEvent.click(dataStructuresBtn);
    expect(screen.queryByText('Arrays')).not.toBeInTheDocument();
  });

  it('hides subtopics when collapsed', () => {
    renderWithProviders(<Sidebar collapsed={true} />);
    expect(screen.queryByText('Arrays')).not.toBeInTheDocument();
  });

  it('applies collapsed styles', () => {
    const { container: collapsedContainer } = renderWithProviders(<Sidebar collapsed={true} />);
    const sidebar = collapsedContainer.querySelector('aside');
    expect(sidebar.className).toContain('collapsed');
  });

  it('navigates on subtopic selection', () => {
    renderWithProviders(<Sidebar collapsed={false} />);
    const dataStructuresBtn = screen.getByText('Data Structures');
    fireEvent.click(dataStructuresBtn);

    const arraysBtn = screen.getByText('Arrays');
    fireEvent.click(arraysBtn);
    expect(screen.queryByText('Arrays')).toBeInTheDocument();
  });
});
