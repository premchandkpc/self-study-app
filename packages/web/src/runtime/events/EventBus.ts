import type { RuntimeEvent, EventFilter } from './Event'
import { filterEvent } from './Event'
import { MiddlewarePipeline, validateMiddleware, enrichMiddleware } from './EventMiddleware'

export type EventHandler = (event: RuntimeEvent) => void
export type Unsubscribe = () => void

export interface EventBusOptions {
  maxHistory?: number
  asyncDispatch?: boolean
  useMiddleware?: boolean
}

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private wildcardHandlers: Set<EventHandler> = new Set()
  private history: RuntimeEvent[] = []
  private filteredHandlers: Map<string, { handler: EventHandler; filter: EventFilter }[]> = new Map()
  private readonly maxHistory: number
  private readonly asyncDispatch: boolean
  private readonly pipeline: MiddlewarePipeline
  private eventCount: number = 0

  constructor(options?: EventBusOptions) {
    this.maxHistory = options?.maxHistory ?? 10000
    this.asyncDispatch = options?.asyncDispatch ?? false
    this.pipeline = new MiddlewarePipeline()
    if (options?.useMiddleware !== false) {
      this.pipeline.use(validateMiddleware)
      this.pipeline.use(enrichMiddleware)
    }
  }

  on(type: string, handler: EventHandler): Unsubscribe {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  onAny(handler: EventHandler): Unsubscribe {
    this.wildcardHandlers.add(handler)
    return () => {
      this.wildcardHandlers.delete(handler)
    }
  }

  onFiltered(type: string, handler: EventHandler, filter: EventFilter): Unsubscribe {
    if (!this.filteredHandlers.has(type)) {
      this.filteredHandlers.set(type, [])
    }
    const entry = { handler, filter }
    this.filteredHandlers.get(type)!.push(entry)
    return () => {
      const entries = this.filteredHandlers.get(type)
      if (entries) {
        const idx = entries.indexOf(entry)
        if (idx >= 0) entries.splice(idx, 1)
      }
    }
  }

  use(mw: (event: RuntimeEvent, next: () => void) => void): () => void {
    return this.pipeline.use(mw)
  }

  removeAllMiddleware(): void {
    this.pipeline.removeAll()
  }

  emit(event: RuntimeEvent): void {
    this.eventCount++

    this.pipeline.run(event)

    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    const dispatch = () => {
      const typeHandlers = this.handlers.get(event.type)
      if (typeHandlers) {
        for (const handler of typeHandlers) {
          handler(event)
        }
      }

      const filtered = this.filteredHandlers.get(event.type)
      if (filtered) {
        for (const { handler, filter } of filtered) {
          if (filterEvent(event, filter)) {
            handler(event)
          }
        }
      }

      for (const handler of this.wildcardHandlers) {
        handler(event)
      }
    }

    if (this.asyncDispatch) {
      setTimeout(dispatch, 0)
    } else {
      dispatch()
    }
  }

  emitBatch(events: RuntimeEvent[]): void {
    for (const event of events) {
      this.emit(event)
    }
  }

  getHistory(filter?: EventFilter): RuntimeEvent[] {
    if (!filter) return [...this.history]
    return this.history.filter(e => filterEvent(e, filter))
  }

  getStats(): { total: number; byType: Map<string, number> } {
    const byType = new Map<string, number>()
    for (const event of this.history) {
      byType.set(event.type, (byType.get(event.type) ?? 0) + 1)
    }
    return { total: this.eventCount, byType }
  }

  clearHistory(): void {
    this.history = []
  }

  replayHistory(): void {
    const snapshot = [...this.history]
    for (const event of snapshot) {
      this.emit(event)
    }
  }

  removeAllListeners(): void {
    this.handlers.clear()
    this.wildcardHandlers.clear()
    this.filteredHandlers.clear()
  }

  listenerCount(): number {
    let count = this.wildcardHandlers.size
    for (const handlers of this.handlers.values()) {
      count += handlers.size
    }
    for (const entries of this.filteredHandlers.values()) {
      count += entries.length
    }
    return count
  }

  totalEvents(): number {
    return this.eventCount
  }
}
