export const TOPIC_META = {
  dsa: {
    color: 'blue',
    desc: 'Master fundamental data structures and algorithms with interactive visualization. Step through every operation from array indexing to graph traversal.',
    objectives: [
      'Understand array operations: indexing, searching, sorting in O(n) or O(n log n)',
      'Visualize pointer manipulation in linked lists and trees',
      'Trace graph algorithms: BFS, DFS, Dijkstra, topological sort',
      'Learn dynamic programming: memoization vs tabulation, optimal substructure'
    ],
    keyTopics: ['Time/Space Complexity', 'In-place vs Extra Space', 'Recursion & Stack Frames', 'Graph Connectivity']
  },
  java: {
    color: 'yellow',
    desc: 'Deep dive into JVM internals, memory management, concurrency. Watch variables on the stack, objects on the heap, garbage collection in action.',
    objectives: [
      'Trace object creation: class loading → memory allocation → initialization',
      'Visualize garbage collection: Mark-Sweep, Generational, CMS algorithms',
      'Understand thread lifecycle: new → runnable → blocked → terminated',
      'Debug lock contention with mutex visualization',
      'See how HashMap resizes and how treeification works'
    ],
    keyTopics: ['Heap vs Stack', 'GC Roots & Reachability', 'Lock Ordering', 'Weak References']
  },
  spring: {
    color: 'yellow',
    desc: 'Spring Framework architecture: dependency injection, aspect-oriented programming, transaction management, and enterprise patterns.',
    objectives: [
      'Understand Bean lifecycle: instantiation → property injection → initialization',
      'See how AOP proxies intercept method calls and apply cross-cutting concerns',
      'Trace transaction boundaries across method calls',
      'Visualize Spring Security filter chains and authentication flow'
    ],
    keyTopics: ['Bean Scopes', 'Proxy Patterns', 'Transaction Propagation', 'Event Publishing']
  },
  golang: {
    color: 'blue',
    desc: 'Learn Go concurrency primitives: lightweight goroutines, channels, and the scheduler that makes Go exceptional for concurrent systems.',
    objectives: [
      'Visualize goroutine scheduling and context switching',
      'Understand channel communication: buffered vs unbuffered, select statements',
      'Trace deadlock detection: when all goroutines are blocked',
      'Learn defer stack and panic recovery mechanism'
    ],
    keyTopics: ['M:N Scheduling', 'Channel Semantics', 'WaitGroups', 'Goroutine Leaks']
  },
  python: {
    color: 'green',
    desc: 'Python runtime: GIL, async I/O, decorators, and data science pipelines. Understand why async is important despite the GIL.',
    objectives: [
      'See how the Global Interpreter Lock limits true parallelism',
      'Trace async/await execution: event loop, coroutines, futures',
      'Understand decorator stacking and function wrapping',
      'Visualize ML pipeline stages: preprocessing → training → validation'
    ],
    keyTopics: ['GIL Contention', 'Event Loop', 'Coroutine States', 'Generator Exhaustion']
  },
  kubernetes: {
    color: 'blue',
    desc: 'Kubernetes orchestration: scheduling, deployment strategies, networking, storage, and failure recovery in cloud-native systems.',
    objectives: [
      'Watch pod scheduling: affinity, taints, tolerations, resource requests',
      'Visualize rolling deployments: gradual replacement with zero downtime',
      'Understand service discovery: DNS round-robin vs direct pod IPs',
      'Trace HPA scaling decisions based on CPU/memory metrics',
      'See how etcd Raft consensus protects cluster state'
    ],
    keyTopics: ['Scheduler Algorithm', 'Ingress Routing', 'StatefulSets', 'Custom Resources']
  },
  aws: {
    color: 'yellow',
    desc: 'AWS services architecture: compute, messaging, storage, databases, and how they integrate to build scalable systems.',
    objectives: [
      'Understand Lambda cold starts vs warm invocations',
      'Visualize SQS queue mechanics: visibility timeout, DLQ, exactly-once processing',
      'Trace API Gateway rate limiting and request transformation',
      'See how RDS read replicas enable scaling and failover',
      'Learn S3 consistency models and CloudFront cache invalidation'
    ],
    keyTopics: ['IAM Principal', 'VPC Networking', 'Eventually Consistent', 'Cost Optimization']
  },
  kafka: {
    color: 'red',
    desc: 'Apache Kafka: distributed message queue, event streaming, partition leadership, consumer groups, and exactly-once semantics.',
    objectives: [
      'Understand partition assignment: round-robin, sticky, range assignors',
      'Visualize leader election using Raft consensus in ISR',
      'Trace consumer lag and commit strategies: at-least-once vs exactly-once',
      'See how replication factor protects against broker failure',
      'Learn compacted topics for state stores'
    ],
    keyTopics: ['Offset Management', 'Consumer Groups', 'ISR Shrink', 'Broker Failure Recovery']
  },
  'system-design': {
    color: 'purple',
    desc: 'Large-scale systems: Uber ride-hailing, load balancing strategies, caching layers, database sharding, and consensus algorithms.',
    objectives: [
      'Design end-to-end ride request flow across 14 services',
      'Understand load balancer algorithms: round-robin, least-connections, consistent hashing',
      'Visualize cache hierarchies: L1 → Redis → Database',
      'Trace database query optimization: indexing, query plans, join strategies',
      'Learn Raft consensus and CAP theorem trade-offs'
    ],
    keyTopics: ['Service Boundaries', 'Sharding Strategy', 'Circuit Breakers', 'Rate Limiting']
  },
  microservices: {
    color: 'blue',
    desc: 'Microservices patterns: load balancing, caching strategies, resilience patterns, API gateways, and event-driven communication.',
    objectives: [
      'Implement circuit breaker pattern to prevent cascading failures',
      'Visualize service discovery: health checks, load balancer updates',
      'Understand API gateway responsibilities: auth, routing, rate limiting',
      'Trace event-driven architecture: producers, brokers, consumers',
      'Learn distributed tracing and observability patterns'
    ],
    keyTopics: ['Bounded Contexts', 'Bulkhead Pattern', 'Service-to-Service Auth', 'Idempotency']
  },
  sorting: {
    color: 'blue',
    desc: 'Sorting algorithms: bubble, selection, insertion, merge, quick, and heap sort with full step-by-step animation and comparison counting.',
    objectives: [
      'Compare time complexity: O(n²) vs O(n log n)',
      'Understand in-place sorting vs extra space requirements',
      'Visualize partitioning in QuickSort: pivot selection strategies',
      'Learn merge process in MergeSort: combine sorted subarrays',
      'Trace heap invariant maintenance during HeapSort'
    ],
    keyTopics: ['Stability', 'Cache Locality', 'Adaptive Algorithms', 'Comparison Counting']
  },
  database: {
    color: 'yellow',
    desc: 'Database internals: B-Tree indexing, query planning, ACID transactions, join algorithms, and query optimization.',
    objectives: [
      'Understand B-Tree properties: branching factor, search, insert, delete',
      'Visualize query plan execution: full scans, index scans, joins',
      'Trace ACID guarantees: isolation levels, lock modes, deadlock detection',
      'Learn join algorithms: nested loop, hash join, sort-merge',
      'See how query optimizer chooses best execution path'
    ],
    keyTopics: ['Cardinality Estimation', 'Lock Modes', 'MVCC', 'Cost-Based Optimization']
  },
  redis: {
    color: 'red',
    desc: 'Redis data structures and operations: strings, lists, sets, hashes, sorted sets, pub/sub, cluster mode, and pipelining.',
    objectives: [
      'Understand data structure operations: O(1) vs O(n) complexity',
      'Visualize pub/sub message delivery: subscribers, channels, unsubscribe',
      'Trace cluster mode: hash slots, key distribution, node failover',
      'Learn pipelining benefits: batch network requests',
      'See persistence strategies: RDB snapshots vs AOF logs'
    ],
    keyTopics: ['Eviction Policies', 'Expiration', 'Replica Lag', 'Cluster Slots']
  },
  docker: {
    color: 'blue',
    desc: 'Docker containerization: image layers, container lifecycle, networking modes, volumes, and docker-compose orchestration.',
    objectives: [
      'Understand image layering: how each RUN/COPY creates new layers',
      'Visualize container lifecycle: create → start → run → pause → stop',
      'Trace network modes: bridge, host, overlay networking',
      'Learn volume types: bind mount vs named volumes vs tmpfs',
      'See how docker-compose orchestrates multi-container applications'
    ],
    keyTopics: ['Union FileSystem', 'OCI Runtime', 'Namespace Isolation', 'Cgroup Limits']
  },
  networking: {
    color: 'green',
    desc: 'Network protocols and communication: TCP handshake, HTTP/1 vs HTTP/2, DNS resolution, load balancer algorithms.',
    objectives: [
      'Trace TCP three-way handshake: SYN, SYN-ACK, ACK with sequence numbers',
      'Understand HTTP/2 multiplexing vs HTTP/1 connection pooling',
      'Visualize DNS resolution: recursive query, nameserver chain, caching',
      'Learn load balancer algorithms: round-robin, least-connections, consistent hash',
      'See how TLS handshake establishes encrypted channel'
    ],
    keyTopics: ['Window Size', 'Congestion Control', 'HTTP Headers', 'Certificate Chains']
  },
  os: {
    color: 'purple',
    desc: 'Operating systems fundamentals: CPU scheduling, memory management, virtual memory, paging, and TLB behavior.',
    objectives: [
      'Understand scheduling algorithms: FCFS, Round-Robin, Priority, Multilevel Feedback Queue',
      'Visualize page replacement: FIFO vs LRU vs Second Chance algorithms',
      'Learn TLB (Translation Lookaside Buffer) and page table walks',
      'Trace virtual memory: logical vs physical addresses, address translation',
      'See how context switching saves/restores CPU state'
    ],
    keyTopics: ['Process vs Thread', 'Mutual Exclusion', 'Deadlock Detection', 'Thrashing']
  },
  ai: {
    color: 'green',
    desc: 'AI fundamentals: Transformer architecture, multi-head attention mechanism, embeddings, and neural network operations.',
    objectives: [
      'Understand Transformer blocks: encoder, decoder, self-attention layers',
      'Visualize multi-head attention: query, key, value matrices, softmax scoring',
      'Trace positional encoding and how tokens maintain position information',
      'Learn embedding spaces: word2vec, GloVe, contextual embeddings',
      'See how attention weights show model interpretability'
    ],
    keyTopics: ['Tokenization', 'Activation Functions', 'Gradient Flow', 'Beam Search']
  },
  distributed: {
    color: 'blue',
    desc: 'Distributed systems foundations: Raft consensus, CAP theorem, two-phase commit, and handling network partitions.',
    objectives: [
      'Understand Raft: leader election, log replication, safety guarantees',
      'Visualize CAP theorem: Consistency vs Availability vs Partition tolerance',
      'Trace two-phase commit: prepare phase, commit phase, abort scenarios',
      'Learn quorum-based decision making for split-brain prevention',
      'See how Byzantine agreement handles malicious nodes'
    ],
    keyTopics: ['Consistency Models', 'Eventual Consistency', 'Vector Clocks', 'Sharding']
  },
  concurrency: {
    color: 'yellow',
    desc: 'Concurrency primitives and patterns: mutexes, semaphores, condition variables, producer-consumer, reader-writer locks.',
    objectives: [
      'Understand mutex semantics: lock/unlock, atomic acquire/release',
      'Visualize semaphores: counting semaphores, binary semaphores (mutexes)',
      'Trace producer-consumer pattern with bounded buffer and synchronization',
      'Learn reader-writer locks: multiple readers OR single writer',
      'See deadlock scenarios and detection strategies'
    ],
    keyTopics: ['Lock Ordering', 'Signal vs Broadcast', 'ABA Problem', 'Spin vs Block']
  },
};

