let _idCounter = 0
function nextId(): string { return `o_${++_idCounter}` }

export type R2Category = 'primitive' | 'collection' | 'structure' | 'architecture' | 'system' | 'visual' | 'compiler'

export interface R2State {
  props: Record<string, unknown>
  x: number; y: number
  w: number; h: number
  color: string
  visible: boolean
  labels: string[]
  opacity: number
  zIndex: number
}

export class R2Object {
  id: string
  type: string
  category: R2Category
  state: R2State
  children: R2Object[] = []
  parent: R2Object | null = null
  connections: string[] = [] // connection ids

  constructor(type: string, category: R2Category, initialState?: Partial<R2State>) {
    this.id = nextId()
    this.type = type
    this.category = category
    this.state = {
      props: {},
      x: 0, y: 0, w: 60, h: 40,
      color: '#3b82f6',
      visible: true,
      labels: [],
      opacity: 1,
      zIndex: 0,
      ...initialState,
    }
  }

  get<T = unknown>(key: string): T | undefined { return this.state.props[key] as T }
  set(key: string, val: unknown): this { this.state.props[key] = val; return this }
  label(text: string): this { this.state.labels.push(text); return this }
  pos(x: number, y: number): this { this.state.x = x; this.state.y = y; return this }
  size(w: number, h: number): this { this.state.w = w; this.state.h = h; return this }
  color_(c: string): this { this.state.color = c; return this }

  addChild(child: R2Object): this {
    child.parent = this
    this.children.push(child)
    return this
  }

  toJSON() {
    return { id: this.id, type: this.type, category: this.category, state: this.state, children: this.children.map(c => c.id) }
  }
}
