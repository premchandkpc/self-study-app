export interface MetricPoint {
  timestamp: number
  value: number
}

export interface MetricSeries {
  name: string
  points: MetricPoint[]
  tags: Record<string, string>
}

export class RuntimeMetrics {
  private metrics: Map<string, MetricSeries>

  constructor() {
    this.metrics = new Map()
  }

  record(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, points: [], tags: tags ?? {} })
    }
    this.metrics.get(name)!.points.push({ timestamp: Date.now(), value })
  }

  getSeries(name: string, from?: number, to?: number): MetricPoint[] {
    const series = this.metrics.get(name)
    if (!series) return []
    let points = series.points
    if (from !== undefined) points = points.filter(p => p.timestamp >= from)
    if (to !== undefined) points = points.filter(p => p.timestamp <= to)
    return points
  }

  export(): Record<string, MetricSeries> {
    return Object.fromEntries(this.metrics)
  }

  clear(): void {
    this.metrics.clear()
  }
}

export class TracingInstrumentation {
  private spans: Map<string, Span>
  private traceTree: Map<string, Span[]>

  constructor() {
    this.spans = new Map()
    this.traceTree = new Map()
  }

  beginSpan(name: string, parentId?: string): string {
    const id = `span-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const span: Span = { id, name, startTime: Date.now(), endTime: 0, parentId }
    this.spans.set(id, span)
    if (parentId) {
      if (!this.traceTree.has(parentId)) this.traceTree.set(parentId, [])
      this.traceTree.get(parentId)!.push(span)
    }
    return id
  }

  endSpan(spanId: string): void {
    const span = this.spans.get(spanId)
    if (span) span.endTime = Date.now()
  }

  export(): TraceReport {
    return {
      spans: Array.from(this.spans.values()),
      tree: Object.fromEntries(this.traceTree),
    }
  }
}

export interface Span {
  id: string
  name: string
  startTime: number
  endTime: number
  parentId?: string
}

export interface TraceReport {
  spans: Span[]
  tree: Record<string, Span[]>
}
