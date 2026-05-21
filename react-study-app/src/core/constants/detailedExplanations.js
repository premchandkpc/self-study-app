export const DETAILED_EXPLANATIONS = {
  // ============= DSA DETAILED =============
  arrays: {
    title: 'Arrays: The Foundation',
    deepDive: `
Arrays are contiguous memory blocks. Accessing element at index i is literally:
  address = base_address + (i × element_size)
This is O(1) because CPU does simple arithmetic, no searching.

SLIDING WINDOW TECHNIQUE:
When problem asks "find max sum subarray of size k":
- Naive: try every k-length window = O(n×k)
- Sliding: maintain current sum, slide right edge, remove left edge = O(n)
Example: [1,2,3,4,5], k=3 → windows [1,2,3], [2,3,4], [3,4,5]
Each slide: remove left element (1), add right element (4,5). O(1) per slide.

TWO POINTER PATTERN:
Works on sorted arrays. Example: find two numbers that sum to target [1,2,3,7,11], target=9
- Left pointer at start (1), right pointer at end (11)
- Sum = 1+11=12 > 9 → move right pointer left
- Sum = 1+7=8 < 9 → move left pointer right
- Sum = 2+7=9 → found! O(n) with no extra space.

PREFIX SUM OPTIMIZATION:
Query: "sum of elements from index 2 to 5?"
- Naive: loop from 2 to 5, sum = O(n)
- Prefix: precompute prefix[i] = sum(0..i)
  answer = prefix[5] - prefix[1] = O(1)
Build prefix in O(n), then unlimited O(1) queries.

GOTCHAS:
- Integer overflow: storing sum of 1M numbers in int causes overflow
- Off-by-one errors: confuse inclusive/exclusive bounds
- Cache locality: accessing array sequentially is fast, jumping around is slow
    `,
    codeExample: `
// Sliding Window: Max sum subarray of size k
const maxSumWindow = (arr, k) => {
  let sum = arr.slice(0, k).reduce((a,b) => a+b, 0);
  let maxSum = sum;

  for (let i = k; i < arr.length; i++) {
    sum = sum - arr[i-k] + arr[i]; // O(1): remove left, add right
    maxSum = Math.max(maxSum, sum);
  }
  return maxSum;
};

// Two Sum with two pointers
const twoSum = (arr, target) => {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    const sum = arr[left] + arr[right];
    if (sum === target) return [arr[left], arr[right]];
    if (sum < target) left++;
    else right--;
  }
  return null; // No solution
};

// Prefix Sum queries
const buildPrefixSum = (arr) => {
  const prefix = [0];
  for (let i = 0; i < arr.length; i++) {
    prefix[i+1] = prefix[i] + arr[i];
  }
  return prefix;
};

const rangeSum = (prefix, left, right) => {
  return prefix[right+1] - prefix[left]; // O(1)!
};
    `,
    visualization: `
Array [2, 3, 5, 1, 4] with k=3:
[2, 3, 5] sum=10
   [3, 5, 1] sum=9  (removed 2, added 1)
      [5, 1, 4] sum=10 (removed 3, added 4)

Window slides by removing leftmost & adding rightmost = O(1) per slide
    `,
    realWorldScales: 'YouTube stores 800M+ videos: metadata in arrays sorted by upload date enables fast range queries using binary search.',
    performanceTips: [
      'Use arrays for sequential access (cache friendly)',
      'Avoid shifting elements (O(n)) - use pointers instead',
      'Consider space: 1M integers = 4MB RAM',
      'Sliding window beats nested loops for subarray problems'
    ]
  },

  binarySearch: {
    title: 'Binary Search: Logarithmic Magic',
    deepDive: `
BINARY SEARCH FUNDAMENTALS:
Requires sorted array. Divide search space in half each iteration.
Iterations = log₂(n): searching 1M items takes only log₂(1M) ≈ 20 iterations!

STEP BY STEP:
Array: [1, 3, 5, 7, 9, 11, 13], target = 7
- Iteration 1: left=0, right=6, mid=3, arr[3]=7 → FOUND!
- If target > arr[mid]: left = mid+1 (search right half)
- If target < arr[mid]: right = mid-1 (search left half)

TIME COMPLEXITY:
- Array size 1M: log₂(1M) ≈ 20 comparisons
- Array size 1B: log₂(1B) ≈ 30 comparisons
Contrast: Linear search on 1B items = 500M comparisons average!

VARIANTS:
1. Find exact element: classic binary search
2. Find first occurrence of value: search in left half even if found
3. Find insertion position: where to insert to keep sorted
4. Search rotated array: detect which half is sorted, search that half
5. Find boundary: first element >= target (upper bound), first element > target

GOTCHAS:
- Integer overflow: mid = (left + right) / 2 overflows for large numbers
  Fix: mid = left + (right - left) / 2
- Off-by-one: confusing <= vs <, inclusive vs exclusive bounds
- Assumes sorted: if unsorted, must sort first O(n log n)
    `,
    codeExample: `
// Standard binary search
const binarySearch = (arr, target) => {
  let left = 0, right = arr.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2); // Avoid overflow

    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1; // Not found
};

// Find first occurrence (leftmost)
const findFirstOccurrence = (arr, target) => {
  let left = 0, right = arr.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (arr[mid] === target) {
      result = mid;
      right = mid - 1; // Keep searching left
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return result;
};

// Search in rotated array [4,5,6,7,0,1,2]
const searchRotated = (arr, target) => {
  let left = 0, right = arr.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (arr[mid] === target) return mid;

    // Determine which half is sorted
    if (arr[left] <= arr[mid]) { // Left half is sorted
      if (arr[left] <= target && target < arr[mid]) {
        right = mid - 1; // Target in sorted left half
      } else {
        left = mid + 1; // Target in right half
      }
    } else { // Right half is sorted
      if (arr[mid] < target && target <= arr[right]) {
        left = mid + 1; // Target in sorted right half
      } else {
        right = mid - 1; // Target in left half
      }
    }
  }
  return -1;
};
    `,
    visualization: `
Searching for 7 in [1,3,5,7,9,11,13]:
[1, 3, 5, |7|, 9, 11, 13]
       ↑
    Found in 1 iteration!

Searching for 11 in [1,3,5,7,9,11,13]:
[1, 3, 5, |7|, 9, 11, 13]  → 11 > 7, search right
         [9, |11|, 13]        → 11 == 11, found in 2 iterations
    `,
    realWorldScales: 'Instagram: Binary search finds users by ID in sharded database. 1B users, ID lookup in 30 comparisons.',
    performanceTips: [
      'Use overflow-safe mid calculation',
      'Understand search space before implementing',
      'Test boundary cases (single element, not found, first/last)',
      'For rotated arrays, identify sorted half first'
    ]
  },

  graphs: {
    title: 'Graphs: Everything is Connected',
    deepDive: `
GRAPH BASICS:
Vertices (nodes) + Edges (connections). Real-world: social networks, maps, dependencies.

REPRESENTATIONS:
1. Adjacency List: node → list of neighbors
   Space: O(V+E), best for sparse graphs
   Example: {0: [1,2], 1: [0,3], 2: [0], 3: [1]}

2. Adjacency Matrix: V×V matrix where matrix[i][j] = edge weight
   Space: O(V²), best for dense graphs
   Access edge: O(1), but space wasteful for sparse graphs

TRAVERSALS:
BFS (Breadth-First Search):
- Explore all neighbors at current distance before moving farther
- Uses queue, finds shortest path in unweighted graphs
- O(V+E) time, O(V) space for queue

DFS (Depth-First Search):
- Explore one path as deep as possible, backtrack
- Uses stack/recursion, finds connected components, cycles
- O(V+E) time, O(V) space for recursion stack

DIJKSTRA'S ALGORITHM (Shortest Path in Weighted Graphs):
- Greedy: always explore closest unvisited node
- Works only with non-negative weights
- O((V+E) log V) with priority queue
- Example: GPS navigation, finding route between cities

GOTCHAS:
- Directed vs undirected: social follow is directed (A follows B ≠ B follows A)
- Weighted vs unweighted: map has weights (distances), social graph doesn't
- Cycles: DFS detects back edges, BFS might not detect cycles easily
- Disconnected components: some nodes unreachable from others
    `,
    codeExample: `
// BFS: Find shortest path from start to target
const bfs = (graph, start, target) => {
  const queue = [start];
  const visited = new Set([start]);
  const parent = {[start]: null};

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === target) break;

    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent[neighbor] = node;
        queue.push(neighbor);
      }
    }
  }

  // Reconstruct path
  const path = [];
  let current = target;
  while (current !== null) {
    path.unshift(current);
    current = parent[current];
  }
  return path;
};

// DFS: Find connected component
const dfs = (graph, start) => {
  const visited = new Set();
  const component = [];

  const dfsHelper = (node) => {
    visited.add(node);
    component.push(node);

    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        dfsHelper(neighbor);
      }
    }
  };

  dfsHelper(start);
  return component;
};

// Dijkstra: Shortest path with weights
const dijkstra = (graph, start) => {
  const distances = {[start]: 0};
  const visited = new Set();
  const pq = [[0, start]]; // [distance, node]

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [dist, node] = pq.shift();

    if (visited.has(node)) continue;
    visited.add(node);

    for (const [neighbor, weight] of graph[node]) {
      const newDist = dist + weight;
      if (!distances[neighbor] || newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        pq.push([newDist, neighbor]);
      }
    }
  }

  return distances;
};
    `,
    visualization: `
Social network graph:
    A ---- B
    |    / |
    |  /   |
    C ---- D

BFS from A: [A] → [B,C] → [D]
DFS from A: [A] → [B] → [D] → [C]

Dijkstra with weights on edges:
A --(1)-- B
|         |
(2)      (3)
|         |
C --(1)-- D

Shortest path A→D: A-C-D = 2+1 = 3 (not A-B-D = 1+3 = 4)
    `,
    realWorldScales: 'Instagram: Social graph with 2B+ users. Finding mutual friends (intersection of two nodes\' adjacency lists). Finding influencer chains (BFS from celebrity).',
    performanceTips: [
      'BFS for shortest path in unweighted graphs',
      'DFS for connected components and cycle detection',
      'Dijkstra only for non-negative weights',
      'Use adjacency list for sparse graphs (social networks)',
      'Use adjacency matrix for dense graphs'
    ]
  },

  dynamicProgramming: {
    title: 'Dynamic Programming: Overlapping Subproblems',
    deepDive: `
CONCEPT:
DP solves problems by breaking into overlapping subproblems, storing results to avoid recomputation.
Two approaches: top-down (memoization) and bottom-up (tabulation).

FIBONACCI EXAMPLE:
Naive recursion: fib(5) = fib(4) + fib(3) = ... recomputes fib(3) multiple times!
fib(5) calls fib(4), fib(4) calls fib(3), fib(3) calls fib(2)... exponential time O(2^n)!

With memoization: store fib(2)=1, fib(3)=2, fib(4)=3, reuse for fib(5)
Time: O(n), Space: O(n) for cache

COIN CHANGE PROBLEM:
Given coins [1, 2, 5], minimum coins to make amount 11?
11 = 5 + 5 + 1 (3 coins) is optimal

DP approach:
- dp[0] = 0 (0 coins for amount 0)
- dp[i] = min(dp[i-coin] + 1) for each coin ≤ i
- dp[1] = 1 (one 1-coin)
- dp[2] = 1 (one 2-coin)
- dp[5] = 1 (one 5-coin)
- dp[11] = min(dp[10]+1, dp[9]+1, dp[6]+1) = min(3, 3, 2) = 2 from dp[6]+one 5-coin

KNAPSACK PROBLEM:
Items with weight & value. Knapsack capacity W. Maximize value?
DP[i][w] = max value using items 0..i-1 with capacity w
For each item: skip it or take it (if fits)
DP[i][w] = max(DP[i-1][w], DP[i-1][w-weight[i]] + value[i])

LONGEST COMMON SUBSEQUENCE (LCS):
Two strings, find longest matching subsequence (not necessarily contiguous)
"ABCDGH" and "AEDFHR" → LCS is "ADH" (length 3)
DP[i][j] = length of LCS for str1[0..i] and str2[0..j]

GOTCHAS:
- Identifying subproblems: must break into smaller versions of same problem
- Base cases: what's the simplest case that doesn't need computation?
- Order of computation: ensure dependencies computed first
- Space optimization: sometimes only need previous row/column, not full table
    `,
    codeExample: `
// Fibonacci with memoization (top-down)
const fib = (n, memo = {}) => {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];

  memo[n] = fib(n-1, memo) + fib(n-2, memo);
  return memo[n];
};

// Coin change with tabulation (bottom-up)
const minCoins = (coins, amount) => {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
};

// 0/1 Knapsack
const knapsack = (weights, values, capacity) => {
  const n = weights.length;
  const dp = Array(n+1).fill(0).map(() => Array(capacity+1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let w = 1; w <= capacity; w++) {
      if (weights[i-1] <= w) {
        dp[i][w] = Math.max(
          dp[i-1][w], // Skip item
          dp[i-1][w - weights[i-1]] + values[i-1] // Take item
        );
      } else {
        dp[i][w] = dp[i-1][w];
      }
    }
  }

  return dp[n][capacity];
};

// LCS (Longest Common Subsequence)
const lcs = (str1, str2) => {
  const m = str1.length, n = str2.length;
  const dp = Array(m+1).fill(0).map(() => Array(n+1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i-1] === str2[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }

  return dp[m][n];
};
    `,
    visualization: `
Fibonacci DP table:
n:    0  1  2  3  4  5
fib:  0  1  1  2  3  5

Coin change: amount = 11, coins = [1,2,5]
amount:  0  1  2  3  4  5  6  7  8  9  10 11
dp:      0  1  1  2  2  1  2  2  3  3  2  3
         ^                          ^
         0 coins for 0              3 coins for 11 (5+5+1)

Knapsack:
weights = [2, 3, 4]
values = [3, 4, 5]
capacity = 6

      0  1  2  3  4  5  6
  0   0  0  0  0  0  0  0
  2   0  0  3  3  3  3  3   (item weight=2, val=3)
  3   0  0  3  4  4  7  7   (item weight=3, val=4)
  4   0  0  3  4  5  7  9   (item weight=4, val=5)
                         ^
                    Max value with capacity 6
    `,
    realWorldScales: 'Uber: Matching problem solved with DP - minimize total delivery time across all orders.',
    performanceTips: [
      'Memoization easier to code, harder to analyze',
      'Tabulation easier to optimize space',
      'Always identify: subproblems + base cases + recurrence',
      'Space optimization: 2D → 1D if only previous row needed'
    ]
  },

  // ============= JAVA DETAILED =============
  jvm: {
    title: 'JVM: The Virtual Machine Behind Java',
    deepDive: `
JVM IS AN INTERPRETER + COMPILER:
On startup, JVM interprets bytecode (slow). After ~10K method invocations, hot methods are JIT-compiled to native machine code (fast).

EXECUTION FLOW:
1. Java source (.java) → Bytecode (.class)
2. JVM loads .class file, verifies bytecode safety
3. Interpret bytecode: each instruction → CPU operations
4. Monitor: which methods called frequently (hot code paths)
5. JIT compile: convert hot methods to native binary → 10-100x speedup

MEMORY LAYOUT:
Heap: all objects created by 'new'
Stack: method calls, local variables, temporary values
- Each thread gets own stack
- Stack frame: method activation, local variables, operand stack

BYTECODE EXAMPLE:
Java: int x = 5; int y = x + 3;
Bytecode:
  bipush 5        // Push constant 5
  istore_1        // Store in local var 1 (x)
  iload_1         // Load var 1 (x)
  bipush 3        // Push constant 3
  iadd            // Add top two stack values
  istore_2        // Store in local var 2 (y)

METHOD INVOCATION:
new frame created on stack with:
- Local variables array (indexed 0, 1, 2...)
- Operand stack (push/pop temporary values)
- Reference to method's code

When method returns, frame popped, execution resumes in caller's frame.

GOTCHAS:
- Local variable 0 = 'this' in instance methods
- Java args: void method(int a, String s) → local vars [this, a, s]
- Operand stack type mismatch causes VerifyError
- Stack overflow: too many nested calls fill up stack
    `,
    codeExample: `
// JVM execution model visualization
class JVMExample {
  public static void main(String[] args) {
    int x = add(5, 3);
    System.out.println(x);
  }

  public static int add(int a, int b) {
    return a + b;
  }
}

/* Stack visualization during execution:

main() invocation:
  Frame: main
    Local vars: [this=null, args=...]
    Operand stack: []

  Calls add(5, 3):

  Frame: add                    Frame: main
    Local vars: [a=5, b=3]      Local vars: [this=null, args=...]
    Operand stack: [8]          Operand stack: [waiting for return]

  Returns 8:

  Frame: main
    Local vars: [this=null, args=..., x=8]
    Operand stack: []
*/

// Memory allocation
public class MemoryExample {
  public static void main(String[] args) {
    // Stack: local variable 'person' reference
    // Heap: new Person object allocated
    Person person = new Person("Alice", 30);

    // Stack: local variable 'name' reference
    // Heap: new String object allocated
    String name = person.getName();
  }
}

class Person {
  private String name;  // Heap: instance variable
  private int age;      // Heap: instance variable

  Person(String name, int age) {
    this.name = name;
    this.age = age;
  }

  String getName() {
    return this.name;   // Access heap object from method
  }
}
    `,
    visualization: `
JVM Compilation Process:
Java Source → Bytecode → Interpret → Monitor → JIT Compile → Native Code
   (.java)    (.class)   (slow)    (count)    (hot method)   (10-100x faster)

Stack vs Heap:
STACK (Per-thread)          HEAP (Shared)
┌─────────────────┐         ┌──────────────────┐
│ main() frame    │         │ String: "Alice"  │
│ x = ref ────────┼────────→│ age: 30          │
│ y = 5           │         │ ...objects...    │
├─────────────────┤         └──────────────────┘
│ foo() frame     │
│ a = 10          │
├─────────────────┤
│ bar() frame     │
│ s = ref ────────┼────────→ Another object
└─────────────────┘

When foo() returns, frame popped. Objects only removed by GC.
    `,
    realWorldScales: 'YouTube: JVM handles billions of requests. Hot methods (request routing, video encoding) JIT-compiled to native code.',
    performanceTips: [
      'Warm up JVM before benchmarking (let JIT compile)',
      'Hot methods: those called 10K+ times benefit from JIT',
      'Stack allocation is cheap, heap allocation involves GC',
      'Monitor GC pauses: larger objects cause longer collections',
      'Profilers show which methods are hot candidates for optimization'
    ]
  },

  gcGarbageCollection: {
    title: 'GC: Automatic Memory Management',
    deepDive: `
GARBAGE COLLECTION PHASES:

Mark Phase:
- Start from GC roots (static variables, stack references)
- Mark all reachable objects as "alive"
- Unreached objects are garbage

Sweep Phase:
- Scan heap, free memory of unmarked objects
- Results in fragmented heap

Compact Phase:
- Move alive objects together to eliminate fragmentation
- Update all references to new positions
- Results in contiguous free space

GENERATIONAL HYPOTHESIS:
Most objects die young. Empirically true: ~80% of objects die within microseconds.
Solution: Young generation (fast, frequent GC), Old generation (slow, rare GC)

YOUNG GENERATION GC (Minor GC):
- Happens frequently (every few MB allocated)
- Survivors moved to old generation (after surviving ~15 GCs)
- Fast because working set is small

OLD GENERATION GC (Major GC):
- Happens rarely (every few hundred MB)
- Must examine all old objects (slow)
- Causes long pause times

CMS (Concurrent Mark-Sweep):
- Mark phase happens while app runs (mostly concurrent)
- Only brief pause for final cleanup
- Lower pause times (~100-200ms) vs full GC (~1-2 seconds)

G1GC (Garbage First):
- Divides heap into regions
- Prioritizes regions with most garbage (garbage first)
- Predictable pause times (~200ms max)

GOTCHAS:
- Stop-The-World (STW): even with concurrent GC, brief pauses happen
- Floating garbage: objects become garbage during concurrent mark, still freed next cycle
- Humongous objects (>50% region size): special handling in G1GC
- Memory pressure: if GC can't keep up, OutOfMemoryError thrown
    `,
    codeExample: `
// GC root examples
public class GCRootsExample {
  // Static field = GC root
  static List<Object> staticList = new ArrayList<>();

  public static void main(String[] args) {
    // Local variable 'obj' = GC root (on stack)
    MyObject obj = new MyObject();

    // Now obj is reachable from stack
    // If we set obj = null, it becomes unreachable (eligible for GC)
    obj = null;

    // Trigger GC (hint to JVM, not guaranteed)
    System.gc();
  }
}

// Memory leak example
class MemoryLeak {
  static Stack<String> stack = new Stack<>();

  public static void push(String s) {
    stack.push(s);
  }

  public static String pop() {
    if (stack.isEmpty()) return null;
    String value = stack.pop();
    // BUG: forgot to set value = null before returning
    // If stack is large, even popped elements stay in memory
    return value;
  }
}

// Fix: explicitly set reference to null
public static String popFixed() {
  if (stack.isEmpty()) return null;
  return stack.pop(); // Let it be GC'd properly
}

// Monitoring GC
public class GCMonitoring {
  public static void main(String[] args) {
    // -Xms1g -Xmx4g -XX:+PrintGCDetails -XX:+PrintGCTimeStamps
    // With these flags, JVM prints GC events

    long before = Runtime.getRuntime().totalMemory();
    System.out.println("Memory before: " + before);

    // Allocate memory
    List<byte[]> list = new ArrayList<>();
    for (int i = 0; i < 1000; i++) {
      list.add(new byte[1024 * 1024]); // 1MB each
    }

    long after = Runtime.getRuntime().totalMemory();
    System.out.println("Memory after: " + after);
  }
}
    `,
    visualization: `
Generational Heap Layout:
┌──────────────────────────────────────────────┐
│ Old Generation (long-lived objects)          │ ← Major GC rare, pause 1-2s
├──────────────────────────────────────────────┤
│ Survivor Space (objects promoted from young) │
├──────────────────────────────────────────────┤
│ Eden Space (new objects allocated)           │ ← Minor GC frequent, pause 10-50ms
└──────────────────────────────────────────────┘

Generational survival:
Young: allocation → survived GC #1 → survived GC #2 → ... → moved to Old

GC Timeline Example (Minor GC):
Time 0ms: Allocate objects A, B, C, D in Eden
Time 5ms: Eden full, GC triggered
Time 10ms: Mark reachable objects (A, B, C alive; D unreachable)
Time 15ms: Sweep D, copy A, B, C to Survivor
Time 20ms: App resumes ← 20ms pause

vs Major GC:
Time 0ms: Old generation full
Time 500ms: Full GC starts (examine entire heap)
Time 1500ms: Compact, GC finishes
Time 1500ms: App resumes ← 1500ms pause! (unacceptable for real-time apps)
    `,
    realWorldScales: 'Instagram: Server handles 1M requests/sec. Each request creates ~100 objects. Garbage collection tuned to keep pause times <50ms.',
    performanceTips: [
      'Reduce object allocation: reuse objects instead of creating new ones',
      'Avoid long-lived objects in loops: they accumulate in old generation',
      'Use weak/soft references for caches',
      'Profile with JProfiler or YourKit to see GC patterns',
      'Tune heap size: -Xms (initial) and -Xmx (max) based on available RAM',
      'Monitor GC pause times: should be <100ms for responsive systems'
    ]
  },

  // ============= SPRING DETAILED =============
  spring: {
    title: 'Spring Framework: Enterprise Java',
    deepDive: `
Spring handles infrastructure so developers focus on business logic.

DEPENDENCY INJECTION (IoC Container):
Traditional: new UserService(new UserRepository())
Spring: @Autowired UserService service; // Container creates & injects

Benefits: loose coupling, easier testing (inject mocks), configuration centralized

BEAN LIFECYCLE:
1. Instantiate: create object
2. Set Properties: inject dependencies
3. BeanPostProcessor: before initialization
4. Initialize: @PostConstruct method
5. Ready to use
6. Destroy: @PreDestroy method

AOP (Aspect-Oriented Programming):
Cross-cutting concerns (logging, security, transactions) separated from business logic.
Without AOP: every method copy-paste logging code
With AOP: define aspect once, apply to all methods

Proxy pattern: Spring creates proxy wrapping bean. When method called:
1. Proxy intercepts
2. Run before-advice (logging, security)
3. Call actual method
4. Run after-advice
5. Return to caller

TRANSACTIONS:
@Transactional: method runs in transaction
- All-or-nothing: if exception, rollback everything
- Isolation: concurrent transactions don't interfere
- Propagation: nested transactions (REQUIRED, SUPPORTS, etc.)

Example: money transfer
@Transactional
public void transfer(Account from, Account to, BigDecimal amount) {
  from.debit(amount);    // if exception here
  to.credit(amount);     // both operations rollback
}

GOTCHAS:
- Circular dependencies: A needs B, B needs A → configure manually
- Proxy issues: calling method within same object bypasses proxy (no AOP)
- @Transactional on private method: doesn't work (proxy can't override)
- Lazy initialization: beans created on-demand if @Lazy, impacts startup time
    `,
    codeExample: `
// IoC Container & Dependency Injection
@Component
class UserRepository {
  public User findById(Long id) {
    // fetch from database
    return new User(id, "John");
  }
}

@Service
class UserService {
  @Autowired
  private UserRepository userRepository;

  public User getUser(Long id) {
    return userRepository.findById(id);
  }
}

@RestController
@RequestMapping("/users")
class UserController {
  @Autowired
  private UserService userService;

  @GetMapping("/{id}")
  public User getUser(@PathVariable Long id) {
    return userService.getUser(id);
  }
}

// AOP: Logging aspect
@Aspect
@Component
class LoggingAspect {
  @Before("execution(* com.example.service.*.*(..))")
  public void logBefore(JoinPoint joinPoint) {
    System.out.println("Calling: " + joinPoint.getSignature());
  }

  @After("execution(* com.example.service.*.*(..))")
  public void logAfter(JoinPoint joinPoint) {
    System.out.println("Finished: " + joinPoint.getSignature());
  }
}

// Result: every service method automatically logged without code in service!

// Transactions
@Service
class AccountService {
  @Autowired
  private AccountRepository accountRepository;

  @Transactional
  public void transfer(Long fromId, Long toId, BigDecimal amount) {
    Account from = accountRepository.findById(fromId);
    Account to = accountRepository.findById(toId);

    from.setBalance(from.getBalance().subtract(amount));
    to.setBalance(to.getBalance().add(amount));

    accountRepository.save(from);
    accountRepository.save(to);
    // if exception thrown here, both saves rollback!
  }
}
    `,
    visualization: `
Spring Container: Manages beans & dependencies
┌─────────────────────────────────┐
│ Spring IoC Container            │
│                                 │
│ [UserRepository]               │
│        ↑                        │
│        │ inject                 │
│        │                        │
│ [UserService] ← depends on      │
│        ↑                        │
│        │ inject                 │
│        │                        │
│ [UserController]               │
└─────────────────────────────────┘

AOP Proxy Interception:
Client → [Proxy] → LoggingAspect (before) → UserService.method()
                ↓
          LoggingAspect (after) → return to Client

Request flow with Spring MVC:
Request → DispatcherServlet → Controller → Service → Repository → Database
  ↓                                            ↓
  └──HandlerMapping (URL routing) ──────────────┘

Transaction boundaries:
Method call → Start transaction
  Insert A ✓
  Insert B ✓
  Exception! ← Rollback both inserts
Method returns
    `,
    realWorldScales: 'Uber backend: Spring handles 100K requests/sec. Dependency injection enables easy testing, AOP handles cross-cutting (logging to Kafka, metrics), transactions ensure payment consistency.',
    performanceTips: [
      'Avoid circular dependencies: use setter injection or @Lazy',
      'Don\'t call @Transactional method from same object',
      'Profile lazy vs eager bean initialization',
      'AOP has overhead: disable unnecessary aspects in production',
      'Connection pooling: configure HikariCP with appropriate pool size'
    ]
  },

  golang: {
    title: 'Go: Concurrency Primitives',
    deepDive: `
Go revolutionized concurrency: goroutines are lightweight (thousands affordable), channels coordinate them naturally.

GOROUTINES:
Not threads. Go runtime multiplexes goroutines onto OS threads.
Typical: 1M goroutines on 100 OS threads.
Creating goroutine: go functionCall() instantly returns, runs concurrently.

CHANNELS:
Communication between goroutines.
Unbuffered channel: sender blocks until receiver ready
Buffered channel: sender writes to buffer, only blocks if buffer full

Pattern: worker pool
- Create N worker goroutines waiting on channel
- Main goroutine sends tasks
- Workers process in parallel
- Join with WaitGroup

SCHEDULER:
Go scheduler assigns goroutines to OS threads (M:N mapping).
M = OS threads, N = goroutines
Context switch: happens when goroutine blocks (I/O, channel read/write)
Cooperative: no time quantum, blocks naturally

GOTCHAS:
- Goroutine leak: goroutine waiting on closed channel never exits
- Deadlock: all goroutines blocked, no progress possible
- Race condition: multiple goroutines access shared variable simultaneously
- Channel send on closed channel: panics
- Buffer size: too small causes blocking, too large wastes memory
    `,
    codeExample: `
package main

import (
  "fmt"
  "sync"
  "time"
)

// Worker processes tasks from channel
func worker(id int, tasks <-chan int, results chan<- string) {
  for task := range tasks {
    fmt.Printf("Worker %d processing task %d\\n", id, task)
    time.Sleep(time.Second) // Simulate work
    results <- fmt.Sprintf("Task %d done by worker %d", task, id)
  }
}

func main() {
  // Buffered channel: queue up to 10 tasks
  tasks := make(chan int, 10)
  results := make(chan string, 10)

  // Create 3 worker goroutines
  var wg sync.WaitGroup
  for i := 1; i <= 3; i++ {
    wg.Add(1)
    go func(id int) {
      defer wg.Done()
      worker(id, tasks, results)
    }(i)
  }

  // Send 10 tasks
  for task := 1; task <= 10; task++ {
    tasks <- task
  }
  close(tasks) // Signal workers: no more tasks

  // Wait for all workers to finish
  wg.Wait()
  close(results)

  // Collect results
  for result := range results {
    fmt.Println(result)
  }
}

// Result: 3 workers process 10 tasks in parallel
// Total time ≈ 4 seconds (10 tasks / 3 workers ≈ 3.3 ≈ 4 seconds)
// vs sequential: 10 seconds
    `,
    visualization: `
Goroutines on Go scheduler:
┌──────────────────────────────────┐
│ Go Runtime Scheduler             │
│                                  │
│ OS Thread 1 ┬─ Goroutine A      │
│             ├─ Goroutine B      │
│             └─ Goroutine C      │
│                                  │
│ OS Thread 2 ┬─ Goroutine D      │
│             ├─ Goroutine E      │
│             └─ Goroutine F      │
│                                  │
│ ... (100 OS threads, 1M goroutines)
└──────────────────────────────────┘

Channel communication:
Goroutine A ────send data──→ Channel ────receive data──→ Goroutine B
                (blocks if no receiver)    (blocks if no data)

Worker pool pattern:
Main → [task1, task2, ..., task10] → Channel ────→ [Worker1, Worker2, Worker3]
                                          ↓
                                      Results channel
    `,
    realWorldScales: 'WhatsApp: Each user connection = separate goroutine. 2B users, 2B goroutines on Go servers. Message routing extremely efficient.',
    performanceTips: [
      'Use buffered channels carefully: buffer size affects memory & latency',
      'Close channel only from sender side (receiver can\'t close)',
      'Use WaitGroup to synchronize goroutine completion',
      'Avoid goroutine leaks: ensure all goroutines eventually exit',
      'Profile with pprof to find goroutine leaks & bottlenecks'
    ]
  },

  python: {
    title: 'Python: GIL & Async',
    deepDive: `
Python's Global Interpreter Lock (GIL) serializes bytecode execution.
Only one thread runs Python code at a time (threading useless for CPU-bound).
Asyncio overcomes this with lightweight coroutines.

GIL EXPLANATION:
Multiple threads can exist, but GIL ensures only one executes Python bytecode.
Thread A holding GIL → Python code runs fast
Thread B waiting for GIL → spins wasting CPU

Native operations (C code) release GIL: I/O, NumPy operations run in parallel.

ASYNCIO:
Lightweight coroutines (1M affordable). Single-threaded event loop.
await keyword: yields control to event loop.
Event loop: manages execution, scheduler

async def fetch(url):
  response = await http_request(url)
  return response

Calling fetch() returns coroutine object (doesn't execute yet).
await fetch() suspends, event loop runs other coroutines.

DECORATORS:
Function wrapping pattern.
@decorator applied before execution.

def timing_decorator(func):
  def wrapper(*args, **kwargs):
    start = time.time()
    result = func(*args, **kwargs)
    print(f"Took {time.time() - start}s")
    return result
  return wrapper

@timing_decorator
def slow_function():
  time.sleep(1)

Result: slow_function() automatically timed without modifying function!

GOTCHAS:
- GIL prevents true parallelism: use multiprocessing for CPU-bound
- Async functions require await in caller: can't mix sync/async without care
- Event loop single-threaded: no parallelism even with 1000 coroutines, just fast context switching
- Blocking operations block entire event loop: use asyncio.to_thread() for blocking calls
    `,
    codeExample: `
import asyncio
import time

# Async I/O example: fetch 10 URLs in parallel
async def fetch_url(session, url):
    print(f"Fetching {url}")
    # In real code: response = await session.get(url)
    await asyncio.sleep(1)  # Simulate network I/O
    print(f"Got {url}")
    return f"Data from {url}"

async def main():
    urls = [f"http://example.com/{i}" for i in range(10)]

    # Sequential: 10 seconds (fetch one at a time)
    # Async: 1 second (fetch all concurrently)
    tasks = [fetch_url(None, url) for url in urls]
    results = await asyncio.gather(*tasks)

    for result in results:
        print(result)

# Run:
# asyncio.run(main())
# Output: all 10 fetches happen in 1 second!

# Decorator example: retry on failure
def retry(max_attempts=3):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    print(f"Attempt {attempt+1} failed, retrying...")
                    time.sleep(2 ** attempt)  # Exponential backoff
        return wrapper
    return decorator

@retry(max_attempts=3)
def unstable_function():
    import random
    if random.random() < 0.7:
        raise Exception("Failed")
    return "Success"

# Threading vs Asyncio
import threading

def cpu_bound():
    # GIL prevents parallelism
    total = 0
    for i in range(100_000_000):
        total += i
    return total

# This runs SLOWER with 2 threads than 1 (GIL contention)
threads = [threading.Thread(target=cpu_bound) for _ in range(2)]
for t in threads:
    t.start()
for t in threads:
    t.join()

# Solution: use multiprocessing (separate Python processes, no GIL)
from multiprocessing import Process

processes = [Process(target=cpu_bound) for _ in range(2)]
for p in processes:
    p.start()
for p in processes:
    p.join()
    `,
    visualization: `
GIL behavior:
Thread A ┌─────────────────────┐
         │ Python code (GIL)   │
         └─────────────────────┘ releases GIL
                               ┌─ C code (NumPy)
         ─────────────────────────────────────
Thread B                              ┌──────────────┐
                                      │ Python code  │
                                      └──────────────┘

Result: only Thread A's Python runs, then Thread B's Python
NumPy can run in parallel (no GIL)

Async event loop scheduling:
Start task A ──┐
              │
              ├─ await (I/O) → yield control
              │
Start task B ──┤ (runs while A waiting)
              │
              ├─ await (I/O) → yield control
              │
A I/O done ────┤ (resume A)
              │
B I/O done ────┘ (resume B)

Timeline: [A starts] [A waits] [B starts] [B waits] [A ready] [B ready]
          Time ──────────────────────────────────────→
    `,
    realWorldScales: 'Instagram: Use asyncio for I/O-heavy services (API calls, database). Use multiprocessing for CPU-heavy (image processing).',
    performanceTips: [
      'Use asyncio for I/O-bound (network, database)',
      'Use multiprocessing for CPU-bound (avoid GIL)',
      'Avoid blocking operations in async (use asyncio.to_thread)',
      'Monitor GIL contention with cProfile',
      'C extensions release GIL: NumPy, Pandas parallelize'
    ]
  },

  // Additional compact topics
  aws: {
    title: 'AWS: Cloud Infrastructure',
    deepDive: `
EC2: Virtual machines on-demand. Choose instance type (CPU, RAM, network), OS (Linux, Windows).
Auto Scaling: automatically scale instances based on metrics (CPU, memory, request count).

Lambda: Serverless compute. Write function, deploy. AWS manages scaling.
Cold start: first invocation slow (~1s for setup), subsequent warm starts (~10ms).
Billed per 100ms execution.

S3: Object storage. Unlimited capacity. CloudFront CDN serves from edge locations.
Request routing to nearest edge = <50ms latency globally.

RDS: Managed database. Handles backups, patches, replication.
Multi-AZ: synchronously replicate to standby, auto-failover on primary failure.
Read replicas: scale reads, eventual consistency.

API Gateway: REST endpoint routing to Lambda/EC2. Rate limiting, auth, transformation.
    `,
    codeExample: `
// Lambda function
exports.handler = async (event) => {
  const name = event.queryStringParameters.name;
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello ' + name })
  };
};

// Auto Scaling Policy
{
  "TargetGroupARN": "arn:aws:elasticloadbalancing:...",
  "TargetValue": 70,  // Scale to keep CPU at 70%
  "ScaleOutCooldown": 60,
  "ScaleInCooldown": 300
}

// S3 + CloudFront
// Upload to S3: s3://my-bucket/video.mp4
// CloudFront caches at 200+ edge locations
// User in India accesses from India edge (50ms vs 200ms from US)
    `,
    visualization: `
AWS Architecture:
Internet → Route53 (DNS) → CloudFront (CDN) → API Gateway → Lambda
                                         ↓
                                       S3 (storage)
                                         ↓
                                       RDS (database)

Auto Scaling:
Low traffic (10 req/s) → 2 EC2 instances
↓ (traffic increases)
High traffic (1000 req/s) → 20 EC2 instances (Auto Scaling adds)
↓ (traffic decreases)
Low traffic → 2 instances (Auto Scaling removes)
    `,
    realWorldScales: 'YouTube: Stores petabytes in S3, served via CloudFront. Peak traffic auto-scales to 10K Lambda functions.',
    performanceTips: [
      'Warm Lambda: invoke periodically to avoid cold starts',
      'CloudFront: cache aggressively for static content',
      'Multi-region: RDS read replicas in different regions',
      'Connection pooling: RDS connections are expensive'
    ]
  },

  redis: {
    title: 'Redis: In-Memory Data Store',
    deepDive: `
Redis stores data in RAM. Sub-millisecond access. Data types: strings, lists, sets, hashes, sorted sets.
Expiration: automatic key deletion after TTL.
Pub/Sub: publish-subscribe messaging.

Persistence: RDB (snapshots) or AOF (append-only file).
RDB: fast but loses recent data on crash.
AOF: slower, no data loss.

Cluster: hash slot based sharding. 16384 slots.
Key hashed to slot, slot assigned to node.
    `,
    codeExample: `
// String operations
redis.set('user:123:name', 'Alice')
redis.get('user:123:name') → 'Alice'

// List: job queue
redis.rpush('queue', 'job1', 'job2', 'job3')
redis.lpop('queue') → 'job1'

// Set: unique followers
redis.sadd('user:123:followers', 'alice', 'bob', 'charlie')
redis.scard('user:123:followers') → 3

// Sorted set: leaderboard
redis.zadd('leaderboard', 100, 'alice', 200, 'bob')
redis.zrange('leaderboard', 0, -1, 'WITHSCORES')

// Expiration: cache with auto-expiry
redis.set('session:abc', '{user: 123}', 'EX', 3600) // expires in 1 hour
    `,
    visualization: `
Redis data types:
String: "name" → "Alice"
List: [job1, job2, job3]
Set: {alice, bob, charlie}
Hash: {name: "Alice", age: 30}
Sorted Set: {alice: 100, bob: 200}

Redis Cluster:
Key "user:123" → hash → slot 1234 → Node 2
Key "post:456" → hash → slot 5678 → Node 5

Multiple reads/writes route to different nodes in parallel.
    `,
    realWorldScales: 'Instagram: Cache user profiles, feed, stories. 100M+ QPS across Redis cluster.',
    performanceTips: [
      'Key expiration: set TTL to prevent unbounded growth',
      'Pipeline: batch commands for throughput',
      'Persistence: RDB for fast snapshots, AOF for durability',
      'Monitor memory: eviction policies when full'
    ]
  },

  sorting_bubble: {
    title: 'Sorting: Bubble to Heap',
    deepDive: `
BUBBLE SORT: O(n²) always
Compare adjacent elements, swap if out of order.
Simplest but slowest.

MERGE SORT: O(n log n) guaranteed
Divide-and-conquer. Split, recursively sort, merge.
Requires O(n) extra space.
Stable: maintains relative order of equal elements.

QUICK SORT: O(n log n) average, O(n²) worst
Pick pivot, partition into smaller/larger, recursively sort.
In-place. Usually fastest in practice (cache locality).
Unstable.

HEAP SORT: O(n log n) guaranteed
Build max-heap. Repeatedly extract root.
In-place. Not stable.

Choosing:
- Linked lists: merge sort (no random access)
- Arrays: quick sort (cache friendly, fastest)
- Stable required: merge sort
- Guaranteed O(n log n): merge, heap
    `,
    codeExample: `
// Bubble sort
const bubbleSort = (arr) => {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
};

// Merge sort
const mergeSort = (arr) => {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
};

const merge = (left, right) => {
  const result = [];
  let i = 0, j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  return result.concat(left.slice(i)).concat(right.slice(j));
};

// Quick sort
const quickSort = (arr) => {
  if (arr.length <= 1) return arr;

  const pivot = arr[0];
  const left = arr.slice(1).filter(x => x < pivot);
  const right = arr.slice(1).filter(x => x >= pivot);

  return quickSort(left).concat([pivot]).concat(quickSort(right));
};
    `,
    visualization: `
Bubble sort: comparisons bubble large elements to end
[3,1,4,1,5] → [1,3,1,4,5] → [1,1,3,4,5]
  ↓ step     ↓ step       ↓ final

Merge sort: recursively divide & merge
[3,1,4,1,5]
   ↓ split
[3,1] [4,1,5]
   ↓ split deeper
[3] [1] [4] [1] [5]
   ↓ merge
[1,3] [1,4,5]
   ↓ merge
[1,1,3,4,5]

Quick sort: partition around pivot
[3,1,4,1,5] pivot=3
[1,1] [3] [4,5]
   ↓ recurse
[1,1] [3] [4,5]
   ↓ final
[1,1,3,4,5]
    `,
    realWorldScales: 'YouTube: Sort 1B videos by upload date. Merge sort for guaranteed O(n log n).',
    performanceTips: [
      'Use language built-in sort (highly optimized)',
      'Quick sort fastest for random data (cache friendly)',
      'Merge sort for stable sort or linked lists',
      'Pre-sorted data: insertion sort O(n)'
    ]
  },
};

export default DETAILED_EXPLANATIONS;
