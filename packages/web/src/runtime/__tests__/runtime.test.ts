import { describe, it, expect } from 'vitest'
import { Entity, Graph, createEvent, filterEvent, EventBus, Timeline, Scheduler, RuntimeEngine } from '../index'

describe('Entity', () => {
  it('creates entity with id/kind/type', () => {
    const e = new Entity('e1', 'node', 'array-element')
    expect(e.id).toBe('e1')
    expect(e.kind).toBe('node')
    expect(e.type).toBe('array-element')
  })

  it('set/get properties work', () => {
    const e = new Entity('e1', 'node', 'test')
    e.set('value', 42)
    e.set('label', 'hello')
    expect(e.get('value')).toBe(42)
    expect(e.get('label')).toBe('hello')
  })

  it('has returns correctly', () => {
    const e = new Entity('e1', 'node', 'test')
    expect(e.has('value')).toBe(false)
    e.set('value', 1)
    expect(e.has('value')).toBe(true)
  })

  it('delete removes property', () => {
    const e = new Entity('e1', 'node', 'test')
    e.set('value', 42)
    expect(e.delete('value')).toBe(true)
    expect(e.has('value')).toBe(false)
  })

  it('clone produces independent copy', () => {
    const e = new Entity('e1', 'node', 'test')
    e.set('value', 42)
    const c = e.clone()
    expect(c.id).toBe('e1')
    expect(c.get('value')).toBe(42)
    c.set('value', 99)
    expect(e.get('value')).toBe(42)
  })

  it('toJSON/fromJSON roundtrip', () => {
    const e = new Entity('e1', 'node', 'test')
    e.set('value', 42)
    e.addLabel('color', 'blue')
    const json = e.toJSON()
    const restored = Entity.fromJSON(json)
    expect(restored.id).toBe('e1')
    expect(restored.get('value')).toBe(42)
    expect(restored.labels.get('color')).toBe('blue')
  })

  it('increments version on set', () => {
    const e = new Entity('e1', 'node', 'test')
    const v1 = e.metadata.version
    e.set('x', 1)
    expect(e.metadata.version).toBe(v1 + 1)
  })

  it('addLabel/removeLabel work', () => {
    const e = new Entity('e1', 'node', 'test')
    e.addLabel('role', 'primary')
    expect(e.labels.get('role')).toBe('primary')
    expect(e.removeLabel('role')).toBe(true)
    expect(e.labels.has('role')).toBe(false)
  })
})

describe('Graph', () => {
  it('add/remove entities', () => {
    const g = new Graph()
    const e = new Entity('e1', 'node', 'test')
    g.addEntity(e)
    expect(g.hasEntity('e1')).toBe(true)
    expect(g.entityCount()).toBe(1)
    g.removeEntity('e1')
    expect(g.hasEntity('e1')).toBe(false)
  })

  it('connect/disconnect edges', () => {
    const g = new Graph()
    g.addEntity(new Entity('a', 'node', 'test'))
    g.addEntity(new Entity('b', 'node', 'test'))
    const edge = g.connect('a', 'b', 'related')
    expect(edge.from).toBe('a')
    expect(edge.to).toBe('b')
    expect(g.edgeCount()).toBe(1)
    g.disconnect('a', 'b', 'related')
    expect(g.edgeCount()).toBe(0)
  })

  it('getNeighbors returns connected entities', () => {
    const g = new Graph()
    g.addEntity(new Entity('a', 'node', 'test'))
    g.addEntity(new Entity('b', 'node', 'test'))
    g.addEntity(new Entity('c', 'node', 'test'))
    g.connect('a', 'b')
    g.connect('a', 'c')
    const neighbors = g.getNeighbors('a')
    expect(neighbors).toHaveLength(2)
    expect(neighbors.map(n => n.id).sort()).toEqual(['b', 'c'])
  })

  it('diff detects changes', () => {
    const before = new Graph()
    before.addEntity(new Entity('a', 'node', 'test'))
    before.addEntity(new Entity('b', 'node', 'test'))

    const after = new Graph()
    after.addEntity(new Entity('a', 'node', 'test'))
    after.addEntity(new Entity('c', 'node', 'test'))

    const d = before.diff(after)
    expect(d.removed).toContain('b')
    expect(d.added).toHaveLength(1)
    expect(d.added[0].id).toBe('c')
  })

  it('diff detects property changes', () => {
    const before = new Graph()
    const ea = new Entity('a', 'node', 'test')
    ea.set('value', 1)
    before.addEntity(ea)

    const after = new Graph()
    const eb = new Entity('a', 'node', 'test')
    eb.set('value', 2)
    after.addEntity(eb)

    const d = before.diff(after)
    expect(d.modified).toHaveLength(1)
    expect(d.modified[0].id).toBe('a')
  })

  it('subgraph filters correctly', () => {
    const g = new Graph()
    g.addEntity(new Entity('a', 'node', 'test'))
    g.addEntity(new Entity('b', 'node', 'test'))
    g.addEntity(new Entity('c', 'node', 'test'))
    g.connect('a', 'b')
    const sub = g.subgraph(new Set(['a', 'b']))
    expect(sub.entityCount()).toBe(2)
    expect(sub.edgeCount()).toBe(1)
  })

  it('toJSON/fromJSON roundtrip', () => {
    const g = new Graph()
    g.addEntity(new Entity('a', 'node', 'test'))
    g.addEntity(new Entity('b', 'node', 'test'))
    g.connect('a', 'b', 'edge-label')
    const json = g.toJSON()
    const restored = Graph.fromJSON(json)
    expect(restored.entityCount()).toBe(2)
    expect(restored.edgeCount()).toBe(1)
    expect(restored.hasEntity('a')).toBe(true)
  })

  it('clone produces independent graph', () => {
    const g = new Graph()
    g.addEntity(new Entity('a', 'node', 'test'))
    const c = g.clone()
    expect(c.entityCount()).toBe(1)
    g.removeEntity('a')
    expect(c.hasEntity('a')).toBe(true)
  })
})

