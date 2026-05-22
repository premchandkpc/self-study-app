import { createElement as h } from 'react';

export function tabs(data, context) {
  const tabList = data.tabs || [];
  const activeTab = window.__S && window.__S.activeTab || 0;
  const rc = context.render;

  function switchTab(idx) {
    window.__S = { ...window.__S, activeTab: idx };
    if (window.__S && window.__S.render) window.__S.render();
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
    h('div', { style: { display: 'flex', borderBottom: '1px solid var(--border)' } },
      tabList.map((tab, i) =>
        h('button', {
          key: i, onClick: () => switchTab(i),
          style: {
            padding: '8px 16px', border: '1px solid var(--border)', borderBottom: i === activeTab ? '1px solid var(--bg2)' : '1px solid var(--border)',
            background: i === activeTab ? 'var(--bg2)' : 'var(--bg)',
            color: 'var(--text)', cursor: 'pointer', fontWeight: i === activeTab ? 700 : 400,
            fontSize: 13, marginRight: -1, borderRadius: '8px 8px 0 0',
          },
        }, tab.label || `Tab ${i + 1}`)
      ),
    ),
    h('div', { style: { flex: 1, overflow: 'auto', padding: 12, border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 12px 12px', background: 'var(--bg2)' } },
      tabList[activeTab] && rc ? rc(tabList[activeTab].template, tabList[activeTab].data, context) : null
    ),
  );
}
