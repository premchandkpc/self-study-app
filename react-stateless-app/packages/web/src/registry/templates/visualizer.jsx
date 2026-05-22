import { createElement as h } from 'react';

export function visualizer(data, context) {
  const steps = data.steps || [];
  const current = window.__S && window.__S.vizStep || 0;

  function goTo(idx) {
    window.__S = { ...window.__S, vizStep: Math.max(0, Math.min(idx, steps.length - 1)) };
    if (window.__S && window.__S.render) window.__S.render();
  }

  const step = steps[current];

  const btn = (disabled) => ({
    padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 8,
    background: disabled ? 'var(--bg)' : 'var(--bg-card)', cursor: disabled ? 'default' : 'pointer',
    fontSize: 14, fontWeight: 700, color: 'var(--text)', opacity: disabled ? 0.4 : 1,
  });

  function renderState(state) {
    if (!state) return null;
    if (Array.isArray(state)) {
      return h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
        state.map((v, i) => h('div', { key: i, style: {
          padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6,
          background: step && step.highlight === i ? 'var(--accent)' : 'var(--bg-card)',
          color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700,
        } }, String(v))),
      );
    }
    if (typeof state === 'object') {
      return h('pre', { style: { fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-card)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' } },
        JSON.stringify(state, null, 2)
      );
    }
    return h('span', { style: { fontWeight: 700 } }, String(state));
  }

  return h('div', { className: 'tmpl-visualizer' },
    h('div', { style: { marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 } },
      h('button', { onClick: () => goTo(current - 1), disabled: current <= 0, style: btn(current <= 0) }, '\u25C0'),
      h('span', { style: { fontSize: 14, fontWeight: 700, color: 'var(--text)' } }, `Step ${current + 1} / ${steps.length}`),
      h('button', { onClick: () => goTo(current + 1), disabled: current >= steps.length - 1, style: btn(current >= steps.length - 1) }, '\u25B6'),
    ),
    step && step.title && h('div', { style: { fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text)' } }, step.title),
    step && step.description && h('div', { style: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 } }, step.description),
    step && step.state && renderState(step.state),
    step && step.result !== undefined && h('div', { style: { marginTop: 10, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)' } },
      h('span', { style: { fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' } }, 'Result: '),
      h('span', { style: { fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--accent)' } }, String(step.result)),
    ),
    !steps.length && h('div', { style: { color: 'var(--text-muted)', fontSize: 14, padding: 20, textAlign: 'center' } }, 'No steps'),
  );
}
