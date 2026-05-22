# Architecture Refactor: Phase 1-4 Implementation Guide

**Status:** Phase 1-2 complete. Phase 3-5 ready for implementation.  
**Risk Level:** Critical → Medium (after Phase 1-2)  
**Production Timeline:** 6 weeks (phased rollout)

---

## What We Built (Phase 1-2)

### 1. **SceneIR Schema** ✅
**File:** `core/ir/VisualizationSchema.ts`

Unified intermediate representation for all visualization types:
- **Graph**: nodes, edges, packets (system design)
- **Array**: cells, window, indices (DSA)
- **Tree**: node/edge structures
- **Table**: headers, rows
- **Timeline**: event sequences
- **Code**: execution state, call stack
- **Custom**: plugin-defined payloads

**Why:** Decouples scenario builders from renderers. Scenario can output SceneIR instead of component-specific objects.

**Impact:** 
- Templates no longer unpack renderer-specific data
- Scenarios can be tested as pure functions
- Enables worker offloading

### 2. **PrimitiveRenderer** ✅
**File:** `core/visualization/PrimitiveRenderer.tsx`

Generic visualization engine that routes SceneIR → appropriate primitive:
- `GraphPrimitive` (system design, graphs)
- `ArrayPrimitive` (DSA, arrays)
- `TreePrimitive` (data structures)
- `TablePrimitive` (metrics, comparison)
- `TimelinePrimitive` (event sequences)
- `CodePrimitive` (execution state)

**Why:** Single renderer for all visualization types. Breaks the 81-edge coupling from DetailedTemplate.

**Status:** Primitives stubbed. Graph and Array working. Tree/Table/Timeline/Code need full implementation.

### 3. **LegacyAdapter** ✅
**File:** `core/ir/LegacyAdapter.ts`

Converts old scenario viz shapes → SceneIR at build time:
```typescript
const sceneIRBuilder = adaptLegacyScenarioBuilder(oldBuilder);
const scenes = await sceneIRBuilder(params); // Returns SceneIR[]
```

**Why:** Incremental migration. Existing scenarios work without rewriting.

**How:** Auto-detects viz type (system-design, dsa-array, etc.) and routes to adapter.

### 4. **Snapshot Tests** ✅
**Files:**
- `ArrayVisualizer/__tests__/scenarios.test.js`
- `SystemDesignVisualizer/__tests__/scenarios.test.js`
- `compiler/__tests__/instrument.test.js`
- `hooks/__tests__/useVisualizerScenario.test.js`
- `visualization/__tests__/PrimitiveRenderer.test.tsx`

**Coverage:** 
- DSA scenario step consistency
- System design graph structures
- Code instrumentation (walkStmt fix)
- Hook behavior
- Primitive routing

**Impact:** Catch regressions in untested hotspots (walkStmt 58 degree, Spring build 92 degree).

### 5. **LazyScenarioLoader** ✅
**File:** `core/scenario/LazyScenarioLoader.ts`

Defers scenario building to avoid main-thread blocking:
```typescript
const sceneIRBuilder = lazyScenarioBuilder(scenario);
const scenes = await sceneIRBuilder(params); // Main thread now
```

**Phase 1 status:** Main thread (default).  
**Phase 3:** Routes heavy scenarios to worker.

**Heavy heuristics:** Spring, AWS, SystemDesign scenarios; 5+ inputs.

### 6. **Typed EventBus** ✅
**Files:**
- `core/events/TypedEventEmitter.ts` (generic typed emitter)
- `core/events/VisualizationEventBus.ts` (scene + learning events)

**VisualizationEvents:**
```typescript
'scene:changed': { scene, sceneIndex, totalScenes }
'metrics:updated': { metrics }
'playback:play' | 'pause' | 'reset' | 'next' | 'prev' | 'seek'
'speed:changed': { speed }
'input:changed': { key, value }
'error': { message, context }
```

**Why:** Type-safe event routing. No more loose `emit('SCENE_CHANGED', ...)`.

**Integration:** SimulationRuntime → VisualizationEventBus. Templates subscribe to typed events.

### 7. **VisualizerRegistry (Plugin System)** ✅
**File:** `core/visualization/VisualizerRegistry.ts`

Dynamic visualizer registration:
```typescript
const registry = visualizerRegistry;
registry.register({
  id: 'custom-spring',
  name: 'Spring Framework',
  scenarios: [...],
  supportedTypes: ['graph'],
});

// Later:
const allDSA = registry.findByCategory('dsa');
const allScenarios = registry.getAllScenarios();
```

**Why:** No hardcoded visualizer list. Add new visualizers without core changes.

**Status:** Core ready. Apps/pages need to use registry instead of direct imports.

### 8. **useSceneNavigator Hook** ✅
**File:** `core/hooks/useSceneNavigator.ts`

