import { lazy } from 'react';

export const VISUALIZERS = {
  /* ─── DSA: Fundamental Algorithms & Data Structures ─────────────────────── */
  array: {
    label: 'Array — Sliding Window, Two Pointers, Prefix Sum, Binary Search',
    icon: '📊',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Sliding window, two pointers, prefix sum queries, binary search. O(n)/O(log n) time.',
  },
  matrix: {
    label: 'Matrix — Spiral, Flood Fill, Rotate 90°',
    icon: '🔢',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Spiral traversal, BFS flood fill, in-place 90° rotation. O(m·n) time.',
  },
  linkedlist: {
    label: 'Linked List — Reverse, Cycle Detection, Merge',
    icon: '🔗',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Iterative reversal, Floyd\'s cycle detection, merge two sorted lists. O(n) time.',
  },
  string: {
    label: 'Strings — KMP, Sliding Window Anagram, Palindrome',
    icon: '🔤',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'KMP pattern matching, sliding window anagram finder, expand-around-center palindrome. O(n) time.',
  },
  trie: {
    label: 'Trie — Insert, Search, Autocomplete',
    icon: '🌳',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Prefix tree for efficient string search, autocomplete, and spell checking. O(m) search time.',
  },
  sorting: {
    label: 'Sorting — Bubble, Merge, Quick, Heap',
    icon: '📶',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Bubble, merge, quick, heap sort with step-by-step comparison and swap tracking.',
  },
  graph: {
    label: 'Graph — BFS / DFS',
    icon: '🕸️',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Breadth-First and Depth-First traversal. O(V+E) time.',
  },
  unionfind: {
    label: 'Union-Find — Path Compression, Kruskal MST',
    icon: '⚡',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Disjoint Set Union with path compression and union by rank. Find connected components, detect cycles, Kruskal MST. O(α(n)) amortized.',
  },
  backtracking: {
    label: 'Backtracking — N-Queens, Sudoku, Permutations',
    icon: '🔀',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Recursive backtracking: choose-explore-unchoose pattern. N-Queens constraints, Sudoku multi-constraint solving, permutation generation.',
  },
  tree: {
    label: 'BST — Insert & Traversals',
    icon: '🌳',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'BST insert path animation. Inorder / Preorder / Postorder traversals.',
  },
  hashmap: {
    label: 'HashMap — Put/Get, Two Sum, LRU Cache',
    icon: '🗺️',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Hash function + chaining, O(n) two-sum with complement lookup, doubly-linked-list LRU cache.',
  },
  set: {
    label: 'Set — Union/Intersection, Merge, Contains Duplicate',
    icon: '🔵',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Set union/intersection/difference, sorted merge with dedup, sliding window duplicate detection.',
  },
  dp: {
    label: 'Dynamic Programming — Fibonacci, Coin Change, Knapsack, LCS, LIS',
    icon: '🧩',
    component: lazy(() => import('../../components/visualizers/GenericVisualizer/GenericVisualizer')),
    desc: 'Tabulation step-by-step: Fibonacci, Coin Change, 0/1 Knapsack, LCS, LIS with full DP table animation.',
  },
  'java-collections': {
    label: 'Java Collections — ArrayList, LinkedList, HashMap, HashSet, TreeMap, Queue, Concurrent',
    icon: '☕',
    component: lazy(() => import('../../components/visualizers/JavaCollectionsVisualizer/JavaCollectionsVisualizer')),
    desc: 'Step-by-step simulations of all Java collection types: core flows, edge cases, concurrency scenarios, and exception handling.',
  },
  'java-streams': {
    label: 'Java Streams — Pipelines, FlatMap, Collectors, Parallel, Edge Cases',
    icon: '🌊',
    component: lazy(() => import('../../components/visualizers/JavaStreamsVisualizer/JavaStreamsVisualizer')),
    desc: 'Stream pipeline visualization: creation, intermediate/terminal ops, lazy evaluation, flatMap, collectors (groupingBy/partitioningBy/joining), parallel streams, reduce/match, and edge cases.',
  },

  /* ─── Language Runtimes & Concurrency ──────────────────────────────────── */
  jvm: {
    label: 'JVM — Heap, GC, Thread Stack',
    icon: '☕',
    component: lazy(() => import('../../components/visualizers/JVMVisualizer/JVMVisualizer')),
    desc: 'Eden → Survivor → Old Gen allocation, Minor GC, Full GC stop-the-world.',
  },
  threads: {
    label: 'Threads — Mutex, Deadlock, Semaphore',
    icon: '🧵',
    component: lazy(() => import('../../components/visualizers/ThreadVisualizer/ThreadVisualizer')),
    desc: 'Thread states, mutex lock/unlock, deadlock cycle, semaphore counting.',
  },
  golang: {
    label: 'Go — Goroutines, Channels, Scheduler',
    icon: '🐹',
    component: lazy(() => import('../../components/visualizers/GoVisualizer/GoVisualizer')),
    desc: 'Goroutine lifecycle, buffered channels, select multiplexing, M:N scheduler G/M/P model.',
  },
  python: {
    label: 'Python — GIL, asyncio, Decorators',
    icon: '🐍',
    component: lazy(() => import('../../components/visualizers/PythonVisualizer/PythonVisualizer')),
    desc: 'GIL thread contention, asyncio event loop coroutines, decorator wrapping patterns.',
  },

  /* ─── Infrastructure & Storage ────────────────────────────────────────── */
  database: {
    label: 'Database — B-Tree, Query Plan, ACID, Joins',
    icon: '🗄️',
    component: lazy(() => import('../../components/visualizers/DatabaseVisualizer/DatabaseVisualizer')),
    desc: 'B-Tree index insertion/search, SQL query planning, ACID transactions, join algorithms.',
  },
  redis: {
    label: 'Redis — Data Types, Pub/Sub, Cluster, Pipeline',
    icon: '🔴',
    component: lazy(() => import('../../components/visualizers/RedisVisualizer/RedisVisualizer')),
    desc: 'Redis data types, pub/sub channels, cluster hash slots, pipelining RTT savings.',
  },
  kafka: {
    label: 'Kafka — Producer → Partition → Consumer',
    icon: '📨',
    component: lazy(() => import('../../components/visualizers/KafkaVisualizer/KafkaVisualizer')),
    desc: 'Partitioned log, ISR replication, consumer groups, lag, leader election.',
  },
  docker: {
    label: 'Docker — Layers, Lifecycle, Network, Compose',
    icon: '🐳',
    component: lazy(() => import('../../components/visualizers/DockerVisualizer/DockerVisualizer')),
    desc: 'Image layer filesystem, container lifecycle, bridge networking, docker-compose orchestration.',
  },
  networking: {
    label: 'Networking — TCP, HTTP/2, DNS, Load Balancer',
    icon: '🌐',
    component: lazy(() => import('../../components/visualizers/NetworkingVisualizer/NetworkingVisualizer')),
    desc: 'TCP 3-way handshake, HTTP/1 vs HTTP/2 multiplexing, DNS resolution chain, LB algorithms.',
  },
  kubernetes: {
    label: 'Kubernetes — Pods, HPA, Rolling, CrashLoop',
    icon: '☸️',
    component: lazy(() => import('../../components/visualizers/KubernetesVisualizer/KubernetesVisualizer')),
    desc: 'Pod scheduling, HPA scale-out, rolling deployments, CrashLoopBackOff.',
  },
  aws: {
    label: 'AWS — Lambda, SQS, API Gateway, EKS',
    icon: '☁️',
    component: lazy(() => import('../../components/visualizers/AWSVisualizer/AWSVisualizer')),
    desc: 'Lambda cold/warm start, SQS DLQ, API Gateway throttling, EKS cluster autoscaler.',
  },

  /* ─── System Architecture ──────────────────────────────────────────────── */
  sd: {
    label: 'System Design — Uber, WhatsApp, LB, Cache, CDN, Raft',
    icon: '🏗️',
    component: lazy(() => import('../../components/visualizers/SystemDesignVisualizer/SystemDesignVisualizer')),
    desc: 'Uber ride-hailing, WhatsApp messaging, Load balancer round-robin, Redis LRU cache, CDN edge, Raft leader election.',
  },
  systemdesign: {
    label: 'System Design — Uber, LB, Cache, CDN, Raft',
    icon: '🏗️',
    component: lazy(() => import('../../components/visualizers/SystemDesignVisualizer/SystemDesignVisualizer')),
    desc: 'Uber ride-hailing, Load balancer round-robin, Redis LRU cache, CDN edge, Raft leader election.',
  },
  uber: {
    label: 'Uber System Design — Ride Matching, GPS, Surge, Payments',
    icon: '🚗',
    component: lazy(() => import('../../components/visualizers/SystemDesignVisualizer/SystemDesignVisualizer')),
    desc: 'Uber ride-hailing architecture: 14 components (Rider/Driver app, API Gateway, Auth, Ride Match, Location, Pricing, Trip, Payment, Redis, Kafka, PostgreSQL, WebSocket).',
  },
  microservices: {
    label: 'Microservices — Circuit Breaker, Discovery, Gateway, Event-Driven',
    icon: '🔌',
    component: lazy(() => import('../../components/visualizers/MicroservicesVisualizer/MicroservicesVisualizer')),
    desc: 'Circuit breaker states (Closed→Open→Half-Open), service discovery with health checks, API gateway routing, event-driven communication with retry and backoff.',
  },
  spring: {
    label: 'Spring Framework — IoC, MVC, AOP, Transactions, Security, JPA, Cloud',
    icon: '🍃',
    component: lazy(() => import('../../components/visualizers/SpringVisualizer/SpringVisualizer')),
    desc: 'Visual simulations of Spring internals: bean lifecycle & circular deps, MVC request flow & interceptors, JDK/CGLIB proxy & advice chain, @Transactional propagation & rollback rules, security filter chain & JWT, JPA N+1 & fetch strategies, auto-configuration & @Conditional, and Spring Cloud circuit breaker & discovery.',
  },

  /* ─── Operating Systems ───────────────────────────────────────────────── */
  os: {
    label: 'Operating Systems — CPU Scheduler, Paging, Virtual Memory',
    icon: '🖥️',
    component: lazy(() => import('../../components/visualizers/OSVisualizer/OSVisualizer')),
    desc: 'FCFS & Round Robin CPU scheduling, page table & TLB walks, virtual memory swapping & thrashing.',
  },

  /* ─── AI / Transformers ───────────────────────────────────────────────── */
  ai: {
    label: 'AI / Transformers — Transformer, Attention, Embeddings',
    icon: '🤖',
    component: lazy(() => import('../../components/visualizers/AIVisualizer/AIVisualizer')),
    desc: 'Transformer encoder-decoder architecture, multi-head scaled dot-product attention, word embedding vectors.',
  },

  /* ─── Distributed Systems ─────────────────────────────────────────────── */
  distributed: {
    label: 'Distributed Systems — Raft, CAP, 2PC',
    icon: '🌍',
    component: lazy(() => import('../../components/visualizers/DistributedSystemsVisualizer/DistributedSystemsVisualizer')),
    desc: 'Raft leader election & log replication, CAP theorem partition simulation, two-phase commit protocol.',
  },

  /* ─── Concurrency ─────────────────────────────────────────────────────── */
  concurrency: {
    label: 'Concurrency — Mutex, Semaphore, Producer-Consumer',
    icon: '🧵',
    component: lazy(() => import('../../components/visualizers/ConcurrencyVisualizer/ConcurrencyVisualizer')),
    desc: 'Mutex lock/unlock with blocked queue, counting semaphore permit tracking, bounded buffer producer-consumer.',
  },
};