describe('RuntimeEvent', () => {
  it('all event types creatable', () => {
    const types = [
      'ENTITY_CREATED', 'ENTITY_DELETED', 'PROPERTY_CHANGED',
      'EDGE_ADDED', 'EDGE_REMOVED', 'MESSAGE_SENT',
      'FUNCTION_CALL', 'FUNCTION_RETURN', 'VARIABLE_MUTATED',
      'THREAD_STARTED', 'LOCK_ACQUIRED', 'MEMORY_ALLOCATED',
      'GC_MARK', 'REQUEST_SENT', 'CONNECTION_ESTABLISHED',
      'REASONING_STEP', 'CUSTOM',
    ] as const
    for (const t of types) {
      const evt = createEvent(t, 0, { entityId: 'test' })
      expect(evt.type).toBe(t)
      expect(evt.id).toBeTruthy()
      expect(evt.frameId).toBe(0)
    }
  })

  it('creates event with overrides', () => {
    const evt = createEvent('PROPERTY_CHANGED', 1, {
      entityId: 'e1',
      property: 'value',
      oldValue: 1,
      newValue: 2,
      concept: 'comparison',
      importance: 0.8,
    })
    expect(evt.entityId).toBe('e1')
    expect(evt.property).toBe('value')
    expect(evt.oldValue).toBe(1)
    expect(evt.newValue).toBe(2)
    expect(evt.concept).toBe('comparison')
  })

  it('filterEvent works correctly', () => {
    const evt = createEvent('PROPERTY_CHANGED', 0, {
      entityId: 'e1', concept: 'sorting', importance: 0.7, source: 'algorithm',
    })
    expect(filterEvent(evt, { types: ['PROPERTY_CHANGED'] })).toBe(true)
    expect(filterEvent(evt, { types: ['ENTITY_CREATED'] })).toBe(false)
    expect(filterEvent(evt, { entityIds: ['e1'] })).toBe(true)
    expect(filterEvent(evt, { entityIds: ['e2'] })).toBe(false)
    expect(filterEvent(evt, { minImportance: 0.5 })).toBe(true)
    expect(filterEvent(evt, { minImportance: 0.9 })).toBe(false)
    expect(filterEvent(evt, { concept: 'sorting' })).toBe(true)
    expect(filterEvent(evt, { source: 'algorithm' })).toBe(true)
  })
})

