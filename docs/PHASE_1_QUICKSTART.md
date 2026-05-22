# Phase 1-2 Quick Start Guide

## What's New

### 1. SceneIR: Unified Visualization Format

```typescript
import type { SceneIR } from 'core/ir/VisualizationSchema';

// Any scene is now:
const scene: SceneIR = {
  id: 'step-1',
  title: 'Array Setup',
  type: 'dsa',
  
  visualization: {
    type: 'dsa-array',
    array: { cells: [...], window: { left: 0, right: 3 } },
  },
  
  content: {
    code: [{ lines: [...], language: 'javascript' }],
    metrics: [{ key: 'time', value: 10, unit: 'ms' }],
    variables: { x: 5, y: 10 },
    narration: 'Initialize array...',
  },
};
```

### 2. PrimitiveRenderer: Universal Rendering Engine

```typescript
import { PrimitiveRenderer } from 'core/visualization/PrimitiveRenderer';

// Render any scene type automatically:
<PrimitiveRenderer
  visualization={scene.visualization}
  config={{ theme: 'dark', interactive: true }}
  onNodeClick={(id) => console.log('Clicked:', id)}
/>
```

### 3. LegacyAdapter: Backward Compatibility

```typescript
import { adaptLegacyScenarioBuilder } from 'core/ir/LegacyAdapter';

// Convert old scenario builders:
const oldBuilder = (params) => [
  { cells: [...], vars: {...}, complexity: {...} },
  { cells: [...], vars: {...}, complexity: {...} },
];

const newBuilder = adaptLegacyScenarioBuilder(oldBuilder);
const scenes = await newBuilder(params); // Returns SceneIR[]
```

### 4. Typed Event Bus: Type-Safe Event Emission

```typescript
import { VisualizationEventBus } from 'core/events/VisualizationEventBus';

const bus = new VisualizationEventBus();

// Typed subscribe (no more loose strings):
bus.onVisualization('scene:changed', ({ scene, sceneIndex }) => {
  console.log(`Now at step ${sceneIndex}: ${scene.title}`);
});

// Typed emit:
bus.emitVisualization('scene:changed', {
  scene: currentScene,
  sceneIndex: 5,
  totalScenes: 10,
});
```

### 5. VisualizerRegistry: Plugin System

```typescript
import { visualizerRegistry } from 'core/visualization/VisualizerRegistry';

// Register visualizer:
visualizerRegistry.register({
  id: 'array-visualizer',
  name: 'Array DSA',
  category: 'dsa',
  scenarios: [...],
});

// Later, query registry:
const allDSA = visualizerRegistry.findByCategory('dsa');
const allScenarios = visualizerRegistry.getAllScenarios();
```

---

## Migration Checklist

### For Existing Visualizers (No Changes Needed Yet)

✅ **Phase 1-2 is backward compatible!**

Existing scenario builders work as-is:
```typescript
// Your current code:
const scenario = {
  id: 'sliding-window',
  build: () => [
    { cells: [...], window: {...}, vars: {...} },
  ],
};

// Still works! LazyScenarioLoader auto-adapts:
const scenes = await lazyScenarioBuilder(scenario)(params);
// Result: SceneIR[] (automatically converted)
```

### To Opt-In to SceneIR (Optional)

Native SceneIR builders are faster (no adapter):
```typescript
// NEW (Phase 3+):
export const slidingWindowScenario: ScenarioDescriptor = {
  id: 'sliding-window',
  build: async (params) => {
    const scenes: SceneIR[] = [
      {
        id: 'step-1',
        visualization: { type: 'dsa-array', array: {...} },
        content: { variables: {...}, narration: '...' },
      },
    ];
    return scenes;
  },
};
```

---

## Testing Your Changes

### Run Phase 1 Tests

```bash
npm test -- \
  ArrayVisualizer/__tests__/scenarios.test.js \
  SystemDesignVisualizer/__tests__/scenarios.test.js \
  compiler/__tests__/instrument.test.js \
  visualization/__tests__/PrimitiveRenderer.test.tsx
```

### Manual Test: Adapt Old Scenario to SceneIR

```typescript
import slidingWindow from './scenarios/sliding-window';
import { adaptLegacyScenarioBuilder } from 'core/ir/LegacyAdapter';

// Build old style:
const oldSteps = slidingWindow.build({ arr: [1, 2, 3, 4, 5], k: 2 });
console.log(oldSteps[0]); // { cells: [...], vars: {...} }

// Adapt to new:
const newBuilder = adaptLegacyScenarioBuilder(slidingWindow.build);
const newScenes = await newBuilder({ arr: [1, 2, 3, 4, 5], k: 2 });
console.log(newScenes[0]); // SceneIR with .visualization.array
```

### Manual Test: Render SceneIR

```typescript
import { PrimitiveRenderer } from 'core/visualization/PrimitiveRenderer';

const viz = {
  type: 'dsa-array',
  array: {
    cells: [
      { value: 1, state: 'idle' },
      { value: 2, state: 'active' },
      { value: 3, state: 'idle' },
    ],
  },
};

// Should render 3 cells with colors
<PrimitiveRenderer visualization={viz} />
```

