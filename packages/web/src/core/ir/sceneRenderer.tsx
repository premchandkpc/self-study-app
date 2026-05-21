// Generic Scene Renderer
// Renders any IR scene without knowledge of specific technologies

import { memo } from 'react';
import { IRScene, PrimitiveType } from './schema';

// Import real implementations
import { TreeRenderer } from './renderers/TreeRenderer';
import { TimelineRenderer } from './renderers/TimelineRenderer';
import { StateMachineRenderer } from './renderers/StateMachineRenderer';
import { PipelineRenderer } from './renderers/PipelineRenderer';
import { QueueRenderer } from './renderers/QueueRenderer';
import { GraphRenderer } from './renderers/GraphRenderer';
import { StackRenderer } from './renderers/StackRenderer';
import { NetworkRenderer } from './renderers/NetworkRenderer';
import { MatrixRenderer } from './renderers/MatrixRenderer';
import { TableRenderer } from './renderers/TableRenderer';
import { FlowchartRenderer } from './renderers/FlowchartRenderer';
import { SequenceRenderer } from './renderers/SequenceRenderer';

// Generic primitive renderers (technology-agnostic)
const PrimitiveRenderers: Record<PrimitiveType, React.ComponentType<{ scene: IRScene }>> = {
  queue: QueueRenderer,
  stack: StackRenderer,
  tree: TreeRenderer,
  graph: GraphRenderer,
  timeline: TimelineRenderer,
  pipeline: PipelineRenderer,
  state_machine: StateMachineRenderer,
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
