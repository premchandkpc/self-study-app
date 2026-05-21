# IR System Quick Start

How to use the Intermediate Representation system in your components.

## Basic Usage

### 1. Create a Compiler

```typescript
// src/core/ir/compilers/MyTechCompiler.ts
import { ContentCompiler, TechnologyContent } from '../contentCompiler';
import { IRLearningUnit } from '../schema';

export class MyTechCompiler extends ContentCompiler {
  compileScenario(scenario: any): IRLearningUnit {
    const content: TechnologyContent = {
      id: scenario.id,
      title: scenario.title,
      technology: 'my-tech',
      domain: 'my-domain',
      concept: scenario.concept,
      difficulty: 2,
      structure: {
        steps: scenario.steps.map(step => ({
          title: step.title,
          description: step.description,
          nodes: this.extractNodes(step),
          edges: this.extractEdges(step),
        })),
      },
    };

    return this.compile(content);
  }

  private extractNodes(step: any) {
    return step.nodes?.map(n => ({
      id: n.id,
      type: n.type || 'queue',
      label: n.label,
      state: 'idle',
    })) || [];
  }

  private extractEdges(step: any) {
    return step.edges?.map(e => ({
      id: `${e.from}-${e.to}`,
      from: e.from,
      to: e.to,
      type: 'flow',
      label: e.label,
    })) || [];
  }

  protected mapTechnologyToPrimitive(tech: string, concept: string): string {
    return 'pipeline'; // or other primitive types
  }
}
```

### 2. Use in a Component

```tsx
// src/components/visualizers/MyVisualizer/MyVisualizer.jsx
import { memo, useMemo } from 'react';
import { MyTechCompiler, SceneRenderer } from '@/core/ir';

const MyVisualizer = memo(function MyVisualizer() {
  const compiler = useMemo(() => new MyTechCompiler(), []);
  const [activeId, setActiveId] = useState(SCENARIOS[0].id);

  const activeScenario = useMemo(
    () => SCENARIOS.find(s => s.id === activeId),
    [activeId]
  );

  const ir = useMemo(() => {
    if (!activeScenario) return null;
    return compiler.compileScenario(activeScenario);
  }, [activeScenario, compiler]);

  return (
    <div>
      <h1>{ir?.title}</h1>
      
      {ir?.scenes.map(scene => (
        <div key={scene.id}>
          <h3>{scene.title}</h3>
          <p>{scene.description}</p>
          
          {/* Generic renderer - works for all primitive types */}
          <SceneRenderer scene={scene} />
        </div>
      ))}
    </div>
  );
});
```

## Working with IR Data

### Primitive Types

The IR system supports 12 primitive types. Pick the one that matches your concept:

| Primitive | Use For | Example |
|-----------|---------|---------|
| `queue` | Linear sequences, FIFO | ArrayList, LinkedList, Redis lists |
| `stack` | LIFO, call stacks | JVM stack, recursion, undo stacks |
| `tree` | Hierarchies | TreeMap, file systems, DOM trees |
| `graph` | Networks, connections | Kafka clusters, routing tables |
| `timeline` | Sequential events | Event logs, transaction history |
| `pipeline` | Processing steps | Data pipelines, request flow |
| `state_machine` | State transitions | Thread states, protocols |
| `network` | Topologies | Distributed systems, mesh |
| `matrix` | Grids | 2D arrays, spreadsheets |
| `table` | Key-value, rows | HashMaps, databases |
| `flowchart` | Branching logic | Decision trees, algorithms |
| `sequence` | Interactions | Message sequences, protocols |

### Scene Structure

