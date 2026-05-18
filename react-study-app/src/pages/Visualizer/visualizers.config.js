import ArrayVisualizer from '../../components/visualizers/ArrayVisualizer/ArrayVisualizer';
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

export const VISUALIZERS = {
  array: {
    label: 'Array — Sliding Window',
    icon: '📊',
    component: ArrayVisualizer,
    desc: 'Maximum sum subarray of size k. O(n) time, O(1) space.',
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
};
