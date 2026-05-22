export type ConceptCategory =
  | 'sorting' | 'searching' | 'data-structure' | 'algorithmic-paradigm'
  | 'concurrency' | 'memory-management' | 'os'
  | 'networking' | 'distributed-systems' | 'database'
  | 'ai-ml' | 'compiler' | 'security'
  | 'system-design' | 'programming-language' | 'general'

export type Complexity = 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(2ⁿ)' | 'O(n!)' | 'unknown'

export type ConceptName =
  | 'comparison' | 'swapping' | 'partitioning' | 'merging' | 'pivot-selection'
  | 'linear-search' | 'binary-search' | 'hashing' | 'collision-resolution' | 'probing'
  | 'recursion' | 'divide-and-conquer' | 'dynamic-programming' | 'backtracking' | 'greedy'
  | 'linked-list' | 'stack' | 'queue' | 'tree' | 'graph' | 'heap' | 'trie'
  | 'array' | 'hash-map' | 'set'
  | 'context-switch' | 'scheduling' | 'deadlock' | 'race-condition' | 'mutex' | 'semaphore'
  | 'memory-allocation' | 'garbage-collection' | 'mark-sweep' | 'reference-counting'
  | 'paging' | 'segmentation' | 'virtual-memory'
  | 'tcp-handshake' | 'routing' | 'congestion-control' | 'dns-resolution'
  | 'replication' | 'consensus' | 'election' | 'gossip' | 'crdt' | 'raft' | 'paxos'
  | 'publish-subscribe' | 'consumer-group' | 'offset-commit' | 'partition-rebalance'
  | 'forward-pass' | 'backpropagation' | 'gradient-descent' | 'loss-function'
  | 'tokenization' | 'attention' | 'transformer' | 'embedding'
  | 'indexing' | 'transaction' | 'isolation' | 'locking'
  | 'load-balancing' | 'caching' | 'rate-limiting' | 'circuit-breaker'
  | 'custom'

export interface ConceptDefinition {
  name: ConceptName
  category: ConceptCategory
  complexity?: Complexity
  description: string
  prerequisites: ConceptName[]
  relatedConcepts: ConceptName[]
  interviewRelevant: boolean
  whyItMatters?: string
  keywords: string[]
}

