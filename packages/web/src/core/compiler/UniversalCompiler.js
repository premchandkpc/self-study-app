// Universal compiler - parses JS code, executes with instrumentation, generates steps
export class UniversalCompiler {
  constructor(config = {}) {
    this.config = {
      maxSteps: 1000,
      trackArrays: true,
      trackStrings: true,
      trackPointers: true,
      trackComparisons: true,
      ...config,
    };
    this.trace = [];
    this.currentStep = 0;
  }

  compile(functionCode, testData) {
    this.trace = [];
    this.currentStep = 0;

    try {
      // Parse function and execute with instrumentation
      const fn = this._parseFunction(functionCode);
      const tracer = new ExecutionTracer(this.config);

      // Instrument arrays/strings with proxies
      const instrumentedInput = tracer.instrument(testData);

      // Execute function
      fn(instrumentedInput, tracer);

      // Get execution trace
      this.trace = tracer.getTrace();
      return this._generateSteps(this.trace, functionCode, testData);
    } catch (e) {
      console.error('Compilation error:', e);
      return [];
    }
  }

  _parseFunction(code) {
    // Extract function body and parameters
    const match = code.match(/function\s+\w+\s*\((.*?)\)\s*\{([\s\S]*)\}/);
    if (!match) throw new Error('Invalid function syntax');

    const [, params, body] = match;
    const paramList = params.split(',').map(p => p.trim());

    return new Function(...paramList, body);
  }

  _generateSteps(trace, code, testData) {
    const steps = [];

    // Initial state
    steps.push({
      title: 'Initialize',
      description: 'Set up input data',
      state: this._captureState(testData),
      opsLog: [{ msg: 'Function started', type: 'init' }],
    });

    // Generate step for each trace event
    trace.forEach((event, idx) => {
      const step = {
        title: `Step ${idx + 1}`,
        description: event.description,
        state: event.state,
        opsLog: event.opsLog || [],
      };

      if (event.result !== undefined) step.result = event.result;
      if (event.complexity) step.complexity = event.complexity;

      steps.push(step);
    });

    return steps;
  }

  _captureState(data) {
    if (Array.isArray(data)) return { array: [...data] };
    if (typeof data === 'string') return { string: data };
    return data;
  }
}

// Tracks execution mutations
export class ExecutionTracer {
  constructor(config) {
    this.config = config;
    this.trace = [];
    this.mutations = [];
    this.stateHistory = [];
  }

  instrument(data) {
    if (Array.isArray(data)) {
      return new Proxy(data, {
        get: (target, prop) => {
          if (typeof prop === 'string' && !isNaN(prop)) {
            this._recordAccess(target, 'array', parseInt(prop), target[prop]);
          }
          return target[prop];
        },
        set: (target, prop, value) => {
          if (typeof prop === 'string' && !isNaN(prop)) {
            this._recordMutation(target, 'array', parseInt(prop), value);
          }
          target[prop] = value;
          return true;
        },
      });
    }
    return data;
  }

  _recordAccess(target, type, index, value) {
    this.mutations.push({
      type: 'access',
      dataType: type,
      index,
      value,
      timestamp: Date.now(),
    });
  }

  _recordMutation(target, type, index, value) {
    this.mutations.push({
      type: 'mutation',
      dataType: type,
      index,
      value,
      timestamp: Date.now(),
    });
  }

  recordStep(description, state, ops = []) {
    this.trace.push({
      description,
      state: { ...state },
      opsLog: ops,
      mutations: [...this.mutations],
    });
    this.mutations = [];
  }

  recordComparison(op, left, right, result) {
    this.recordStep(
      `Compare: ${left} ${op} ${right}`,
      {},
      [{ msg: `${left} ${op} ${right} = ${result}`, type: 'compare' }]
    );
  }

  getTrace() {
    return this.trace;
  }
}

// Generates customizable visualization steps
export class StepGenerator {
  constructor() {
    this.renderers = new Map();
    this.registerDefaultRenderers();
  }

  registerRenderer(type, renderer) {
    this.renderers.set(type, renderer);
  }

  detectType(data) {
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'string') return 'string';
    if (typeof data === 'object') return 'object';
    return 'primitive';
  }

  render(trace, config = {}) {
    const type = this.detectType(trace[0]?.state);
    const renderer = this.renderers.get(type);
    if (!renderer) return trace;
    return renderer(trace, config);
  }

  registerDefaultRenderers() {
    this.renderers.set('array', (trace, config) => {
      return trace.map(step => ({
        ...step,
        visualization: {
          type: 'array',
          highlighted: config.highlightIndices || [],
        },
      }));
    });

    this.renderers.set('string', (trace, config) => {
      return trace.map(step => ({
        ...step,
        visualization: {
          type: 'string',
          highlighted: config.highlightIndices || [],
        },
      }));
    });
  }
}
