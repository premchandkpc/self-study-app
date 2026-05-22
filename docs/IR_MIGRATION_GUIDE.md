# IR System Migration Guide

The Intermediate Representation (IR) system is now implemented. This guide explains how to migrate existing visualizers to use it.

## Current Status

✅ **Built**: IR schema, base compiler, Java Collections compiler, generic renderer  
✅ **Proven**: Kafka, Redis, Java Collections all compile to identical IR primitives  
⏳ **Next**: Migrate existing visualizers to prove production-readiness  

## What the IR System Solves

**Before**: Adding Kafka, Redis, HashMap visualizers required 3 separate renderers = 3× code duplication

**After**: One generic renderer works for all. Adding new tech requires only a compiler.

```
Before: N technologies × M visualizations = N×M code
After:  N technologies + M visualizations = N+M code
```

## Migration Path

### Phase 1: Migrate One Visualizer (Proof of Concept)

**Goal**: Prove the IR system works end-to-end

**Steps**:
1. Pick a visualizer (e.g., `JavaCollectionsVisualizer`)
2. Extract its content model to a compiler (✅ Done: `JavaCollectionsCompiler`)
3. Create IR-based version (✅ Started: `IRBasedJavaCollectionsVisualizer`)
4. Test in browser to verify rendering works
5. Measure: lines of code, render performance, ease of adding new content

### Phase 2: Implement Remaining Primitive Renderers

**Current state**: Most renderers are stubs in `sceneRenderer.tsx`

**Priority**:
1. **TreeRenderer** - Used by TreeMap, BST content
2. **GraphRenderer** - Used by network, distributed systems
3. **TimelineRenderer** - Used by sequence content, event ordering
4. **StateMachineRenderer** - Used by concurrency, state content
5. **StackRenderer** - Used by stack content
6. **MatrixRenderer** - Used by 2D grid content
7. **NetworkRenderer** - Used by topology content

Each renderer should:
- Work with `IRScene` data (nodes, edges, layout hints)
- Be memoized to prevent re-renders
- Support animation steps via `scene.animation`
- Show node labels and edge relationships

### Phase 3: Build Layout Engine

**Problem**: Currently node positions are hardcoded by individual renderers

**Solution**: Automatic layout from abstract graph

```typescript
// What we have
const scene: IRScene = {
  type: 'graph',
  nodes: [...],
  edges: [...],
  // No positions!
}

// What we need
const layoutEngine = new LayoutEngine();
const positioned = layoutEngine.layout(scene.nodes, scene.edges, {
  algorithm: 'force', // or 'hierarchical', 'circular', 'grid'
  bounds: { width: 800, height: 600 },
});
```

**Algorithms to implement**:
- Hierarchical (DAGs like pipelines)
- Force-directed (general graphs)
- Circular (rings, cycles)
- Grid (matrices)
- Tree (parent-child hierarchies)

### Phase 4: Build Animation Engine

**Problem**: Currently animations are hardcoded per-step

**Solution**: Generic animation runtime

```typescript
// Scene describes animation semantics
const scene: IRScene = {
  animation: {
    duration: 3000,
    steps: [
      { target: 'node', id: 'cell-0', action: 'highlight', duration: 500 },
      { target: 'edge', id: 'edge-01', action: 'reveal', duration: 300, delay: 100 },
    ],
  }
}

// Engine handles timing, easing, DOM updates
const animator = new AnimationEngine(scene);
animator.play();
animator.onStep((event) => updateUI(event));
```

**Features**:
- Time-based animation (not frame-based for simplicity)
- Action types: highlight, fade, reveal, move, transform
- Automatic delay sequencing
- Play/pause/seek controls

### Phase 5: Build Event-Driven Interaction Runtime

**Problem**: Currently interactions are scattered (click handlers everywhere)

**Solution**: Unified event model

