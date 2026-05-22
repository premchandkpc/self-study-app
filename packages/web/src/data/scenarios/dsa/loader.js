export async function loadDsaScenarios(vizType) {
  switch (vizType) {
    case 'array':
      return import('../../../legacy/dsa/arrays/ArrayVisualizer/array-engine.js').then(m => m.SCENARIOS);
    case 'matrix':
      return import('../../../legacy/dsa/matrices/MatrixVisualizer/matrix-engine.js').then(m => m.SCENARIOS);
    case 'linkedlist':
      return import('../../../legacy/dsa/linked-lists/LinkedListVisualizer/linkedlist-engine.js').then(m => m.SCENARIOS);
    case 'string':
      return import('../../../legacy/dsa/strings/StringVisualizer/string-engine.js').then(m => m.SCENARIOS);
    case 'trie':
      return import('../../../legacy/dsa/tries/TrieVisualizer/trie-engine.js').then(m => m.SCENARIOS);
    case 'sorting':
      return import('../../../legacy/dsa/sorting/SortingVisualizer/sorting-engine.js').then(m => m.SCENARIOS);
    case 'graph':
      return import('../../../legacy/dsa/graphs/GraphVisualizer/graph-engine.js').then(m => m.SCENARIOS);
    case 'unionfind':
      return import('../../../legacy/dsa/union-find/UnionFindVisualizer/unionfind-engine.js').then(m => m.SCENARIOS);
    case 'backtracking':
      return import('../../../legacy/dsa/backtracking/BacktrackingVisualizer/backtracking-engine.js').then(m => m.SCENARIOS);
    case 'tree':
      return import('../../../legacy/dsa/trees/TreeVisualizer/tree-engine.js').then(m => m.SCENARIOS);
    case 'hashmap':
      return import('../../../legacy/dsa/hash-maps/HashMapVisualizer/hashmap-engine.js').then(m => m.SCENARIOS);
    case 'set':
      return import('../../../legacy/dsa/sets/SetVisualizer/set-engine.js').then(m => m.SCENARIOS);
    case 'dp':
      return import('../../../legacy/dsa/dynamic-programming/DPVisualizer/dp-engine.js').then(m => m.SCENARIOS);
    case 'twopointers':
      return import('../../../legacy/dsa/arrays/TwoPointersVisualizer/twopointers-engine.js').then(m => m.SCENARIOS);
    default:
      return null;
  }
}
