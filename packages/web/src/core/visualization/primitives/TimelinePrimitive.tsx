import React from 'react';

export interface TimelinePrimitiveProps {
  data: {
    events: Array<{
      id: string;
      time: number;
      label: string;
      type?: 'ok' | 'warn' | 'error';
    }>;
  };
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
}

export function TimelinePrimitive({
  data,
  className = '',
  style = {},
  theme = 'light',
}: TimelinePrimitiveProps) {
  const { events } = data;

  return (
    <div className={className} style={{ padding: 16, ...style }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map((evt) => (
          <div key={evt.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: getEventColor(evt.type),
                marginTop: 4,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-primary)' }}>
                {evt.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                t={evt.time}ms
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEventColor(type: string | undefined): string {
  const colors: Record<string, string> = {
    ok: 'var(--color-success)',
    warn: 'var(--color-warning)',
    error: 'var(--color-error)',
  };
  return colors[type || 'ok'] || 'var(--color-info)';
}
