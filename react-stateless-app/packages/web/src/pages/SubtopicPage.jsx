import { createElement as h } from 'react';
import { render } from '../registry/index.js';
import Sidebar from '../components/Sidebar.jsx';

export default function SubtopicPage({ subtopic, related, maps }) {
  const topics = (maps && maps.topics) || [];

  if (!subtopic) {
    return h('div', { style: { padding: 40, textAlign: 'center' } },
      h('h2', null, 'Not Found'),
    );
  }

  function back() {
    window.location.hash = `#/stud/${subtopic.topic_slug}`;
  }

  function navRelated(slug) {
    window.location.hash = `#/stud/${subtopic.topic_slug}/${slug}`;
  }

  return h('div', { className: 'layout' },
    h(Sidebar, { topics, currentTopic: subtopic.topic_slug }),
    h('div', { className: 'main' },
      // Route indicator + back
      h('div', { className: 'route-bar' },
        h('button', {
          onClick: back,
          style: { border: 'none', background: 'none', cursor: 'pointer', padding: 0, marginRight: 12, fontWeight: 700 },
        }, '\u2190'),
        `${subtopic.topic_slug}/${subtopic.slug}`
      ),

      // Content box
      h('div', { className: 'content-box', style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } },
        // Subtopic bar
        h('div', { className: 'subtopic-bar' }, subtopic.title),

        // Template rendered content
        h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } },
          render(subtopic.template_slug, subtopic.data, { theme: 'light' })
        ),

        // Related
        related && related.length > 0 && h('div', {
          style: { marginTop: 16, padding: 16, border: '4px solid #111', borderRadius: 20, background: '#fafafa' },
        },
          h('div', { style: { fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555' } }, 'Related'),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            related.map(r =>
              h('button', {
                key: r.slug, onClick: () => navRelated(r.slug),
                style: { padding: '6px 14px', border: '3px solid #111', borderRadius: 10, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12 },
              }, r.title),
            ),
          ),
        ),
      ),
    ),
  );
}
