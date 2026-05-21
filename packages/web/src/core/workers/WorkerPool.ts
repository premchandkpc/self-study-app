// WorkerPool - Manages multiple Web Workers
// Coordinates off-main-thread work distribution

import { CompileRequest, CompileResponse } from './contentCompilerWorker';

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{
    request: CompileRequest;
    resolve: (response: CompileResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private pendingRequests = new Map<string, number>(); // id → workerIndex

  constructor(
    private workerCount: number = navigator.hardwareConcurrency || 4
  ) {
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(new URL('./contentCompilerWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (event) => {
        const { type } = event.data;

        if (type === 'ready') {
          // Worker ready, process queue
          this.processQueue(i);
          return;
        }

        // Assume it's a response
        const response = event.data as CompileResponse;
        this.handleResponse(i, response);
      };

      worker.onerror = (error) => {
        console.error(`Worker ${i} error:`, error);
        // Restart worker
        this.restartWorker(i);
      };

      this.workers.push(worker);
    }
  }

  async compile(
    request: CompileRequest,
    optimize: boolean = true
  ): Promise<CompileResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        request: { ...request, content: request.content },
        resolve,
        reject,
      });

      // Try to process immediately
      for (let i = 0; i < this.workers.length; i++) {
        if (!this.pendingRequests.has(`${i}`)) {
          this.processQueue(i);
          return;
        }
      }
    });
  }

  private processQueue(workerIndex: number): void {
    if (this.queue.length === 0) return;
    if (this.pendingRequests.has(`${workerIndex}`)) return;

    const item = this.queue.shift();
    if (!item) return;

    const { request, resolve, reject } = item;

    this.pendingRequests.set(request.id, workerIndex);

    try {
      this.workers[workerIndex].postMessage(request);

      // Timeout after 30s
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`Worker timeout for request ${request.id}`));
        }
      }, 30000);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleResponse(workerIndex: number, response: CompileResponse): void {
    this.pendingRequests.delete(response.id);

    // Find and resolve the promise
    const queueIndex = this.queue.findIndex((item) => item.request.id === response.id);
    if (queueIndex !== -1) {
      const { resolve, reject } = this.queue[queueIndex];
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Unknown error'));
      }
      this.queue.splice(queueIndex, 1);
    }

    // Process next in queue
    this.processQueue(workerIndex);
  }

  private restartWorker(index: number): void {
    this.workers[index].terminate();

    const worker = new Worker(new URL('./contentCompilerWorker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event) => {
      const response = event.data as CompileResponse;
      this.handleResponse(index, response);
    };

    this.workers[index] = worker;
  }

  terminate(): void {
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.queue = [];
    this.pendingRequests.clear();
  }

  getStats() {
    return {
      workerCount: this.workers.length,
      queueLength: this.queue.length,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Global instance
let globalPool: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool {
  if (!globalPool) {
    globalPool = new WorkerPool();
  }
  return globalPool;
}
