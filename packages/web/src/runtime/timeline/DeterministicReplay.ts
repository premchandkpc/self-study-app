import type { RuntimeEvent } from '../events/Event'
import { TraceRecorder, type ExecutionTrace } from '../../execution/TraceRecorder'
import { EventBus } from '../events/EventBus'

export class DeterministicReplay {
  private eventLog: RuntimeEvent[]
  private replaySeed: number
  private replayCount: number = 0

  constructor(events: RuntimeEvent[]) {
    this.eventLog = [...events]
    this.replaySeed = Date.now()
  }

  replay(): ExecutionTrace {
    const bus = new EventBus({ useMiddleware: false })
    const recorder = new TraceRecorder(bus)
    const deterministicEvents = this._sortDeterministically(this.eventLog)
    recorder.startTrace(`replay-${this.replayCount++}`)
    for (const event of deterministicEvents) {
      recorder.recordEvent(event)
    }
    return recorder.endTrace()
  }

  verify(): boolean {
    const trace1 = this.replay()
    const trace2 = this.replay()
    return this.compareTraces(trace1, trace2)
  }

  compareTraces(a: ExecutionTrace, b: ExecutionTrace): boolean {
    if (a.events.length !== b.events.length) return false
    for (let i = 0; i < a.events.length; i++) {
      const ae = a.events[i], be = b.events[i]
      if (ae.type !== be.type) return false
      if (ae.frameId !== be.frameId) return false
      if (JSON.stringify(ae.newValue) !== JSON.stringify(be.newValue)) return false
      if (JSON.stringify(ae.oldValue) !== JSON.stringify(be.oldValue)) return false
      if (ae.entityId !== be.entityId) return false
    }
    return true
  }

  verifyMultiple(times: number = 5): { pass: boolean; attempts: number; failures: number } {
    let failures = 0
    const baseline = this.replay()
    for (let i = 1; i < times; i++) {
      const trace = this.replay()
      if (!this.compareTraces(baseline, trace)) failures++
    }
    return { pass: failures === 0, attempts: times, failures }
  }

  private _sortDeterministically(events: RuntimeEvent[]): RuntimeEvent[] {
    return [...events].sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
      if (a.frameId !== b.frameId) return a.frameId - b.frameId
      return a.id.localeCompare(b.id)
    })
  }
}