export const CONCEPT_DEFINITIONS: Record<ConceptName, ConceptDefinition> = {
  comparison: {
    name: 'comparison', category: 'general', complexity: 'O(1)',
    description: 'Comparing two values to determine their relative order',
    prerequisites: [], relatedConcepts: ['swapping', 'sorting'],
    interviewRelevant: true, whyItMatters: 'Fundamental operation underlying all comparison-based algorithms',
    keywords: ['compare', 'less than', 'greater than', 'equal'],
  },
  swapping: {
    name: 'swapping', category: 'sorting', complexity: 'O(1)',
    description: 'Exchanging the positions of two elements',
    prerequisites: ['comparison'], relatedConcepts: ['sorting', 'partitioning'],
    interviewRelevant: true, whyItMatters: 'Core operation in sorting algorithms',
    keywords: ['exchange', 'swap', 'switch'],
  },
  partitioning: {
    name: 'partitioning', category: 'algorithmic-paradigm', complexity: 'O(n)',
    description: 'Dividing a collection into two groups based on a condition',
    prerequisites: ['comparison', 'swapping'], relatedConcepts: ['divide-and-conquer', 'pivot-selection'],
    interviewRelevant: true, whyItMatters: 'Key to quicksort and many divide-and-conquer algorithms',
    keywords: ['partition', 'split', 'divide', 'pivot'],
  },
  merging: {
    name: 'merging', category: 'algorithmic-paradigm', complexity: 'O(n)',
    description: 'Combining two sorted sequences into one sorted sequence',
    prerequisites: ['comparison'], relatedConcepts: ['divide-and-conquer', 'sorting'],
    interviewRelevant: true, whyItMatters: 'Core to merge sort and external sorting',
    keywords: ['merge', 'combine', 'sorted merge'],
  },
  'pivot-selection': {
    name: 'pivot-selection', category: 'sorting', complexity: 'O(1)',
    description: 'Choosing a pivot element for partitioning',
    prerequisites: ['partitioning'], relatedConcepts: ['sorting', 'divide-and-conquer'],
    interviewRelevant: true, whyItMatters: 'Pivot quality determines quicksort performance',
    keywords: ['pivot', 'median', 'partition element'],
  },
  'linear-search': {
    name: 'linear-search', category: 'searching', complexity: 'O(n)',
    description: 'Sequentially checking each element until target is found',
    prerequisites: ['comparison'], relatedConcepts: ['binary-search', 'array'],
    interviewRelevant: true, whyItMatters: 'Simplest search, works on unsorted data',
    keywords: ['sequential search', 'linear scan', 'brute force'],
  },
  'binary-search': {
    name: 'binary-search', category: 'searching', complexity: 'O(log n)',
    description: 'Repeatedly halving the search space on sorted data',
    prerequisites: ['comparison', 'array'], relatedConcepts: ['linear-search', 'divide-and-conquer'],
    interviewRelevant: true, whyItMatters: 'Optimal search for sorted data',
    keywords: ['binary search', 'divide', 'halve', 'logarithmic'],
  },
  hashing: {
    name: 'hashing', category: 'data-structure', complexity: 'O(1)',
    description: 'Mapping data of arbitrary size to fixed-size values',
    prerequisites: ['array'], relatedConcepts: ['collision-resolution', 'hash-map', 'probing'],
    interviewRelevant: true, whyItMatters: 'Foundation of hash maps, sets, and caches',
    keywords: ['hash', 'digest', 'hash function', 'bucket'],
  },
  'collision-resolution': {
    name: 'collision-resolution', category: 'data-structure', complexity: 'O(1)',
    description: 'Handling two keys that hash to the same slot',
    prerequisites: ['hashing'], relatedConcepts: ['hashing', 'probing', 'hash-map'],
    interviewRelevant: true, whyItMatters: 'Determines hash table performance in practice',
    keywords: ['collision', 'chaining', 'open addressing', 'overflow'],
  },
  recursion: {
    name: 'recursion', category: 'algorithmic-paradigm',
    description: 'A function that calls itself to solve smaller subproblems',
    prerequisites: [], relatedConcepts: ['divide-and-conquer', 'backtracking', 'dynamic-programming'],
    interviewRelevant: true, whyItMatters: 'Elegant solutions for naturally recursive problems',
    keywords: ['recursion', 'base case', 'recurrence', 'call stack'],
  },
  'divide-and-conquer': {
    name: 'divide-and-conquer', category: 'algorithmic-paradigm',
    description: 'Breaking a problem into independent subproblems, solving each, combining results',
    prerequisites: ['recursion'], relatedConcepts: ['merging', 'partitioning', 'binary-search'],
    interviewRelevant: true, whyItMatters: 'Enables O(n log n) sorting and efficient searching',
    keywords: ['divide', 'conquer', 'combine', 'subproblem'],
  },
  'dynamic-programming': {
    name: 'dynamic-programming', category: 'algorithmic-paradigm',
    description: 'Solving problems by combining solutions to overlapping subproblems',
    prerequisites: ['recursion'], relatedConcepts: ['greedy', 'backtracking'],
    interviewRelevant: true, whyItMatters: 'Turns exponential problems into polynomial time',
    keywords: ['DP', 'memoization', 'tabulation', 'optimal substructure', 'overlapping subproblems'],
  },
  backtracking: {
    name: 'backtracking', category: 'algorithmic-paradigm',
    description: 'Exploring all candidates and abandoning those that cannot be solutions',
    prerequisites: ['recursion'], relatedConcepts: ['dynamic-programming', 'greedy'],
    interviewRelevant: true, whyItMatters: 'Solves constraint satisfaction and combinatorial problems',
    keywords: ['backtrack', 'prune', 'constraint satisfaction', 'search tree'],
  },
  greedy: {
    name: 'greedy', category: 'algorithmic-paradigm',
    description: 'Making the locally optimal choice at each step',
    prerequisites: [], relatedConcepts: ['dynamic-programming'],
    interviewRelevant: true, whyItMatters: 'Simple, fast, optimal for problems with matroid structure',
    keywords: ['greedy', 'local optimum', 'global optimum', 'marginal gain'],
  },
  'linked-list': {
    name: 'linked-list', category: 'data-structure',
    description: 'Linear collection of nodes where each node points to the next',
    prerequisites: ['recursion'], relatedConcepts: ['stack', 'queue', 'array'],
    interviewRelevant: true, whyItMatters: 'Dynamic size, O(1) insert/delete at known position',
    keywords: ['linked list', 'node', 'pointer', 'singly linked', 'doubly linked'],
  },
  stack: {
    name: 'stack', category: 'data-structure', complexity: 'O(1)',
    description: 'Last-in-first-out (LIFO) data structure',
    prerequisites: ['array', 'linked-list'], relatedConcepts: ['queue', 'recursion'],
    interviewRelevant: true, whyItMatters: 'Used everywhere: call stack, undo, expression evaluation',
    keywords: ['stack', 'LIFO', 'push', 'pop', 'peek', 'top'],
  },
  queue: {
    name: 'queue', category: 'data-structure', complexity: 'O(1)',
    description: 'First-in-first-out (FIFO) data structure',
    prerequisites: ['array', 'linked-list'], relatedConcepts: ['stack', 'scheduling'],
    interviewRelevant: true, whyItMatters: 'BFS, task scheduling, buffering',
    keywords: ['queue', 'FIFO', 'enqueue', 'dequeue', 'front', 'rear'],
  },
  tree: {
    name: 'tree', category: 'data-structure',
    description: 'Hierarchical data structure with parent-child relationships',
    prerequisites: ['recursion', 'linked-list'], relatedConcepts: ['graph', 'heap', 'trie'],
    interviewRelevant: true, whyItMatters: 'Hierarchies, search trees, expression trees, DOM',
    keywords: ['tree', 'root', 'leaf', 'parent', 'child', 'binary tree', 'BST'],
  },
  graph: {
    name: 'graph', category: 'data-structure',
    description: 'Collection of nodes connected by edges, representing relationships',
    prerequisites: ['tree', 'linked-list'], relatedConcepts: ['tree', 'heap'],
    interviewRelevant: true, whyItMatters: 'Models networks, social graphs, dependencies, maps',
    keywords: ['graph', 'vertex', 'edge', 'directed', 'undirected', 'weighted', 'adjacency'],
  },
  heap: {
    name: 'heap', category: 'data-structure',
    description: 'Specialized tree satisfying the heap property',
    prerequisites: ['tree', 'array'], relatedConcepts: ['priority-queue', 'tree'],
    interviewRelevant: true, whyItMatters: 'Priority queues, heap sort, Dijkstra',
    keywords: ['heap', 'min-heap', 'max-heap', 'heapify', 'priority queue'],
  },
  'hash-map': {
    name: 'hash-map', category: 'data-structure', complexity: 'O(1)',
    description: 'Key-value store using hash function for O(1) average access',
    prerequisites: ['hashing', 'array', 'collision-resolution'],
    relatedConcepts: ['hashing', 'set'],
    interviewRelevant: true, whyItMatters: 'Most widely used data structure across all programming',
    keywords: ['hash map', 'dictionary', 'associative array', 'hash table'],
  },
  array: {
    name: 'array', category: 'data-structure', complexity: 'O(1)',
    description: 'Contiguous memory block storing elements of the same type',
    prerequisites: [], relatedConcepts: ['linked-list', 'stack', 'queue'],
    interviewRelevant: true, whyItMatters: 'Most fundamental data structure, CPU-cache friendly',
    keywords: ['array', 'index', 'contiguous', 'random access'],
  },
  'context-switch': {
    name: 'context-switch', category: 'os',
    description: 'Saving and restoring process/thread state to switch execution',
    prerequisites: ['scheduling'], relatedConcepts: ['scheduling', 'thread'],
    interviewRelevant: true, whyItMatters: 'Overhead of multitasking, affects performance design',
    keywords: ['context switch', 'TCB', 'process switch', 'overhead'],
  },
  scheduling: {
    name: 'scheduling', category: 'os',
    description: 'Determining which process/thread runs when on the CPU',
    prerequisites: [], relatedConcepts: ['context-switch', 'deadlock'],
    interviewRelevant: true, whyItMatters: 'Core OS function, determines responsiveness and throughput',
    keywords: ['scheduling', 'CPU scheduling', 'round robin', 'FCFS', 'SJF', 'priority'],
  },
  deadlock: {
    name: 'deadlock', category: 'concurrency',
    description: 'Two or more processes waiting indefinitely for resources held by each other',
    prerequisites: ['mutex', 'locking'], relatedConcepts: ['race-condition', 'mutex', 'semaphore'],
    interviewRelevant: true, whyItMatters: 'Critical system design issue, must be prevented or handled',
    keywords: ['deadlock', 'circular wait', 'hold and wait', 'no preemption', 'mutual exclusion'],
  },
  'race-condition': {
    name: 'race-condition', category: 'concurrency',
    description: 'Behavior depends on uncontrolled timing of concurrent operations',
    prerequisites: ['context-switch'], relatedConcepts: ['deadlock', 'mutex', 'semaphore'],
    interviewRelevant: true, whyItMatters: 'Hardest bugs to reproduce and debug',
    keywords: ['race condition', 'data race', 'concurrent access', 'non-deterministic'],
  },
  mutex: {
    name: 'mutex', category: 'concurrency',
    description: 'Mutual exclusion lock ensuring only one thread accesses a resource',
    prerequisites: ['context-switch'], relatedConcepts: ['semaphore', 'deadlock', 'race-condition'],
    interviewRelevant: true, whyItMatters: 'Primary mechanism for preventing data races',
    keywords: ['mutex', 'lock', 'mutual exclusion', 'critical section'],
  },
  semaphore: {
    name: 'semaphore', category: 'concurrency',
    description: 'Signaling mechanism controlling access to a pool of resources',
    prerequisites: ['mutex'], relatedConcepts: ['mutex', 'deadlock', 'scheduling'],
    interviewRelevant: true, whyItMatters: 'Count-based synchronization, producer-consumer problems',
    keywords: ['semaphore', 'counting semaphore', 'binary semaphore', 'signal', 'wait'],
  },
  'memory-allocation': {
    name: 'memory-allocation', category: 'memory-management',
    description: 'Assigning memory blocks to processes/objects on request',
    prerequisites: [], relatedConcepts: ['garbage-collection', 'paging', 'segmentation'],
    interviewRelevant: true, whyItMatters: 'Memory efficiency directly impacts performance',
    keywords: ['malloc', 'free', 'allocator', 'fragmentation', 'buddy system'],
  },
  'garbage-collection': {
    name: 'garbage-collection', category: 'memory-management',
    description: 'Automatic reclamation of memory no longer in use',
    prerequisites: ['memory-allocation'], relatedConcepts: ['mark-sweep', 'reference-counting'],
    interviewRelevant: true, whyItMatters: 'Eliminates manual memory management bugs in managed languages',
    keywords: ['GC', 'garbage collector', 'automatic memory management'],
  },
  'mark-sweep': {
    name: 'mark-sweep', category: 'memory-management',
    description: 'GC algorithm that marks reachable objects then sweeps unreachable ones',
    prerequisites: ['garbage-collection'], relatedConcepts: ['garbage-collection', 'reference-counting'],
    interviewRelevant: true, whyItMatters: 'Classic GC algorithm, foundation of JVM and V8',
    keywords: ['mark', 'sweep', 'reachable', 'root set'],
  },
  'tcp-handshake': {
    name: 'tcp-handshake', category: 'networking',
    description: 'Three-way handshake establishing a TCP connection',
    prerequisites: [], relatedConcepts: ['congestion-control', 'routing'],
    interviewRelevant: true, whyItMatters: 'Guarantees reliable connection-oriented communication',
    keywords: ['SYN', 'SYN-ACK', 'ACK', 'three-way handshake', 'TCP'],
  },
  routing: {
    name: 'routing', category: 'networking',
    description: 'Determining the path data takes through a network',
    prerequisites: [], relatedConcepts: ['congestion-control', 'tcp-handshake'],
    interviewRelevant: true, whyItMatters: 'Keeps internet working despite failures and topology changes',
    keywords: ['router', 'routing table', 'OSPF', 'BGP', 'shortest path'],
  },
  'congestion-control': {
    name: 'congestion-control', category: 'networking',
    description: 'Preventing network collapse from too much traffic',
    prerequisites: ['tcp-handshake'], relatedConcepts: ['routing', 'tcp-handshake'],
    interviewRelevant: true, whyItMatters: 'Prevents internet congestion collapse',
    keywords: ['congestion', 'slow start', 'AIMD', 'window', 'TCP'],
  },
  replication: {
    name: 'replication', category: 'distributed-systems',
    description: 'Copying data across multiple nodes for fault tolerance',
    prerequisites: [], relatedConcepts: ['consensus', 'raft', 'paxos', 'crdt'],
    interviewRelevant: true, whyItMatters: 'Foundation of fault tolerance and high availability',
    keywords: ['replication', 'leader', 'follower', 'quorum', 'replica'],
  },
  consensus: {
    name: 'consensus', category: 'distributed-systems',
    description: 'Getting multiple nodes to agree on a value despite failures',
    prerequisites: ['replication'], relatedConcepts: ['raft', 'paxos', 'election'],
    interviewRelevant: true, whyItMatters: 'Enables consistent distributed state machines',
    keywords: ['consensus', 'agreement', 'quorum', 'fault tolerance'],
  },
  election: {
    name: 'election', category: 'distributed-systems',
    description: 'Choosing a leader among distributed nodes',
    prerequisites: ['consensus'], relatedConcepts: ['raft', 'consensus'],
    interviewRelevant: true, whyItMatters: 'Required for leader-based replication and consensus',
    keywords: ['leader election', 'bully algorithm', 'ring algorithm', 'Raft'],
  },
  raft: {
    name: 'raft', category: 'distributed-systems',
    description: 'Understandable consensus algorithm with leader election and log replication',
    prerequisites: ['consensus', 'election', 'replication'],
    relatedConcepts: ['paxos', 'consensus', 'election'],
    interviewRelevant: true, whyItMatters: 'Most widely taught consensus algorithm, used in etcd, Consul',
    keywords: ['Raft', 'leader', 'term', 'log replication', 'commit', 'quorum'],
  },
  'publish-subscribe': {
    name: 'publish-subscribe', category: 'distributed-systems',
    description: 'Messaging pattern where publishers send to topics, subscribers receive',
    prerequisites: [], relatedConcepts: ['consumer-group', 'offset-commit'],
    interviewRelevant: true, whyItMatters: 'Decouples producers and consumers in distributed systems',
    keywords: ['pub-sub', 'topic', 'publisher', 'subscriber', 'broker', 'Kafka'],
  },
  'consumer-group': {
    name: 'consumer-group', category: 'distributed-systems',
    description: 'Group of consumers that divide topic partitions among themselves',
    prerequisites: ['publish-subscribe'], relatedConcepts: ['partition-rebalance', 'offset-commit'],
    interviewRelevant: true, whyItMatters: 'Enables horizontal scaling of message consumption',
    keywords: ['consumer group', 'partition', 'rebalance', 'Kafka'],
  },
  'offset-commit': {
    name: 'offset-commit', category: 'distributed-systems',
    description: 'Recording the position of a consumer in a partition log',
    prerequisites: ['publish-subscribe', 'consumer-group'],
    relatedConcepts: ['consumer-group', 'publish-subscribe'],
    interviewRelevant: true, whyItMatters: 'Enables exactly-once semantics and failure recovery',
    keywords: ['offset', 'commit', 'position', 'Kafka', 'at-least-once'],
  },
  'partition-rebalance': {
    name: 'partition-rebalance', category: 'distributed-systems',
    description: 'Redistributing partitions among consumers when group membership changes',
    prerequisites: ['consumer-group', 'publish-subscribe'],
    relatedConcepts: ['consumer-group'],
    interviewRelevant: true, whyItMatters: 'Ensures load distribution but causes processing pauses',
    keywords: ['rebalance', 'partition assignment', 'consumer', 'Kafka', 'revoke'],
  },
  'forward-pass': {
    name: 'forward-pass', category: 'ai-ml',
    description: 'Computing output from input through neural network layers',
    prerequisites: ['tensor'], relatedConcepts: ['backpropagation', 'gradient-descent'],
    interviewRelevant: true, whyItMatters: 'Core inference computation in neural networks',
    keywords: ['forward', 'inference', 'layer', 'activation', 'neural network'],
  },
  backpropagation: {
    name: 'backpropagation', category: 'ai-ml',
    description: 'Computing gradients by propagating error backwards through the network',
    prerequisites: ['forward-pass'], relatedConcepts: ['gradient-descent', 'loss-function'],
    interviewRelevant: true, whyItMatters: 'The algorithm that made deep learning possible',
    keywords: ['backprop', 'gradient', 'chain rule', 'backward pass', 'differentiation'],
  },
  'gradient-descent': {
    name: 'gradient-descent', category: 'ai-ml',
    description: 'Iterative optimization moving parameters opposite the gradient',
    prerequisites: ['backpropagation'], relatedConcepts: ['loss-function', 'backpropagation'],
    interviewRelevant: true, whyItMatters: 'Core optimization algorithm for all neural network training',
    keywords: ['gradient descent', 'learning rate', 'SGD', 'Adam', 'optimizer'],
  },
  'loss-function': {
    name: 'loss-function', category: 'ai-ml',
    description: 'Measuring the difference between predicted and actual values',
    prerequisites: [], relatedConcepts: ['gradient-descent', 'backpropagation'],
    interviewRelevant: true, whyItMatters: 'Defines what the model learns and how well',
    keywords: ['loss', 'cost', 'error', 'MSE', 'cross-entropy', 'objective'],
  },
  indexing: {
    name: 'indexing', category: 'database',
    description: 'Data structure improving data retrieval speed',
    prerequisites: ['tree', 'hashing'], relatedConcepts: ['transaction', 'locking'],
    interviewRelevant: true, whyItMatters: 'Makes database queries fast enough for real-world use',
    keywords: ['index', 'B-tree', 'primary key', 'secondary index', 'query performance'],
  },
  transaction: {
    name: 'transaction', category: 'database',
    description: 'Group of operations executed atomically with ACID properties',
    prerequisites: ['locking', 'indexing'], relatedConcepts: ['isolation', 'locking'],
    interviewRelevant: true, whyItMatters: 'Ensures data integrity despite failures and concurrency',
    keywords: ['transaction', 'ACID', 'atomic', 'commit', 'rollback', 'begin'],
  },
  isolation: {
    name: 'isolation', category: 'database',
    description: 'Ensuring concurrent transactions do not interfere with each other',
    prerequisites: ['transaction', 'locking'], relatedConcepts: ['transaction', 'locking'],
    interviewRelevant: true, whyItMatters: 'Determines correctness of concurrent database access',
    keywords: ['isolation', 'serializable', 'MVCC', 'read committed', 'dirty read'],
  },
  locking: {
    name: 'locking', category: 'concurrency',
    description: 'Controlling concurrent access to shared resources',
    prerequisites: ['context-switch'], relatedConcepts: ['mutex', 'deadlock', 'transaction'],
    interviewRelevant: true, whyItMatters: 'Fundamental synchronization primitive',
    keywords: ['lock', 'unlock', 'shared lock', 'exclusive lock', 'two-phase locking'],
  },
  'load-balancing': {
    name: 'load-balancing', category: 'system-design',
    description: 'Distributing workload across multiple computing resources',
    prerequisites: [], relatedConcepts: ['caching', 'rate-limiting', 'circuit-breaker'],
    interviewRelevant: true, whyItMatters: 'Essential for scalability and high availability',
    keywords: ['load balancer', 'round robin', 'least connections', 'health check'],
  },
  caching: {
    name: 'caching', category: 'system-design',
    description: 'Storing frequently accessed data for faster retrieval',
    prerequisites: ['hashing', 'hash-map'], relatedConcepts: ['load-balancing', 'database'],
    interviewRelevant: true, whyItMatters: 'Single most effective performance optimization',
    keywords: ['cache', 'TTL', 'cache miss', 'cache hit', 'LRU', 'Redis', 'CDN'],
  },
  'rate-limiting': {
    name: 'rate-limiting', category: 'system-design',
    description: 'Controlling the rate of requests to a system',
    prerequisites: [], relatedConcepts: ['load-balancing', 'circuit-breaker'],
    interviewRelevant: true, whyItMatters: 'Prevents abuse and ensures fair resource allocation',
    keywords: ['rate limit', 'throttle', 'token bucket', 'leaky bucket', '429'],
  },
  'circuit-breaker': {
    name: 'circuit-breaker', category: 'system-design',
    description: 'Preventing cascading failures by stopping calls to failing services',
    prerequisites: [], relatedConcepts: ['load-balancing', 'rate-limiting'],
    interviewRelevant: true, whyItMatters: 'Critical for resilient microservice architectures',
    keywords: ['circuit breaker', 'fault tolerance', 'resilience', 'bulkhead', 'Hystrix'],
  },
  custom: {
    name: 'custom', category: 'general',
    description: 'User-defined concept',
    prerequisites: [], relatedConcepts: [],
    interviewRelevant: false,
    keywords: ['custom'],
  },
  probing: {
    name: 'probing', category: 'data-structure',
    description: 'Systematically checking positions in a hash table during collision resolution',
    prerequisites: ['hashing', 'collision-resolution'], relatedConcepts: ['hashing', 'collision-resolution'],
    interviewRelevant: true, whyItMatters: 'Determines cache performance and clustering behavior',
    keywords: ['linear probing', 'quadratic probing', 'double hashing', 'open addressing'],
  },
  trie: {
    name: 'trie', category: 'data-structure',
    description: 'Tree structure for storing strings, sharing common prefixes',
    prerequisites: ['tree'], relatedConcepts: ['tree', 'hashing'],
    interviewRelevant: true, whyItMatters: 'Fast prefix search, autocomplete, spell checking',
    keywords: ['trie', 'prefix tree', 'radix tree', 'autocomplete'],
  },
  set: {
    name: 'set', category: 'data-structure',
    description: 'Collection of unique elements with membership testing',
    prerequisites: ['hashing', 'hash-map'], relatedConcepts: ['hash-map', 'array'],
    interviewRelevant: true, whyItMatters: 'Fundamental for deduplication and membership checks',
    keywords: ['set', 'unique', 'union', 'intersection', 'difference'],
  },
  'reference-counting': {
    name: 'reference-counting', category: 'memory-management',
    description: 'GC strategy tracking how many references point to each object',
    prerequisites: ['garbage-collection'], relatedConcepts: ['garbage-collection', 'mark-sweep'],
    interviewRelevant: true, whyItMatters: 'Simple GC used in Python, Swift, Objective-C',
    keywords: ['reference count', 'retain', 'release', 'cycle', 'weak reference'],
  },
  paging: {
    name: 'paging', category: 'memory-management',
    description: 'Memory management scheme dividing memory into fixed-size pages',
    prerequisites: ['memory-allocation'], relatedConcepts: ['segmentation', 'virtual-memory'],
    interviewRelevant: true, whyItMatters: 'Enables virtual memory, protection, and efficient allocation',
    keywords: ['page', 'page table', 'TLB', 'page fault', 'frame'],
  },
  'virtual-memory': {
    name: 'virtual-memory', category: 'memory-management',
    description: 'Abstracting physical memory into virtual addresses for each process',
    prerequisites: ['paging', 'segmentation'], relatedConcepts: ['paging', 'memory-allocation'],
    interviewRelevant: true, whyItMatters: 'Allows programs larger than physical RAM, isolation, sharing',
    keywords: ['virtual memory', 'VM', 'address space', 'MMU', 'page table'],
  },
  embedding: {
    name: 'embedding', category: 'ai-ml',
    description: 'Dense vector representation of discrete objects in continuous space',
    prerequisites: [], relatedConcepts: ['attention', 'transformer', 'tokenization'],
    interviewRelevant: true, whyItMatters: 'Foundation of modern NLP and recommendation systems',
    keywords: ['embedding', 'vector', 'Word2Vec', 'BERT', 'representation learning'],
  },
  attention: {
    name: 'attention', category: 'ai-ml',
    description: 'Allowing model to focus on relevant parts of the input',
    prerequisites: ['embedding', 'tokenization'], relatedConcepts: ['transformer', 'embedding'],
    interviewRelevant: true, whyItMatters: 'Core mechanism behind transformers and LLMs',
    keywords: ['attention', 'self-attention', 'query', 'key', 'value', 'transformer'],
  },
  transformer: {
    name: 'transformer', category: 'ai-ml',
    description: 'Neural architecture based on self-attention, no recurrence',
    prerequisites: ['attention', 'embedding', 'forward-pass'],
    relatedConcepts: ['attention', 'tokenization', 'embedding'],
    interviewRelevant: true, whyItMatters: 'Architecture behind GPT, BERT, and all modern LLMs',
    keywords: ['transformer', 'encoder', 'decoder', 'self-attention', 'GPT', 'BERT'],
  },
  tokenization: {
    name: 'tokenization', category: 'ai-ml',
    description: 'Splitting text into smaller units (tokens) for model processing',
    prerequisites: [], relatedConcepts: ['embedding', 'transformer'],
    interviewRelevant: true, whyItMatters: 'First step in any NLP pipeline',
    keywords: ['tokenization', 'token', 'subword', 'BPE', 'WordPiece', 'sentencepiece'],
  },
  segmentation: {
    name: 'segmentation', category: 'memory-management',
    description: 'Memory management dividing address space into variable-sized segments',
    prerequisites: ['memory-allocation'], relatedConcepts: ['paging', 'virtual-memory'],
    interviewRelevant: true, whyItMatters: 'Logical protection units matching program structure',
    keywords: ['segment', 'segmentation', 'base', 'limit', 'x86 segmentation'],
  },
  'dns-resolution': {
    name: 'dns-resolution', category: 'networking',
    description: 'Translating human-readable domain names to IP addresses',
    prerequisites: [], relatedConcepts: ['routing'],
    interviewRelevant: true, whyItMatters: 'Essential for every internet request, often overlooked bottleneck',
    keywords: ['DNS', 'domain name', 'A record', 'CNAME', 'resolver', 'TLD'],
  },
  gossip: {
    name: 'gossip', category: 'distributed-systems',
    description: 'Epidemic protocol for spreading information through a network',
    prerequisites: [], relatedConcepts: ['replication', 'consensus'],
    interviewRelevant: true, whyItMatters: 'Decentralized, fault-tolerant information dissemination',
    keywords: ['gossip protocol', 'epidemic', 'anti-entropy', 'membership', 'Cassandra'],
  },
  crdt: {
    name: 'crdt', category: 'distributed-systems',
    description: 'Conflict-free replicated data type that converges without coordination',
    prerequisites: ['replication', 'consensus'], relatedConcepts: ['gossip', 'replication'],
    interviewRelevant: true, whyItMatters: 'Enables offline-first collaborative applications',
    keywords: ['CRDT', 'conflict-free', 'convergent', 'LWW', 'OR-Set', 'collaboration'],
  },
  paxos: {
    name: 'paxos', category: 'distributed-systems',
    description: 'Classic consensus algorithm for agreeing on a single value',
    prerequisites: ['consensus', 'replication'], relatedConcepts: ['raft', 'consensus'],
    interviewRelevant: true, whyItMatters: 'Foundational consensus protocol, proven correct',
    keywords: ['Paxos', 'proposer', 'acceptor', 'learner', 'quorum', 'ballot'],
  },
}