```typescript
interface IRScene {
  id: string;
  type: PrimitiveType;           // Which renderer to use
  title: string;
  description?: string;
  nodes: IRNode[];               // Visual elements
  edges: IREdge[];               // Relationships
  layout?: 'hierarchical' | 'circular' | 'force' | 'grid';
  animation?: IRAnimation;       // Optional: step-by-step playback
}

interface IRNode {
  id: string;
  type: PrimitiveType;           // Often matches scene.type
  label: string;                 // Display text
  state: 'idle' | 'active' | 'completed' | 'error' | 'processing';
  metadata?: Record<string, any>;
  data?: any;
}

interface IREdge {
  id: string;
  from: string;                  // Source node id
  to: string;                    // Target node id
  type: 'flow' | 'dependency' | 'reference' | 'bidirectional';
  label?: string;
  metadata?: Record<string, any>;
}
```

## Animation Example

```typescript
const scene: IRScene = {
  id: 'demo',
  type: 'queue',
  title: 'Array Add Operation',
  nodes: [
    { id: 'cell-0', label: '42', state: 'idle' },
    { id: 'cell-1', label: '17', state: 'idle' },
  ],
  edges: [],
  animation: {
    duration: 2000,
    steps: [
      {
        target: 'node',
        id: 'cell-0',
        action: 'highlight',
        duration: 500,
        delay: 0,
      },
      {
        target: 'node',
        id: 'cell-1',
        action: 'reveal',
        duration: 300,
        delay: 600,
      },
    ],
  },
};

// SceneRenderer will automatically animate the nodes
<SceneRenderer scene={scene} />
```

## Pattern: Multi-Step Visualization

```typescript
const compiler = new MyTechCompiler();

// Content with multiple steps
const content = {
  steps: [
    {
      title: 'Step 1: Initialize',
      nodes: [{ id: 'a', label: 'Array', type: 'queue' }],
      edges: [],
    },
    {
      title: 'Step 2: Add Element',
      nodes: [
        { id: 'a', label: 'Array', type: 'queue' },
        { id: 'b', label: '42', type: 'queue', state: 'new' },
      ],
      edges: [{ from: 'a', to: 'b', label: 'contains' }],
    },
    {
      title: 'Step 3: Complete',
      nodes: [
        { id: 'a', label: 'Array', type: 'queue' },
        { id: 'b', label: '42', type: 'queue', state: 'idle' },
      ],
      edges: [{ from: 'a', to: 'b', label: 'contains' }],
    },
  ],
};

// Each step becomes a scene
const ir = compiler.compile(content);
// ir.scenes.length === 3
// Each scene can be rendered independently
// ir.scenes[0].type === 'queue' (for all steps)
```

## Benefits

### For Component Developers
- No need to write custom renderers
- Content and visualization are separate
- Easy to add animations, interactions

### For Content Creators
- Define content once, render anywhere
- Clear, standardized data format
- Same content works on web, mobile, canvas

### For the Team
- Reduced code duplication (N+M not N×M)
- Easier to maintain (change renderer, not content)
- Easier to test (IR is just data, not components)
- Easier to extend (add new tech = add compiler)

## Common Mistakes

❌ **Wrong**: Hardcoding positions in nodes
```typescript
const node = {
  id: 'node-1',
  label: 'A',
  x: 100,  // ❌ Don't do this
  y: 200,
};
```

✅ **Right**: Let layout engine position nodes
```typescript
const scene = {
  type: 'graph',
  nodes: [{ id: 'node-1', label: 'A' }],
  layout: 'hierarchical',  // ✅ Engine handles positioning
};
```

❌ **Wrong**: Storing UI state in IR
```typescript
const node = {
  id: 'node-1',
  isHovered: true,  // ❌ IR is content, not state
};
```

✅ **Right**: Manage UI state in component
```typescript
const [hoveredId, setHoveredId] = useState(null);

// Use hoveredId to update node states in scene
const scene = {
  nodes: originalNodes.map(n => ({
    ...n,
    state: n.id === hoveredId ? 'active' : 'idle',
  })),
};
```

## Next Steps

1. Look at `JavaCollectionsCompiler` for a complete example
2. Look at `kafkaToIR.example.ts` for proof of multi-tech compilation
3. Create your first compiler following the template above
4. Test it in a component using `SceneRenderer`
