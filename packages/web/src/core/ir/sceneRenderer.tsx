// Generic Scene Renderer
// Renders any IR scene without knowledge of specific technologies

import { memo } from 'react';
import { IRScene, PrimitiveType } from './schema';

// Import real implementations
import { TreeRenderer } from './renderers/TreeRenderer';
import { TimelineRenderer } from './renderers/TimelineRenderer';
import { StateMachineRenderer } from './renderers/StateMachineRenderer';

// Generic primitive renderers (technology-agnostic)
const PrimitiveRenderers: Record<PrimitiveType, React.ComponentType<{ scene: IRScene }>> = {
  queue: QueueRenderer,
  stack: StackRenderer,
  tree: TreeRenderer, // NOW REAL
  graph: GraphRenderer,
  timeline: TimelineRenderer, // NOW REAL
  pipeline: PipelineRenderer,
  state_machine: StateMachineRenderer, // NOW REAL
  network: NetworkRenderer,
  matrix: MatrixRenderer,
  table: TableRenderer,
  flowchart: FlowchartRenderer,
  sequence: SequenceRenderer,
};

export const SceneRenderer = memo(function SceneRenderer({ scene }: { scene: IRScene }) {
  const Renderer = PrimitiveRenderers[scene.type];

  if (!Renderer) {
    return <div>Unknown primitive type: {scene.type}</div>;
  }

  return <Renderer scene={scene} />;
});

// Generic Queue Renderer (works for Kafka, Redis Lists, etc.)
function QueueRenderer({ scene }: { scene: IRScene }) {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>{scene.title}</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '20px' }}>
        {scene.nodes.map((node) => (
          <div
            key={node.id}
            style={{
              padding: '10px 15px',
              background: '#e8f4f8',
              border: '1px solid #0ea5e9',
              borderRadius: '6px',
              minWidth: '80px',
              textAlign: 'center',
            }}
          >
            {node.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic Pipeline Renderer
function PipelineRenderer({ scene }: { scene: IRScene }) {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>{scene.title}</h3>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '20px' }}>
        {scene.nodes.map((node, i) => (
          <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div
              style={{
                padding: '10px 15px',
                background: '#f0fdf4',
                border: '1px solid #22c55e',
                borderRadius: '6px',
              }}
            >
              {node.label}
            </div>
            {i < scene.nodes.length - 1 && <div>→</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic Graph Renderer
function GraphRenderer({ scene }: { scene: IRScene }) {
  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>{scene.title}</h3>
      <div style={{ marginTop: '20px', fontSize: '12px' }}>
        <div>Nodes: {scene.nodes.length}</div>
        <div>Edges: {scene.edges.length}</div>
      </div>
    </div>
  );
}

// Stubs for other primitives
function StackRenderer({ scene }: { scene: IRScene }) {
  return <div>{scene.title} (Stack)</div>;
}

function NetworkRenderer({ scene }: { scene: IRScene }) {
  return <div>{scene.title} (Network)</div>;
}

function MatrixRenderer({ scene }: { scene: IRScene }) {
  return <div>{scene.title} (Matrix)</div>;
}

function TableRenderer({ scene }: { scene: IRScene }) {
  return <div>{scene.title} (Table)</div>;
}

function FlowchartRenderer({ scene }: { scene: IRScene }) {
  return <div>{scene.title} (Flowchart)</div>;
}

function SequenceRenderer({ scene }: { scene: IRScene }) {
  return <div>{scene.title} (Sequence)</div>;
}
