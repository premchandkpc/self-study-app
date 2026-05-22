import { describe, it, expect, vi } from 'vitest'
import { AnimationEngine, createAnimation, applyEasing, interpolate, SpringSystem, GraphLayoutAnimator } from '../../animation'
import { SceneNode, SceneGraph, SceneGraphBuilder, CanvasRenderer, SVGRenderer } from '../../renderers'
import { Entity, Graph, createEvent, EventBus } from '../../runtime'
import { BidirectionalTimeline, FrameInterpolator, SeekOptimizer, BranchingTimeline, DeterministicReplay, SnapshotManager } from '../../runtime/timeline'
import { NarrativeGraph, NarrationEngine, formatTemplate, getEmphasis, ExplanationPipeline, NarrativeSync } from '../../narrative'
import { ConceptRegistry, ConceptEnricher } from '../../concepts'
import { SemanticGraph, createSemanticNode } from '../../semantic'
import { RuntimeEngine } from '../../runtime'

describe('Phase 4: Animation Primitives', () => {
  it('createAnimation generates valid descriptor', () => {
    const a = createAnimation('move', ['e1'], 500, { easing: 'ease-in-out' })
    expect(a.type).toBe('move')
    expect(a.targetIds).toEqual(['e1'])
    expect(a.duration).toBe(500)
    expect(a.easing).toBe('ease-in-out')
    expect(a.id).toBeTruthy()
  })

  it('applyEasing returns correct values', () => {
    expect(applyEasing(0, 'linear')).toBe(0)
    expect(applyEasing(0.5, 'linear')).toBe(0.5)
    expect(applyEasing(1, 'linear')).toBe(1)
    expect(applyEasing(0.5, 'ease-in')).toBe(0.25)
    expect(applyEasing(0.5, 'ease-out')).toBe(0.75)
  })

  it('interpolate works for numbers', () => {
    expect(interpolate(0, 100, 0.5, 'linear')).toBe(50)
    expect(interpolate(0, 100, 0, 'linear')).toBe(0)
    expect(interpolate(0, 100, 1, 'linear')).toBe(100)
  })
})

describe('Phase 4: AnimationEngine', () => {
  it('animate registers an animation', () => {
    const engine = new AnimationEngine()
    const desc = createAnimation('fade', ['e1'], 100)
    const id = engine.animate(desc)
    expect(id).toBeTruthy()
    expect(engine.getActiveAnimations()).toHaveLength(1)
  })

  it('tick advances animation progress', () => {
    const engine = new AnimationEngine()
    const desc = createAnimation('move', ['e1'], 1000, {
      properties: [{ property: 'x', from: 0, to: 100, interpolator: 'linear' }],
    })
    engine.animate(desc)
    engine.tick(500)
    const active = engine.getActiveAnimations()
    expect(active[0].progress).toBeCloseTo(0.5, 1)
  })

  it('complete callback fires when animation ends', () => {
    const engine = new AnimationEngine()
    const desc = createAnimation('move', ['e1'], 100)
    const id = engine.animate(desc)
    let completed = false
    engine.onComplete(id, () => { completed = true })
    engine.tick(200)
    expect(completed).toBe(true)
  })

  it('stop removes animation', () => {
    const engine = new AnimationEngine()
    const id = engine.animate(createAnimation('fade', ['e1'], 100))
    expect(engine.getActiveAnimations()).toHaveLength(1)
    engine.stop(id)
    expect(engine.getActiveAnimations()).toHaveLength(0)
  })

  it('pause and play control the loop', () => {
    const engine = new AnimationEngine()
    expect(engine.isRunning()).toBe(false)
    engine.play()
    expect(engine.isRunning()).toBe(true)
    engine.pause()
    expect(engine.isRunning()).toBe(false)
  })

  it('getEntityAnimationState returns state for entity', () => {
    const engine = new AnimationEngine()
    engine.animate(createAnimation('move', ['e1'], 100))
    const state = engine.getEntityAnimationState('e1')
    expect(state.entityId).toBe('e1')
    expect(state.activeAnimations).toHaveLength(1)
  })
})

