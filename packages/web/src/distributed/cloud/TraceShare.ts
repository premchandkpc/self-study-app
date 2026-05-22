import type { Frame } from '../runtime/timeline'

export interface TraceShareResult {
  url: string
  shareId: string
  createdAt: number
}

export class TraceShare {
  private traces: Map<string, { trace: { id: string; events: unknown[] }; createdAt: number }>

  constructor() {
    this.traces = new Map()
  }

  async shareTrace(trace: { id: string; events: unknown[] }): Promise<string> {
    const shareId = `trace-${trace.id}-${Date.now()}`
    this.traces.set(shareId, { trace, createdAt: Date.now() })
    return shareId
  }

  async loadTrace(shareId: string): Promise<{ id: string; events: unknown[] } | null> {
    return this.traces.get(shareId)?.trace ?? null
  }

  async streamTrace(_shareId: string, _onFrame: (frame: Frame) => void): Promise<void> {
    throw new Error('Not implemented')
  }

  listTraces(): { shareId: string; createdAt: number }[] {
    return Array.from(this.traces.entries()).map(([shareId, data]) => ({
      shareId,
      createdAt: data.createdAt,
    }))
  }
}
