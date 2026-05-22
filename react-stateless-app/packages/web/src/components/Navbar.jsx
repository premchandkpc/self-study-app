import { createElement as h } from 'react';

export default function Navbar({ topics, currentTopic }) {
  function nav(slug) {
    window.location.hash = `#/stud/${slug}`;
  }

  return h('nav', { className: 'navbar' },
    h('div', { className: 'navbar-brand', onClick: () => { window.location.hash = '#/stud'; } },
      h('span', { style: { fontSize: 20 } }, '\u2699\uFE0F'),
      h('span', { style: { fontWeight: 700, fontSize: 15 } }, 'Algo Lab')
    ),
    h('div', { className: 'navbar-links' },
      (topics || []).map(t =>
        h('button', {
          key: t.slug,
          className: `navbar-link ${currentTopic === t.slug ? 'navbar-link-active' : ''}`,
          onClick: () => nav(t.slug),
        }, t.icon, ' ', t.title)
      ),
    ),
  );
}