---

## Common Patterns

### Pattern 1: Hook → SceneIR

```typescript
import { useSceneNavigator } from 'core/hooks/useSceneNavigator';

const MyComponent = () => {
  const scenes = getScenes(); // Returns SceneIR[]
  const nav = useSceneNavigator(scenes);
  
  return (
    <>
      <PrimitiveRenderer visualization={nav.currentScene?.visualization} />
      <button onClick={nav.next}>Next</button>
      <button onClick={nav.prev}>Prev</button>
    </>
  );
};
```

### Pattern 2: Event-Driven Updates (Phase 4+)

```typescript
import { VisualizationEventBus } from 'core/events/VisualizationEventBus';

const bus = new VisualizationEventBus();

// Renderer listens to scene changes:
useEffect(() => {
  const unsub = bus.onVisualization('scene:changed', ({ scene }) => {
    setCurrentScene(scene);
  });
  return unsub;
}, []);

// Runtime publishes:
bus.emitVisualization('scene:changed', {
  scene: nextScene,
  sceneIndex: idx,
  totalScenes: total,
});
```

### Pattern 3: Plugin Registration (Phase 5+)

```typescript
import { visualizerRegistry, type VisualizerPlugin } from 'core/visualization/VisualizerRegistry';

const myPlugin: VisualizerPlugin = {
  id: 'my-custom-viz',
  name: 'My Custom Visualizer',
  category: 'custom',
  scenarios: [
    {
      id: 'my-scenario',
      label: 'My Scenario',
      build: () => [...], // Old or new style
    },
  ],
};

// Register at app startup:
visualizerRegistry.register(myPlugin);

// Use anywhere:
const scenarios = visualizerRegistry.getScenarios('my-custom-viz');
```

---

## File Organization

```
core/
├── ir/
│   ├── VisualizationSchema.ts      (SceneIR types)
│   ├── LegacyAdapter.ts            (Backward compat)
│   └── __tests__/
├── visualization/
│   ├── PrimitiveRenderer.tsx       (Main renderer)
│   ├── primitives/
│   │   ├── GraphPrimitive.tsx
│   │   ├── ArrayPrimitive.tsx
│   │   ├── TreePrimitive.tsx
│   │   ├── TablePrimitive.tsx
│   │   ├── TimelinePrimitive.tsx
│   │   └── CodePrimitive.tsx
│   ├── VisualizerRegistry.ts       (Plugin system)
│   └── __tests__/
├── scenario/
│   ├── LazyScenarioLoader.ts       (Deferred build)
│   └── __tests__/
├── events/
│   ├── EventBus.ts                 (Learning events)
│   ├── TypedEventEmitter.ts        (Typed base)
│   ├── VisualizationEventBus.ts    (Scene events)
│   └── __tests__/
└── hooks/
    ├── useSceneNavigator.ts        (Scene nav + filtering)
    └── __tests__/
```

---

## Debugging Tips

### Check SceneIR Shape

```typescript
import { SceneIR } from 'core/ir/VisualizationSchema';

const scene: SceneIR = {...}; // TS will complain if wrong shape
console.log(scene.visualization.type); // 'graph' | 'dsa-array' | ...
```

### Debug Adapter Conversion

```typescript
import { adaptLegacyViz } from 'core/ir/LegacyAdapter';

const oldViz = { cells: [...], vars: {...} };
const scene = adaptLegacyViz(oldViz);
console.log(scene); // Full SceneIR structure
```

### Check Event Listener Count

```typescript
const count = bus.getVisualizationListenerCount('scene:changed');
console.log(`${count} listeners for scene:changed`);
```

### Verify Visualizer Registration

```typescript
const allViz = visualizerRegistry.getAll();
console.log(`Registered: ${allViz.map(v => v.id).join(', ')}`);

const dsa = visualizerRegistry.findByCategory('dsa');
console.log(`DSA visualizers: ${dsa.length}`);
```

---

## Next Steps

### Phase 3: Worker Integration (Week 3-4)

Scenario builders will auto-offload to worker. No code changes needed.

```typescript
// Still works same way:
const scenes = await lazyScenarioBuilder(scenario)(params);
// But Spring/AWS scenarios now run in worker
```

### Phase 4: Stateless Templates (Week 2-3)

DetailedTemplate → UnifiedRenderer (compatible):
```typescript
// OLD (still works):
<DetailedTemplate scenarios={scenarios} />

// NEW (optional, same visual):
<UnifiedRenderer visualizerId="detailed" layout="detailed" scenes={scenes} />
```

### Phase 5: Full Plugin System (Week 5-6)

Load visualizers from registry dynamically. No hardcoded routing.

---

## Support

- **Questions?** Check `ARCHITECTURE_REFACTOR.md` for full context
- **Bugs?** Run snapshot tests first: `npm test -- --update-snapshots`
- **Help?** Ask in `#architecture` on Slack
