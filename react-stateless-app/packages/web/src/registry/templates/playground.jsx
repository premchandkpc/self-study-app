import { createElement as h } from 'react';

const s = {
  textarea: { width: '100%', minHeight: 180, border: '1px solid var(--border)', borderRadius: 12, padding: 12, fontFamily: '"Monaco","Menlo",monospace', fontSize: 13, resize: 'vertical', background: 'var(--bg-card)', color: 'var(--text)', outline: 'none' },
  btnRun: { padding: '8px 20px', border: '1px solid var(--accent)', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  btnTest: { padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  output: { marginTop: 12, border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'var(--bg-card)' },
  outputLabel: { fontWeight: 700, fontSize: 12, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase' },
  success: { color: 'var(--success)', fontFamily: 'monospace', fontSize: 12, margin: 0 },
  error: { color: 'var(--error)', fontFamily: 'monospace', fontSize: 12, margin: 0 },
  actions: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' },
};

export function playground(data, context) {
  const starter = data.starterCode || '';
  const tests = data.tests || [];
  const result = window.__S && window.__S.result;
  const testResult = window.__S && window.__S.testResult;

  function run() {
    const el = document.getElementById('pg-code');
    const code = el ? el.value : starter;
    fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, input: {} }),
    }).then(r => r.json()).then(res => {
      window.__S = { ...window.__S, result: res };
      if (window.__S && window.__S.render) window.__S.render();
    });
  }

  function runTest(idx) {
    const el = document.getElementById('pg-code');
    const code = el ? el.value : starter;
    const tc = tests[idx];
    if (!tc) return;
    const input = (() => { try { return JSON.parse(tc.input); } catch { return {}; } })();
    fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, input }),
    }).then(r => r.json()).then(res => {
      const passed = String(res.result) === String(tc.expected);
      window.__S = { ...window.__S, testResult: { idx, passed, result: res.result, expected: tc.expected } };
      if (window.__S && window.__S.render) window.__S.render();
    });
  }

  return h('div', { className: 'tmpl-playground' },
    h('textarea', { id: 'pg-code', defaultValue: starter, spellCheck: 'false', style: s.textarea }),
    h('div', { style: s.actions },
      h('button', { onClick: run, style: s.btnRun }, '\u25B6 Run'),
      tests.map((tc, i) => h('button', { key: i, onClick: () => runTest(i), style: s.btnTest }, `Test ${i + 1}`)),
    ),
    result && h('div', { style: s.output },
      h('div', { style: s.outputLabel }, 'Output'),
      result.error
        ? h('pre', { style: s.error }, result.error)
        : h('pre', { style: s.success }, JSON.stringify(result.result, null, 2)),
    ),
    testResult && h('div', {
      style: { marginTop: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid', fontWeight: 600, fontSize: 13,
        borderColor: testResult.passed ? 'var(--success)' : 'var(--error)',
        background: testResult.passed ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)',
        color: testResult.passed ? 'var(--success)' : 'var(--error)',
      },
    }, testResult.passed ? '\u2713 Passed' : '\u2717 Failed', ' \u2014 ', `Expected: ${testResult.expected}, Got: ${testResult.result}`),
  );
}
