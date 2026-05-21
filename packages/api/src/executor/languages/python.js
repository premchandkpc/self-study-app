import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class PythonExecutor {
  static async execute(code, inputData) {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `algo_${Date.now()}.py`);
    const outputFile = path.join(tmpDir, `algo_out_${Date.now()}.json`);

    try {
      // Generate Python script that captures steps
      const script = this.wrapCode(code, inputData, outputFile);
      fs.writeFileSync(tmpFile, script);

      // Execute Python
      const result = execSync(`python3 "${tmpFile}"`, { timeout: 5000, encoding: 'utf-8' });

      // Read output
      if (fs.existsSync(outputFile)) {
        const output = fs.readFileSync(outputFile, 'utf-8');
        return JSON.parse(output);
      }

      return { steps: [], error: result };
    } catch (e) {
      return { steps: [], error: `Python execution failed: ${e.message}` };
    } finally {
      [tmpFile, outputFile].forEach(f => {
        try { fs.unlinkSync(f); } catch { }
      });
    }
  }

  static wrapCode(userCode, inputData, outputFile) {
    return `
import json
import sys

# Input data
input_data = ${JSON.stringify(inputData)}

# Tracer class
class Tracer:
    def __init__(self):
        self.steps = []

    def step(self, title, description, state=None, metadata=None):
        step = {
            'title': title,
            'description': description,
            'state': state or {},
            'opsLog': [{'msg': description, 'type': 'info'}]
        }
        if metadata:
            step.update(metadata)
        self.steps.append(step)

    def found(self, result, context=None):
        step = {
            'title': 'Found',
            'description': f'Found: {json.dumps(result)}',
            'result': result,
            'opsLog': [{'msg': f'Found: {json.dumps(result)}', 'type': 'success'}]
        }
        if context and 'state' in context:
            step['state'] = context['state']
        self.steps.append(step)

# User algorithm
${this.extractPythonBody(userCode)}

# Execute
tracer = Tracer()
try:
    result = algorithm(input_data, tracer)
    output = {
        'steps': tracer.steps,
        'error': None
    }
except Exception as e:
    output = {
        'steps': tracer.steps,
        'error': str(e)
    }

# Write output
with open('${outputFile}', 'w') as f:
    json.dump(output, f)
`;
  }

  static extractPythonBody(code) {
    // Extract function definition, handle both def and lambda
    const match = code.match(/def algorithm\(.*?\):\s*([\s\S]*)/);
    if (match) {
      return `def algorithm(input, tracer):\n${this.indent(match[1])}`;
    }
    return code;
  }

  static indent(code) {
    return code.split('\n').map(line => '    ' + line).join('\n');
  }
}