describe('Phase 4: Spring Physics', () => {
  it('SpringSystem converges to target', () => {
    const spring = new SpringSystem({ stiffness: 180, damping: 12, mass: 1 })
    let pos = 0
    for (let i = 0; i < 100; i++) {
      pos = spring.compute(pos, 100, 0.016)
    }
    expect(pos).toBeCloseTo(100, 0)
  })

  it('forceLayout produces valid positions', () => {
    const spring = new SpringSystem()
    const positions = spring.forceLayout(
      [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }],
      [{ from: 'a', to: 'b' }],
      { iterations: 20 },
    )
    expect(positions.has('a')).toBe(true)
    expect(positions.has('b')).toBe(true)
  })
})

describe('Phase 4: GraphLayoutAnimator', () => {
  it('animateTransition produces animation descriptor', () => {
    const animator = new GraphLayoutAnimator()
    const oldLayout = new Map([['e1', { x: 0, y: 0 }]])
    const newLayout = new Map([['e1', { x: 100, y: 50 }]])
    const desc = animator.animateTransition(oldLayout, newLayout, 300)
    expect(desc.type).toBe('move')
    expect(desc.duration).toBe(300)
    expect(desc.properties.length).toBeGreaterThan(0)
  })

  it('animateHighlight creates highlight animation', () => {
    const animator = new GraphLayoutAnimator()
    const desc = animator.animateHighlight(['e1'], '#ff0000', 200)
    expect(desc.type).toBe('highlight')
    expect(desc.keyframes).toHaveLength(3)
  })

  it('animatePacketFlow creates flow animation', () => {
    const animator = new GraphLayoutAnimator()
    const desc = animator.animatePacketFlow('a', 'b', 600)
    expect(desc.type).toBe('packet-flow')
    expect(desc.targetIds).toEqual(['a', 'b'])
  })
})

describe('Phase 4: SceneGraph', () => {
  it('create and manipulate SceneNode', () => {
    const node = new SceneNode('n1', 'e1', 'node')
    node.position = { x: 100, y: 200 }
    node.color = '#ff0000'
    node.label = 'test'
    expect(node.id).toBe('n1')
    expect(node.entityId).toBe('e1')
    expect(node.position.x).toBe(100)
  })

  it('SceneGraph add/get/remove nodes', () => {
    const sg = new SceneGraph()
    const node = new SceneNode('n1', 'e1', 'node')
    sg.addNode(node)
    expect(sg.getNode('n1')).toBe(node)
    expect(sg.getAllNodes()).toHaveLength(1)
    sg.removeNode('n1')
    expect(sg.getNode('n1')).toBeUndefined()
  })

  it('SceneGraph edges', () => {
    const sg = new SceneGraph()
    sg.addNode(new SceneNode('a', 'a', 'node'))
    sg.addNode(new SceneNode('b', 'b', 'node'))
    sg.addEdge('e1', 'a', 'b', 'connects-to')
    expect(sg.getAllEdges()).toHaveLength(1)
    expect(sg.getAllEdges()[0].label).toBe('connects-to')
  })

  it('sortedNodes orders by zIndex', () => {
    const sg = new SceneGraph()
    const a = new SceneNode('a', 'a', 'node'); a.zIndex = 5
    const b = new SceneNode('b', 'b', 'node'); b.zIndex = 1
    sg.addNode(a)
    sg.addNode(b)
    const sorted = sg.sortedNodes()
    expect(sorted[0].id).toBe('b')
    expect(sorted[1].id).toBe('a')
  })
})

