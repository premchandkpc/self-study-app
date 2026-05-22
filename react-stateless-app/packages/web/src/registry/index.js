import { createElement as h } from 'react';
import { markdown } from './templates/markdown.jsx';
import { playground } from './templates/playground.jsx';
import { splitPanel } from './templates/split-panel.jsx';
import { tabs } from './templates/tabs.jsx';
import { cardGrid } from './templates/card-grid.jsx';
import { visualizer } from './templates/visualizer.jsx';

const registry = new Map();

export function define(slug, factory) {
  registry.set(slug, factory);
}

export function render(slug, data, context = {}) {
  const factory = registry.get(slug);
  if (!factory) {
    return h('div', { style: { padding: 20, color: '#999' } }, `Template "${slug}" not registered`);
  }
  // Pass render function via context so composite templates can nest
  return factory(data, { ...context, render });
}

// Register all template factories
define('markdown', markdown);
define('playground', playground);
define('split-panel', splitPanel);
define('tabs', tabs);
define('card-grid', cardGrid);
define('visualizer', visualizer);
