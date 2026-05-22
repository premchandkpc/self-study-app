import { createElement as h } from 'react';
import Sidebar from '../components/Sidebar.jsx';

export default function HomePage({ maps }) {
  const topics = (maps && maps.topics) || [];

  function nav(slug) {
    window.location.hash = `#/stud/${slug}`;
  }

  return h('div', { className: 'layout' },
    h(Sidebar, { topics, currentTopic: null }),
    h('div', { className: 'main' },
      h('div', { className: 'route-bar' }, 'stud/'),
      h('div', { className: 'content-box' },
        h('div', { style: { textAlign: 'center', padding: 20 } },
          h('div', { style: { fontSize: 48, marginBottom: 8 } }, '\u2699\uFE0F'),
          h('h1', { style: { fontSize: 28, fontWeight: 800, color: '#111', margin: '0 0 8px' } }, 'Algorithm Lab'),
          h('p', { style: { fontSize: 15, color: '#555', marginBottom: 24 } },
            'Learn data structures and algorithms interactively'
          ),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 } },
          topics.map(t =>
            h('div', {
              key: t.slug, onClick: () => nav(t.slug),
              style: {
                padding: 20, border: '4px solid #111', borderRadius: 20, cursor: 'pointer',
                background: '#fafafa',
              },
            },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, t.icon),
              h('div', { style: { fontWeight: 800, fontSize: 16, color: '#111', marginBottom: 4 } }, t.title),
              h('div', { style: { fontSize: 12, color: '#666' } }, t.description),
            )
          ),
        ),
      ),
    ),
  );
}
