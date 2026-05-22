import { describe, it, expect, vi } from 'vitest'
import { KnowledgeGraph, DEFAULT_CONCEPT_GRAPH, CONCEPT_RELATIONSHIPS, buildDefaultKnowledgeGraph } from '../../knowledge'
import type { KnowledgeNode } from '../../knowledge'
import { EmbeddingSystem, InMemoryVectorIndex, RAGPipeline, AdaptiveEngine, ScenarioGenerator, InterviewGenerator, OpenAIProvider, LocalProvider } from '../../ai'
import { DSLParser } from '../../dsl'
import { WebSocketTransport, HTTPTransport } from '../../protocols/transport'
import { SimulationServer } from '../../../server/SimulationServer'
import { InMemoryStorage } from '../../../server/storage/InMemoryStorage'
import { PluginRegistry, PluginLoader, SandboxedPlugin, KafkaDomainPlugin, ThreeJSRendererPlugin, ParticleAnimationPlugin, GPTNarrativePlugin } from '../../plugins'
import type { Plugin, PluginType } from '../../plugins'
import { LWWRegister, ORSet, ConflictResolver, MultiplayerRuntime, TraceShare, CloudReplay, DebugSession, SimulationOrchestrator, RuntimeMetrics, TracingInstrumentation } from '../../distributed'
import { PeerSync, EventOrdering } from '../../distributed'
import { RuntimeEngine } from '../../runtime'
import { Graph, Entity } from '../../runtime'

describe('Phase 7: KnowledgeGraph', () => {
  it('addConcept and getConcept work', () => {
    const kg = new KnowledgeGraph()
    const node: KnowledgeNode = { id: 'test', name: 'Test', description: 'A test concept', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] }
    kg.addConcept(node)
    expect(kg.getConcept('test')).toBe(node)
    expect(kg.getConcept('nonexistent')).toBeUndefined()
  })

  it('addRelationship and traversal work', () => {
    const kg = new KnowledgeGraph()
    const a: KnowledgeNode = { id: 'a', name: 'A', description: '', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] }
    const b: KnowledgeNode = { id: 'b', name: 'B', description: '', category: 'data-structure', difficulty: 2, importance: 0.5, interviewFrequency: 0.5, prerequisites: ['a'], relatedConcepts: [] }
    kg.addConcept(a); kg.addConcept(b)
    kg.addRelationship('a', 'b', 'prerequisite')
    const prereqs = kg.getPrerequisites('b')
    expect(prereqs).toHaveLength(1)
    expect(prereqs[0].id).toBe('a')
  })

  it('getLearningPath finds path', () => {
    const kg = new KnowledgeGraph()
    const a: KnowledgeNode = { id: 'a', name: 'A', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] }
    const b: KnowledgeNode = { id: 'b', name: 'B', category: 'algorithm', difficulty: 2, importance: 0.5, interviewFrequency: 0.5, prerequisites: ['a'], relatedConcepts: [] }
    const c: KnowledgeNode = { id: 'c', name: 'C', category: 'algorithm', difficulty: 3, importance: 0.5, interviewFrequency: 0.5, prerequisites: ['b'], relatedConcepts: [] }
    kg.addConcept(a); kg.addConcept(b); kg.addConcept(c)
    kg.addRelationship('a', 'b', 'prerequisite')
    kg.addRelationship('b', 'c', 'prerequisite')
    const path = kg.getLearningPath('a', 'c')
    expect(path.length).toBeGreaterThanOrEqual(2)
  })

  it('search returns relevant results', () => {
    const kg = new KnowledgeGraph()
    const { nodes } = buildDefaultKnowledgeGraph()
    for (const n of nodes) kg.addConcept(n)
    const results = kg.search('sort', 5)
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.name.toLowerCase().includes('sort'))).toBe(true)
  })

  it('semanticSearch with embeddings', () => {
    const kg = new KnowledgeGraph()
    const node: KnowledgeNode = { id: 'test', name: 'Test', description: 'A test', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [], embedding: [0.1, 0.2, 0.3] }
    kg.addConcept(node)
    const results = kg.semanticSearch([0.1, 0.2, 0.3], 5)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('test')
  })

  it('generateScenario creates scenario', () => {
    const kg = new KnowledgeGraph()
    const node: KnowledgeNode = { id: 'quick-sort', name: 'Quick Sort', description: 'A sorting algorithm', category: 'algorithm', difficulty: 2, importance: 0.9, interviewFrequency: 0.9, prerequisites: ['arrays'], relatedConcepts: ['merge-sort'] }
    kg.addConcept(node)
    const scenario = kg.generateScenario('quick-sort')
    expect(scenario.title).toContain('Quick Sort')
    expect(scenario.questions).toHaveLength(1)
  })

  it('generateInterviewQuestions returns 3 questions', () => {
    const kg = new KnowledgeGraph()
    const node: KnowledgeNode = { id: 'bst', name: 'BST', description: 'Binary search tree', category: 'data-structure', difficulty: 2, importance: 0.8, interviewFrequency: 0.8, prerequisites: ['binary-tree'], relatedConcepts: ['avl-tree'] }
    kg.addConcept(node)
    const questions = kg.generateInterviewQuestions('bst')
    expect(questions).toHaveLength(3)
    expect(questions[0].type).toBe('coding')
    expect(questions[1].type).toBe('conceptual')
    expect(questions[2].type).toBe('system-design')
  })

  it('generateLesson creates lesson plan', () => {
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'dfs', name: 'DFS', description: 'Depth-first search traversal', category: 'algorithm', difficulty: 2, importance: 0.8, interviewFrequency: 0.8, prerequisites: ['graph-ds'], relatedConcepts: ['bfs'] })
    const lesson = kg.generateLesson('dfs')
    expect(lesson.title).toBe('DFS')
    expect(lesson.sections).toHaveLength(3)
    expect(lesson.quiz).toHaveLength(1)
  })

  it('export/import roundtrip', () => {
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'test', name: 'Test', description: '', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    kg.addRelationship('test', 'test', 'related-to')
    const schema = kg.export()
    const restored = KnowledgeGraph.import(schema)
    expect(restored.getConcept('test')).toBeDefined()
    expect(restored.search('test')).toHaveLength(1)
  })

  it('defaultConceptGraph has many concepts', () => {
    expect(DEFAULT_CONCEPT_GRAPH.length).toBeGreaterThan(70)
    expect(CONCEPT_RELATIONSHIPS.length).toBeGreaterThan(60)
  })
})

