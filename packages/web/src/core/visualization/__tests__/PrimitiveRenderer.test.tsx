/**
 * Tests for PrimitiveRenderer.
 * Verifies routing to correct primitive and rendering without errors.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PrimitiveRenderer } from '../PrimitiveRenderer';
import type { VisualizationPayload } from '../../ir/VisualizationSchema';

describe('PrimitiveRenderer', () => {
  it('renders graph primitive', () => {
    const viz: VisualizationPayload = {
      type: 'graph',
      graph: {
        nodes: [
          { id: 'n1', label: 'Node 1', x: 100, y: 100 },
          { id: 'n2', label: 'Node 2', x: 200, y: 200 },
        ],
        edges: [{ from: 'n1', to: 'n2', protocol: 'HTTP' }],
      },
    };

    render(<PrimitiveRenderer visualization={viz} />);
    expect(screen.getByText('Node 1')).toBeInTheDocument();
    expect(screen.getByText('Node 2')).toBeInTheDocument();
  });

  it('renders array primitive', () => {
    const viz: VisualizationPayload = {
      type: 'dsa-array',
      array: {
        cells: [
          { value: 5, state: 'idle' },
          { value: 3, state: 'active' },
          { value: 7, state: 'idle' },
        ],
      },
    };

    render(<PrimitiveRenderer visualization={viz} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders table primitive', () => {
    const viz: VisualizationPayload = {
      type: 'table',
      table: {
        headers: ['Name', 'Value'],
        rows: [
          ['x', '5'],
          ['y', '10'],
        ],
      },
    };

    render(<PrimitiveRenderer visualization={viz} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('x')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders timeline primitive', () => {
    const viz: VisualizationPayload = {
      type: 'timeline',
      timeline: {
        events: [
          { id: 'e1', time: 0, label: 'Start', type: 'ok' },
          { id: 'e2', time: 100, label: 'Done', type: 'ok' },
        ],
      },
    };

    render(<PrimitiveRenderer visualization={viz} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders code primitive', () => {
    const viz: VisualizationPayload = {
      type: 'code',
      execution: {
        lineNumber: 5,
        state: { x: 10, y: 20 },
      },
    };

    render(<PrimitiveRenderer visualization={viz} />);
    expect(screen.getByText(/Current line/)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('shows error for missing data', () => {
    const viz: VisualizationPayload = {
      type: 'graph',
    };

    render(<PrimitiveRenderer visualization={viz} />);
    expect(screen.getByText(/No graph data/)).toBeInTheDocument();
  });

  it('handles unknown visualization type', () => {
    const viz = {
      type: 'unknown-type',
    } as any;

    render(<PrimitiveRenderer visualization={viz} />);
    expect(screen.getByText(/Unknown visualization type/)).toBeInTheDocument();
  });

  it('accepts config props', () => {
    const viz: VisualizationPayload = {
      type: 'dsa-array',
      array: { cells: [{ value: 1 }] },
    };

    const { container } = render(
      <PrimitiveRenderer
        visualization={viz}
        config={{ theme: 'dark', interactive: true, layout: 'horizontal' }}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('accepts event handlers', () => {
    const handleNodeClick = jest.fn();
    const handleEdgeClick = jest.fn();

    const viz: VisualizationPayload = {
      type: 'graph',
      graph: {
        nodes: [{ id: 'n1', label: 'Node 1', x: 100, y: 100 }],
        edges: [],
      },
    };

    render(
      <PrimitiveRenderer
        visualization={viz}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
      />
    );

    expect(screen.getByText('Node 1')).toBeInTheDocument();
  });
});