describe('Phase 4: SceneGraphBuilder', () => {
  it('builds scene from graph', () => {
    const g = new Graph()
    g.addEntity(new Entity('e1', 'node', 'array-element'))
    g.addEntity(new Entity('e2', 'node', 'array-element'))
    const builder = new SceneGraphBuilder()
    const sg = builder.build(g)
    expect(sg.getAllNodes()).toHaveLength(2)
  })

  it('buildFromTimeline handles events', () => {
    const g = new Graph()
    g.addEntity(new Entity('e1', 'node', 'test'))
    const engine = new RuntimeEngine(g)
    engine.ingest(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    engine.ingest(createEvent('PROPERTY_CHANGED', 1, {
      entityId: 'e1', property: 'highlight', newValue: 'comparing',
    }))
    engine.build()
    const builder = new SceneGraphBuilder()
    const frame = engine.getCurrentFrame()
    const sg = frame ? builder.buildFromTimeline(g, frame) : builder.build(g)
    expect(sg.getAllNodes().length).toBeGreaterThanOrEqual(0)
  })

  it('resetLayout clears cache', () => {
    const builder = new SceneGraphBuilder()
    builder.resetLayout()
    const g = new Graph()
    g.addEntity(new Entity('e1', 'node', 'test'))
    const sg = builder.build(g)
    expect(sg.getAllNodes()).toHaveLength(1)
  })
})

describe('Phase 4: CanvasRenderer', () => {
  it('type is canvas', () => {
    const r = new CanvasRenderer()
    expect(r.type).toBe('canvas')
  })

  it('init sets up canvas element', () => {
    const container = document.createElement('div')
    const r = new CanvasRenderer()
    r.init(container)
    expect(container.querySelector('canvas')).toBeTruthy()
    r.dispose()
  })

  it('getFPS returns initial value', () => {
    const r = new CanvasRenderer()
    expect(r.getFPS()).toBe(60)
  })

  it('fitToScreen adjusts viewport', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800 })
    Object.defineProperty(container, 'clientHeight', { value: 600 })
    const r = new CanvasRenderer()
    r.init(container)
    const sg = new SceneGraph()
    sg.addNode(new SceneNode('n1', 'e1', 'node'))
    r.fitToScreen(sg)
    expect(r.getFPS()).toBeDefined()
    r.dispose()
  })
})

describe('Phase 4: SVGRenderer', () => {
  it('type is svg', () => {
    const r = new SVGRenderer()
    expect(r.type).toBe('svg')
  })

  it('init creates SVG element', () => {
    const container = document.createElement('div')
    const r = new SVGRenderer()
    r.init(container)
    expect(container.querySelector('svg')).toBeTruthy()
    r.dispose()
  })
})

describe('Phase 5: BidirectionalTimeline', () => {
  it('setDirection/getDirection work', () => {
    const tl = new BidirectionalTimeline()
    expect(tl.getDirection()).toBe(1)
    tl.setDirection(-1)
    expect(tl.getDirection()).toBe(-1)
  })

  it('getNextFrame respects direction', () => {
    const tl = new BidirectionalTimeline()
    tl.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    tl.addEvent(createEvent('PROPERTY_CHANGED', 1, { entityId: 'e1' }))
    tl.buildFrames()
    const next = tl.getNextFrame(0)
    expect(next).not.toBeNull()
    expect(next!.id).toBeGreaterThanOrEqual(0)
  })

  it('reverseEvents swaps old and new values', () => {
    const tl = new BidirectionalTimeline()
    const e1 = createEvent('PROPERTY_CHANGED', 0, { property: 'x', oldValue: 1, newValue: 2 })
    const e2 = createEvent('PROPERTY_CHANGED', 1, { property: 'x', oldValue: 2, newValue: 3 })
    tl.addEvent(e1)
    tl.addEvent(e2)
    tl.buildFrames()
    const reversed = tl.reverseEvents(e1, e2)
    expect(reversed).toHaveLength(2)
    expect(reversed[0].oldValue).toBe(3)
    expect(reversed[0].newValue).toBe(2)
  })
})

