import { DataTypesView, PubSubView, ClusterView, PipelineView } from './views';

const viewMap = {
  'data-types': DataTypesView,
  'pub-sub': PubSubView,
  cluster: ClusterView,
  pipeline: PipelineView,
};

export function getView(viewType) {
  return viewMap[viewType];
}

export function createView(viewType, viz) {
  if (!viz) return null;
  const View = getView(viewType);
  return View ? <View viz={viz} /> : null;
}
