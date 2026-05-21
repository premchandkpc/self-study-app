import React from 'react';
import type { ArrayCellData } from '../../ir/VisualizationSchema';

export interface ArrayPrimitiveProps {
  data: { cells: ArrayCellData[]; window?: { left: number; right: number }; indices?: Record<string, number | number[]> };
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  theme?: 'light' | 'dark';
}

export function ArrayPrimitive({
  data,
  className = '',
  style = {},
  interactive = true,
  theme = 'light',
}: ArrayPrimitiveProps) {
  const { cells, window } = data;

  return (
    <div className={className} style={{ display: 'flex', gap: 8, padding: 16, ...style }}>
      {cells.map((cell, i) => (
        <div
          key={i}
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            border: '2px solid var(--border)',
            background: getCellColor(cell.state, theme, window && i >= window.left && i <= window.right),
            color: 'var(--text-primary)',
            fontSize: 14,
            fontWeight: '600',
            cursor: interactive ? 'pointer' : 'default',
          }}
        >
          {cell.value !== null && cell.value !== undefined ? String(cell.value) : '?'}
        </div>
      ))}
    </div>
  );
}

function getCellColor(
  state: string | undefined,
  theme: string,
  inWindow: boolean
): string {
  if (inWindow) return 'var(--color-warning-bg)';
  const colors: Record<string, string> = {
    idle: 'var(--bg-subtle)',
    active: 'var(--color-info-bg)',
    error: 'var(--color-error-bg)',
    done: 'var(--color-success-bg)',
    visited: 'var(--bg-muted)',
    window: 'var(--color-warning-bg)',
    adding: 'var(--color-success-bg)',
    removing: 'var(--color-error-bg)',
  };
  return colors[state || 'idle'] || 'var(--bg-subtle)';
}
