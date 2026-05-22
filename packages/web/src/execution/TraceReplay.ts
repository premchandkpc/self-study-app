import type { ExecutionTrace, ExecutionFrame, VariableState, HeapObject } from './Frame'
import type { ExecutionSnapshot } from './TraceRecorder'
import type { RuntimeEvent } from '../runtime/events/Event'

export class TraceReplay {
  private trace: ExecutionTrace
  private currentStep: number = 0
  private reconstructedVariables: Map<string, VariableState> = new Map()
  private reconstructedHeap: Map<string, HeapObject> = new Map()
  private reconstructedStack: ExecutionFrame[] = []

  constructor(trace: ExecutionTrace) {
    this.trace = trace
    this._rebuild(0)
  }

  nextStep(): ExecutionSnapshot {
    if (this.currentStep >= this.trace.events.length - 1) {
      return this.snapshot()
    }
    this.currentStep++
    this._applyEvent(this.trace.events[this.currentStep])
    return this.snapshot()
  }

  previousStep(): ExecutionSnapshot {
    if (this.currentStep <= 0) {
      this._rebuild(0)
      return this.snapshot()
    }
    this.currentStep--
    this._rebuild(this.currentStep)
    return this.snapshot()
  }

  seekToFrame(frameIndex: number): ExecutionSnapshot {
    const idx = Math.max(0, Math.min(frameIndex, this.trace.events.length - 1))
    this.currentStep = idx
    this._rebuild(idx)
    return this.snapshot()
  }

  getVariables(): Map<string, VariableState> {
    return new Map(this.reconstructedVariables)
  }

  getCallStack(): ExecutionFrame[] {
    return [...this.reconstructedStack]
  }

  getHeapState(): Map<string, HeapObject> {
    return new Map(this.reconstructedHeap)
  }

  reconstructState(atFrame: number): ExecutionSnapshot {
    this.seekToFrame(atFrame)
    return this.snapshot()
  }

  private _rebuild(upToIndex: number): void {
    this.reconstructedVariables = new Map()
    this.reconstructedHeap = new Map()
    this.reconstructedStack = []

    for (let i = 0; i <= upToIndex; i++) {
      this._applyEvent(this.trace.events[i])
    }
  }

  private _applyEvent(event: RuntimeEvent): void {
    if (!event) return

    switch (event.type) {
      case 'VARIABLE_MUTATED':
        if (event.property) {
          this.reconstructedVariables.set(event.property, {
            name: event.property,
            type: 'primitive',
            value: event.newValue,
            previousValue: event.oldValue as VariableState['previousValue'],
            scope: 'local',
            immutable: false,
          })
        }
        break
      case 'MEMORY_ALLOCATED':
        if (event.entityId) {
          this.reconstructedHeap.set(event.entityId, {
            id: event.entityId,
            type: (event.metadata?.type as string) ?? 'unknown',
            fields: new Map(),
            references: [],
            referencedBy: [],
            size: (event.metadata?.size as number) ?? 0,
            allocationSite: event.explanation ?? '',
          })
        }
        break
      case 'MEMORY_FREED':
        if (event.entityId) {
          this.reconstructedHeap.delete(event.entityId)
        }
        break
      case 'FUNCTION_CALL':
        if (event.entityId) {
          const frame: ExecutionFrame = {
            id: `reconstructed_${event.id}`,
            functionName: event.entityId,
            lineNumber: 0,
            variables: new Map(),
            stack: [],
            heap: new Map(),
            startedAt: event.timestamp,
            childFrames: [],
          }
          this.reconstructedStack.push(frame)
        }
        break
      case 'FUNCTION_RETURN':
        this.reconstructedStack.pop()
        break
      case 'STACK_PUSHED':
        if (event.entityId) {
          const sf: ExecutionFrame = {
            id: `stack_${event.id}`,
            functionName: event.entityId,
            lineNumber: 0,
            variables: new Map(),
            stack: [],
            heap: new Map(),
            startedAt: event.timestamp,
            childFrames: [],
          }
          this.reconstructedStack.push(sf)
        }
        break
      case 'STACK_POPPED':
        this.reconstructedStack.pop()
        break
    }
  }

  snapshot(): ExecutionSnapshot {
    return {
      frameIndex: this.currentStep,
      variables: Array.from(this.reconstructedVariables.values()),
      callStack: [...this.reconstructedStack],
      heap: Array.from(this.reconstructedHeap.values()),
      lastEvent: this.trace.events[this.currentStep] ?? null,
    }
  }
}
