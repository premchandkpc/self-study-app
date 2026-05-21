import express from 'express';
import { execSync } from 'child_process';
import { PythonExecutor } from './languages/python.js';
import { JavaExecutor } from './languages/java.js';

const router = express.Router();

const executors = {
  javascript: javascriptExecutor,
  python: PythonExecutor.execute.bind(PythonExecutor),
  java: JavaExecutor.execute.bind(JavaExecutor),
  go: goPlaceholder,
  rust: rustPlaceholder,
};

/**
 * POST /api/execute
 * Body: { language, code, inputData }
 * Returns: { steps: [...], error: null } or { steps: [...], error: "message" }
 */
router.post('/execute', async (req, res) => {
  const { language, code, inputData } = req.body;

  if (!language || !code || !inputData) {
    return res.status(400).json({ error: 'Missing language, code, or inputData' });
  }

  const executor = executors[language];
  if (!executor) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  try {
    const result = await executor(code, inputData);
    res.json(result);
  } catch (e) {
    res.status(500).json({ steps: [], error: e.message });
  }
});

async function javascriptExecutor(code, inputData) {
  // Should not be called from backend (JS runs client-side)
  // Kept for completeness
  try {
    const fnBody = extractFunctionBody(code);
    const algorithm = new Function('input', 'tracer', fnBody);
    const steps = [];
    const tracer = createTracer(steps);
    algorithm(inputData, tracer);
    return { steps, error: null };
  } catch (e) {
    return { steps: [], error: e.message };
  }
}

function goPlaceholder(code, inputData) {
  return Promise.resolve({
    steps: [],
    error: 'Go WASM support coming soon. Use JavaScript or Python.',
  });
}

function rustPlaceholder(code, inputData) {
  return Promise.resolve({
    steps: [],
    error: 'Rust WASM support coming soon. Use JavaScript or Python.',
  });
}

function extractFunctionBody(code) {
  const match = code.match(/\{([\s\S]*)\}(?:\s*;)?$/);
  return match ? match[1] : code;
}

function createTracer(steps) {
  return {
    step(title, description, state, metadata = {}) {
      steps.push({ title, description, state, ...metadata });
    },
    found(result, context = {}) {
      steps.push({ title: 'Found', description: `Found: ${JSON.stringify(result)}`, ...context, result });
    },
  };
}

export default router;
