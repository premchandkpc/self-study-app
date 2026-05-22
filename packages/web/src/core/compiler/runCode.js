const MAX_STEPS = 1000;

function safeClone(val, depth = 0) {
  if (depth > 4) return '…';
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;
  if (typeof val === 'function') return '[fn]';
  if (Array.isArray(val)) return val.slice(0, 32).map(v => safeClone(v, depth + 1));
  const out = {};
  let count = 0;
  for (const [k, v] of Object.entries(val)) {
    if (count++ > 16) { out['…'] = `+${Object.keys(val).length - 16}`; break; }
    out[k] = safeClone(v, depth + 1);
  }
  return out;
}

function narrate(prev, curr, line) {
  if (!prev) return `Line ${line} — start`;
  const changes = [];
  for (const [k, v] of Object.entries(curr)) {
    const ps = JSON.stringify(prev[k]);
    const cs = JSON.stringify(v);
    if (k === '__result') {
      changes.push(`return ${cs}`);
    } else if (!(k in prev)) {
      changes.push(`${k} = ${cs}`);
    } else if (ps !== cs) {
      const shortPrev = ps?.length > 20 ? ps.slice(0, 20) + '…' : ps;
      const shortCurr = cs?.length > 20 ? cs.slice(0, 20) + '…' : cs;
      changes.push(`${k}: ${shortPrev} → ${shortCurr}`);
    }
  }
  if (!changes.length) return `Line ${line}`;
  return `Line ${line} — ${changes.join(', ')}`;
}

/**
 * Execute instrumented code in a sandbox and return steps array.
 * Each step: { vars, codeLine, narration }
 */
export function runCode({ code, fnName, paramValues }) {
  const steps = [];
  let prevVars = null;

  function __step__(vars, codeLine) {
    if (steps.length >= MAX_STEPS) return;
    const cloned = safeClone(vars);
    steps.push({
      vars: cloned,
      codeLine,
      narration: narrate(prevVars, cloned, codeLine),
    });
    prevVars = cloned;
  }

  const safeGlobals = {
    Math, Array, Object, String, Number, Boolean, Map, Set,
    parseInt, parseFloat, isNaN, isFinite, JSON,
    console: { log: () => {}, warn: () => {}, error: () => {} },
    __step__,
  };

  const argNames = Object.keys(safeGlobals);
  const argVals = argNames.map(k => safeGlobals[k]);

  let safeParamStr;
  try {
    safeParamStr = paramValues.map(v => JSON.stringify(v)).join(', ');
  } catch {
    throw new Error('Parameter values must be JSON-serializable');
  }

  const fnBody = `${code}\ntry{${fnName}(${safeParamStr});}catch(__e){if(steps&&steps.length>0){}else{throw __e;}}`;

  let fn;
  try {
    fn = new Function(...argNames, fnBody);
  } catch (e) {
    throw new Error(`Compile error: ${e.message}`, { cause: e });
  }

  try {
    fn(...argVals);
  } catch (e) {
    if (steps.length === 0) throw new Error(`Runtime error: ${e.message}`, { cause: e });
  }

  if (steps.length === 0) {
    throw new Error('No steps captured. Ensure your function has statements and loops that run.');
  }

  if (steps.length >= MAX_STEPS) {
    steps.push({
      vars: steps[steps.length - 1]?.vars ?? {},
      codeLine: null,
      narration: `⚠ Stopped at ${MAX_STEPS} steps (recursion/loop limit). Reduce input size.`,
    });
  }

  return steps;
}