describe('Phase 7: EmbeddingSystem', () => {
  it('embedText produces vector', async () => {
    const es = new EmbeddingSystem()
    const vec = await es.embedText('hello world')
    expect(vec.length).toBe(128)
    expect(vec.every(v => typeof v === 'number')).toBe(true)
  })

  it('embedConcept works', async () => {
    const es = new EmbeddingSystem()
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'test', name: 'Test', description: 'Testing', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    const vec = await es.embedConcept(kg.getConcept('test')!)
    expect(vec.length).toBe(128)
  })

  it('indexConcepts and semanticSearch', async () => {
    const es = new EmbeddingSystem()
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'sort', name: 'Sorting', description: 'Sorting algorithms', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    kg.addConcept({ id: 'graph', name: 'Graph', description: 'Graph traversal', category: 'algorithm', difficulty: 2, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    await es.indexConcepts(kg)
    const results = await es.semanticSearch('sorting', 5)
    expect(results.length).toBeGreaterThan(0)
  })

  it('InMemoryVectorIndex add/search', () => {
    const idx = new InMemoryVectorIndex()
    idx.add('a', [1, 0, 0], { name: 'A' })
    idx.add('b', [0, 1, 0], { name: 'B' })
    idx.add('c', [0, 0, 1], { name: 'C' })
    const results = idx.search([1, 0, 0], 2)
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('a')
  })
})

describe('Phase 7: RAGPipeline', () => {
  it('query returns response with concepts', async () => {
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'sort', name: 'Sorting', description: 'arranging elements', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    const es = new EmbeddingSystem()
    const rag = new RAGPipeline(kg, es)
    const response = await rag.query('How does sorting work?')
    expect(response.answer).toBeTruthy()
    expect(response.confidence).toBeGreaterThan(0)
  })

  it('query with context includes events', async () => {
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'test-concept', name: 'Test Concept', description: 'a test concept', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    const es = new EmbeddingSystem()
    await es.indexConcepts(kg)
    const rag = new RAGPipeline(kg, es)
    const response = await rag.query('test concept', { conceptId: 'test-concept', userLevel: 2 })
    expect(response.relevantConcepts).toContain('test-concept')
  })
})

describe('Phase 7: AdaptiveEngine', () => {
  it('adapt detects weak areas', () => {
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'math', name: 'Math', description: '', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    kg.addConcept({ id: 'science', name: 'Science', description: '', category: 'algorithm', difficulty: 2, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    const engine = new AdaptiveEngine(kg)
    const result = engine.adapt({
      mastery: 0.5,
      averageTime: 1000,
      events: [{ concept: 'math', accuracy: 0.3, time: 2000 }],
    })
    expect(result.suggestedReview).toContain('math')
    expect(result.narrationDepth).toBe('shallow')
  })

  it('adapt increases difficulty on high mastery', () => {
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'easy', name: 'Easy', description: '', category: 'algorithm', difficulty: 1, importance: 0.5, interviewFrequency: 0.5, prerequisites: [], relatedConcepts: [] })
    const engine = new AdaptiveEngine(kg)
    const result = engine.adapt({
      mastery: 0.95,
      averageTime: 500,
      events: [{ concept: 'easy', accuracy: 1.0, time: 100 }],
    })
    expect(result.narrationDepth).toBe('deep')
  })

  it('getUserProfile returns current state', () => {
    const engine = new AdaptiveEngine(new KnowledgeGraph())
    expect(engine.getUserProfile().level).toBe(1)
  })
})

describe('Phase 7: ScenarioGenerator', () => {
  it('generate creates scenario from concept', async () => {
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'bubble-sort', name: 'Bubble Sort', description: 'Simple sorting algorithm', category: 'algorithm', difficulty: 1, importance: 0.6, interviewFrequency: 0.5, prerequisites: ['arrays'], relatedConcepts: ['insertion-sort'], visualType: 'array' })
    const gen = new ScenarioGenerator(kg)
    const scenario = await gen.generate('bubble-sort', 1)
    expect(scenario.title).toContain('Bubble Sort')
    expect(scenario.initialState.entities.length).toBeGreaterThanOrEqual(1)
    expect(scenario.events.length).toBeGreaterThanOrEqual(1)
  })

  it('generate throws for unknown concept', async () => {
    const gen = new ScenarioGenerator(new KnowledgeGraph())
    await expect(gen.generate('nonexistent', 1)).rejects.toThrow()
  })
})