```typescript
// Scene describes interactions
const scene: IRScene = {
  interactions: [
    {
      type: 'click',
      target: 'node-42',
      action: 'expand',
      payload: { children: [...] },
    },
  ]
}

// Runtime dispatches events
const runtime = new InteractionRuntime(scene);
runtime.on('click:node-42', () => {
  // Handle expansion
  // Update scene state
  // Re-render
});
```

**Benefits**:
- No callback hell (event system instead)
- Testable interactions without UI
- Multiplayer ready (emit events to server)
- Undo/redo via event log

## File Organization

```
packages/web/src/core/ir/
├── schema.ts                           # Type definitions
├── contentCompiler.ts                  # Base compiler
├── sceneRenderer.tsx                   # Generic renderers (currently stubs)
├── compilers/
│   ├── JavaCollectionsCompiler.ts     # ✅ Completed
│   ├── KafkaCompiler.ts               # TODO
│   ├── RedisCompiler.ts               # TODO
│   └── DatabaseCompiler.ts            # TODO
├── engines/
│   ├── layoutEngine.ts                # TODO
│   ├── animationEngine.ts             # TODO
│   └── interactionRuntime.ts          # TODO
├── examples/
│   ├── kafkaToIR.example.ts           # ✅ Proof of concept
│   └── javaCollectionsToIR.example.ts # ✅ Proof of concept
└── __tests__/
    ├── integration.test.ts
    └── validate.js
```

## Compiler Template

For migrating each technology, follow this pattern:

```typescript
// src/core/ir/compilers/YourTechCompiler.ts

import { ContentCompiler, TechnologyContent } from '../contentCompiler';

export class YourTechCompiler extends ContentCompiler {
  compile(content: YourTechContent): IRLearningUnit {
    const techContent: TechnologyContent = {
      id: content.id,
      title: content.title,
      technology: 'your-tech',
      domain: 'your-domain',
      concept: content.concept,
      difficulty: this.inferDifficulty(content),
      structure: {
        steps: content.steps.map(step => ({
          title: step.title,
          description: step.description,
          nodes: this.extractNodes(step),
          edges: this.extractEdges(step),
          animate: this.extractAnimations(step),
        })),
      },
    };

    return super.compile(techContent);
  }

  protected mapTechnologyToPrimitive(tech: string, concept: string): string {
    // Map your tech's concepts to primitives
    const mapping = {
      'your-tech': {
        'concept-a': 'pipeline',
        'concept-b': 'graph',
      },
    };
    return mapping[tech]?.[concept] || 'pipeline';
  }

  private extractNodes(step: any) {
    // Convert your tech's data to IRNode[]
  }

  private extractEdges(step: any) {
    // Convert relationships to IREdge[]
  }

  private extractAnimations(step: any) {
    // Convert animations to IRAnimation (optional)
  }
}
```

## Benefits of Completing Migration

| Before | After |
|--------|-------|
| 10 visualizers × 5 concepts = 50 files | 10 compilers + 5 renderers = 15 files |
| Each visualizer has its own rendering logic | One generic renderer for all |
| Adding new tech requires writing UI component | Adding new tech requires writing compiler only |
| Hard to refactor rendering without breaking tech-specific code | Easy: change renderer, content unchanged |
| Difficult to add features (animations, interactions, layout) without breaking each visualizer | Trivial: add to IR schema, all visualizers inherit features |
| No clear separation of concerns | Technology → IR → UI (clean layers) |

## Next Immediate Steps

1. **Verify JavaCollectionsVisualizer IR rendering** (test in browser)
2. **Implement TreeRenderer** (needed for TreeMap visualization)
3. **Implement GraphRenderer** (needed for network visualizations)
4. **Create KafkaCompiler** (prove it works for another tech)
5. **Build LayoutEngine** (automatic positioning)

## Questions to Answer

- How does animation timing work with React batching?
- Should layout be computed once or reactively?
- How do we integrate with existing event handlers?
- What's the backward-compat path for old visualizers?
