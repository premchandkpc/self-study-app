# Phase 9: Plugin + Extension System

**Duration**: 2 weeks
**Goal**: Build a plugin system for runtime, renderers, AI, and narratives.

---

## Week 1: Plugin Architecture

### Day 1-2: Plugin Interface

```typescript
// src/plugins/Plugin.ts
export interface Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly type: PluginType

  // Lifecycle
  init(runtime: RuntimeEngine): void
  activate(): void
  deactivate(): void
  dispose(): void

  // Metadata
  getDependencies(): string[]
  getPermissions(): Permission[]
  getConfig(): PluginConfig
}

export type PluginType =
  | 'runtime'          // Extends runtime engine
  | 'renderer'         // Adds rendering backend
  | 'animation'        // Adds animation primitives
  | 'narrative'        // Adds narration engines
  | 'ai'               // Adds AI providers
  | 'layout'           // Adds layout algorithms
  | 'instrumentation'  // Adds tracing methods
  | 'protocol'         // Adds transport protocols
  | 'domain'           // Adds domain support
  | 'concept'          // Adds concept definitions
```

### Day 3-4: PluginRegistry

```typescript
// src/plugins/PluginRegistry.ts
export class PluginRegistry {
  private plugins: Map<string, Plugin>
  private activated: Set<string>
  private dependencies: Map<string, string[]>

  // Registration
  register(plugin: Plugin): void
  unregister(id: string): void

  // Activation (resolves dependencies)
  activate(id: string): void
  deactivate(id: string): void
  activateAll(): void

  // Queries
  getPlugin(id: string): Plugin | undefined
  getPluginsByType(type: PluginType): Plugin[]
  isActivated(id: string): boolean

  // Dependency resolution (topological sort)
  resolveDependencies(id: string): string[]
  validateDependencies(id: string): ValidationResult

  // Events
  onActivated(cb: (plugin: Plugin) => void): void
  onDeactivated(cb: (plugin: Plugin) => void): void
}
```

### Day 5: PluginLoader

```typescript
// src/plugins/PluginLoader.ts
export class PluginLoader {
  private registry: PluginRegistry

  // Load from file
  async loadFromFile(path: string): Promise<Plugin>

  // Load from URL
  async loadFromURL(url: string): Promise<Plugin>

  // Load all from directory
  async loadFromDirectory(dir: string): Promise<Plugin[]>

  // Sandbox — run in isolated context
  async loadInSandbox(path: string): Promise<SandboxedPlugin>

  // Validate plugin
  validate(plugin: Plugin): ValidationResult
}

// Sandboxed execution for untrusted plugins
export class SandboxedPlugin implements Plugin {
  private worker: Worker

  async init(runtime: RuntimeEngine): Promise<void> {
    // Run in Web Worker for isolation
    this.worker = new Worker('plugin-sandbox.js')
    this.worker.postMessage({ type: 'init', runtime: runtime.getSnapshot() })
  }

  // All plugin methods proxy through worker messages
}
```

---

## Week 2: Plugin Types

### Day 1-2: Domain Plugins

```typescript
// src/plugins/examples/KafkaDomainPlugin.ts
export class KafkaDomainPlugin implements Plugin {
  id = 'domain.kafka'
  name = 'Kafka Domain'
  version = '1.0.0'
  type = 'domain'

  init(runtime: RuntimeEngine): void {
    // Register Kafka entities
    runtime.getGraph().registerEntityKind('broker')
    runtime.getGraph().registerEntityKind('partition')
    runtime.getGraph().registerEntityKind('producer')
    runtime.getGraph().registerEntityKind('consumer')
    runtime.getGraph().registerEntityKind('topic')

    // Register Kafka event producers
    runtime.registerEventProducer('kafka-publish', this.publishProducer)
    runtime.registerEventProducer('kafka-consume', this.consumeProducer)
    runtime.registerEventProducer('kafka-rebalance', this.rebalanceProducer)

    // Register Kafka event → concept mapping
    runtime.getConceptRegistry().registerMapping('kafka-publish', 'publish-subscribe')
    runtime.getConceptRegistry().registerMapping('kafka-consume', 'consumer-group')
    runtime.getConceptRegistry().registerMapping('kafka-rebalance', 'partition-rebalance')
  }

  activate(): void { /* Register Kafka narration templates */ }
  deactivate(): void { /* Clean up */ }
}
```

### Day 3-4: Renderer + Animation Plugins

```typescript
// src/plugins/examples/ThreeJSRendererPlugin.ts
export class ThreeJSRendererPlugin implements Plugin {
  id = 'renderer.threejs'
  name = 'Three.js 3D Renderer'
  version = '1.0.0'
  type = 'renderer'

  init(runtime: RuntimeEngine): void {
    runtime.getRendererRegistry().register('webgl-3d', {
      create: (container) => new ThreeJSRenderer(container),
      capabilities: ['3d', 'shadows', 'particles', 'post-processing'],
      maxNodes: 100000
    })
  }
}

// src/plugins/examples/ParticleAnimationPlugin.ts
export class ParticleAnimationPlugin implements Plugin {
  id = 'animation.particles'
  name = 'Particle Animation Primitives'
  version = '1.0.0'
  type = 'animation'

  init(runtime: RuntimeEngine): void {
    runtime.getAnimationEngine().registerPrimitive('explode', this.explode)
    runtime.getAnimationEngine().registerPrimitive('implode', this.implode)
    runtime.getAnimationEngine().registerPrimitive('fragment', this.fragment)
    runtime.getAnimationEngine().registerPrimitive('vortex', this.vortex)
  }
}
```

### Day 5: AI + Narrative Plugins

```typescript
// src/plugins/examples/GPTNarrativePlugin.ts
export class GPTNarrativePlugin implements Plugin {
  id = 'narrative.gpt'
  name = 'GPT Narrative Generator'
  version = '1.0.0'
  type = 'narrative'

  init(runtime: RuntimeEngine): void {
    runtime.getNarrationEngine().registerProvider('gpt', {
      generateExplanation: async (event) => {
        const response = await openai.createCompletion({
          prompt: `Explain this event in 1 sentence: ${JSON.stringify(event)}`,
          max_tokens: 50
        })
        return response.choices[0].text
      }
    })
  }
}
```

---

## Files Created

```
src/plugins/
├── Plugin.ts
├── PluginRegistry.ts
├── PluginLoader.ts
├── SandboxedPlugin.ts
├── examples/
│   ├── KafkaDomainPlugin.ts
│   ├── ThreeJSRendererPlugin.ts
│   ├── ParticleAnimationPlugin.ts
│   └── GPTNarrativePlugin.ts
└── index.ts
```

---

## Success Criteria

- [ ] Plugin interface works for all 8 plugin types
- [ ] PluginRegistry resolves dependencies topologically
- [ ] PluginLoader loads from file, URL, directory
- [ ] SandboxedPlugin runs untrusted code safely
- [ ] Domain plugins add entities/events/concepts
- [ ] Renderer plugins register new backends
- [ ] Animation plugins add new primitives
- [ ] AI plugins provide custom LLM providers
- [x] Plugin lifecycle (init/activate/deactivate/dispose) works

---
## ✅ Completed May 2026
Plugin interface with 10 types, PluginRegistry with dep resolution and topological activation, PluginLoader with validate, SandboxedPlugin, 4 example plugins (KafkaDomain, ThreeJS, ParticleAnimation, GPTNarrative).