describe('Phase 7: InterviewGenerator', () => {
  it('generateQuestions returns questions', () => {
    const kg = new KnowledgeGraph()
    kg.addConcept({ id: 'hash-map', name: 'Hash Map', description: 'Key-value store', category: 'data-structure', difficulty: 2, importance: 0.9, interviewFrequency: 0.9, prerequisites: ['arrays'], relatedConcepts: ['hash-set'] })
    const gen = new InterviewGenerator(kg)
    const questions = gen.generateQuestions('hash-map', 2)
    expect(questions).toHaveLength(2)
    expect(questions[0].question).toContain('Hash Map')
  })

  it('returns empty for unknown concept', () => {
    const gen = new InterviewGenerator(new KnowledgeGraph())
    expect(gen.generateQuestions('missing', 3)).toHaveLength(0)
  })
})

describe('Phase 7: AI Providers', () => {
  it('OpenAIProvider has correct structure', () => {
    const provider = new OpenAIProvider('test-key')
    expect(typeof provider.generate).toBe('function')
    expect(typeof provider.stream).toBe('function')
  })

  it('LocalProvider has correct structure', () => {
    const provider = new LocalProvider()
    expect(typeof provider.generate).toBe('function')
    expect(typeof provider.stream).toBe('function')
  })
})

