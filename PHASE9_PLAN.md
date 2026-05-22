# Phase 9: Plugin & Extensibility System

**Goal**: Allow third-party developers to add custom algorithms, renderers, concepts.

**Duration**: 1-2 weeks

---

## Plugin Architecture

```
Core Runtime (stable)
  ↓
Plugin System (extensible)
  ├── Algorithm Plugins
  ├── Renderer Plugins
  ├── Concept Plugins
  └── Analyzer Plugins
```

---

## Algorithm Plugin System

### 1. Plugin Interface

```typescript
// src/core/plugins/AlgorithmPlugin.ts
export interface AlgorithmPlugin {
  name: string
  version: string
  description: string
  author?: string
  
  // Core function
  execute(input: any, options?: any): SemanticEvent[]
  
  // Metadata
  getMetadata(): {
    concepts: string[]
    complexity: string
    difficulty: 'easy' | 'medium' | 'hard'
    tags: string[]
  }
  
  // Validation
  validate(input: any): boolean
  
  // Optional hooks
  onInit?(): void
  onDestroy?(): void
}

// Example custom plugin
class CustomAlgorithmPlugin implements AlgorithmPlugin {
  name = 'My Custom Sort'
  version = '1.0.0'
  description = 'A unique sorting algorithm'
  author = 'Developer Name'
  
  execute(input: number[]): SemanticEvent[] {
    const events: SemanticEvent[] = []
    // Implementation
    return events
  }
  
  getMetadata() {
    return {
      concepts: ['sorting', 'comparison'],
      complexity: 'O(n log n)',
      difficulty: 'medium',
      tags: ['sorting', 'divide-and-conquer']
    }
  }
  
  validate(input: any): boolean {
    return Array.isArray(input) && input.every(x => typeof x === 'number')
  }
}
```

### 2. Renderer Plugin System

```typescript
// src/core/plugins/RendererPlugin.ts
export interface RendererPlugin {
  name: string
  version: string
  
  // Factory function
  createRenderer(container: HTMLElement): IRenderer
  
  // Metadata
  supportedEventTypes: EventType[]
  priority: number // Higher = preferred
  
  onInit?(): void
  onDestroy?(): void
}

// Example: Custom 3D renderer plugin
class WebGL3DRendererPlugin implements RendererPlugin {
  name = '3D Visualization'
  version = '1.0.0'
  supportedEventTypes = ['ARRAY_SWAP', 'NODE_UPDATE', 'ARRAY_COMPARE']
  priority = 10 // High priority
  
  createRenderer(container: HTMLElement): IRenderer {
    return new WebGL3DRenderer(container)
  }
}
```

### 3. Concept Plugin System

```typescript
// src/core/plugins/ConceptPlugin.ts
export interface ConceptPlugin {
  name: string
  version: string
  
  // Provide concepts
  getConcepts(): ConceptGraph
  
  // Optional: custom concept metadata
  enrichConcept?(concept: Concept): Concept
}

// Example: Interview prep concept plugin
class InterviewConceptPlugin implements ConceptPlugin {
  name = 'Interview Prep Concepts'
  version = '1.0.0'
  
  getConcepts(): ConceptGraph {
    return {
      concepts: new Map([
        ['array_sorting', {
          id: 'array_sorting',
          name: 'Array Sorting',
          importance: 'critical',
          // ...
        }]
      ])
    }
  }
}
```

### 4. Plugin Registry