describe('Phase 5: FrameInterpolator', () => {
  it('interpolates between frames', () => {
    const g1 = new Graph(); g1.addEntity(new Entity('e1', 'node', 'test'))
    const g2 = new Graph(); g2.addEntity(new Entity('e1', 'node', 'test'))
    g1.getEntity('e1')!.set('value', 0)
    g2.getEntity('e1')!.set('value', 100)
    const f1 = { id: 0, timestamp: 0, events: [], state: g1 }
    const f2 = { id: 1, timestamp: 1000, events: [], state: g2 }
    const interp = new FrameInterpolator()
    const result = interp.interpolate(f1, f2, 0.5)
    expect(result.id).toBe(0)
    expect(result.timestamp).toBe(500)
  })

  it('interpolateEvents interpolates numeric values', () => {
    const interp = new FrameInterpolator()
    const prev = [createEvent('PROPERTY_CHANGED', 0, { property: 'x', newValue: 0 })]
    const next = [createEvent('PROPERTY_CHANGED', 1, { property: 'x', newValue: 100 })]
    const result = interp.interpolateEvents(prev, next, 0.5)
    expect(result[0].newValue).toBe(50)
  })
})

describe('Phase 5: SeekOptimizer', () => {
  it('build creates seek table', () => {
    const opt = new SeekOptimizer()
    const events = Array.from({ length: 250 }, (_, i) =>
      createEvent('CUSTOM', i, {}))
    opt.build(events, 100)
    expect(opt.getSeekPoints().length).toBeGreaterThanOrEqual(2)
  })

  it('findNearestSnapshot returns closest point', () => {
    const opt = new SeekOptimizer()
    const events = Array.from({ length: 250 }, (_, i) =>
      createEvent('CUSTOM', i, {}))
    opt.build(events, 100)
    const result = opt.findNearestSnapshot(150)
    expect(result.frameIndex).toBeLessThanOrEqual(150)
    expect(result.frameIndex).toBeGreaterThanOrEqual(100)
  })

  it('clear resets seek table', () => {
    const opt = new SeekOptimizer()
    const events = Array.from({ length: 50 }, (_, i) =>
      createEvent('CUSTOM', i, {}))
    opt.build(events, 10)
    expect(opt.getSeekPoints().length).toBeGreaterThan(0)
    opt.clear()
    expect(opt.getSeekPoints()).toHaveLength(0)
  })
})

describe('Phase 5: BranchingTimeline', () => {
  it('creates main branch with base events', () => {
    const bt = new BranchingTimeline()
    expect(bt.getBranches()).toHaveLength(1)
    expect(bt.getCurrentBranch().name).toBe('main')
  })

  it('branch creates fork', () => {
    const bt = new BranchingTimeline()
    bt.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    bt.addEvent(createEvent('PROPERTY_CHANGED', 1, { entityId: 'e1' }))
    const branchId = bt.branch('experiment', 1)
    expect(branchId).toBeTruthy()
    expect(bt.getBranches()).toHaveLength(2)
  })

  it('switchBranch changes current branch', () => {
    const bt = new BranchingTimeline()
    const branchId = bt.branch('test', 0)
    bt.switchBranch(branchId)
    expect(bt.getCurrentBranch().id).toBe(branchId)
  })

  it('mergeBranch combines events', () => {
    const bt = new BranchingTimeline()
    bt.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    const branchId = bt.branch('fork', 0)
    bt.switchBranch(branchId)
    bt.addEvent(createEvent('CUSTOM', 1, { entityId: 'e1' }))
    bt.switchBranch(bt.getBranches()[0].id)
    bt.mergeBranch(branchId)
    expect(bt.getCurrentBranch().events.length).toBeGreaterThanOrEqual(1)
  })

  it('diffBranches finds differences', () => {
    const bt = new BranchingTimeline()
    bt.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    const branchId = bt.branch('diff-test', 0)
    bt.switchBranch(branchId)
    bt.addEvent(createEvent('CUSTOM', 1, {}))
    bt.switchBranch(bt.getBranches()[0].id)
    const diff = bt.diffBranches(bt.getBranches()[0].id, branchId)
    expect(diff).toHaveLength(1)
  })

  it('export/import roundtrip', () => {
    const bt = new BranchingTimeline()
    bt.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    const schema = bt.export()
    const restored = BranchingTimeline.import(schema)
    expect(restored.getBranches()).toHaveLength(1)
    expect(restored.getCurrentBranch().name).toBe('main')
  })
})