describe('Phase 8: DSLParser', () => {
  it('parse creates graph from definition', () => {
    const parser = new DSLParser()
    const simDef = {
      id: 'test-sim', name: 'Test', description: '', version: '1.0', domain: 'custom' as const,
      initialState: [{ id: 'e1', kind: 'node', type: 'test', properties: { value: 42 } }],
      producers: [], timeline: {}, narration: { enabled: true },
    }
    const result = parser.parse(simDef)
    expect(result.graph.entityCount()).toBe(1)
    expect(result.graph.getEntity('e1')?.get('value')).toBe(42)
  })

  it('validate catches missing fields', () => {
    const parser = new DSLParser()
    const result = parser.validate({ id: '', name: '', description: '', version: '1.0', domain: '' as any, initialState: [], producers: [], timeline: {} })
    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThanOrEqual(3)
  })

  it('validate warns on empty initialState', () => {
    const parser = new DSLParser()
    const result = parser.validate({ id: 'x', name: 'x', description: '', version: '1.0', domain: 'custom', initialState: [], producers: [], timeline: {} })
    expect(result.valid).toBe(true)
    expect(result.issues.some(i => i.severity === 'warning')).toBe(true)
  })
})

describe('Phase 8: WebSocketTransport', () => {
  it('connect fails gracefully', async () => {
    const transport = new WebSocketTransport('ws://localhost:1')
    await expect(transport.connect()).rejects.toThrow()
  })

  it('disconnect is safe when not connected', () => {
    const transport = new WebSocketTransport('ws://localhost:1')
    expect(() => transport.disconnect()).not.toThrow()
  })
})

describe('Phase 8: HTTPTransport', () => {
  it('loadSimulation fails with server error', async () => {
    const transport = new HTTPTransport('http://localhost:1/api')
    await expect(transport.loadSimulation('test')).rejects.toThrow()
  })

  it('listSimulations fails gracefully', async () => {
    const transport = new HTTPTransport('http://localhost:1/api')
    await expect(transport.listSimulations()).rejects.toThrow()
  })
})

describe('Phase 8: SimulationServer', () => {
  it('handleConnect and disconnect', () => {
    const server = new SimulationServer()
    server.handleConnect('client1')
    server.handleConnect('client2')
    server.handleDisconnect('client1')
    expect(server.getActiveSimulations()).toHaveLength(0)
  })

  it('handleLoad creates runtime', () => {
    const server = new SimulationServer()
    const def = server.handleLoad('client1', 'sim1')
    expect(def.id).toBe('sim1')
    expect(server.getRuntime('sim1')).toBeDefined()
  })

  it('handleAction returns frame', () => {
    const server = new SimulationServer()
    server.handleLoad('client1', 'sim1')
    const frame = server.handleAction('client1', 'sim1', 'PLAY')
    expect(frame).not.toBeNull()
    expect(frame!.frameId).toBeDefined()
  })
})

describe('Phase 8: InMemoryStorage', () => {
  it('save and load simulation', async () => {
    const storage = new InMemoryStorage()
    await storage.save({ id: 's1', name: 'Sim 1', domain: 'custom' })
    const loaded = await storage.load('s1')
    expect(loaded?.name).toBe('Sim 1')
  })

  it('list returns filtered results', async () => {
    const storage = new InMemoryStorage()
    await storage.save({ id: 's1', name: 'S1', domain: 'sorting' })
    await storage.save({ id: 's2', name: 'S2', domain: 'kafka' })
    const list = await storage.list({ domain: 'sorting' })
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('s1')
  })

  it('saveState and loadState', async () => {
    const storage = new InMemoryStorage()
    await storage.saveState('sim1', { graphState: 'test', currentFrame: 5, events: '[]', timestamp: 100 })
    const state = await storage.loadState('sim1')
    expect(state?.currentFrame).toBe(5)
  })

  it('delete removes simulation', async () => {
    const storage = new InMemoryStorage()
    await storage.save({ id: 's1', name: 'S1', domain: 'custom' })
    await storage.delete('s1')
    expect(await storage.load('s1')).toBeNull()
  })
})