export const VISUALIZER_MAP = {
  'dsa:Arrays':                  'array',
  'dsa:TwoPointers':             'array',
  'dsa:PrefixSum':               'array',
  'dsa:BinarySearch':            'array',
  'dsa:Matrices':                'matrix',
  'dsa:LinkedList':              'linkedlist',
  'dsa:Graphs':                  'graph',
  'dsa:Trees':                   'tree',
  'java:JVM':                    'jvm',
  'java:GC':                     'jvm',
  'java:Threads':                'threads',
  'java:Locks':                  'threads',
  'java:Collections':            'java-collections',
  'java:Classloader':            'jvm',
  'java:String Pool':            'jvm',
  'java:HashMap Internals':      'jvm',
  'java:Volatile':               'jvm',
  'java:Exception Stack':        'jvm',
  'kafka:Partitions':            'kafka',
  'kafka:ISR':                   'kafka',
  'kafka:Consumer Groups':       'kafka',
  'kafka:Lag':                   'kafka',
  'kubernetes:Pods':             'kubernetes',
  'kubernetes:HPA':              'kubernetes',
  'kubernetes:Deployments':      'kubernetes',
  'kubernetes:Services':         'kubernetes',
  'kubernetes:Ingress':          'kubernetes',
  'kubernetes:Config & Storage': 'kubernetes',
  'kubernetes:DNS':              'kubernetes',
  'kubernetes:Sidecars':         'kubernetes',
  'kubernetes:etcd':             'kubernetes',
  'kubernetes:Node Failure':     'kubernetes',
  'system-design:Uber':              'uber',
  'microservices:Load Balancer':     'systemdesign',
  'microservices:Cache':             'systemdesign',
  'microservices:CDN':               'systemdesign',
  'microservices:Raft':              'systemdesign',
  'microservices:Circuit Breaker':   'microservices',
  'microservices:Service Discovery': 'microservices',
  'microservices:API Gateway':       'microservices',
  'microservices:Event-Driven':      'microservices',
  'golang:Goroutines':           'golang',
  'golang:Channels':             'golang',
  'golang:Scheduler':            'golang',
  'golang:gRPC':                 'golang',
  'aws:Lambda':                  'aws',
  'aws:SQS':                     'aws',
  'aws:SNS':                     'aws',
  'aws:EKS':                     'aws',
  'aws:API Gateway':             'aws',
  'aws:EC2':                     'aws',
  'aws:S3':                      'aws',
  'aws:IAM':                     'aws',
  'aws:Route53':                 'aws',
  'aws:ECS':                     'aws',
  'aws:Step Functions':          'aws',
  'aws:Aurora / RDS':             'aws',
  'aws:ElastiCache':              'aws',
  'python:GIL':                  'python',
  'python:Async':                'python',
  'python:Decorators':           'python',
  'python:ML Pipelines':         'python',
  'dsa:DP':                      'dp',
  'dsa:Strings':                 'string',
  'dsa:HashMaps':                'hashmap',
  'dsa:Sets':                    'set',
  'sorting:Bubble Sort':         'sorting',
  'sorting:Merge Sort':          'sorting',
  'sorting:Quick Sort':          'sorting',
  'sorting:Heap Sort':           'sorting',
  'database:B-Tree':             'database',
  'database:Query Planning':     'database',
  'database:Transactions':       'database',
  'database:Joins':              'database',
  'redis:Data Types':            'redis',
  'redis:Pub/Sub':               'redis',
  'redis:Cluster':               'redis',
  'redis:Pipelining':            'redis',
  'docker:Image Layers':         'docker',
  'docker:Container Lifecycle':  'docker',
  'docker:Networking':           'docker',
  'docker:Compose':              'docker',
  'networking:TCP Handshake':    'networking',
  'networking:HTTP':             'networking',
  'networking:DNS':              'networking',
  'networking:Load Balancer':    'networking',
  'os:Scheduler':                'os',
  'os:Paging':                   'os',
  'os:Virtual Memory':           'os',
  'ai:Transformer':              'ai',
  'ai:Attention':                'ai',
  'ai:Embeddings':               'ai',
  'distributed:Raft':            'distributed',
  'distributed:CAP Theorem':     'distributed',
  'distributed:2PC':             'distributed',
  'concurrency:Mutex':           'concurrency',
  'concurrency:Semaphore':       'concurrency',
  'concurrency:Producer-Consumer': 'concurrency',
};
