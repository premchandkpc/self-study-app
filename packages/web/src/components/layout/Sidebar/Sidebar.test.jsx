import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import * as TopicsModule from '../../../core/constants/topics';
import * as RoutesModule from '../../../core/constants/routes';

vi.mock('../../../core/constants/topics', () => ({
  TOPICS: [
    {
      id: 'dsa',
      label: 'Data Structures',
      icon: '📦',
      subtopics: ['Arrays', 'LinkedList'],
    },
    {
      id: 'algos',
      label: 'Algorithms',
      icon: '🔄',
      subtopics: ['Sorting', 'Search'],
    },
  ],
}));

vi.mock('../../../core/constants/routes', () => ({
  SUBTOPIC_ROUTES: {
    'dsa:Arrays': '/topics/dsa/Arrays/learn',
    'dsa:LinkedList': '/topics/dsa/LinkedList/learn',
    'algos:Sorting': '/topics/algos/Sorting/learn',
  },
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Sidebar', () => {
  it('renders sidebar with topics', () => {
    renderWithRouter(<Sidebar collapsed={false} />);
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
    expect(screen.getByText('Algorithms')).toBeInTheDocument();
  });

  it('shows section label when not collapsed', () => {
    renderWithRouter(<Sidebar collapsed={false} />);
    expect(screen.getByText('Topics')).toBeInTheDocument();
  });

  it('hides section label when collapsed', () => {
    renderWithRouter(<Sidebar collapsed={true} />);
    expect(screen.queryByText('Topics')).not.toBeInTheDocument();
  });

  it('toggles subtopic expansion on topic click', () => {
    renderWithRouter(<Sidebar collapsed={false} />);
    const dataStructuresBtn = screen.getByText('Data Structures');

    expect(screen.queryByText('Arrays')).not.toBeInTheDocument();

    fireEvent.click(dataStructuresBtn);
    expect(screen.getByText('Arrays')).toBeInTheDocument();
    expect(screen.getByText('LinkedList')).toBeInTheDocument();

    fireEvent.click(dataStructuresBtn);
    expect(screen.queryByText('Arrays')).not.toBeInTheDocument();
  });

  it('hides subtopics when collapsed', () => {
    renderWithRouter(<Sidebar collapsed={true} />);
    expect(screen.queryByText('Arrays')).not.toBeInTheDocument();
  });

  it('applies collapsed styles', () => {
    const { container: collapsedContainer } = renderWithRouter(<Sidebar collapsed={true} />);
    const sidebar = collapsedContainer.querySelector('aside');
    expect(sidebar.className).toContain('collapsed');
  });

  it('navigates on subtopic selection', () => {
    renderWithRouter(<Sidebar collapsed={false} />);
    const dataStructuresBtn = screen.getByText('Data Structures');
    fireEvent.click(dataStructuresBtn);

    const arraysBtn = screen.getByText('Arrays');
    fireEvent.click(arraysBtn);
    expect(window.location.pathname).toBe('/');
  });
});
