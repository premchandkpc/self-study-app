# Phase 8: Web Workers for Algorithm Execution

**Goal**: Run heavy algorithms in background threads. UI stays responsive.

**Duration**: 1-2 weeks

---

## Problem: Blocking Main Thread

```
User clicks "Sort 10,000 elements"
  ↓
Main thread runs algorithm
  ↓
Browser freezes for 2+ seconds
  ↓
User experience: laggy, unresponsive
```

---

## Solution: Web Workers

```
Main Thread (UI)
  ↓ (message)
Worker Thread (Algorithm)
  ↓ (generates events)
  Back to Main Thread
  ↓
Render (responsive)
```

---

## Implementation

### 1. Algorithm Worker

```typescript
// src/workers/algorithmWorker.ts
// Runs in background thread

import { bubbleSortEvents } from '@/core/algorithms/bubbleSort'
import { quickSortEvents } from '@/core/algorithms/quickSort'
import { SemanticEvent } from '@/core/runtime'

type AlgorithmType = 'bubbleSort' | 'quickSort' | 'mergeSort' | 'heapSort'

interface WorkerMessage {
  id: string
  algorithm: AlgorithmType
  data: any
}

// Listen for messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, algorithm, data } = event.data
  
  try {
    let events: SemanticEvent[]
    
    switch (algorithm) {
      case 'bubbleSort':
        events = bubbleSortEvents(data)
        break
      case 'quickSort':
        events = quickSortEvents(data)
        break
      case 'mergeSort':
        events = mergeSortEvents(data)
        break
      case 'heapSort':
        events = heapSortEvents(data)
        break
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`)
    }
    
    // Send events back to main thread
    self.postMessage({
      id,
      status: 'success',
      events,
      timestamp: Date.now()
    })
  } catch (error) {
    self.postMessage({
      id,
      status: 'error',
      error: (error as Error).message
    })
  }
}
```

### 2. Worker Manager

```typescript
// src/core/workers/WorkerManager.ts
export interface WorkerTask {
  id: string
  algorithm: string
  data: any
  onComplete?: (events: SemanticEvent[]) => void
  onError?: (error: Error) => void
  timeout?: number
}

export class WorkerManager {
  private worker: Worker | null = null
  private tasks: Map<string, WorkerTask> = new Map()
  private taskTimeouts: Map<string, NodeJS.Timeout> = new Map()
  
  constructor(workerPath: string = '/workers/algorithmWorker.js') {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      this.worker = new Worker(workerPath)
      this.worker.onmessage = this.handleMessage.bind(this)
      this.worker.onerror = this.handleError.bind(this)
    }
  }
  
  async runAlgorithm(task: WorkerTask): Promise<SemanticEvent[]> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Web Workers not supported'))
        return
      }
      
      this.tasks.set(task.id, {
        ...task,
        onComplete: (events) => {
          task.onComplete?.(events)
          resolve(events)
        },
        onError: (error) => {
          task.onError?.(error)
          reject(error)
        }
      })
      
      // Set timeout
      const timeout = task.timeout ?? 30000 // 30s default
      const timeoutId = setTimeout(() => {
        this.tasks.delete(task.id)
        reject(new Error('Algorithm execution timeout'))
      }, timeout)
      
      this.taskTimeouts.set(task.id, timeoutId)
      
      // Send to worker
      this.worker.postMessage({
        id: task.id,
        algorithm: task.algorithm,
        data: task.data
      })
    })
  }
  
  private handleMessage(event: MessageEvent): void {
    const { id, status, events, error } = event.data
    const task = this.tasks.get(id)
    
    if (!task) return
    
    // Clear timeout
    const timeoutId = this.taskTimeouts.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.taskTimeouts.delete(id)
    }
    
    this.tasks.delete(id)
    
    if (status === 'success') {
      task.onComplete?.(events)
    } else {
      task.onError?.(new Error(error))
    }
  }
  
  private handleError(event: ErrorEvent): void {
    console.error('Worker error:', event.error)
  }
  
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

// Singleton instance
export const workerManager = new WorkerManager()
```

### 3. React Hook

```typescript
// src/core/hooks/useWorkerAlgorithm.ts
export interface UseWorkerAlgorithmOptions {
  algorithm: string
  data: any
  onComplete?: (events: SemanticEvent[]) => void
  onError?: (error: Error) => void
}