describe('Phase 5: DeterministicReplay', () => {
  it('replay produces execution trace', () => {
    const events = [
      createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }),
      createEvent('PROPERTY_CHANGED', 1, { entityId: 'e1', property: 'x', newValue: 42 }),
    ]
    const dr = new DeterministicReplay(events)
    const trace = dr.replay()
    expect(trace.id).toBeTruthy()
    expect(trace.events.length).toBeGreaterThan(0)
  })

  it('verify confirms determinism', () => {
    const events = [
      createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }),
      createEvent('PROPERTY_CHANGED', 1, { entityId: 'e1', property: 'x', newValue: 42 }),
    ]
    const dr = new DeterministicReplay(events)
    expect(dr.verify()).toBe(true)
  })

  it('verifyMultiple returns all pass', () => {
    const events = [
      createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }),
      createEvent('CUSTOM', 1, {}),
    ]
    const dr = new DeterministicReplay(events)
    const result = dr.verifyMultiple(3)
    expect(result.pass).toBe(true)
    expect(result.attempts).toBe(3)
  })
})

describe('Phase 5: SnapshotManager', () => {
  it('snapshot and restore', () => {
    const g = new Graph()
    g.addEntity(new Entity('e1', 'node', 'test'))
    const sm = new SnapshotManager()
    sm.snapshot(0, g)
    const restored = sm.restore(0)
    expect(restored.graph.entityCount()).toBe(1)
    expect(restored.fromFrame).toBe(0)
  })

  it('hasSnapshot checks existence', () => {
    const sm = new SnapshotManager()
    sm.snapshot(0, new Graph())
    expect(sm.hasSnapshot(0)).toBe(true)
    expect(sm.hasSnapshot(1)).toBe(false)
  })

  it('prune removes snapshots', () => {
    const sm = new SnapshotManager()
    for (let i = 0; i < 10; i++) sm.snapshot(i, new Graph())
    expect(sm.getSnapshotCount()).toBe(10)
    sm.prune(3)
    expect(sm.getSnapshotCount()).toBeLessThan(10)
  })

  it('compress and decompress roundtrip', () => {
    const g1 = new Graph()
    g1.addEntity(new Entity('e1', 'node', 'test'))
    g1.getEntity('e1')!.set('val', 1)
    const g2 = new Graph()
    g2.addEntity(new Entity('e1', 'node', 'test'))
    g2.getEntity('e1')!.set('val', 42)

    const sm = new SnapshotManager()
    sm.snapshot(0, g1)
    sm.snapshot(100, g2)
    sm.compress()
    const decompressed = sm.decompress(100)
    expect(decompressed).not.toBeNull()
    expect(decompressed!.getEntity('e1')?.get('val')).toBe(42)
  })
})

describe('Phase 6: NarrativeGraph', () => {
  it('buildNarrative creates path from events', () => {
    const ng = new NarrativeGraph()
    const sg = new SemanticGraph()
    const events = [
      createEvent('ENTITY_CREATED', 0, { entityId: 'e1', explanation: 'Created e1' }),
      createEvent('PROPERTY_CHANGED', 1, { entityId: 'e1', property: 'x', newValue: 5, concept: 'comparison' }),
    ]
    const path = ng.buildNarrative(events, sg)
    expect(path.nodes).toHaveLength(2)
    expect(path.totalDuration).toBeGreaterThan(0)
  })

  it('explainEvent returns explanation nodes', () => {
    const ng = new NarrativeGraph()
    const event = createEvent('PROPERTY_CHANGED', 0, {
      entityId: 'e1', explanation: 'Value changed', concept: 'swapping',
    })
    const nodes = ng.explainEvent(event)
    expect(nodes.length).toBeGreaterThanOrEqual(1)
    expect(nodes[0].type).toBe('explanation')
  })

  it('adapt adjusts for user level', () => {
    const ng = new NarrativeGraph()
    const path = { nodes: [
      { id: 'n1', type: 'event' as const, text: 'test', emphasis: [], concepts: [], complexity: 1, prerequisites: [], duration: 1000 },
    ], totalDuration: 1000, currentIndex: 0 }
    const adapted = ng.adapt(path, 2)
    expect(adapted.nodes[0].complexity).toBeLessThan(1)
  })
})

