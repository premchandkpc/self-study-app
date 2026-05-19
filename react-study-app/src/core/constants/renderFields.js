export const DEFAULT_RENDER_FIELDS = new Set([
  'cells','arr','nodes','origNext','tree','nodeStates','edgeStates',
  'matrix','buckets','dp','chars','str','text','setA','setB','arr1','arr2','nums',
  'type','narration','codeLine','events','complexity','vars','result',
  'union','intersect','diff','highlightA','highlightB','visited','cycleTarget',
  'heapSize','groups','partitionRange','metrics',
  'list1','list2','mergedNodes','reversed','charStates','patternStates',
  'activeBucket','activeIndex','activeOp','resultIndices',
  'pointers','window','queue','path','prefix','query',
  'base','active','deps','kind','rowLabels','colLabels','labels','table',
  'activeRow','activeCol','activeI','activeJ','windowIndices','foundIndices',
]);

export function buildRenderFields(customFields = []) {
  if (!customFields.length) return DEFAULT_RENDER_FIELDS;
  const merged = new Set(DEFAULT_RENDER_FIELDS);
  for (const f of customFields) merged.add(f);
  return merged;
}