export function useWorkerAlgorithm(options: UseWorkerAlgorithmOptions) {
  const [events, setEvents] = useState<SemanticEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await workerManager.runAlgorithm({
        id: crypto.randomUUID(),
        algorithm: options.algorithm,
        data: options.data,
        timeout: 60000 // 1 minute
      })
      
      setEvents(result)
      options.onComplete?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      options.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [options])
  
  return { events, loading, error, run }
}
```

### 4. Component Integration

```typescript
// src/components/visualizers/WorkerAwareVisualizer.tsx
interface WorkerAwareVisualizerProps {
  algorithm: 'bubbleSort' | 'quickSort' | 'mergeSort' | 'heapSort'
  data: number[]
}

export function WorkerAwareVisualizer({
  algorithm,
  data
}: WorkerAwareVisualizerProps) {
  const { events, loading, error, run } = useWorkerAlgorithm({
    algorithm,
    data
  })
  
  const engine = useVisualizationEngine({ events })
  
  useEffect(() => {
    run()
  }, [algorithm, data, run])
  
  if (loading) {
    return <div className="loading">Computing algorithm...</div>
  }
  
  if (error) {
    return <div className="error">Error: {error.message}</div>
  }
  
  if (events.length === 0) {
    return <div>No events generated</div>
  }
  
  return (
    <MultiLayerVisualizer
      title={`${algorithm} (${data.length} elements)`}
      events={events}
    />
  )
}
```

### 5. Multiple Workers (Thread Pool)

For concurrent algorithms:

```typescript
// src/core/workers/WorkerPool.ts
export class WorkerPool {
  private workers: Worker[] = []
  private tasks: Map<string, WorkerTask> = new Map()
  private queue: WorkerTask[] = []
  
  constructor(poolSize: number = 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker('/workers/algorithmWorker.js')
      worker.onmessage = this.handleMessage.bind(this)
      this.workers.push(worker)
    }
  }
  
  async runAlgorithm(task: WorkerTask): Promise<SemanticEvent[]> {
    return new Promise((resolve, reject) => {
      this.tasks.set(task.id, {
        ...task,
        onComplete: (events) => resolve(events),
        onError: (error) => reject(error)
      })
      
      this.queue.push(task)
      this.processQueue()
    })
  }
  
  private processQueue(): void {
    if (this.queue.length === 0) return
    
    const availableWorker = this.findAvailableWorker()
    if (!availableWorker) return
    
    const task = this.queue.shift()
    if (task) {
      availableWorker.postMessage({
        id: task.id,
        algorithm: task.algorithm,
        data: task.data
      })
    }
  }
  
  private findAvailableWorker(): Worker | null {
    // Simple round-robin
    return this.workers[0] // Simplified
  }
  
  private handleMessage(event: MessageEvent): void {
    const { id, status, events, error } = event.data
    const task = this.tasks.get(id)
    
    if (task) {
      if (status === 'success') {
        task.onComplete?.(events)
      } else {
        task.onError?.(new Error(error))
      }
    }
    
    this.tasks.delete(id)
    this.processQueue()
  }
  
  terminate(): void {
    this.workers.forEach(w => w.terminate())
    this.workers = []
  }
}
```

---

## Webpack Configuration

```javascript
// webpack.config.js (if using webpack)
module.exports = {
  // ... other config
  entry: {
    main: './src/index.ts',
    algorithmWorker: './src/workers/algorithmWorker.ts'
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.worker\.ts$/,
        use: { loader: 'worker-loader' }
      },
      // ... other loaders
    ]
  }
}
```

Or with Vite:
```typescript
// vite.config.ts
export default {
  worker: {
    format: 'es'
  }
}
```

---

## Usage Example

```typescript
// Component usage
function SortingDemo() {
  const largeArray = Array.from({ length: 10000 }, () => 
    Math.floor(Math.random() * 1000)
  )
  
  return (
    <WorkerAwareVisualizer
      algorithm="quickSort"
      data={largeArray}
    />
  )
}
```

**Result**: Algorithm runs in background, UI stays responsive! 🎉

---

## Completion Checklist

- [ ] Worker file created
- [ ] WorkerManager implemented
- [ ] useWorkerAlgorithm hook working
- [ ] Component integrated
- [ ] Error handling complete
- [ ] Timeout working
- [ ] Multiple workers optional pool
- [ ] Performance tested
- [ ] Fallback for browsers without Workers

---

## Success Criteria

✅ **10k element sort doesn't freeze UI**  
✅ **Progress indicator works while computing**  
✅ **User can still click buttons**  
✅ **Results appear seamlessly when ready**  
✅ **Errors handled gracefully**  

---

## Next Phase (Phase 9)

Plugin system for third-party visualizers.
