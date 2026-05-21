import React from 'react';

export interface TablePrimitiveProps {
  data: { headers: string[]; rows: (string | number | boolean)[][] };
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  theme?: 'light' | 'dark';
}

export function TablePrimitive({
  data,
  className = '',
  style = {},
  interactive = true,
  theme = 'light',
}: TablePrimitiveProps) {
  const { headers, rows } = data;

  return (
    <div className={className} style={{ overflowX: 'auto', ...style }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: 13,
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '12px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                  }}
                >
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
