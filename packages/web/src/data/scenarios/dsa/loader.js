export async function loadDsaScenarios(vizType) {
  switch (vizType) {
    case 'array':
      return import('../../../components/visualizers/ArrayVisualizer/array-engine.js').then(m => m.SCENARIOS);
    case 'matrix':
      return import('../../../components/visualizers/MatrixVisualizer/matrix-engine.js').then(m => m.SCENARIOS);
    case 'linkedlist':
      return import('../../../components/visualizers/LinkedListVisualizer/linkedlist-engine.js').then(m => m.SCENARIOS);
    case 'string':
      return import('../../../components/visualizers/StringVisualizer/string-engine.js').then(m => m.SCENARIOS);
    case 'trie':
      return import('../../../components/visualizers/TrieVisualizer/trie-engine.js').then(m => m.SCENARIOS);
    case 'sorting':
      return import('../../../components/visualizers/SortingVisualizer/sorting-engine.js').then(m => m.SCENARIOS);
    case 'graph':
      return import('../../../components/visualizers/GraphVisualizer/graph-engine.js').then(m => m.SCENARIOS);
    case 'unionfind':
      return import('../../../components/visualizers/UnionFindVisualizer/unionfind-engine.js').then(m => m.SCENARIOS);
    case 'backtracking':
      return import('../../../components/visualizers/BacktrackingVisualizer/backtracking-engine.js').then(m => m.SCENARIOS);
    case 'tree':
      return import('../../../components/visualizers/TreeVisualizer/tree-engine.js').then(m => m.SCENARIOS);
    case 'hashmap':
      return import('../../../components/visualizers/HashMapVisualizer/hashmap-engine.js').then(m => m.SCENARIOS);
    case 'set':
      return import('../../../components/visualizers/SetVisualizer/set-engine.js').then(m => m.SCENARIOS);
    case 'dp':
      return import('../../../components/visualizers/DPVisualizer/dp-engine.js').then(m => m.SCENARIOS);
    case 'twopointers':
      return import('../../../components/visualizers/TwoPointersVisualizer/twopointers-engine.js').then(m => m.SCENARIOS);
    default:
      return null;
  }
}