describe('Phase 9: PluginRegistry', () => {
  it('register and getPlugin', () => {
    const registry = new PluginRegistry()
    const plugin = new SandboxedPlugin('test.plugin', 'Test', '1.0.0', 'runtime')
    registry.register(plugin)
    expect(registry.getPlugin('test.plugin')).toBe(plugin)
  })

  it('register duplicate throws', () => {
    const registry = new PluginRegistry()
    registry.register(new SandboxedPlugin('dup', 'Dup', '1.0.0', 'runtime'))
    expect(() => registry.register(new SandboxedPlugin('dup', 'Dup', '1.0.0', 'runtime'))).toThrow()
  })

  it('activate and deactivate', () => {
    const registry = new PluginRegistry()
    const plugin = new SandboxedPlugin('test', 'Test', '1.0.0', 'runtime')
    registry.register(plugin)
    registry.activate('test')
    expect(registry.isActivated('test')).toBe(true)
    registry.deactivate('test')
    expect(registry.isActivated('test')).toBe(false)
  })

  it('getPluginsByType', () => {
    const registry = new PluginRegistry()
    registry.register(new SandboxedPlugin('r1', 'R1', '1.0.0', 'runtime'))
    registry.register(new SandboxedPlugin('r2', 'R2', '1.0.0', 'runtime'))
    registry.register(new SandboxedPlugin('ai1', 'AI1', '1.0.0', 'ai'))
    expect(registry.getPluginsByType('runtime')).toHaveLength(2)
    expect(registry.getPluginsByType('ai')).toHaveLength(1)
  })

  it('resolveDependencies', () => {
    const registry = new PluginRegistry()
    const base = new SandboxedPlugin('base', 'Base', '1.0.0', 'runtime')
    const derived = new (class extends SandboxedPlugin {
      getDependencies() { return ['base'] }
    })('derived', 'Derived', '1.0.0', 'runtime')
    registry.register(base)
    registry.register(derived)
    const deps = registry.resolveDependencies('derived')
    expect(deps).toContain('base')
  })

  it('activateAll activates registered plugins', () => {
    const registry = new PluginRegistry()
    registry.register(new SandboxedPlugin('a', 'A', '1.0.0', 'runtime'))
    registry.register(new SandboxedPlugin('b', 'B', '1.0.0', 'runtime'))
    registry.activateAll()
    expect(registry.isActivated('a')).toBe(true)
    expect(registry.isActivated('b')).toBe(true)
  })

  it('onActivated callback fires', () => {
    const registry = new PluginRegistry()
    let called = false
    registry.onActivated(() => { called = true })
    const plugin = new SandboxedPlugin('cb-test', 'CB', '1.0.0', 'runtime')
    registry.register(plugin)
    registry.activate('cb-test')
    expect(called).toBe(true)
  })

  it('unregister removes plugin', () => {
    const registry = new PluginRegistry()
    registry.register(new SandboxedPlugin('remove-me', 'RM', '1.0.0', 'runtime'))
    registry.unregister('remove-me')
    expect(registry.getPlugin('remove-me')).toBeUndefined()
  })
})

describe('Phase 9: PluginLoader', () => {
  it('validate checks plugin interface', () => {
    const registry = new PluginRegistry()
    const loader = new PluginLoader(registry)
    const valid = new SandboxedPlugin('valid', 'Valid', '1.0.0', 'runtime')
    const result = loader.validate(valid)
    expect(result.valid).toBe(true)
  })

  it('registerAndValidate works for valid plugin', () => {
    const registry = new PluginRegistry()
    const loader = new PluginLoader(registry)
    const plugin = new SandboxedPlugin('good', 'Good', '1.0.0', 'runtime')
    expect(() => loader.registerAndValidate(plugin)).not.toThrow()
  })
})