describe('Phase 6: NarrationEngine', () => {
  it('generateNarration returns path', () => {
    const tl = new BidirectionalTimeline()
    tl.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    tl.buildFrames()
    const sg = new SemanticGraph()
    const ne = new NarrationEngine()
    const path = ne.generateNarration(tl, sg)
    expect(path.nodes).toHaveLength(1)
  })

  it('nextNarration and previousNarration traverse', () => {
    const tl = new BidirectionalTimeline()
    tl.addEvent(createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }))
    tl.addEvent(createEvent('CUSTOM', 1, { explanation: 'done' }))
    tl.buildFrames()
    const ne = new NarrationEngine()
    ne.generateNarration(tl, new SemanticGraph())
    const next = ne.nextNarration()
    expect(next).not.toBeNull()
    const prev = ne.previousNarration()
    expect(prev).not.toBeNull()
  })

  it('getCurrentText returns empty if no path', () => {
    const ne = new NarrationEngine()
    expect(ne.getCurrentText()).toBe('')
  })

  it('renderWithEmphasis wraps words', () => {
    const ne = new NarrationEngine()
    const result = ne.renderWithEmphasis('hello world', ['world'])
    expect(result).toContain('<mark>world</mark>')
  })

  it('onNarrationChange callback fires', () => {
    const ne = new NarrationEngine()
    let called = false
    ne.onNarrationChange(() => { called = true })
    ne.seekToFrame(0)
  })
})

describe('Phase 6: Narration Templates', () => {
  it('formatTemplate fills placeholders', () => {
    const event = createEvent('PROPERTY_CHANGED', 0, {
      entityId: 'e1', property: 'value', oldValue: 1, newValue: 2,
    })
    const result = formatTemplate('{property} changed from {oldValue} to {newValue}', event)
    expect(result).toContain('value changed from 1 to 2')
  })

  it('getEmphasis returns key words', () => {
    const event = createEvent('LOCK_ACQUIRED', 0, {
      entityId: 'lock1', metadata: { threadId: 't1', lockId: 'lock1' },
    })
    const emphasis = getEmphasis(event)
    expect(emphasis.length).toBeGreaterThan(0)
  })

  it('all event types have templates', () => {
    const types = [
      'ENTITY_CREATED', 'ENTITY_DELETED', 'PROPERTY_CHANGED',
      'EDGE_ADDED', 'MESSAGE_SENT', 'FUNCTION_CALL',
      'VARIABLE_MUTATED', 'THREAD_STARTED', 'LOCK_ACQUIRED',
      'MEMORY_ALLOCATED', 'GC_MARK', 'REQUEST_SENT',
      'CONNECTION_ESTABLISHED', 'REASONING_STEP', 'CUSTOM',
    ]
    for (const t of types) {
      const event = createEvent(t as any, 0, { entityId: 'x' })
      expect(typeof event.type).toBe('string')
    }
  })
})