```typescript
// src/core/plugins/PluginRegistry.ts
export class PluginRegistry {
  private algorithmPlugins: Map<string, AlgorithmPlugin> = new Map()
  private rendererPlugins: Map<string, RendererPlugin> = new Map()
  private conceptPlugins: Map<string, ConceptPlugin> = new Map()
  private analyzerPlugins: Map<string, AnalyzerPlugin> = new Map()
  
  // Register plugins
  registerAlgorithm(id: string, plugin: AlgorithmPlugin): void {
    if (this.algorithmPlugins.has(id)) {
      throw new Error(`Algorithm plugin "${id}" already registered`)
    }
    plugin.onInit?.()
    this.algorithmPlugins.set(id, plugin)
  }
  
  registerRenderer(id: string, plugin: RendererPlugin): void {
    if (this.rendererPlugins.has(id)) {
      throw new Error(`Renderer plugin "${id}" already registered`)
    }
    plugin.onInit?.()
    this.rendererPlugins.set(id, plugin)
  }
  
  registerConcept(id: string, plugin: ConceptPlugin): void {
    if (this.conceptPlugins.has(id)) {
      throw new Error(`Concept plugin "${id}" already registered`)
    }
    this.conceptPlugins.set(id, plugin)
  }
  
  // Retrieve plugins
  getAlgorithm(id: string): AlgorithmPlugin | null {
    return this.algorithmPlugins.get(id) ?? null
  }
  
  getRenderer(id: string): RendererPlugin | null {
    return this.rendererPlugins.get(id) ?? null
  }
  
  getAvailableAlgorithms(): AlgorithmPlugin[] {
    return Array.from(this.algorithmPlugins.values())
  }
  
  getAvailableRenderers(): RendererPlugin[] {
    return Array.from(this.rendererPlugins.values())
      .sort((a, b) => b.priority - a.priority)
  }
  
  // Unregister (cleanup)
  unregisterAlgorithm(id: string): void {
    const plugin = this.algorithmPlugins.get(id)
    plugin?.onDestroy?.()
    this.algorithmPlugins.delete(id)
  }
  
  unregisterRenderer(id: string): void {
    const plugin = this.rendererPlugins.get(id)
    plugin?.onDestroy?.()
    this.rendererPlugins.delete(id)
  }
}

export const pluginRegistry = new PluginRegistry()
```

---

## Plugin Loader

```typescript
// src/core/plugins/PluginLoader.ts
export class PluginLoader {
  async loadRemotePlugin(url: string): Promise<AlgorithmPlugin> {
    const response = await fetch(url)
    const code = await response.text()
    
    // Execute in isolated context
    const fn = new Function('exports', code)
    const exports = {}
    fn(exports)
    
    return (exports as any).default
  }
  
  async loadLocalPlugin(modulePath: string): Promise<AlgorithmPlugin> {
    const module = await import(modulePath)
    return module.default || module
  }
  
  validatePlugin(plugin: any): plugin is AlgorithmPlugin {
    return (
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string' &&
      typeof plugin.execute === 'function' &&
      typeof plugin.getMetadata === 'function' &&
      typeof plugin.validate === 'function'
    )
  }
}
```

---

## Plugin UI

```typescript
// src/components/plugins/PluginLibrary.tsx
export function PluginLibrary() {
  const [plugins, setPlugins] = useState(pluginRegistry.getAvailableAlgorithms())
  const [selectedPlugin, setSelectedPlugin] = useState<AlgorithmPlugin | null>(null)
  
  const registerNewPlugin = async (url: string) => {
    try {
      const loader = new PluginLoader()
      const plugin = await loader.loadRemotePlugin(url)
      
      if (loader.validatePlugin(plugin)) {
        pluginRegistry.registerAlgorithm(plugin.name, plugin)
        setPlugins(pluginRegistry.getAvailableAlgorithms())
      }
    } catch (error) {
      console.error('Failed to load plugin:', error)
    }
  }
  
  return (
    <div className="plugin-library">
      <h2>Algorithm Plugins</h2>
      
      <div className="plugin-list">
        {plugins.map(plugin => (
          <div
            key={plugin.name}
            className="plugin-card"
            onClick={() => setSelectedPlugin(plugin)}
          >
            <h3>{plugin.name}</h3>
            <p>{plugin.description}</p>
            <div className="metadata">
              <span>{plugin.getMetadata().complexity}</span>
              <span>{plugin.getMetadata().difficulty}</span>
            </div>
          </div>
        ))}
      </div>
      
      {selectedPlugin && (
        <PluginDetail plugin={selectedPlugin} />
      )}
      
      <div className="add-plugin">
        <input
          type="url"
          placeholder="Plugin URL"
          onBlur={(e) => registerNewPlugin(e.target.value)}
        />
        <button>Add Plugin</button>
      </div>
    </div>
  )
}
```

---

## Marketplace Example

```typescript
// Plugin marketplace discovery
const PLUGIN_MARKETPLACE = 'https://plugins.visualization-platform.io/api'

async function discoverPlugins(): Promise<PluginMetadata[]> {
  const response = await fetch(`${PLUGIN_MARKETPLACE}/plugins`)
  const plugins = await response.json()
  return plugins
}

interface PluginMetadata {
  id: string
  name: string
  version: string
  author: string
  downloads: number
  rating: number
  url: string
  tags: string[]
}
```

---