describe('Phase 9: SandboxedPlugin', () => {
  it('lifecycle works', () => {
    const plugin = new SandboxedPlugin('sandbox', 'Sandbox', '1.0.0', 'renderer')
    plugin.init(new RuntimeEngine())
    expect(plugin.isInitialized()).toBe(true)
    plugin.activate()
    plugin.deactivate()
    plugin.dispose()
  })

  it('basic properties', () => {
    const plugin = new SandboxedPlugin('id', 'Name', '1.0.0', 'domain')
    expect(plugin.id).toBe('id')
    expect(plugin.name).toBe('Name')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.type).toBe('domain')
    expect(plugin.getDependencies()).toEqual([])
    expect(plugin.getConfig().sandboxed).toBe(true)
  })
})

describe('Phase 9: Example Plugins', () => {
  it('KafkaDomainPlugin has correct id', () => {
    const p = new KafkaDomainPlugin()
    expect(p.id).toBe('domain.kafka')
    expect(p.type).toBe('domain')
  })

  it('ThreeJSRendererPlugin has correct type', () => {
    const p = new ThreeJSRendererPlugin()
    expect(p.type).toBe('renderer')
    expect(p.getConfig().maxNodes).toBe(100000)
  })

  it('ParticleAnimationPlugin config', () => {
    const p = new ParticleAnimationPlugin()
    expect(p.getConfig().maxParticles).toBe(10000)
  })

  it('GPTNarrativePlugin init is callable', () => {
    const p = new GPTNarrativePlugin()
    expect(() => p.init(new RuntimeEngine())).not.toThrow()
  })
})

describe('Phase 10: LWWRegister', () => {
  it('set and get', () => {
    const reg = new LWWRegister('peer1')
    reg.set('value1', 100)
    expect(reg.get()).toBe('value1')
    reg.set('value2', 50)
    expect(reg.get()).toBe('value1')
    reg.set('value3', 200)
    expect(reg.get()).toBe('value3')
  })

  it('merge with higher timestamp wins', () => {
    const a = new LWWRegister('a')
    const b = new LWWRegister('b')
    a.set('from-a', 100)
    b.set('from-b', 200)
    a.merge(b)
    expect(a.get()).toBe('from-b')
  })

  it('toState and fromState roundtrip', () => {
    const a = new LWWRegister('p1')
    a.set('test-value', 42)
    const state = a.toState()
    const b = new LWWRegister('p2')
    b.fromState(state)
    expect(b.get()).toBe('test-value')
  })
})

describe('Phase 10: ORSet', () => {
  it('add, has, remove', () => {
    const set = new ORSet()
    set.add('a', 1)
    set.add('b', 2)
    expect(set.has('a')).toBe(true)
    expect(set.has('b')).toBe(true)
    expect(set.getElements()).toEqual(['a', 'b'])
    set.remove('a', 3)
    expect(set.has('a')).toBe(false)
  })

  it('add-wins semantics', () => {
    const set = new ORSet()
    set.add('x', 10)
    set.remove('x', 5)
    expect(set.has('x')).toBe(true)
    set.remove('x', 15)
    expect(set.has('x')).toBe(false)
  })

  it('merge combines sets', () => {
    const a = new ORSet()
    const b = new ORSet()
    a.add('x', 1); a.add('y', 2)
    b.add('y', 3); b.add('z', 4)
    a.merge(b)
    const elems = a.getElements()
    expect(elems).toContain('x')
    expect(elems).toContain('y')
    expect(elems).toContain('z')
  })
})

describe('Phase 10: ConflictResolver', () => {
  it('resolve picks higher timestamp', () => {
    const r = new ConflictResolver()
    const a = { id: 'e1', timestamp: 100, type: 'CUSTOM' as const, entityId: 'e1', peerId: 'a' }
    const b = { id: 'e1', timestamp: 200, type: 'CUSTOM' as const, entityId: 'e1', peerId: 'b' }
    expect(r.resolve(a, b)).toBe(b)
  })

  it('resolve uses peerId tiebreaker', () => {
    const r = new ConflictResolver()
    const a = { id: 'e1', timestamp: 100, type: 'CUSTOM' as const, entityId: 'e1', peerId: 'a' }
    const b = { id: 'e1', timestamp: 100, type: 'CUSTOM' as const, entityId: 'e1', peerId: 'b' }
    expect(r.resolve(a, b).peerId).toBe('b')
  })

  it('mergeBranches combines events', () => {
    const r = new ConflictResolver()
    const merged = r.mergeBranches(
      { id: 'b1', name: 'main', events: [{ id: 'e1', timestamp: 1, type: 'CUSTOM' as const, entityId: 'x' }] },
      { id: 'b2', name: 'fork', events: [{ id: 'e2', timestamp: 2, type: 'CUSTOM' as const, entityId: 'y' }] },
    )
    expect(merged.events).toHaveLength(2)
  })
})