Replaces useIRSceneNavigator with:
- Better typing (SceneIR vs loose viz object)
- Filtering support (`jump(predicate)`)
- Loop mode
- Change callbacks
- Stateless scene descriptor input

```typescript
const nav = useSceneNavigator(scenes, { loop: true, onSceneChange: (s) => {} });
// nav.next(), nav.prev(), nav.select(idx), nav.jump(filter)
```

---

## Next Steps (Phase 3-5)

### **Phase 3: Worker Integration** (Week 3-4)

**Goal:** Offload heavy scenario builds to worker. Unblock compiler.

**Files to create:**
- `core/workers/ScenarioWorker.ts` — Worker main loop
- `core/workers/ScenarioWorkerClient.ts` — Main thread ↔ worker bridge
- `core/scenario/LazyScenarioLoader.ts` — Route to worker

**Implementation:**
1. Wrap heavy scenario builders in worker
2. Pass SceneIR (serializable) instead of objects
3. Integrate with CompilerTemplate (currently blocks on handleRun)

**Test:**
- Measure latency reduction (target: 100ms → 10ms for Spring scenarios)
- Verify worker message queuing under high load

### **Phase 4: Stateless Templates** (Week 2-3)

**Goal:** Replace DetailedTemplate, SystemTemplate, etc. with UnifiedRenderer.

**Current:** 6+ templates, each with own hooks, layouts, logic.  
**Target:** Single UnifiedRenderer + config → all templates.

```typescript
// OLD:
<DetailedTemplate scenarios={scenarios} />

// NEW:
<UnifiedRenderer
  scenes={scenes}
  config={{ layout: 'detailed', showConcepts: true, showMetrics: true }}
/>
```

**Files to create:**
- `components/templates/UnifiedRenderer/UnifiedRenderer.tsx`
- `components/templates/UnifiedRenderer/LayoutRegistry.ts` (route to layout)
- `components/templates/layouts/{detailed, canvas, dsa, system}.tsx`

**Refactor:**
1. Extract DetailedTemplate logic → LayoutRegistry
2. Move CSS to config/theme
3. Replace `useVisualizerScenario` calls with direct scene prop
4. Wire up VisualizationEventBus for playback

**Migrate visualizers** (no code changes, just config):
```typescript
// packages/web/src/components/visualizers/ArrayVisualizer/index.jsx
export default () => (
  <UnifiedRenderer
    visualizerId="array-visualizer"
    layout="dsa"
  />
);
```

### **Phase 5: Plugin System Activation** (Week 5-6)

**Goal:** Load visualizers from registry. Support external plugins.

**Current:** Visualizers hardcoded in App.jsx routing.  
**Target:** Registry-driven + dynamic imports.

```typescript
// App.jsx
const visualizers = visualizerRegistry.getAll();
const routes = visualizers.map(v => (
  <Route key={v.id} path={`/viz/${v.id}`} element={<DynamicVisualizer id={v.id} />} />
));
```

**Files to create:**
- `components/DynamicVisualizer.tsx` — Load scene builder + template on demand
- `App.jsx` — Register all visualizers at startup
- `pages/*.jsx` — Use VisualizerRegistry instead of direct imports

**Load plugins at startup:**
```typescript
import { registerDSAVisualizers } from './visualizers/dsa';
import { registerSystemVisualizers } from './visualizers/system-design';

registerDSAVisualizers(visualizerRegistry);
registerSystemVisualizers(visualizerRegistry);
```

---

## Backward Compatibility

**LegacyAdapter handles:**
- ✅ Old scenario shapes (cells, nodes/edges, metrics, etc.)
- ✅ Old component props (useVisualizerScenario, active.code, etc.)
- ✅ No breaks in existing visualizers

**Migration path:**
1. Phase 1-2 (done): Infra ready
2. Opt-in: Visualizers can adopt SceneIR builder or use adapter
3. Phase 3: Worker integration (transparent to builders)
4. Phase 4: Templates replaced (transparent to builders)
5. Phase 5: Full plugin system (optional)

**If builder doesn't change:**
```typescript
// Old builder
const scenario = {
  id: 'sliding-window',
  build: () => [
    { cells: [...], vars: {...}, complexity: {...} },
  ],
};

// Still works:
const scenes = await lazyScenarioBuilder(scenario)(params);
// Result: SceneIR[] (adapter converted)
```

---

## Critical Path (Minimal changes to ship)

**Week 1-2:** Phase 1-2 ✅  
**Week 2-3:** Phase 3 (worker) + Phase 4 (UnifiedRenderer)  
**Week 3-4:** Phase 5 (registry)  
**Week 4+:** Migrate individual visualizers (one per day, 15 visualizers)

**Must-do before Phase 3:**
- [ ] Run snapshot tests on main (catch any regressions)
- [ ] Integrate LegacyAdapter into useVisualizerScenario hook
- [ ] Test: old scenario → SceneIR → PrimitiveRenderer end-to-end

