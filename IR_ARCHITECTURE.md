# Intermediate Representation (IR) Architecture

## Problem Solved

**Semantic Coupling**: Visualizers knew about specific technologies (Kafka, Redis, Java)

**Result**: Adding new technology required changing renderers

## Solution

### Three-Layer Architecture

```
TechnologyContent (Kafka, Redis, etc.)
         ↓
    Compiler
         ↓
    IR (Abstract)
         ↓
    Renderer (Generic)
```

## Benefits

| Before | After |
|--------|-------|
| `<KafkaRenderer />` | `<SceneRenderer primitive="pipeline" />` |
| Tech-specific logic | Technology-agnostic |
| N technologies × M visualizations = N×M code | N technologies + M visualizations = N+M code |
| Hard to add new tech | Easy to add new tech (just add compiler) |

## How It Works

### Step 1: Compile Content to IR

```typescript
const kafkaContent = { ... }; // Technology-specific
const compiler = new ContentCompiler();
const ir = compiler.compile(kafkaContent);
// Result: { type: 'pipeline', nodes: [...], edges: [...] }
```

### Step 2: Render IR Primitively

```typescript
<SceneRenderer scene={ir} />
// Renderer doesn't know what technology this was
// Works for Kafka, Redis, RabbitMQ identically
```

## IR Primitive Types

Instead of:
- KafkaVisualizer
- RedisVisualizer
- RabbitMQVisualizer

We have:
- `pipeline` - for pub/sub patterns
- `queue` - for queue patterns
- `state_machine` - for state transitions
- `graph` - for distributed networks
- `tree` - for hierarchies
- `timeline` - for sequences
- And more...

## Example

**Technology**: Kafka  
**Concept**: Pub/Sub  
**Specific Knowledge**: Producers, Topics, Partitions, Consumer Groups

↓ **Compile** ↓

**IR Type**: `pipeline`  
**Nodes**: [source, target, intermediate]  
**Edges**: [flow, flow, flow]  
**Primitive**: "A sequence of processing steps"

↓ **Render** ↓

**Output**: Generic pipeline visualization (boxes + arrows)  
**Works for**: Kafka, Redis, RabbitMQ, AWS SNS, custom systems

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│ Specific Technology Content                  │
│ (Kafka, Redis, Java, Go, etc.)             │
└────────────────┬────────────────────────────┘
                 │
                 ↓
         ┌───────────────┐
         │ ContentCompiler│  (maps tech → primitives)
         └───────┬───────┘
                 │
                 ↓
    ┌────────────────────────────┐
    │ IR (Semantic AST)          │
    │ - type: PrimitiveType      │
    │ - nodes: IRNode[]          │
    │ - edges: IREdge[]          │
    │ - animation: IRAnimation[] │
    └────────────┬───────────────┘
                 │
                 ↓
         ┌───────────────┐
         │SceneRenderer  │  (knows only primitives)
         └───────┬───────┘
                 │
                 ↓
    ┌────────────────────────────┐
    │ UI Output                  │
    │ (React components)         │
    └────────────────────────────┘
```

## Extension: Adding New Technology

**Before**: Add new visualizer component  
**After**: Add compiler for technology → IR

```typescript
class GoGoroutineCompiler extends ContentCompiler {
  mapTechnologyToPrimitive(tech, concept) {
    return concept === 'goroutine' ? 'state_machine' : 'graph';
  }
}
```

## Migration Path

### Phase 1: Implement IR
✅ Define schema  
✅ Create compiler  
✅ Create generic renderers  

### Phase 2: Migrate Existing Content
- Map Kafka → IR
- Map Redis → IR
- Map Java Collections → IR

### Phase 3: Remove Technology-Specific Code
- Delete KafkaRenderer
- Delete RedisRenderer
- Delete JavaCollectionsVisualizer-specific logic

### Phase 4: Scale
- AI can generate IR
- Mobile can render IR
- Canvas/WebGL can render IR
- Analytics works on IR events

## Future Capabilities

With IR in place:

### AI Integration
```typescript
const aiGenerated = await generateLearningPath('distributed systems');
// Returns IR directly - can be visualized immediately
```

### Cross-Platform Rendering
- React Web
- React Native
- Canvas/WebGL for high-performance
- SVG for print
- Terminal for CLI

### Analytics
```typescript
track({
  event: 'SCENE_COMPLETED',
  ir: { type: 'pipeline', complexity: 'high' },
  timeSpent: 340
});
// Analytics works on primitives, not specific tech
```

### Undo/Redo
```typescript
const prevState = { ...currentIR };
const nextState = interactionRuntime.applyInteraction(interaction);
```

### Multiplayer Learning
```typescript
emit('SCENE_CHANGED', { ir, userId, timestamp });
```

## Next Steps

1. **Remove semantic coupling** from JavaCollectionsVisualizer, DatabaseVisualizer, RedisVisualizer
2. **Map all existing content to IR**
3. **Build layout engine** (nodes shouldn't be hardcoded positions)
4. **Build animation engine** (step-by-step cognitive pacing)
5. **Build interaction runtime** (event-driven, not callback hell)
6. **Migrate to Canvas** for complex diagrams