describe('Phase 10: PeerSync', () => {
  it('initial state', () => {
    const crdt = new LWWRegister('local')
    const sync = new PeerSync('local', crdt)
    expect(sync.getConnectedPeers()).toHaveLength(0)
  })

  it('disconnectAll is safe when not connected', () => {
    const sync = new PeerSync('local', new LWWRegister('local'))
    expect(() => sync.disconnectAll()).not.toThrow()
  })
})

describe('Phase 10: EventOrdering', () => {
  it('stamp increments clock', () => {
    const order = new EventOrdering('p1')
    const e1 = order.stamp({ id: 'e1', timestamp: 0, type: 'CUSTOM' as const, entityId: 'x' })
    const e2 = order.stamp({ id: 'e2', timestamp: 0, type: 'CUSTOM' as const, entityId: 'x' })
    expect(e2.timestamp).toBeGreaterThan(e1.timestamp!)
  })

  it('receive updates clock', () => {
    const order = new EventOrdering('local')
    order.receive({ id: 'e1', timestamp: 50, type: 'CUSTOM' as const, entityId: 'x', peerId: 'remote' })
    expect(order.getClock()).toBe(51)
  })

  it('compare orders by timestamp then peerId', () => {
    const order = new EventOrdering()
    const a = { id: 'e1', timestamp: 10, type: 'CUSTOM' as const, entityId: 'x', peerId: 'a' }
    const b = { id: 'e1', timestamp: 10, type: 'CUSTOM' as const, entityId: 'x', peerId: 'b' }
    const c = { id: 'e1', timestamp: 20, type: 'CUSTOM' as const, entityId: 'x', peerId: 'c' }
    expect(order.compare(a, b)).toBeLessThan(0)
    expect(order.compare(c, a)).toBeGreaterThan(0)
  })
})

describe('Phase 10: MultiplayerRuntime', () => {
  it('constructor creates runtime', () => {
    const mr = new MultiplayerRuntime(new RuntimeEngine(), 'room-1')
    expect(mr.getPeerId()).toBeTruthy()
    expect(mr.getRoom()).toBe('room-1')
  })

  it('annotate stores annotations', () => {
    const mr = new MultiplayerRuntime(new RuntimeEngine(), 'test-room')
    mr.annotate(0, 'First annotation')
    mr.annotate(1, 'Second annotation')
    const annotations = mr.getAnnotations()
    expect(annotations.size).toBe(2)
    expect(annotations.get(0)?.[0].text).toBe('First annotation')
  })

  it('leave is safe without joining', async () => {
    const mr = new MultiplayerRuntime(new RuntimeEngine(), 'test')
    await expect(mr.leave()).resolves.not.toThrow()
  })
})

describe('Phase 10: TraceShare', () => {
  it('shareTrace and loadTrace roundtrip', async () => {
    const ts = new TraceShare()
    const shareId = await ts.shareTrace({ id: 'trace-1', events: [{ type: 'ENTITY_CREATED', timestamp: 0, entityId: 'e1' }] })
    expect(shareId).toBeTruthy()
    const loaded = await ts.loadTrace(shareId)
    expect(loaded?.id).toBe('trace-1')
  })

  it('listTraces returns shared', async () => {
    const ts = new TraceShare()
    await ts.shareTrace({ id: 't1', events: [] })
    await ts.shareTrace({ id: 't2', events: [] })
    expect(ts.listTraces()).toHaveLength(2)
  })
})

