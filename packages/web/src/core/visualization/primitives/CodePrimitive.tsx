import React from 'react';

export interface CodePrimitiveProps {
  data: {
    lineNumber?: number;
    callStack?: Array<{ fn: string; line: number }>;
    state?: Record<string, unknown>;
  };
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
}

export function CodePrimitive({
  data,
  className = '',
  style = {},
  theme = 'light',
}: CodePrimitiveProps) {
  const { lineNumber, callStack, state } = data;

  return (
    <div className={className} style={{ padding: 16, ...style }}>
      {lineNumber && (
        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          Current line: <strong>{lineNumber}</strong>
        </div>
      )}

      {callStack && callStack.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: '600', color: 'var(--text-primary)', marginBottom: 8 }}>
            Call Stack
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            {callStack.map((frame, i) => (
              <div key={i}>
                {i}. {frame.fn} @ line {frame.line}
              </div>
            ))}
          </div>
        </div>
      )}

      {state && Object.keys(state).length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: '600', color: 'var(--text-primary)', marginBottom: 8 }}>
            Variables
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            <pre style={{ margin: 0, overflow: 'auto' }}>
              {JSON.stringify(state, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
