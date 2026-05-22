import { createElement as h } from 'react';
import Sidebar from '../components/Sidebar.jsx';

export default function TopicPage({ topic, subtopics, maps }) {
  const topics = (maps && maps.topics) || [];

  if (!topic) {
    return h('div', { style: { padding: 40, textAlign: 'center' } },
      h('h2', null, 'Topic not found'),
    );
  }

  function nav(subSlug) {
    window.location.hash = `#/stud/${topic.slug}/${subSlug}`;
  }

  function parseTags(t) {
    try { return typeof t === 'string' ? JSON.parse(t) : t || []; }
    catch { return []; }
  }

  function diffIcon(t) {
    const ts = parseTags(t);
    if (ts.includes('easy')) return '\uD83D\uDFE2';
    if (ts.includes('medium')) return '\uD83D\uDFE1';
    if (ts.includes('hard')) return '\uD83D\uDD34';
    return '\u26AA';
  }

  return h('div', { className: 'layout' },
    h(Sidebar, { topics, currentTopic: topic.slug }),
    h('div', { className: 'main' },
      // Route indicator
      h('div', { className: 'route-bar' }, `${topic.slug}/...`),

      // Search bar
      h('input', {
        className: 'search-bar',
        type: 'text',
        placeholder: 'topic, topic2.... compiler',
      }),

      // Filters
      h('div', { className: 'filter-row' },
        h('div', { className: 'filter-box' }, 'tags or filters'),
        h('div', { className: 'search-label' }, 'search'),
      ),

      // Content
      h('div', { className: 'content-box' },
        h('div', { className: 'subtopic-bar' },
          (subtopics || []).map(s => s.title).join(' \u00B7 ')
        ),

        // Subtopic grid
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 } },
          (subtopics || []).map(s =>
            h('div', {
              key: s.slug, onClick: () => nav(s.slug),
              style: {
                padding: 16, border: '4px solid #111', borderRadius: 20, cursor: 'pointer',
                background: '#fafafa',
              },
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { style: { fontSize: 18 } }, diffIcon(s.tags)),
                h('span', { style: { fontWeight: 700, fontSize: 15, color: '#111' } }, s.title),
              ),
              h('div', { style: { fontSize: 12, color: '#666', lineHeight: 1.5 } }, s.description),
              h('div', { style: { display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' } },
                parseTags(s.tags).slice(0, 3).map((tag, i) =>
                  h('span', {
                    key: i,
                    style: { padding: '2px 8px', fontSize: 10, border: '2px solid #111', borderRadius: 6, color: '#555', fontWeight: 600 },
                  }, tag),
                ),
              ),
            )
          ),
        ),
      ),
    ),
  );
}