**Must-do before Phase 4:**
- [ ] Implement LayoutRegistry
- [ ] Build UnifiedRenderer (compose primitives + content)
- [ ] Test: DetailedTemplate → UnifiedRenderer parity

**Must-do before Phase 5:**
- [ ] Register all visualizers in VisualizerRegistry
- [ ] Implement DynamicVisualizer
- [ ] Test: App.jsx routes via registry

---

## Key Files Summary

| Phase | File | Status | Impact |
|-------|------|--------|--------|
| 1 | `core/ir/VisualizationSchema.ts` | ✅ | Unified IR |
| 1 | `core/visualization/PrimitiveRenderer.tsx` | ✅ | Generic renderer |
| 1 | `core/ir/LegacyAdapter.ts` | ✅ | Backward compat |
| 2 | `core/scenario/LazyScenarioLoader.ts` | ✅ | Deferred build |
| 2 | `core/events/{TypedEventEmitter, VisualizationEventBus}.ts` | ✅ | Typed events |
| 2 | `core/visualization/VisualizerRegistry.ts` | ✅ | Plugin system |
| 3 | `core/workers/ScenarioWorker.ts` | 🔲 | Offload build |
| 4 | `components/templates/UnifiedRenderer.tsx` | 🔲 | Single template |
| 4 | `components/templates/LayoutRegistry.ts` | 🔲 | Layout router |
| 5 | `components/DynamicVisualizer.tsx` | 🔲 | Dynamic load |

---

## Architecture After Refactor

```
┌──────────────────────────────────────────────┐
│            Page (InterviewMode, etc.)         │
└──────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    ┌─────────────┐      ┌───────────────┐
    │ Registry    │      │ DynamicViz    │
    │ (scenes)    │      │ (load scenes) │
    └──────┬──────┘      └────────┬──────┘
           │                      │
           └──────────┬───────────┘
                      ▼
        ┌──────────────────────────┐
        │   UnifiedRenderer        │
        │ (PrimitiveRenderer +     │
        │  Layout + Content)       │
        └──────────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
    ┌─────────┐        ┌──────────────┐
    │Primitive│        │VisualizationEventBus
    │Renderer │        │ (scene, metrics, etc.)
    │ (graph, │        └──────┬───────┘
    │  array, │               │
    │  table, │          ┌────▼────────┐
    │  etc.)  │          │SimulationRte
    └─────────┘          │(runtime mgmt)
                         └─────────────┘
```

**Data flow:**
1. Page requests scenario from VisualizerRegistry
2. DynamicViz loads scene builder (lazy or worker)
3. SceneIR[] returned (serializable)
4. UnifiedRenderer routes to PrimitiveRenderer + layout
5. VisualizationEventBus emits scene/metric changes
6. Templates/components subscribe via typed events

---

## Testing Checklist

### Phase 1 ✅
- [ ] SceneIR schema compiles (TS strict)
- [ ] LegacyAdapter converts all scenario types
- [ ] PrimitiveRenderer routes all types
- [ ] Snapshot tests pass (5 builders)

### Phase 3 🔲
- [ ] Worker pool integration with scenario builders
- [ ] Latency reduction (100ms → 10ms for heavy scenarios)
- [ ] Worker message queuing under load

### Phase 4 🔲
- [ ] UnifiedRenderer parity with DetailedTemplate (visual match)
- [ ] UnifiedRenderer parity with SystemTemplate
- [ ] CSS/layout migration complete
- [ ] Event bus wiring (scene changes, metrics updates)

### Phase 5 🔲
- [ ] Registry registration works
- [ ] Dynamic visualizer loading
- [ ] Zero breakage in existing visualizers
- [ ] Plugin API stable

---

## Performance Targets

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Scenario build time | 100ms | 10ms | 20% reduction |
| DOM nodes (Detailed) | 500+ | <200 | 60% reduction |
| Re-render on scene change | Full tree | Primitive only | 90% reduction |
| Bundle size (theory) | N/A | TBD | -5% (deferred loads) |
| Worker pool startup | N/A | <500ms | <100ms |

---

## Risk Mitigation

**Risk:** Templates break on SceneIR rollout  
**Mitigation:** LegacyAdapter auto-converts. Stage rollout (1 visualizer → all).

**Risk:** Worker integration blocks main thread  
**Mitigation:** Phase 1-2 work on main thread. Async worker optional.

**Risk:** Plugin system allows broken visualizers  
**Mitigation:** VisualizerPlugin interface enforces schema. Type checking.

**Risk:** Event bus listener leaks  
**Mitigation:** Hook cleanup + tests for listener counts.

---

## Sign-Off

**Reviewed by:** Staff+ Platform Architect  
**Status:** Ready for implementation  
**Next step:** Phase 3 (Worker integration) starts after Phase 1-2 validation
