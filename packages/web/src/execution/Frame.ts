export interface ExecutionFrame {
  id: string
  parentId?: string
  functionName: string
  file?: string
  lineNumber: number
  variables: Map<string, VariableState>
  stack: ExecutionFrame[]
  heap: Map<string, HeapObject>
  startedAt: number
  completedAt?: number
  childFrames: string[]
}

export interface VariableState {
  name: string
  type: 'primitive' | 'object' | 'array' | 'reference' | 'function'
  value: unknown
  previousValue?: unknown
  scope: 'local' | 'closure' | 'global' | 'this'
  immutable: boolean
}

export interface HeapObject {
  id: string
  type: string
  fields: Map<string, unknown>
  references: string[]
  referencedBy: string[]
  size: number
  allocationSite: string
}

export function createFrame(
  functionName: string,
  lineNumber: number,
  overrides?: Partial<ExecutionFrame>,
): ExecutionFrame {
  return {
    id: `frame_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    functionName,
    lineNumber,
    variables: new Map(),
    stack: [],
    heap: new Map(),
    startedAt: Date.now(),
    childFrames: [],
    ...overrides,
  }
}

export function createVariableState(
  name: string,
  value: unknown,
  overrides?: Partial<VariableState>,
): VariableState {
  return {
    name,
    type: _inferType(value),
    value,
    scope: 'local',
    immutable: false,
    ...overrides,
  }
}

function _inferType(val: unknown): VariableState['type'] {
  if (val === null || val === undefined) return 'primitive'
  if (typeof val === 'function') return 'function'
  if (Array.isArray(val)) return 'array'
  if (typeof val === 'object') return 'object'
  return 'primitive'
}

export function createHeapObject(
  id: string,
  type: string,
  overrides?: Partial<HeapObject>,
): HeapObject {
  return {
    id,
    type,
    fields: new Map(),
    references: [],
    referencedBy: [],
    size: 0,
    allocationSite: '',
    ...overrides,
  }
}

export interface VariableDiff {
  name: string
  oldValue: unknown
  newValue: unknown
  scope: string
}

export function diffVariables(
  before: Map<string, VariableState>,
  after: Map<string, VariableState>,
): VariableDiff[] {
  const diffs: VariableDiff[] = []
  for (const [name, state] of after) {
    const prev = before.get(name)
    if (!prev) {
      diffs.push({ name, oldValue: undefined, newValue: state.value, scope: state.scope })
    } else if (prev.value !== state.value) {
      diffs.push({ name, oldValue: prev.value, newValue: state.value, scope: state.scope })
    }
  }
  for (const [name, state] of before) {
    if (!after.has(name)) {
      diffs.push({ name, oldValue: state.value, newValue: undefined, scope: state.scope })
    }
  }
  return diffs
}
