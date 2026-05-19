import ArrayVisualizer from '../../components/visualizers/ArrayVisualizer/ArrayVisualizer';
import MatrixVisualizer from '../../components/visualizers/MatrixVisualizer/MatrixVisualizer';
import LinkedListVisualizer from '../../components/visualizers/LinkedListVisualizer/LinkedListVisualizer';
import GraphVisualizer from '../../components/visualizers/GraphVisualizer/GraphVisualizer';
import KafkaVisualizer from '../../components/visualizers/KafkaVisualizer/KafkaVisualizer';
import JVMVisualizer from '../../components/visualizers/JVMVisualizer/JVMVisualizer';
import TreeVisualizer from '../../components/visualizers/TreeVisualizer/TreeVisualizer';
import KubernetesVisualizer from '../../components/visualizers/KubernetesVisualizer/KubernetesVisualizer';
import ThreadVisualizer from '../../components/visualizers/ThreadVisualizer/ThreadVisualizer';
import SystemDesignVisualizer from '../../components/visualizers/SystemDesignVisualizer/SystemDesignVisualizer';
import GoVisualizer from '../../components/visualizers/GoVisualizer/GoVisualizer';
import AWSVisualizer from '../../components/visualizers/AWSVisualizer/AWSVisualizer';
import PythonVisualizer from '../../components/visualizers/PythonVisualizer/PythonVisualizer';
import StringVisualizer from '../../components/visualizers/StringVisualizer/StringVisualizer';
import HashMapVisualizer from '../../components/visualizers/HashMapVisualizer/HashMapVisualizer';
import SetVisualizer from '../../components/visualizers/SetVisualizer/SetVisualizer';
import SortingVisualizer from '../../components/visualizers/SortingVisualizer/SortingVisualizer';
import DatabaseVisualizer from '../../components/visualizers/DatabaseVisualizer/DatabaseVisualizer';
import RedisVisualizer from '../../components/visualizers/RedisVisualizer/RedisVisualizer';
import DockerVisualizer from '../../components/visualizers/DockerVisualizer/DockerVisualizer';
import NetworkingVisualizer from '../../components/visualizers/NetworkingVisualizer/NetworkingVisualizer';
import DPVisualizer from '../../components/visualizers/DPVisualizer/DPVisualizer';

