export function formatVarValue(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.length > 12 ? `"${v.slice(0, 10)}..."` : `"${v}"`;
  if (Array.isArray(v)) {
    const inner = v.slice(0, 6).map((x) => (x === null ? '∅' : String(x))).join(', ');
    return `[${inner}${v.length > 6 ? ', ...' : ''}]`;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v).slice(0, 4);
    if (!entries.length) return '{}';
    return `{${entries.map(([k, val]) => `${k}:${val}`).join(', ')}${Object.keys(v).length > 4 ? ',...' : ''}}`;
  }
  return String(v);
}