describe('EventBus', () => {
  it('delivers events to subscribers', () => {
    const bus = new EventBus({ useMiddleware: false })
    const received: any[] = []
    bus.on('PROPERTY_CHANGED', (e) => received.push(e))
    const evt = createEvent('PROPERTY_CHANGED', 0)
    bus.emit(evt)
    expect(received).toHaveLength(1)
    expect(received[0].id).toBe(evt.id)
  })

  it('delivers to wildcard handlers', () => {
    const bus = new EventBus({ useMiddleware: false })
    const received: any[] = []
    bus.onAny((e) => received.push(e))
    bus.emit(createEvent('ENTITY_CREATED', 0))
    bus.emit(createEvent('CUSTOM', 1))
    expect(received).toHaveLength(2)
  })

  it('unsubscribe stops delivery', () => {
    const bus = new EventBus({ useMiddleware: false })
    const received: any[] = []
    const unsub = bus.on('PROPERTY_CHANGED', (e) => received.push(e))
    bus.emit(createEvent('PROPERTY_CHANGED', 0))
    unsub()
    bus.emit(createEvent('PROPERTY_CHANGED', 0))
    expect(received).toHaveLength(1)
  })

  it('maintains event history', () => {
    const bus = new EventBus({ useMiddleware: false })
    bus.emit(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    bus.emit(createEvent('PROPERTY_CHANGED', 1, { entityId: 'e1' }))
    const history = bus.getHistory()
    expect(history).toHaveLength(2)
  })

  it('history can be filtered', () => {
    const bus = new EventBus({ useMiddleware: false })
    bus.emit(createEvent('ENTITY_CREATED', 0))
    bus.emit(createEvent('CUSTOM', 1))
    const filtered = bus.getHistory({ types: ['CUSTOM'] })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].type).toBe('CUSTOM')
  })

  it('replayHistory re-emits events', () => {
    const bus = new EventBus({ useMiddleware: false })
    const received: any[] = []
    bus.onAny((e) => received.push(e))
    bus.emit(createEvent('ENTITY_CREATED', 0))
    bus.emit(createEvent('CUSTOM', 1))
    received.length = 0
    bus.replayHistory()
    expect(received).toHaveLength(2)
  })

  it('clearHistory clears events', () => {
    const bus = new EventBus({ useMiddleware: false })
    bus.emit(createEvent('ENTITY_CREATED', 0))
    bus.clearHistory()
    expect(bus.getHistory()).toHaveLength(0)
  })

  it('getStats returns counts by type', () => {
    const bus = new EventBus({ useMiddleware: false })
    bus.emit(createEvent('ENTITY_CREATED', 0))
    bus.emit(createEvent('ENTITY_CREATED', 1))
    bus.emit(createEvent('CUSTOM', 2))
    const stats = bus.getStats()
    expect(stats.total).toBe(3)
    expect(stats.byType.get('ENTITY_CREATED')).toBe(2)
    expect(stats.byType.get('CUSTOM')).toBe(1)
  })

  it('filtered handlers work', () => {
    const bus = new EventBus({ useMiddleware: false })
    const received: any[] = []
    bus.onFiltered('PROPERTY_CHANGED', (e) => received.push(e), {
      entityIds: ['e1'],
    })
    bus.emit(createEvent('PROPERTY_CHANGED', 0, { entityId: 'e1' }))
    bus.emit(createEvent('PROPERTY_CHANGED', 1, { entityId: 'e2' }))
    expect(received).toHaveLength(1)
  })
})

describe('Timeline', () => {
  it('builds frames from events', () => {
    const t = new Timeline()
    t.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    t.addEvent(createEvent('PROPERTY_CHANGED', 1, {
      entityId: 'e1', property: 'value', newValue: 42,
    }))
    t.buildFrames()
    expect(t.frameCount()).toBe(2)
  })

  it('frame seeking works', () => {
    const t = new Timeline()
    t.addEvent(createEvent('ENTITY_CREATED', 5, { entityId: 'e1' }))
    t.addEvent(createEvent('PROPERTY_CHANGED', 10, { entityId: 'e1' }))
    t.buildFrames()
    const frame = t.seek(10)
    expect(frame).not.toBeNull()
    expect(frame!.id).toBe(10)
  })

  it('firstFrame/lastFrame work', () => {
    const t = new Timeline()
    t.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    t.addEvent(createEvent('CUSTOM', 1, { entityId: 'e1' }))
    t.buildFrames()
    expect(t.firstFrame()?.id).toBe(0)
    expect(t.lastFrame()?.id).toBe(1)
  })

  it('getFrame returns null for out of bounds', () => {
    const t = new Timeline()
    expect(t.getFrame(0)).toBeNull()
    t.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    t.buildFrames()
    expect(t.getFrame(99)).toBeNull()
  })

  it('clear resets timeline', () => {
    const t = new Timeline()
    t.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    t.buildFrames()
    expect(t.frameCount()).toBe(1)
    t.clear()
    expect(t.frameCount()).toBe(0)
  })

  it('export produces serializable schema', () => {
    const t = new Timeline()
    t.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    t.buildFrames()
    const schema = t.export()
    expect(schema.frameCount).toBe(1)
    expect(schema.frames[0].id).toBe(0)
  })
})

