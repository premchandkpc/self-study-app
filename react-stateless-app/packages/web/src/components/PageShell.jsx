import { createElement as h } from 'react';
import Navbar from './Navbar.jsx';

export default function PageShell({ topics, currentTopic, children }) {
  return h('div', { className: 'app-shell' },
    h(Navbar, { topics, currentTopic }),
    h('main', { className: 'app-main' }, children),
  );
}
