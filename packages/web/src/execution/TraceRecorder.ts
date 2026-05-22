import type { RuntimeEvent } from '../runtime/events/Event'
import type { EventBus } from '../runtime/events/EventBus'
import type { ExecutionFrame, VariableState, HeapObject } from './Frame'
import { createFrame, createVariableState, createHeapObject } from './Frame'

export interface ExecutionTrace {
  id: string
  name: string
  frames: ExecutionFrame[]
  heap: Map<string, HeapObject>
  events: RuntimeEvent[]
  duration: number
  startedAt: number
  completedAt: number
}

export interface ExecutionSnapshot {
  frameIndex: number
  variables: VariableState[]
  callStack: ExecutionFrame[]
  heap: HeapObject[]
  lastEvent: RuntimeEvent | null
}

export class TraceRecorder {
  private frames: ExecutionFrame[] = []
  private currentFrame: ExecutionFrame | null = null
  private heapMap: Map<string, HeapObject> = new Map()
  private eventBus: EventBus
  private recordedEvents: RuntimeEvent[] = []
  private traceName: string = ''
  private startedAt: number = 0
  private completedAt: number = 0
  private frameStack: ExecutionFrame[] = []
  private variableHistory: Map<string, VariableState> = new Map()

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  startTrace(name: string): void {
    this.frames = []
    this.currentFrame = null
    this.heapMap = new Map()
    this.recordedEvents = []
    this.traceName = name
    this.startedAt = Date.now()
    this.completedAt = 0
    this.frameStack = []
    this.variableHistory = new Map()
  }

  endTrace(): ExecutionTrace {
    this.completedAt = Date.now()
    return {
      id: `trace_${this.startedAt}_${Math.random().toString(36).slice(2, 7)}`,
      name: this.traceName,
      frames: this.frames,
      heap: new Map(this.heapMap),
      events: [...this.recordedEvents],
      duration: this.completedAt - this.startedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    }
  }

  functionCall(func: string, args: unknown[] = []): void {
    const frame = createFrame(func, 0, {
      parentId: this.currentFrame?.id,
      variables: new Map(),
    })
    for (const v of this.variableHistory.values()) {
      frame.variables.set(v.name, { ...v })
    }
    this.currentFrame = frame
    this.frames.push(frame)
    this.frameStack.push(frame)
    for (let i = 0; i < args.length; i++) {
      const vs = createVariableState(`arg_${i}`, args[i], { scope: 'local' })
      frame.variables.set(vs.name, vs)
      this.variableHistory.set(vs.name, vs)
    }
  }

  functionReturn(result: unknown): void {
    const frame = this.frameStack.pop()
    if (frame) {
      frame.completedAt = Date.now()
      if (result !== undefined) {
        const vs = createVariableState('return', result, { scope: 'local' })
        frame.variables.set(vs.name, vs)
      }
      this.currentFrame = this.frameStack.length > 0
        ? this.frameStack[this.frameStack.length - 1]
        : null
    }
  }

  variableMutated(name: string, oldVal: unknown, newVal: unknown): void {
    const existing = this.variableHistory.get(name)
    const vs = createVariableState(name, newVal, {
      previousValue: oldVal,
      scope: existing?.scope ?? 'local',
    })
    this.variableHistory.set(name, vs)
    if (this.currentFrame) {
      this.currentFrame.variables.set(name, vs)
    }
  }

  variableCreated(name: string, val: unknown): void {
    const vs = createVariableState(name, val)
    this.variableHistory.set(name, vs)
    if (this.currentFrame) {
      this.currentFrame.variables.set(name, vs)
    }
  }

  variableDeleted(name: string): void {
    this.variableHistory.delete(name)
    for (const frame of this.frames) {
      frame.variables.delete(name)
    }
  }

  objectAllocated(obj: HeapObject): void {
    this.heapMap.set(obj.id, obj)
  }

  objectFreed(id: string): void {
    this.heapMap.delete(id)
    for (const obj of this.heapMap.values()) {
      const idx = obj.references.indexOf(id)
      if (idx >= 0) obj.references.splice(idx, 1)
      const ridx = obj.referencedBy.indexOf(id)
      if (ridx >= 0) obj.referencedBy.splice(ridx, 1)
    }
  }

  referenceChanged(from: string, to: string, added: boolean): void {
    const obj = this.heapMap.get(from)
    if (!obj) return
    if (added) {
      if (!obj.references.includes(to)) obj.references.push(to)
      const target = this.heapMap.get(to)
      if (target && !target.referencedBy.includes(from)) {
        target.referencedBy.push(from)
      }
    } else {
      obj.references = obj.references.filter(r => r !== to)
      const target = this.heapMap.get(to)
      if (target) {
        target.referencedBy = target.referencedBy.filter(r => r !== from)
      }
    }
  }

  stackPush(frame: ExecutionFrame): void {
    this.frameStack.push(frame)
    this.frames.push(frame)
    this.currentFrame = frame
  }

  stackPop(): ExecutionFrame | null {
    const frame = this.frameStack.pop() ?? null
    this.currentFrame = this.frameStack.length > 0
      ? this.frameStack[this.frameStack.length - 1]
      : null
    return frame
  }

  recordEvent(event: RuntimeEvent): void {
    this.recordedEvents.push(event)
    this.eventBus.emit(event)

    if (event.type === 'VARIABLE_MUTATED' && event.property && event.oldValue !== undefined) {
      this.variableMutated(event.property, event.oldValue, event.newValue)
    }
    if (event.type === 'MEMORY_ALLOCATED' && event.entityId) {
      this.objectAllocated(createHeapObject(event.entityId, event.metadata?.type as string ?? 'unknown', {
        size: (event.metadata?.size as number) ?? 0,
        allocationSite: event.explanation ?? '',
      }))
    }
    if (event.type === 'MEMORY_FREED' && event.entityId) {
      this.objectFreed(event.entityId)
    }
    if (event.type === 'FUNCTION_CALL' && event.entityId) {
      this.functionCall(event.entityId, event.metadata?.args as unknown[] ?? [])
    }
    if (event.type === 'FUNCTION_RETURN') {
      this.functionReturn(event.newValue)
    }
  }

  getCurrentVariables(): Map<string, VariableState> {
    return new Map(this.variableHistory)
  }

  getCallStack(): ExecutionFrame[] {
    return [...this.frameStack]
  }

  getHeapState(): Map<string, HeapObject> {
    return new Map(this.heapMap)
  }

  getFrameHistory(): ExecutionFrame[] {
    return [...this.frames]
  }

  snapshot(): ExecutionSnapshot {
    return {
      frameIndex: this.frames.length,
      variables: Array.from(this.variableHistory.values()),
      callStack: [...this.frameStack],
      heap: Array.from(this.heapMap.values()),
      lastEvent: this.recordedEvents[this.recordedEvents.length - 1] ?? null,
    }
  }

  clear(): void {
    this.frames = []
    this.currentFrame = null
    this.heapMap = new Map()
    this.recordedEvents = []
    this.frameStack = []
    this.variableHistory = new Map()
    this.traceName = ''
  }
}
