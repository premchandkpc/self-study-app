import { createElement as h } from 'react';

export default function Sidebar({ topics, currentTopic }) {
  function nav(slug) {
    window.location.hash = `#/stud/${slug}`;
  }

  function goHome() {
    window.location.hash = '#/stud';
  }

  return h('div', { className: 'sidebar' },
    h('div', {
      onClick: goHome,
      style: {
        padding: 16, textAlign: 'center', cursor: 'pointer', borderBottom: '4px solid #111',
        fontSize: 24, fontWeight: 800, marginBottom: 8,
      },
    }, '\u2699\uFE0F'),
    (topics || []).map(t =>
      h('div', {
        key: t.slug, onClick: () => nav(t.slug),
        style: {
          padding: '10px 14px', margin: '4px 8px', borderRadius: 10, cursor: 'pointer',
          background: currentTopic === t.slug ? '#e8e8e8' : 'transparent',
          fontWeight: currentTopic === t.slug ? 700 : 400,
          border: currentTopic === t.slug ? '2px solid #111' : '2px solid transparent',
          fontSize: 13, color: '#111',
        },
      }, t.icon, ' ', t.title),
    ),
  );
}
