import { createElement as h } from 'react';

export function markdown(data, context) {
  const content = data.content || '';
  const lines = content.split('\n');
  const els = [];
  let skip = -1;

  for (let i = 0; i < lines.length; i++) {
    if (i <= skip) continue;
    const t = lines[i].trim();

    if (t.startsWith('```')) {
      const c = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('```')) c.push(lines[j]), j++;
      els.push(h('pre', { key: i }, h('code', null, c.join('\n'))));
      skip = j; continue;
    }

    if (t.startsWith('- ')) {
      const items = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('- ')) items.push(lines[j].trim().slice(2)), j++;
      els.push(h('ul', { key: i }, items.map((x, k) => h('li', { key: k }, x))));
      skip = j - 1; continue;
    }

    if (t.startsWith('### ')) { els.push(h('h3', { key: i }, t.slice(4))); continue; }
    if (t.startsWith('## ')) { els.push(h('h2', { key: i }, t.slice(3))); continue; }
    if (t.startsWith('# ')) { els.push(h('h1', { key: i }, t.slice(2))); continue; }
    if (!t) continue;

    const html = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
    els.push(h('p', { key: i, dangerouslySetInnerHTML: { __html: html } }));
  }

  return h('div', { className: 'tmpl-md' }, els);
}
