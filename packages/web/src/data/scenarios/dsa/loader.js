export async function loadDsaScenarios(vizType) {
  switch (vizType) {
    case 'array':
      return import('../../../features/dsa/arrays/ArrayVisualizer/array-engine.js').then(m => m.SCENARIOS);
    case 'matrix':
      return import('../../../features/dsa/matrices/MatrixVisualizer/matrix-engine.js').then(m => m.SCENARIOS);
    case 'linkedlist':
      return import('../../../features/dsa/linked-lists/LinkedListVisualizer/linkedlist-engine.js').then(m => m.SCENARIOS);
    case 'string':
      return import('../../../features/dsa/strings/StringVisualizer/string-engine.js').then(m => m.SCENARIOS);
    case 'trie':
      return import('../../../features/dsa/tries/TrieVisualizer/trie-engine.js').then(m => m.SCENARIOS);
    case 'sorting':
      return import('../../../features/dsa/sorting/SortingVisualizer/sorting-engine.js').then(m => m.SCENARIOS);
    case 'graph':
      return import('../../../features/dsa/graphs/GraphVisualizer/graph-engine.js').then(m => m.SCENARIOS);
    case 'unionfind':
      return import('../../../features/dsa/union-find/UnionFindVisualizer/unionfind-engine.js').then(m => m.SCENARIOS);
    case 'backtracking':
      return import('../../../features/dsa/backtracking/BacktrackingVisualizer/backtracking-engine.js').then(m => m.SCENARIOS);
    case 'tree':
      return import('../../../features/dsa/trees/TreeVisualizer/tree-engine.js').then(m => m.SCENARIOS);
    case 'hashmap':
      return import('../../../features/dsa/hash-maps/HashMapVisualizer/hashmap-engine.js').then(m => m.SCENARIOS);
    case 'set':
      return import('../../../features/dsa/sets/SetVisualizer/set-engine.js').then(m => m.SCENARIOS);
    case 'dp':
      return import('../../../features/dsa/dynamic-programming/DPVisualizer/dp-engine.js').then(m => m.SCENARIOS);
    case 'twopointers':
      return import('../../../features/dsa/arrays/TwoPointersVisualizer/twopointers-engine.js').then(m => m.SCENARIOS);
    default:
      return null;
  }
}
