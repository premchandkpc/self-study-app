import { createElement as h } from 'react';

export function splitPanel(data, context) {
  const left = data.left || {};
  const right = data.right || {};
  const rc = context.render;
  const ratio = context.splitRatio || 0.5;

  return h('div', { style: { display: 'flex', flex: 1, minHeight: 0, gap: 0 } },
    h('div', { style: { flex: `${ratio * 100}%`, overflow: 'auto', borderRight: '1px solid var(--border)' } },
      rc ? rc(left.template, left.data, context) : null
    ),
    h('div', { style: { flex: `${(1 - ratio) * 100}%`, overflow: 'auto' } },
      rc ? rc(right.template, right.data, context) : null
    ),
  );
}