export const VISUALIZERS = {
  array: {
    label: 'Array — Sliding Window, Two Pointers, Prefix Sum, Binary Search',
    icon: '📊',
    component: ArrayVisualizer,
    desc: 'Sliding window, two pointers, prefix sum queries, binary search. O(n)/O(log n) time.',
  },
  matrix: {
    label: 'Matrix — Spiral, Flood Fill, Rotate 90°',
    icon: '🔢',
    component: MatrixVisualizer,
    desc: 'Spiral traversal, BFS flood fill, in-place 90° rotation. O(m·n) time.',
  },
  linkedlist: {
    label: 'Linked List — Reverse, Cycle Detection, Merge',
    icon: '🔗',
    component: LinkedListVisualizer,
    desc: 'Iterative reversal, Floyd\'s cycle detection, merge two sorted lists. O(n) time.',
  },
  graph: {
    label: 'Graph — BFS / DFS',
    icon: '🕸️',
    component: GraphVisualizer,
    desc: 'Breadth-First and Depth-First traversal. O(V+E) time.',
  },
  tree: {
    label: 'BST — Insert & Traversals',
    icon: '🌳',
    component: TreeVisualizer,
    desc: 'BST insert path animation. Inorder / Preorder / Postorder traversals.',
  },
  jvm: {
    label: 'JVM — Heap, GC, Thread Stack',
    icon: '☕',
    component: JVMVisualizer,
    desc: 'Eden → Survivor → Old Gen allocation, Minor GC, Full GC stop-the-world.',
  },
  threads: {
    label: 'Threads — Mutex, Deadlock, Semaphore',
    icon: '🧵',
    component: ThreadVisualizer,
    desc: 'Thread states, mutex lock/unlock, deadlock cycle, semaphore counting.',
  },
  kafka: {
    label: 'Kafka — Producer → Partition → Consumer',
    icon: '📨',
    component: KafkaVisualizer,
    desc: 'Partitioned log, ISR replication, consumer groups, lag, leader election.',
  },
  kubernetes: {
    label: 'Kubernetes — Pods, HPA, Rolling, CrashLoop',
    icon: '☸️',
    component: KubernetesVisualizer,
    desc: 'Pod scheduling, HPA scale-out, rolling deployments, CrashLoopBackOff.',
  },
  golang: {
    label: 'Go — Goroutines, Channels, Scheduler',
    icon: '🐹',
    component: GoVisualizer,
    desc: 'Goroutine lifecycle, buffered channels, select multiplexing, M:N scheduler G/M/P model.',
  },
  aws: {
    label: 'AWS — Lambda, SQS, API Gateway, EKS',
    icon: '☁️',
    component: AWSVisualizer,
    desc: 'Lambda cold/warm start, SQS DLQ, API Gateway throttling, EKS cluster autoscaler.',
  },
  systemdesign: {
    label: 'System Design — LB, Cache, CDN, Raft, Microservices',
    icon: '🏗️',
    component: SystemDesignVisualizer,
    desc: 'Load balancer round-robin, Redis LRU cache, CDN edge, Raft leader election, Circuit Breaker.',
  },
  python: {
    label: 'Python — GIL, asyncio, Decorators',
    icon: '🐍',
    component: PythonVisualizer,
    desc: 'GIL thread contention, asyncio event loop coroutines, decorator wrapping patterns.',
  },
  string: {
    label: 'Strings — KMP, Sliding Window Anagram, Palindrome',
    icon: '🔤',
    component: StringVisualizer,
    desc: 'KMP pattern matching, sliding window anagram finder, expand-around-center palindrome. O(n) time.',
  },
  hashmap: {
    label: 'HashMap — Put/Get, Two Sum, LRU Cache',
    icon: '🗺️',
    component: HashMapVisualizer,
    desc: 'Hash function + chaining, O(n) two-sum with complement lookup, doubly-linked-list LRU cache.',
  },
  set: {
    label: 'Set — Union/Intersection, Merge, Contains Duplicate',
    icon: '🔵',
    component: SetVisualizer,
    desc: 'Set union/intersection/difference, sorted merge with dedup, sliding window duplicate detection.',
  },
  sorting: {
    label: 'Sorting — Bubble, Merge, Quick, Heap',
    icon: '📶',
    component: SortingVisualizer,
    desc: 'Bubble, merge, quick, heap sort with step-by-step comparison and swap tracking.',
  },
  database: {
    label: 'Database — B-Tree, Query Plan, ACID, Joins',
    icon: '🗄️',
    component: DatabaseVisualizer,
    desc: 'B-Tree index insertion/search, SQL query planning, ACID transactions, join algorithms.',
  },
  redis: {
    label: 'Redis — Data Types, Pub/Sub, Cluster, Pipeline',
    icon: '🔴',
    component: RedisVisualizer,
    desc: 'Redis data types, pub/sub channels, cluster hash slots, pipelining RTT savings.',
  },
  docker: {
    label: 'Docker — Layers, Lifecycle, Network, Compose',
    icon: '🐳',
    component: DockerVisualizer,
    desc: 'Image layer filesystem, container lifecycle, bridge networking, docker-compose orchestration.',
  },
  networking: {
    label: 'Networking — TCP, HTTP/2, DNS, Load Balancer',
    icon: '🌐',
    component: NetworkingVisualizer,
    desc: 'TCP 3-way handshake, HTTP/1 vs HTTP/2 multiplexing, DNS resolution chain, LB algorithms.',
  },
  dp: {
    label: 'Dynamic Programming — Fibonacci, Coin Change, Knapsack, LCS, LIS',
    icon: '🧩',
    component: DPVisualizer,
    desc: 'Tabulation step-by-step: Fibonacci, Coin Change, 0/1 Knapsack, LCS, LIS with full DP table animation.',
  },
};
