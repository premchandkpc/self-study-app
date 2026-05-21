export const STEP_META = ['narration', 'codeLine', 'complexity', 'metrics', 'events', 'type', 'vars', 'result'];

export const DSA_VIZ_TYPES = {
  array:      { required: ['cells'] },
  sort:       { required: ['arr'] },
  linkedlist: { required: ['nodes'] },
  tree:       { required: ['tree'] },
  graph:      { required: ['nodeStates'] },
  matrix:     { required: ['matrix'] },
  hashmap:    { required: ['buckets'] },
  dp:         { required: ['dp'] },
  string:     { required: ['chars'] },
  set:        { required: ['setA'] },
};

export const SYSTEM_DIAGRAM_FIELDS = ['nodes', 'edges', 'packets'];
export const TECH_DIAGRAM_FIELDS = ['boxes', 'flows'];

export function detectVizType(viz) {
  if (viz.type) return viz.type;
  if (viz.cells)                               return 'array';
  if (viz.arr && viz.arr[0]?.state !== undefined) return 'sort';
  // Check for array visualization (including arr1, arr2, array variations)
  if (viz.array || (viz.arr1 && !viz.nums) || (viz.arr2 && !viz.nums)) return 'array';
  if (viz.nodes && Array.isArray(viz.nodes))   return 'linkedlist';
  if (viz.list1 !== undefined && !Array.isArray(viz.list1)) return 'linkedlist';
  if (viz.tree)                                return 'tree';
  if (viz.nodeStates)                          return 'graph';
  if (viz.matrix)                              return 'matrix';
  if (viz.buckets)                             return 'hashmap';
  if (viz.dp || viz.table)                     return 'dp';
  if (viz.chars || viz.str !== undefined || viz.text) return 'string';
  if (viz.setA || (viz.arr1 && viz.nums && viz.k !== undefined)) return 'set';
  return null;
}
