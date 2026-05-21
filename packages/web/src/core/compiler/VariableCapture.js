// Capture local variables at each step using Proxy
export class VariableCapture {
  // Execute code with variable tracking
  // Returns: { result, captures: [{ varName: value, ... }, ...] }
  static execute(code, input, tracer) {
    const captures = [];
    const locals = { ...input };

    // Proxy to track variable mutations
    const handler = {
      set(target, prop, value) {
        // Track all user variables (skip tracer/input/internals)
        if (!prop.startsWith('_') && prop !== 'tracer' && prop !== 'input') {
          // Optionally: tracer.captureVariable(prop, value);
        }
        target[prop] = value;
        return true;
      },
    };

    const proxy = new Proxy(locals, handler);

    // Extract function body and parameters
    const paramMatch = code.match(/\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()) : ['input', 'tracer'];

    const bodyMatch = code.match(/\{([\s\S]*)\}(?:\s*$|;)/);
    const body = bodyMatch ? bodyMatch[1] : code;

    try {
      // Create function with proxy in scope
      const fn = new Function(
        ...params,
        `
        const locals = this;
        ${body}
        `
      );

      const result = fn.apply(proxy, [input, tracer]);
      return { result, captures, error: null };
    } catch (e) {
      return { result: undefined, captures, error: e.message };
    }
  }

  // Snapshot all current variables
  static snapshot(locals) {
    const snap = {};
    for (const [key, val] of Object.entries(locals)) {
      if (!key.startsWith('_') && key !== 'tracer' && key !== 'input') {
        snap[key] = this._clone(val);
      }
    }
    return snap;
  }

  static _clone(val) {
    if (val === null || val === undefined) return val;
    if (typeof val === 'object') {
      if (Array.isArray(val)) return [...val];
      try {
        return JSON.parse(JSON.stringify(val));
      } catch {
        return `[${typeof val}]`;
      }
    }
    return val;
  }
}
