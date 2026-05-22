import { createElement as h } from 'react';

export function cardGrid(data, context) {
  const items = data.items || [];
  const columns = context.columns || data.columns || 3;

  function nav(slug) {
    window.location.hash = `#/stud/${slug}`;
  }

  return h('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(columns, 4)}, 1fr)`,
      gap: 10,
    },
  }, items.map((item, i) =>
    h('div', {
      key: item.slug || i, onClick: item.slug ? () => nav(item.slug) : undefined,
      style: {
        padding: 14, border: '1px solid var(--border)', borderRadius: 12,
        cursor: item.slug ? 'pointer' : 'default', background: 'var(--bg-card)',
        transition: 'transform 0.15s',
      },
    },
      item.icon && h('div', { style: { fontSize: 24, marginBottom: 6 } }, item.icon),
      h('div', { style: { fontWeight: 700, fontSize: 14, color: 'var(--text)' } }, item.title || item.name),
      item.description && h('div', { style: { fontSize: 12, color: 'var(--text-muted)', marginTop: 4 } }, item.description),
    )
  ));
}