## Security Considerations

⚠️ **Be Careful!** Loading third-party code is risky.

### Mitigation Strategies

```typescript
// 1. Code signing
interface SignedPlugin {
  plugin: AlgorithmPlugin
  signature: string
  publicKey: string
}

// 2. Sandbox execution
class SandboxedPluginLoader {
  async loadPlugin(code: string): Promise<AlgorithmPlugin> {
    const iframe = document.createElement('iframe')
    iframe.sandbox.add('allow-scripts')
    
    // Load plugin in isolated iframe context
    // Communicate via postMessage
  }
}

// 3. Permissions
interface PluginPermissions {
  canAccessNetwork: boolean
  canAccessStorage: boolean
  canAccessDOM: boolean
  maxMemory: number
  timeout: number
}

// 4. Audit trail
class PluginAudit {
  logPluginExecution(pluginId: string, duration: number, error?: Error): void {
    // Log all plugin executions
  }
}
```

---

## Files to Create

```
src/core/plugins/
├── AlgorithmPlugin.ts
├── RendererPlugin.ts
├── ConceptPlugin.ts
├── AnalyzerPlugin.ts
├── PluginRegistry.ts
├── PluginLoader.ts
├── PluginSecurity.ts
└── index.ts

src/components/plugins/
├── PluginLibrary.tsx
├── PluginDetail.tsx
└── PluginMarketplace.tsx

examples/plugins/
├── custom-sort-plugin.ts
├── custom-renderer-plugin.ts
└── README.md
```

---

## Example: Third-Party Plugin

```typescript
// examples/plugins/custom-sort-plugin.ts
import { AlgorithmPlugin, SemanticEvent } from '@/core/plugins'

class CocktailSortPlugin implements AlgorithmPlugin {
  name = 'Cocktail Sort'
  version = '1.0.0'
  description = 'Bidirectional bubble sort'
  author = 'Plugin Developer'
  
  execute(arr: number[]): SemanticEvent[] {
    const events: SemanticEvent[] = []
    let frameId = 0
    const copy = [...arr]
    
    let start = 0
    let end = copy.length - 1
    let swapped = true
    
    while (swapped && start < end) {
      swapped = false
      
      // Forward pass
      for (let i = start; i < end; i++) {
        frameId++
        events.push({
          type: 'ARRAY_COMPARE',
          frameId,
          timestamp: frameId * 300,
          indices: [i, i + 1],
          concepts: ['comparison']
        })
        
        if (copy[i] > copy[i + 1]) {
          [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]]
          frameId++
          events.push({
            type: 'ARRAY_SWAP',
            frameId,
            timestamp: frameId * 300,
            indices: [i, i + 1],
            concepts: ['swap']
          })
          swapped = true
        }
      }
      
      end--
      
      // Backward pass
      for (let i = end; i > start; i--) {
        frameId++
        events.push({
          type: 'ARRAY_COMPARE',
          frameId,
          timestamp: frameId * 300,
          indices: [i - 1, i],
          concepts: ['comparison']
        })
        
        if (copy[i - 1] > copy[i]) {
          [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]]
          frameId++
          events.push({
            type: 'ARRAY_SWAP',
            frameId,
            timestamp: frameId * 300,
            indices: [i - 1, i],
            concepts: ['swap']
          })
          swapped = true
        }
      }
      
      start++
    }
    
    return events
  }
  
  getMetadata() {
    return {
      concepts: ['sorting', 'bidirectional', 'optimization'],
      complexity: 'O(n²)',
      difficulty: 'medium',
      tags: ['sorting', 'comparison-based']
    }
  }
  
  validate(input: any): boolean {
    return Array.isArray(input) && input.every(x => typeof x === 'number')
  }
}

// Export for registration
export default CocktailSortPlugin
```

---

## Completion Checklist

- [ ] Plugin interfaces defined
- [ ] PluginRegistry implemented
- [ ] PluginLoader working
- [ ] Plugin validation
- [ ] Example plugins created
- [ ] Plugin UI/marketplace
- [ ] Security measures
- [ ] Documentation
- [ ] Example plugins shared

---

## Success Criteria

✅ **Third-party algorithms work seamlessly**  
✅ **Plugin discovery via marketplace**  
✅ **Security validated**  
✅ **Easy plugin development**  
✅ **Community plugins available**  

---

## Next Phase (Phase 10)

Build semantic concept graph for AI learning.
