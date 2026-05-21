// ContentCompilerWorker - Off-main-thread compilation
// Runs in Web Worker to prevent blocking UI
// Handles: parsing, validation, graph building, layout precomputation

import { ContentCompiler } from '../ir/contentCompiler';
import { ContentCompilerOptimizer } from '../ir/contentCompilerOptimizer';
import { TechnologyContent, IRLearningUnit } from '../ir/schema';

export interface CompileRequest {
  id: string;
  content: TechnologyContent;
  optimize: boolean;
}

export interface CompileResponse {
  id: string;
  success: boolean;
  ir?: IRLearningUnit;
  error?: string;
  report?: any;
  duration: number;
}

// Initialize compilers
const compiler = new ContentCompiler();
const optimizer = new ContentCompilerOptimizer();

// Handle messages from main thread
self.onmessage = (event: MessageEvent<CompileRequest>) => {
  const startTime = performance.now();
  const { id, content, optimize } = event.data;

  try {
    // Compile
    const ir = compiler.compile(content);

    // Optionally optimize
    let report: any = undefined;
    if (optimize) {
      report = optimizer.validate(ir);

      if (!report.valid) {
        throw new Error(`Validation failed: ${report.errors.map((e: any) => e.message).join(', ')}`);
      }
    }

    const duration = performance.now() - startTime;

    const response: CompileResponse = {
      id,
      success: true,
      ir,
      report,
      duration,
    };

    self.postMessage(response);
  } catch (error) {
    const duration = performance.now() - startTime;

    const response: CompileResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };

    self.postMessage(response);
  }
};

// Notify that worker is ready
self.postMessage({ type: 'ready' });
