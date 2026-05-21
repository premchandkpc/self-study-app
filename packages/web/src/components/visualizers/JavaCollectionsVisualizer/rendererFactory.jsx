import { ArrayListRenderer, LinkedListRenderer, BucketRenderer, TreeMapRenderer, PriorityQueueRenderer, ArrayDequeRenderer, ConcurrentHashMapRenderer, CopyOnWriteRenderer } from './types';

const rendererMap = {
  arraylist: ArrayListRenderer,
  linkedlist: LinkedListRenderer,
  hashmap: BucketRenderer,
  hashset: BucketRenderer,
  treemap: TreeMapRenderer,
  priorityqueue: PriorityQueueRenderer,
  arraydeque: ArrayDequeRenderer,
  concurrenthashmap: ConcurrentHashMapRenderer,
  concurrent: ConcurrentHashMapRenderer,
  copyonwritearraylist: CopyOnWriteRenderer,
};

export function getRenderer(collectionType) {
  return rendererMap[collectionType];
}

export function createVizRenderer(viz) {
  if (!viz) return null;
  const Renderer = getRenderer(viz.collectionType);
  return Renderer ? <Renderer viz={viz} /> : null;
}
