import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { fetchMaps, fetchTopic, fetchSubtopic } from './api.js';
import HomePage from './pages/HomePage.jsx';
import TopicPage from './pages/TopicPage.jsx';
import SubtopicPage from './pages/SubtopicPage.jsx';
import './styles.css';
import './registry/index.js';

const root = createRoot(document.getElementById('root'));
let mapsCache = null;
window.__S = {};

async function load() {
  const hash = window.location.hash.slice(1) || '/stud';
  const parts = hash.split('/').filter(Boolean);
  const topicSlug = parts[0] === 'stud' ? parts[1] : parts[0];
  const subtopicSlug = parts[2] || null;

  try {
    root.render(h('div', { className: 'loading' }, 'Loading...'));
    if (!mapsCache) mapsCache = await fetchMaps();

    if (subtopicSlug) {
      const d = await fetchSubtopic(subtopicSlug);
      root.render(h(SubtopicPage, { subtopic: d.subtopic, related: d.related, maps: mapsCache }));
    } else if (topicSlug) {
      const d = await fetchTopic(topicSlug);
      root.render(h(TopicPage, { topic: d.topic, subtopics: d.subtopics, maps: mapsCache }));
    } else {
      root.render(h(HomePage, { maps: mapsCache }));
    }
  } catch (err) {
    root.render(h('div', { style: { padding: 40, textAlign: 'center' } },
      h('h2', { style: { color: '#e74c3c' } }, 'Error'),
      h('p', null, err.message),
      h('button', { onClick: () => { window.location.hash = '#/stud'; },
        style: { padding: '8px 20px', border: '3px solid #111', borderRadius: 10, cursor: 'pointer', marginTop: 12 }
      }, 'Go Home'),
    ));
  }
}

window.__S.render = load;
load();
window.addEventListener('hashchange', load);
