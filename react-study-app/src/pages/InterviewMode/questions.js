export const QUESTIONS = [
  /* ── DSA ── */
  { id: 1,  category: 'dsa',           difficulty: 'easy',   q: 'What is the time complexity of binary search?',                                               a: 'O(log n) — each step halves the search space. Requires sorted array.' },
  { id: 2,  category: 'dsa',           difficulty: 'easy',   q: 'Difference between stack and queue?',                                                         a: 'Stack: LIFO (push/pop same end). Queue: FIFO (enqueue rear, dequeue front).' },
  { id: 3,  category: 'dsa',           difficulty: 'medium', q: 'What is the sliding window technique?',                                                        a: 'Maintain a window [l,r] and slide it to avoid recomputing sums/counts. O(n) instead of O(n²).' },
  { id: 4,  category: 'dsa',           difficulty: 'medium', q: 'BFS vs DFS — when to use each?',                                                              a: 'BFS: shortest path (unweighted), level-order. DFS: cycle detection, topological sort, backtracking. BFS uses queue; DFS uses stack/recursion.' },
  { id: 5,  category: 'dsa',           difficulty: 'medium', q: 'What is a BST property?',                                                                     a: 'Left subtree all keys < root, right subtree all keys > root. Inorder traversal gives sorted sequence. Search/insert O(h), worst O(n) unbalanced.' },
  { id: 6,  category: 'dsa',           difficulty: 'hard',   q: 'Explain dynamic programming — optimal substructure and overlapping subproblems.',             a: 'Optimal substructure: optimal solution built from optimal sub-solutions. Overlapping subproblems: same sub-problems solved repeatedly → cache with memoization or bottom-up DP table.' },
  { id: 7,  category: 'dsa',           difficulty: 'hard',   q: 'Dijkstra algorithm time complexity with a min-heap?',                                         a: 'O((V + E) log V) — each edge relaxation is O(log V) heap op. Fails with negative weights → use Bellman-Ford O(VE).' },
  { id: 8,  category: 'dsa',           difficulty: 'medium', q: 'What is a hash collision and how is it resolved?',                                             a: 'Two keys map to same bucket. Resolved by: chaining (linked list per bucket) or open addressing (linear/quadratic probing, double hashing).' },

  /* ── Java ── */
  { id: 9,  category: 'java',          difficulty: 'easy',   q: 'What is the difference between == and .equals() in Java?',                                    a: '== compares references (memory address). .equals() compares object content. Always use .equals() for String comparison.' },
  { id: 10, category: 'java',          difficulty: 'medium', q: 'Explain the JVM memory model: Heap vs Stack.',                                                a: 'Stack: thread-local, holds frames (local vars, operand stack). Heap: shared, holds objects. Stack overflow = deep recursion. Heap OOM = too many objects.' },
  { id: 11, category: 'java',          difficulty: 'medium', q: 'What is the difference between checked and unchecked exceptions?',                            a: 'Checked: must be declared/caught (IOException, SQLException) — compile-time. Unchecked: extend RuntimeException (NPE, ArrayIndexOutOfBounds) — not forced.' },
  { id: 12, category: 'java',          difficulty: 'hard',   q: 'What is the Java Memory Model and happens-before?',                                           a: 'JMM defines visibility/ordering guarantees across threads. Happens-before: if A hb B, writes in A visible to B. synchronized/volatile/thread start establish hb.' },
  { id: 13, category: 'java',          difficulty: 'hard',   q: 'Explain garbage collection: Minor GC vs Full GC.',                                            a: 'Minor GC: cleans Eden + Survivor spaces (young gen). Fast, stop-the-world brief. Full GC: sweeps young + old gen. Long pause. Avoid by tuning object lifetimes.' },
  { id: 14, category: 'java',          difficulty: 'medium', q: 'What is volatile in Java?',                                                                   a: 'Guarantees visibility: writes flush to main memory immediately, reads always fetch from main memory. No atomicity for compound ops (i++ needs AtomicInteger).' },
  { id: 15, category: 'java',          difficulty: 'medium', q: 'Difference between HashMap and ConcurrentHashMap.',                                           a: 'HashMap: not thread-safe. ConcurrentHashMap: segment-level locking (Java 7) / CAS + synchronized per bucket (Java 8). No full lock on reads.' },
  { id: 16, category: 'java',          difficulty: 'hard',   q: 'What is a deadlock and how do you prevent it?',                                               a: 'Deadlock: circular wait on locks. Prevent: always acquire locks in same order, use tryLock with timeout, avoid nested locks, use lock-free structures.' },

  /* ── Golang ── */
  { id: 17, category: 'golang',        difficulty: 'easy',   q: 'What is a goroutine?',                                                                        a: 'Lightweight user-space thread managed by Go runtime. ~2KB initial stack. Multiplexed onto OS threads via M:N scheduler (GOMAXPROCS).' },
  { id: 18, category: 'golang',        difficulty: 'medium', q: 'Buffered vs unbuffered channel?',                                                             a: 'Unbuffered: send blocks until receiver ready (synchronous rendezvous). Buffered ch(n): send blocks only when buffer full. Use buffered to decouple producer/consumer.' },
  { id: 19, category: 'golang',        difficulty: 'medium', q: 'What does select do in Go?',                                                                  a: 'Waits on multiple channel ops simultaneously. Picks a ready case randomly if multiple ready. Default case makes it non-blocking. Used for timeouts and cancellation.' },
  { id: 20, category: 'golang',        difficulty: 'hard',   q: 'Explain Go scheduler: G, M, P.',                                                              a: 'G=goroutine, M=OS thread, P=processor (logical). P has local run queue. M picks G from P\'s queue or steals from others. GOMAXPROCS controls # of P.' },
  { id: 21, category: 'golang',        difficulty: 'medium', q: 'What is a context in Go?',                                                                    a: 'Carries deadline, cancellation signal, and values across API boundaries. context.WithCancel/WithTimeout return derived contexts. Always pass as first arg.' },

  /* ── Kafka ── */
  { id: 22, category: 'kafka',         difficulty: 'easy',   q: 'What is a Kafka partition?',                                                                  a: 'Ordered, immutable sequence of records within a topic. Unit of parallelism. One partition consumed by one consumer in a group at a time.' },
  { id: 23, category: 'kafka',         difficulty: 'medium', q: 'What is ISR in Kafka?',                                                                       a: 'In-Sync Replicas: set of replicas fully caught up with leader. Producer acks=all waits for all ISR to confirm. If replica falls behind, removed from ISR.' },
  { id: 24, category: 'kafka',         difficulty: 'medium', q: 'Explain consumer group and offset.',                                                          a: 'Consumer group: N consumers share partition assignment for a topic. Offset: position in partition log. Committed to __consumer_offsets topic. Enable at-least-once or exactly-once.' },
  { id: 25, category: 'kafka',         difficulty: 'hard',   q: 'How does Kafka leader election work?',                                                        a: 'ZooKeeper (old) or KRaft (new): controller monitors broker liveness. On leader failure, controller picks new leader from ISR. Unclean election (non-ISR) risks data loss.' },
  { id: 26, category: 'kafka',         difficulty: 'medium', q: 'What causes consumer lag and how to fix it?',                                                 a: 'Lag = latest offset − committed offset. Causes: slow processing, too few consumers, large messages. Fix: scale consumers to match partitions, increase throughput, reduce processing time.' },
  { id: 27, category: 'kafka',         difficulty: 'hard',   q: 'Kafka exactly-once semantics — how?',                                                         a: 'Producer idempotence (enable.idempotence=true) + transactions (beginTransaction/commitTransaction). Broker deduplicates by sequence number. Consumer reads only committed.' },

  /* ── Kubernetes ── */
  { id: 28, category: 'kubernetes',    difficulty: 'easy',   q: 'What is a Pod in Kubernetes?',                                                                a: 'Smallest deployable unit. One or more containers sharing network namespace and volumes. Ephemeral — controllers manage restarts.' },
  { id: 29, category: 'kubernetes',    difficulty: 'medium', q: 'How does HPA work?',                                                                          a: 'Horizontal Pod Autoscaler polls metrics server every 15s. Formula: desiredReplicas = ceil(currentReplicas × currentMetric/desiredMetric). Cooldown prevents thrashing.' },
  { id: 30, category: 'kubernetes',    difficulty: 'medium', q: 'Rolling deployment vs blue-green vs canary?',                                                 a: 'Rolling: replace pods incrementally (maxSurge/maxUnavailable). Blue-green: two full envs, switch traffic instantly. Canary: route small % to new version first.' },
  { id: 31, category: 'kubernetes',    difficulty: 'hard',   q: 'What is etcd and why is it critical?',                                                        a: 'Distributed key-value store using Raft consensus. Stores all cluster state. Quorum requires (n/2)+1 nodes. Loss of etcd quorum = cluster brain-dead. Always backup.' },
  { id: 32, category: 'kubernetes',    difficulty: 'medium', q: 'Explain CrashLoopBackOff.',                                                                   a: 'Container crashes on start repeatedly. Kubelet uses exponential backoff (10s→20s→40s→5min max). Debug: kubectl logs --previous, kubectl describe pod.' },
  { id: 33, category: 'kubernetes',    difficulty: 'hard',   q: 'What is a service mesh?',                                                                     a: 'Infrastructure layer for service-to-service comms. Sidecar proxies (Envoy/Linkerd) handle mTLS, retries, circuit breaking, observability without app code changes.' },

  /* ── System Design ── */
  { id: 34, category: 'system-design', difficulty: 'medium', q: 'Explain CAP theorem.',                                                                        a: 'Distributed system can guarantee only 2 of 3: Consistency (all nodes same data), Availability (every request gets response), Partition tolerance (works despite network split). Network partitions inevitable → choose CP or AP.' },
  { id: 35, category: 'system-design', difficulty: 'medium', q: 'What is consistent hashing?',                                                                 a: 'Maps keys and nodes to ring. Key goes to first node clockwise. Adding/removing node only remaps K/N keys. Virtual nodes balance load. Used in DynamoDB, Cassandra, CDNs.' },
  { id: 36, category: 'system-design', difficulty: 'hard',   q: 'How does Raft consensus work?',                                                               a: 'Leader election: candidates request votes, majority wins term. Log replication: leader appends, sends to followers, commits after majority ACK. Leader heartbeats prevent re-election.' },
  { id: 37, category: 'system-design', difficulty: 'medium', q: 'What is a circuit breaker pattern?',                                                         a: 'Stops calling a failing service after threshold of errors. States: Closed (normal) → Open (fast-fail) → Half-Open (test probe). Prevents cascade failures.' },
  { id: 38, category: 'system-design', difficulty: 'medium', q: 'SQL vs NoSQL — when to choose each?',                                                         a: 'SQL: ACID, complex joins, structured schema, strong consistency. NoSQL: horizontal scale, flexible schema, high throughput, eventual consistency. Not either/or — use both.' },
  { id: 39, category: 'system-design', difficulty: 'hard',   q: 'Design URL shortener — key decisions.',                                                       a: 'Encode with base62 (7 chars = 62^7 = 3.5T URLs). Hash collision: retry with salt. Storage: KV store (DynamoDB). Cache hot URLs (Redis LRU). 301 vs 302 redirect. CDN edge.' },
  { id: 40, category: 'system-design', difficulty: 'hard',   q: 'What is the difference between eventual and strong consistency?',                             a: 'Strong: every read returns latest write (linearizability). Adds latency (sync replication). Eventual: reads may return stale, converge eventually. DynamoDB default eventual, optional strong.' },

  /* ── Python ── */
  { id: 41, category: 'python',        difficulty: 'medium', q: 'What is the GIL and how does it affect multithreading?',                                      a: 'Global Interpreter Lock: only one thread executes Python bytecode at a time. CPU-bound threads don\'t benefit from multiple cores. Use multiprocessing or asyncio for CPU-bound work.' },
  { id: 42, category: 'python',        difficulty: 'medium', q: 'How does asyncio work in Python?',                                                            a: 'Single-threaded event loop. async/await suspends coroutine at I/O, event loop runs other coroutines. No GIL concern. Not for CPU-bound — use ProcessPoolExecutor.' },
  { id: 43, category: 'python',        difficulty: 'medium', q: 'What is a decorator in Python?',                                                              a: 'Higher-order function that wraps another function. @decorator syntax is syntactic sugar for func = decorator(func). Used for logging, caching (functools.lru_cache), auth.' },
];

export const CATEGORIES = [
  { id: 'all',          label: 'All',           icon: '🌐', color: 'var(--text-accent)' },
  { id: 'dsa',          label: 'DSA',           icon: '📊', color: 'var(--node-default)' },
  { id: 'java',         label: 'Java',          icon: '☕', color: 'var(--node-comparing)' },
  { id: 'golang',       label: 'Go',            icon: '🐹', color: 'var(--node-visited)' },
  { id: 'kafka',        label: 'Kafka',         icon: '📨', color: 'var(--kafka-producer)' },
  { id: 'kubernetes',   label: 'K8s',           icon: '☸️', color: 'var(--pod-running)' },
  { id: 'system-design',label: 'System Design', icon: '🏗️', color: 'var(--node-blocked)' },
  { id: 'python',       label: 'Python',        icon: '🐍', color: 'var(--node-active)' },
];

export const DIFFICULTY_COLOR = {
  easy:   'var(--pod-running)',
  medium: 'var(--node-comparing)',
  hard:   'var(--pod-crash)',
};