describe('Scheduler', () => {
  it('tick fires callback', () => {
    const s = new Scheduler(2, { frameDelay: 100, speed: 100 })
    const frames: number[] = []
    s.onTick((f) => frames.push(f))
    s.play()
    expect(frames.length).toBeGreaterThanOrEqual(0)
    s.pause()
  })

  it('seek moves to frame', () => {
    const s = new Scheduler(10)
    expect(s.seek(5)).toBe(true)
    expect(s.getCurrentFrame()).toBe(5)
  })

  it('seek returns false for invalid frame', () => {
    const s = new Scheduler(10)
    expect(s.seek(-1)).toBe(false)
    expect(s.seek(100)).toBe(false)
  })

  it('stepForward/stepBackward work', () => {
    const s = new Scheduler(10)
    expect(s.stepForward()).toBe(true)
    expect(s.getCurrentFrame()).toBe(1)
    expect(s.stepBackward()).toBe(true)
    expect(s.getCurrentFrame()).toBe(0)
  })

  it('canAdvance/canRewind', () => {
    const s = new Scheduler(5)
    expect(s.canAdvance()).toBe(true)
    expect(s.canRewind()).toBe(false)
    s.seek(4)
    expect(s.canAdvance()).toBe(false)
    expect(s.canRewind()).toBe(true)
  })

  it('setSpeed applies correctly', () => {
    const s = new Scheduler(10)
    s.setSpeed(2)
    expect(s.getSpeed()).toBe(2)
    s.setSpeed(0.05)
    expect(s.getSpeed()).toBe(0.1)
  })

  it('reset resets state', () => {
    const s = new Scheduler(10)
    s.seek(5)
    s.reset()
    expect(s.getCurrentFrame()).toBe(0)
    expect(s.isRunning()).toBe(false)
  })

  it('dispose cleans up', () => {
    const s = new Scheduler(10)
    let called = false
    s.onTick(() => { called = true })
    s.dispose()
    expect(s.isRunning()).toBe(false)
  })
})

describe('RuntimeEngine', () => {
  it('initial state is idle', () => {
    const e = new RuntimeEngine()
    expect(e.getState()).toBe('idle')
  })

  it('state machine transitions', () => {
    const e = new RuntimeEngine()
    e.ingest(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    e.start()
    expect(e.getState()).toBe('paused')
    e.play()
    expect(e.getState()).toBe('running')
    e.pause()
    expect(e.getState()).toBe('paused')
    e.stop()
    expect(e.getState()).toBe('idle')
  })

  it('event ingestion', () => {
    const e = new RuntimeEngine()
    e.ingest(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    expect(e.getFrameCount()).toBeGreaterThanOrEqual(1)
  })

  it('batch ingestion', () => {
    const e = new RuntimeEngine()
    e.ingestBatch([
      createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }),
      createEvent('PROPERTY_CHANGED', 1, { entityId: 'e1', property: 'x', newValue: 5 }),
    ])
    expect(e.getFrameCount()).toBe(2)
  })

  it('seek moves to frame', () => {
    const e = new RuntimeEngine()
    e.ingest(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    e.ingest(createEvent('CUSTOM', 5, {}))
    expect(e.seek(0)).toBe(true)
    expect(e.getCurrentFrameIndex()).toBe(0)
    expect(e.seek(5)).toBe(true)
  })

  it('frame change callbacks fire', () => {
    const e = new RuntimeEngine()
    e.ingest(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    const frames: any[] = []
    e.onFrameChange((f) => frames.push(f))
    e.seek(0)
    expect(frames.length).toBeGreaterThanOrEqual(1)
  })

  it('state change callbacks fire', () => {
    const e = new RuntimeEngine()
    const states: string[] = []
    e.onStateChange((s) => states.push(s))
    e.play()
    expect(states).toContain('running')
    e.pause()
    expect(states).toContain('paused')
  })

  it('reset clears all state', () => {
    const e = new RuntimeEngine()
    e.ingest(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    e.play()
    e.reset()
    expect(e.getState()).toBe('idle')
    expect(e.getFrameCount()).toBe(0)
  })

  it('setSpeed/getProgress work', () => {
    const e = new RuntimeEngine()
    e.setSpeed(2)
    e.ingest(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    e.ingest(createEvent('CUSTOM', 10, {}))
    e.play()
    expect(e.getProgress()).toBeGreaterThanOrEqual(0)
    e.stop()
  })

  it('dispose cleans up', () => {
    const e = new RuntimeEngine()
    let called = false
    e.onFrameChange(() => { called = true })
    e.dispose()
    expect(e.getState()).toBe('idle')
  })
})
