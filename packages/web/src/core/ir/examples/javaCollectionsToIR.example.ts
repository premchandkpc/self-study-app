// Example: Java Collections → Generic IR → Universal Renderer
// Shows how concrete Java Collections scenarios compile to abstract IR

import { JavaCollectionsCompiler } from '../compilers/JavaCollectionsCompiler';
import { IRLearningUnit } from '../schema';

// Example: ArrayList basic flow
const arrayListFlowScenario = {
  id: 'arraylist-flow-basic',
  label: 'ArrayList: Add/Remove/Get',
  collectionType: 'arraylist' as const,
  category: 'flow' as const,
  icon: '📋',
  code: 'ArrayList<Integer> list = new ArrayList<>();\nlist.add(42);\nlist.add(17);\nint val = list.get(0);',
  language: 'java',
  steps: [
    {
      title: 'ArrayList created',
      description: 'ArrayList created. capacity=10, size=0',
      cells: Array(10).fill(null).map((_, i) => ({ val: null, state: 'null' })),
      size: 0,
      capacity: 10,
    },
    {
      title: 'Add element',
      description: 'add(42) → O(1) amortized',
      cells: [
        { val: 42, state: 'new' },
        ...Array(9).fill(null).map(() => ({ val: null, state: 'null' })),
      ],
      size: 1,
      capacity: 10,
      ops: [{ msg: 'add(42) → index 0', type: 'ok' }],
    },
    {
      title: 'Get element',
      description: 'get(0) → Direct index O(1)',
      cells: [
        { val: 42, state: 'active' },
        ...Array(9).fill(null).map(() => ({ val: null, state: 'null' })),
      ],
      size: 1,
      capacity: 10,
    },
  ],
};

// Example: HashMap basic flow
const hashMapFlowScenario = {
  id: 'hashmap-flow-basic',
  label: 'HashMap: Put/Get/Collision',
  collectionType: 'hashmap' as const,
  category: 'flow' as const,
  icon: '🗺️',
  code: 'HashMap<String, Integer> map = new HashMap<>();\nmap.put("key1", 100);\nint val = map.get("key1");',
  language: 'java',
  steps: [
    {
      title: 'HashMap created',
      description: 'HashMap created with default capacity 16',
      buckets: Array(16).fill([]),
      size: 0,
    },
    {
      title: 'Put entry',
      description: 'put("key1", 100) → hash("key1") % 16 = bucket 5',
      buckets: Array(16)
        .fill([])
        .map((_, i) => (i === 5 ? [{ key: 'key1', val: 100, state: 'new' }] : [])),
      size: 1,
    },
    {
      title: 'Get entry',
      description: 'get("key1") → O(1) bucket lookup',
      buckets: Array(16)
        .fill([])
        .map((_, i) => (i === 5 ? [{ key: 'key1', val: 100, state: 'active' }] : [])),
      size: 1,
    },
  ],
};

// Compile both with JavaCollectionsCompiler
const compiler = new JavaCollectionsCompiler();

const arrayListIR: IRLearningUnit = compiler.compileScenario(arrayListFlowScenario as any);
const hashMapIR: IRLearningUnit = compiler.compileScenario(hashMapFlowScenario as any);

export const javaCollectionsIRExample = {
  arrayListIR,
  hashMapIR,
  proof: `
✅ ArrayList (array-based) → queue primitive
✅ HashMap (hash table) → table primitive
✅ Both compile to IR without renderer knowing the implementation
✅ Same rendering logic works for all collections
✅ Add new collection: just add compiler for it
✅ Change rendering: change renderer, not content
  `,
};

console.log('Java Collections IR Example:', {
  arrayListTitle: arrayListIR.title,
  arrayListType: arrayListIR.scenes[0].type,
  hashMapTitle: hashMapIR.title,
  hashMapType: hashMapIR.scenes[0].type,
  proof: 'Different data structures → same IR structure → universal rendering',
});