describe('Phase 10: CloudReplay', () => {
  it('start and stop recording', async () => {
    const cr = new CloudReplay(new RuntimeEngine())
    expect(cr.isRecording()).toBe(false)
    cr.startRecording()
    expect(cr.isRecording()).toBe(true)
    const url = await cr.stopRecording()
    expect(url).toBeTruthy()
    expect(typeof url).toBe('string')
  })
})

describe('Phase 10: DebugSession', () => {
  it('setBreakpoint and getBreakpoints', () => {
    const ds = new DebugSession()
    ds.setBreakpoint(10)
    ds.setBreakpoint(20, 'peer1')
    const bps = ds.getBreakpoints()
    expect(bps.has(10)).toBe(true)
    expect(bps.has(20)).toBe(true)
  })

  it('removeBreakpoint', () => {
    const ds = new DebugSession()
    ds.setBreakpoint(5)
    ds.removeBreakpoint(5)
    expect(ds.getBreakpoints().has(5)).toBe(false)
  })

  it('addWatch and updatePeerState', () => {
    const ds = new DebugSession()
    ds.addWatch('peer1', 'x > 5')
    ds.updatePeerState('peer1', { frameIndex: 3, variables: { x: 10 }, activeBreakpoints: [] })
    expect(ds.getPeerState('peer1')?.frameIndex).toBe(3)
  })
})

describe('Phase 10: SimulationOrchestrator', () => {
  it('addNode and getNodes', () => {
    const orch = new SimulationOrchestrator()
    orch.addNode('http://server1:8080', 100)
    orch.addNode('http://server2:8080', 200)
    expect(orch.getNodes()).toHaveLength(2)
  })

  it('assignSimulation routes to least loaded', () => {
    const orch = new SimulationOrchestrator()
    orch.addNode('http://s1', 10)
    orch.addNode('http://s2', 10)
    const serverId = orch.assignSimulation('sim-1')
    expect(serverId).toBeTruthy()
    expect(orch.getServer('sim-1')).toBe(serverId)
  })

  it('migrate moves simulation', () => {
    const orch = new SimulationOrchestrator()
    orch.addNode('http://s1', 10)
    orch.addNode('http://s2', 10)
    orch.assignSimulation('sim-1')
    const targetId = orch.getNodes()[1].id
    orch.migrate('sim-1', targetId)
    expect(orch.getServer('sim-1')).toBe(targetId)
  })

  it('removeNode cleans up', () => {
    const orch = new SimulationOrchestrator()
    orch.addNode('http://s1', 10)
    const nodes = orch.getNodes()
    orch.removeNode(nodes[0].id)
    expect(orch.getNodes()).toHaveLength(0)
  })
})

describe('Phase 10: RuntimeMetrics', () => {
  it('record and getSeries', () => {
    const m = new RuntimeMetrics()
    m.record('fps', 60)
    m.record('fps', 55)
    m.record('memory', 1024)
    expect(m.getSeries('fps')).toHaveLength(2)
    expect(m.getSeries('memory')).toHaveLength(1)
  })

  it('export returns all series', () => {
    const m = new RuntimeMetrics()
    m.record('test', 1)
    const exported = m.export()
    expect(exported.test).toBeDefined()
  })

  it('clear removes all', () => {
    const m = new RuntimeMetrics()
    m.record('x', 1)
    m.clear()
    expect(m.getSeries('x')).toHaveLength(0)
  })
})

describe('Phase 10: TracingInstrumentation', () => {
  it('beginSpan and endSpan', () => {
    const t = new TracingInstrumentation()
    const id = t.beginSpan('render')
    t.endSpan(id)
    const report = t.export()
    expect(report.spans).toHaveLength(1)
    expect(report.spans[0].name).toBe('render')
    expect(report.spans[0].endTime).toBeGreaterThan(0)
  })

  it('span hierarchy with parentId', () => {
    const t = new TracingInstrumentation()
    const parentId = t.beginSpan('parent')
    const childId = t.beginSpan('child', parentId)
    t.endSpan(childId)
    t.endSpan(parentId)
    const report = t.export()
    expect(report.spans).toHaveLength(2)
    expect(Object.keys(report.tree)).toContain(parentId)
  })
})