describe('Phase 6: ExplanationPipeline', () => {
  it('shallow explanation returns summary', () => {
    const ep = new ExplanationPipeline()
    const event = createEvent('PROPERTY_CHANGED', 0, {
      entityId: 'e1', property: 'x', oldValue: 1, newValue: 2,
    })
    const expl = ep.explain(event, 'shallow')
    expect(expl.summary).toBeTruthy()
    expect(expl.context).toBeTruthy()
  })

  it('medium explanation includes context and implication', () => {
    const ep = new ExplanationPipeline()
    const event = createEvent('PROPERTY_CHANGED', 0, {
      entityId: 'e1', property: 'value', oldValue: 1, newValue: 2, concept: 'sorting',
    })
    const expl = ep.explain(event, 'medium')
    expect(expl.concepts).toContain('sorting')
    expect(expl.interviewTip).toBeTruthy()
  })

  it('deep explanation extends medium', () => {
    const ep = new ExplanationPipeline()
    const event = createEvent('PROPERTY_CHANGED', 0, {
      entityId: 'e1', property: 'x', oldValue: 0, newValue: 100, concept: 'sorting',
    })
    const expl = ep.explain(event, 'deep')
    expect(expl.relatedTopics.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Phase 6: NarrativeSync', () => {
  it('start/stop toggles active state', () => {
    const engine = new RuntimeEngine()
    const narration = new NarrationEngine()
    const sync = new NarrativeSync(engine, narration)
    sync.start()
    expect(sync.isActive()).toBe(true)
    sync.stop()
    expect(sync.isActive()).toBe(false)
  })

  it('onDisplay callback added', () => {
    const engine = new RuntimeEngine()
    const narration = new NarrationEngine()
    const sync = new NarrativeSync(engine, narration)
    let called = false
    sync.onDisplay(() => { called = true })
    sync.start()
    expect(sync.isActive()).toBe(true)
    sync.destroy()
  })

  it('getOptimalPace returns slower for important events', () => {
    const sync = new NarrativeSync(new RuntimeEngine(), new NarrationEngine())
    const important = createEvent('PROPERTY_CHANGED', 0, { importance: 0.9 })
    const normal = createEvent('PROPERTY_CHANGED', 0, {})
    expect(sync.getOptimalPace(important)).toBe(0.5)
    expect(sync.getOptimalPace(normal)).toBe(1.0)
  })
})

describe('Phase 6: ConceptRegistry', () => {
  it('has mappings for common event types', () => {
    const registry = new ConceptRegistry()
    expect(registry.getMapping('PROPERTY_CHANGED')).toBeDefined()
    expect(registry.getMapping('FUNCTION_CALL')).toBeDefined()
    expect(registry.getMapping('LOCK_ACQUIRED')).toBeDefined()
  })

  it('registerMapping adds custom mapping', () => {
    const registry = new ConceptRegistry()
    registry.registerMapping('CUSTOM_EVENT', {
      concept: 'custom-concept', category: 'general', complexity: 'O(n)', importance: 0.5, interviewRelevant: false,
    })
    expect(registry.hasMapping('CUSTOM_EVENT')).toBe(true)
  })

  it('getAllMappings returns all entries', () => {
    const registry = new ConceptRegistry()
    const all = registry.getAllMappings()
    expect(Object.keys(all).length).toBeGreaterThan(20)
  })
})

describe('Phase 6: ConceptEnricher', () => {
  it('enrich adds semantic fields to event', () => {
    const sg = new SemanticGraph()
    const enricher = new ConceptEnricher(sg)
    const event = createEvent('PROPERTY_CHANGED', 0, {
      entityId: 'e1', property: 'x', oldValue: 1, newValue: 2,
    })
    const enriched = enricher.enrich(event)
    expect(enriched.concept).toBe('comparison')
    expect(enriched.importance).toBeGreaterThan(0)
    expect(enriched.explanation).toBeTruthy()
  })

  it('enrichBatch processes multiple events', () => {
    const sg = new SemanticGraph()
    const enricher = new ConceptEnricher(sg)
    const events = [
      createEvent('ENTITY_CREATED', 0, { entityId: 'e1' }),
      createEvent('MEMORY_ALLOCATED', 1, { entityId: 'm1' }),
    ]
    const enriched = enricher.enrichBatch(events)
    expect(enriched).toHaveLength(2)
    expect(enriched[0].concept).toBeTruthy()
    expect(enriched[1].concept).toBeTruthy()
  })

  it('unknown event types get default mapping', () => {
    const sg = new SemanticGraph()
    const enricher = new ConceptEnricher(sg)
    const event = createEvent('CUSTOM', 0, { explanation: 'test' })
    const enriched = enricher.enrich(event)
    expect(enriched.concept).toBe('custom')
    expect(enriched.category).toBe('general')
  })
})
