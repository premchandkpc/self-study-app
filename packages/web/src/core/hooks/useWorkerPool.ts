// Hook: useWorkerPool - Compile content off-main-thread
// Usage: const ir = await useWorkerPool().compile(content)

import { useCallback, useEffect, useRef } from 'react';
import { WorkerPool, getWorkerPool } from '../workers/WorkerPool';
import { CompileRequest, CompileResponse } from '../workers/contentCompilerWorker';
import { TechnologyContent } from '../ir/schema';

export function useWorkerPool() {
  const poolRef = useRef<WorkerPool | null>(null);

  useEffect(() => {
    poolRef.current = getWorkerPool();

    return () => {
      // Don't terminate global pool on unmount
    };
  }, []);

  const compile = useCallback(
    async (
      content: TechnologyContent,
      optimize: boolean = true
    ): Promise<CompileResponse> => {
      if (!poolRef.current) {
        throw new Error('Worker pool not initialized');
      }

      const request: CompileRequest = {
        id: `${Date.now()}-${Math.random()}`,
        content,
      };

      return poolRef.current.compile(request, optimize);
    },
    []
  );

  return {
    compile,
    getStats: () => poolRef.current?.getStats(),
  };
}
