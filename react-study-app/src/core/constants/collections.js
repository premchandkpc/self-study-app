export const COLLECTION_CATEGORIES = [
  { key: 'concurrency', label: 'Concurrency Flows', icon: '🔀', desc: 'Thread lifecycle, lock acquisition, parallel execution flows with code' },
  { key: 'edgeCases',   label: 'Edge Cases',         icon: '⚠️', desc: 'Corner cases, boundary conditions, unusual states and simulations' },
  { key: 'situations',  label: 'Situations & Behaviors', icon: '🎭', desc: 'Real-world patterns, situation-wise examples and behavior flows' },
  { key: 'exceptions',  label: 'Exceptions & Failures',  icon: '💥', desc: 'Error flows, exception propagation, failure mode simulations' },
];

export const COLLECTIONS = [
  {
    id: 'java',
    label: 'Java',
    icon: '☕',
    color: 'yellow',
    desc: 'JVM internals, GC algorithms, thread lifecycle, locks — complete concurrency & failure simulation.',
    scenarios: {
      concurrency: [
        {
          id: 'mutex',
          label: 'Mutex Lock/Unlock',
          icon: '🔒',
          vizType: 'threads',
          desc: 'Thread acquires mutex, enters critical section, releases. Shows RUNNING→WAITING→RUNNING state transitions.',
          code: ['synchronized(lock) {', '  // critical section', '  sharedCounter++;', '}'],
          tags: ['mutex', 'lock', 'critical-section', 'synchronized'],
        },
        {
          id: 'semaphore',
          label: 'Semaphore Counting',
          icon: '🚦',
          vizType: 'threads',
          desc: 'N permits control concurrent access. Thread blocks when permits exhausted, resumes on release.',
          code: ['Semaphore sem = new Semaphore(3);', 'sem.acquire(); // blocks if 0 permits', '// work...', 'sem.release();'],
          tags: ['semaphore', 'permits', 'counting', 'concurrent'],
        },
        {
          id: 'thread-lifecycle',
          label: 'Thread Lifecycle',
          icon: '🧵',
          vizType: 'threads',
          desc: 'NEW → RUNNABLE → RUNNING → WAITING/TIMED_WAITING → TERMINATED state machine.',
          code: ['Thread t = new Thread(task);', 't.start();       // NEW → RUNNABLE', 't.join();        // caller WAITING', '// t finishes   // TERMINATED'],
          tags: ['lifecycle', 'states', 'new', 'runnable', 'terminated'],
        },
        {
          id: 'jvm-gc',
          label: 'GC Stop-the-World',
          icon: '🗑️',
          vizType: 'jvm',
          desc: 'Minor GC pauses all threads, evacuates Eden→Survivor. Full GC compacts OldGen.',
          code: ['// JVM pauses all threads', '// Eden space full → Minor GC', '// Objects age: Eden → S0 → S1 → Old', '// Old full → Full GC (STW)'],
          tags: ['gc', 'stop-the-world', 'eden', 'survivor', 'old-gen'],
        },
      ],
      edgeCases: [
        {
          id: 'deadlock',
          label: 'Deadlock',
          icon: '💀',
          vizType: 'threads',
          desc: 'T1 holds μA wants μB; T2 holds μB wants μA. Circular wait → no progress possible.',
          code: ['// T1: A then B', 'sync(lockA) { sync(lockB) {...} }', '// T2: B then A — DEADLOCK!', 'sync(lockB) { sync(lockA) {...} }', '// Fix: consistent lock ordering'],
          tags: ['deadlock', 'circular-wait', 'lock-ordering'],
        },
        {
          id: 'oom',
          label: 'OutOfMemoryError',
          icon: '🔴',
          vizType: 'jvm',
          desc: 'Heap exhaustion: GC overhead limit exceeded when GC runs > 98% time with < 2% freed.',
          code: ['List<byte[]> list = new ArrayList<>();', 'while(true) {', '  list.add(new byte[1024*1024]);', '  // → OutOfMemoryError: Java heap space', '}'],
          tags: ['oom', 'heap', 'memory-leak', 'gc-overhead'],
        },
        {
          id: 'stack-overflow',
          label: 'StackOverflowError',
          icon: '📚',
          vizType: 'jvm',
          desc: 'Infinite recursion fills thread stack. Each frame pushed until stack exhausted.',
          code: ['void recurse() {', '  recurse(); // no base case', '}', '// → StackOverflowError'],
          tags: ['stack', 'recursion', 'stack-overflow', 'frame'],
        },
        {
          id: 'volatile-visibility',
          label: 'Volatile Visibility',
          icon: '👁️',
          vizType: 'threads',
          desc: 'Without volatile, thread cache hides write. With volatile, all threads see latest value.',
          code: ['volatile boolean running = true;', '// Thread A: running = false;', '// Thread B: while (running) { ... }', '// Without volatile: B may loop forever'],
          tags: ['volatile', 'visibility', 'cache', 'jmm'],
          comingSoon: true,
        },
      ],
      situations: [
        {
          id: 'producer-consumer',
          label: 'Producer-Consumer',
          icon: '🏭',
          vizType: 'threads',
          desc: 'wait()/notify() pattern. Producer blocks when buffer full; consumer blocks when empty.',
          code: ['synchronized(buf) {', '  while(buf.isFull()) buf.wait();', '  buf.add(item);', '  buf.notifyAll();', '}'],
          tags: ['producer', 'consumer', 'wait', 'notify', 'blocking-queue'],
          comingSoon: true,
        },
        {
          id: 'read-write-lock',
          label: 'Read-Write Lock',
          icon: '📖',
          vizType: 'threads',
          desc: 'Multiple concurrent readers allowed; exclusive writer lock blocks all readers.',
          code: ['ReadWriteLock rwl = new ReentrantReadWriteLock();', 'rwl.readLock().lock();   // shared', 'rwl.writeLock().lock();  // exclusive', '// reads concurrent, writes exclusive'],
          tags: ['rwlock', 'readers', 'writers', 'shared-exclusive'],
          comingSoon: true,
        },
        {
          id: 'thread-pool',
          label: 'Thread Pool Executor',
          icon: '🏊',
          vizType: 'threads',
          desc: 'Tasks queue → worker threads pick up → execute → return to pool. Bounded parallelism.',
          code: ['ExecutorService pool = Executors.newFixedThreadPool(4);', 'pool.submit(task);   // queued if all busy', '// Threads reused across tasks', 'pool.shutdown();'],
          tags: ['thread-pool', 'executor', 'fixed-pool', 'task-queue'],
        },
        {
          id: 'gc-generations',
          label: 'GC Generational Lifecycle',
          icon: '♻️',
          vizType: 'jvm',
          desc: 'Object born in Eden, survives Minor GC → Survivor, promoted after threshold → OldGen.',
          code: ['// Object allocation → Eden', '// Minor GC: Eden → Survivor 0', '// Next GC: S0 → S1 (age++)', '// age >= 15 → promoted to Old Gen'],
          tags: ['eden', 'survivor', 'old-gen', 'promotion', 'gc-age'],
        },
      ],
      exceptions: [
        {
          id: 'starvation',
          label: 'Thread Starvation',
          icon: '😵',
          vizType: 'threads',
          desc: 'High-priority threads monopolize CPU. Low-priority thread never scheduled → starvation.',
          code: ['// T_HIGH always preempts T_LOW', '// T_LOW: RUNNABLE but never RUNNING', '// Fix: fair locks, priority inversion', 'new ReentrantLock(true) // fair'],
          tags: ['starvation', 'priority', 'fairness', 'scheduling'],
        },
        {
          id: 'livelock',
          label: 'Livelock',
          icon: '🔄',
          vizType: 'threads',
          desc: 'Threads keep retrying and yielding to each other. Active but no progress made.',
          code: ['while (!lock.tryLock()) {', '  Thread.yield();  // both yield simultaneously', '  // both retry simultaneously', '  // → livelock: active, zero progress', '}'],
          tags: ['livelock', 'trylock', 'yield', 'retry'],
          comingSoon: true,
        },
        {
          id: 'race-condition',
          label: 'Race Condition',
          icon: '🏁',
          vizType: 'threads',
          desc: 'Unsynchronized i++ is read-modify-write. Two threads interleave → lost update.',
          code: ['int i = 0;', '// T1: read(0), +1, write(1)', '// T2: read(0), +1, write(1)  ← race!', '// Expected 2, got 1', '// Fix: AtomicInteger / synchronized'],
          tags: ['race-condition', 'lost-update', 'atomic', 'unsynchronized'],
        },
        {
          id: 'interrupted-exception',
          label: 'InterruptedException',
          icon: '✋',
          vizType: 'threads',
          desc: 'Thread interrupted while blocking on wait/sleep/join. Must handle or re-interrupt.',
          code: ['try {', '  Thread.sleep(5000);', '} catch (InterruptedException e) {', '  Thread.currentThread().interrupt(); // restore flag', '  return; // clean exit', '}'],
          tags: ['interrupted', 'sleep', 'interrupt-flag', 'blocking'],
          comingSoon: true,
        },
      ],
    },
  },

  {
    id: 'golang',
    label: 'Go',
    icon: '🐹',
    color: 'blue',
    desc: 'Goroutines, channels, Go scheduler M:N model — concurrency patterns and failure modes.',
    scenarios: {
      concurrency: [
        { id: 'goroutine-lifecycle', label: 'Goroutine Lifecycle', icon: '🐹', vizType: 'golang', desc: 'go func() spawns lightweight goroutine. GMP scheduler assigns to OS thread.', code: ['go func() { /* goroutine */ }()'], tags: ['goroutine', 'gmp', 'scheduler'] },
        { id: 'buffered-channel', label: 'Buffered Channel', icon: '📦', vizType: 'golang', desc: 'Send non-blocking until buffer full. Receiver unblocks sender.', code: ['ch := make(chan int, 3)', 'ch <- 1  // non-blocking'], tags: ['channel', 'buffered', 'non-blocking'] },
        { id: 'select-multiplex', label: 'Select Multiplexing', icon: '🔀', vizType: 'golang', desc: 'select waits on multiple channels, picks first ready. Default for non-blocking.', code: ['select {', 'case v := <-ch1:', 'case ch2 <- x:', 'default:', '}'], tags: ['select', 'multiplex', 'non-blocking'] },
        { id: 'grpc-flow', label: 'gRPC Call Flow', icon: '📡', vizType: 'golang', desc: 'Client stub → HTTP/2 → server handler → streaming response.', code: ['conn, _ := grpc.Dial(addr)', 'client := pb.NewSvcClient(conn)', 'resp, _ := client.Call(ctx, req)'], tags: ['grpc', 'http2', 'proto', 'streaming'] },
      ],
      edgeCases: [
        { id: 'goroutine-leak', label: 'Goroutine Leak', icon: '💧', vizType: 'golang', desc: 'Goroutine blocks on channel send/recv forever. Heap grows. Use context cancellation.', code: ['go func() { <-ch }()  // ch never sent', '// goroutine leaks forever'], tags: ['leak', 'channel', 'context', 'cancel'], comingSoon: true },
        { id: 'channel-deadlock', label: 'Channel Deadlock', icon: '💀', vizType: 'golang', desc: 'Unbuffered send with no receiver. Runtime panics: all goroutines asleep.', code: ['ch := make(chan int)', 'ch <- 1  // deadlock! no receiver'], tags: ['deadlock', 'unbuffered', 'panic'] },
        { id: 'nil-channel', label: 'Nil Channel Block', icon: '🚫', vizType: 'golang', desc: 'Send/recv on nil channel blocks forever. Useful for disabling select cases.', code: ['var ch chan int  // nil', 'ch <- 1         // blocks forever'], tags: ['nil', 'channel', 'block'], comingSoon: true },
      ],
      situations: [
        { id: 'fan-out', label: 'Fan-Out Pattern', icon: '📤', vizType: 'golang', desc: 'Distribute work across N goroutines via shared channel. Collect results via done channel.', code: ['for i := 0; i < workers; i++ {', '  go worker(jobs, results)', '}'], tags: ['fan-out', 'worker-pool', 'concurrency'] },
        { id: 'pipeline', label: 'Pipeline Pattern', icon: '🔗', vizType: 'golang', desc: 'Chained stages: generate → transform → collect. Each stage runs concurrently.', code: ['c1 := generate(nums...)', 'c2 := square(c1)', 'consume(c2)'], tags: ['pipeline', 'stages', 'chained'] },
      ],
      exceptions: [
        { id: 'panic-recover', label: 'Panic & Recover', icon: '😱', vizType: 'golang', desc: 'panic unwinds stack. defer+recover catches it. Goroutine-scoped — does not cross goroutine boundary.', code: ['defer func() {', '  if r := recover(); r != nil { ... }', '}()', 'panic("oops")'], tags: ['panic', 'recover', 'defer'] },
        { id: 'context-cancel', label: 'Context Cancellation', icon: '✋', vizType: 'golang', desc: 'ctx.Done() signals cancellation down the call tree. Goroutines must check and exit.', code: ['ctx, cancel := context.WithTimeout(ctx, 5*time.Second)', 'defer cancel()', 'select {', 'case <-ctx.Done(): return', '}'], tags: ['context', 'cancel', 'timeout', 'done'] },
      ],
    },
  },

  {
    id: 'aws',
    label: 'AWS',
    icon: '☁️',
    color: 'yellow',
    desc: 'Lambda, SQS, SNS, EKS, API Gateway — cloud failure modes, edge cases, scaling flows.',
    scenarios: {
      concurrency: [
        { id: 'lambda-warm', label: 'Lambda Warm Start', icon: '🔥', vizType: 'aws', desc: 'Execution env reused. Container alive, handler reinvoked. Fast path.', code: ['// Handler called directly', '// init code NOT re-run', 'exports.handler = async (event) => { ... }'], tags: ['lambda', 'warm-start', 'container-reuse'] },
        { id: 'sqs-consumer', label: 'SQS Consumer Flow', icon: '📨', vizType: 'aws', desc: 'Long-poll → receive message → process → delete. Visibility timeout controls redelivery.', code: ['// Poll → message visible for 30s', '// process() ...', '// deleteMessage() removes it', '// Fail → reappears after timeout'], tags: ['sqs', 'consumer', 'visibility-timeout', 'long-poll'] },
        { id: 'eks-scaling', label: 'EKS Cluster Autoscaler', icon: '☸️', vizType: 'aws', desc: 'Pod pending → CA adds node → scheduler places pod. Scale-down when underutilized.', code: ['// Pod: Pending (no node capacity)', '// CA: adds EC2 node', '// kube-scheduler: places pod', '// Node idle → CA terminates'], tags: ['eks', 'autoscaler', 'nodes', 'pending'] },
        { id: 'apigw-request', label: 'API Gateway Request Flow', icon: '🚪', vizType: 'aws', desc: 'Client → API GW (auth + throttle) → Lambda/integration → response.', code: ['// Client → API GW', '// Authorizer checks JWT', '// Throttle: 10k req/s default', '// → Lambda invoked'], tags: ['api-gateway', 'authorizer', 'throttle', 'integration'] },
      ],
      edgeCases: [
        { id: 'lambda-cold', label: 'Lambda Cold Start', icon: '🥶', vizType: 'aws', desc: 'New execution env: download → init → handler. 100ms–1s penalty. Provisioned concurrency avoids it.', code: ['// Cold start sequence:', '// 1. Download code/container', '// 2. Init runtime + module load', '// 3. Init code runs', '// 4. Handler called'], tags: ['lambda', 'cold-start', 'init', 'provisioned-concurrency'] },
        { id: 'sqs-dlq', label: 'SQS Dead Letter Queue', icon: '☠️', vizType: 'aws', desc: 'Message fails maxReceiveCount times → moved to DLQ. Prevents poison-pill loops.', code: ['// Message received 3 times', '// Each time: process fails', '// maxReceiveCount=3 hit', '// → moved to DLQ'], tags: ['sqs', 'dlq', 'dead-letter', 'max-receive'] },
        { id: 'lambda-concurrency', label: 'Lambda Concurrency Limit', icon: '🚦', vizType: 'aws', desc: 'Account default 1000 concurrent. Reserved concurrency throttles at function level.', code: ['// 1000 concurrent invocations', '// Burst: 500-3000/min', '// ThrottleError: 429', '// Reserved: isolates function quota'], tags: ['lambda', 'concurrency', 'throttle', 'reserved'] },
      ],
      situations: [
        { id: 'sns-fanout', label: 'SNS Fan-Out', icon: '📢', vizType: 'aws', desc: 'Publish once → SNS delivers to N SQS queues in parallel. Decoupled multi-consumer.', code: ['// SNS topic', '// → SQS queue A', '// → SQS queue B', '// → Lambda subscriber'], tags: ['sns', 'fan-out', 'pub-sub', 'topic'] },
        { id: 'eks-rolling', label: 'EKS Rolling Deploy', icon: '🔄', vizType: 'aws', desc: 'Gradual pod replacement. maxSurge/maxUnavailable control pace. Zero-downtime.', code: ['strategy:', '  rollingUpdate:', '    maxSurge: 1', '    maxUnavailable: 0'], tags: ['eks', 'rolling-deploy', 'zero-downtime', 'deployment'] },
      ],
      exceptions: [
        { id: 'lambda-timeout', label: 'Lambda Timeout', icon: '⏰', vizType: 'aws', desc: 'Function exceeds max timeout (15 min). Task.Timed out error, partial work done.', code: ['// Lambda max: 15 minutes', '// Task.TimedOut error', '// SQS: message returns after visibility timeout', '// Fix: async pattern, Step Functions'], tags: ['lambda', 'timeout', 'timed-out'] },
        { id: 'eks-crashloop', label: 'EKS CrashLoopBackOff', icon: '💥', vizType: 'aws', desc: 'Container exits immediately. Kubernetes restarts with exponential backoff (10s→20s→40s→5min).', code: ['# Pod status: CrashLoopBackOff', '# kubectl logs <pod>: see error', '# kubectl describe pod: Events', '# Backoff: 10s 20s 40s 80s 5m'], tags: ['eks', 'crashloop', 'backoff', 'restart'] },
      ],
    },
  },

  {
    id: 'kafka',
    label: 'Kafka',
    icon: '📨',
    color: 'red',
    desc: 'Partitions, ISR, consumer groups, lag — distributed log failure modes and flows.',
    scenarios: {
      concurrency: [
        { id: 'partition-flow', label: 'Partition Write Flow', icon: '📝', vizType: 'kafka', desc: 'Producer → leader partition → ISR replicate → ACK. Parallel partitions for throughput.', code: ['// Producer: acks=all', '// Leader writes to log', '// ISR replicate', '// ACK when all ISR confirm'], tags: ['partition', 'leader', 'isr', 'acks'] },
        { id: 'consumer-group', label: 'Consumer Group Rebalance', icon: '⚖️', vizType: 'kafka', desc: 'New consumer joins → group coordinator triggers rebalance → partitions reassigned.', code: ['// Group coordinator assigns partitions', '// Consumer joins → STOP_THE_WORLD rebalance', '// Eager: all revoke, then reassign', '// Cooperative: incremental rebalance'], tags: ['consumer-group', 'rebalance', 'coordinator'] },
      ],
      edgeCases: [
        { id: 'isr-shrink', label: 'ISR Shrink', icon: '⚠️', vizType: 'kafka', desc: 'Replica lags > replica.lag.time.max.ms → removed from ISR. min.insync.replicas enforces durability.', code: ['// replica.lag.time.max.ms = 10s', '// Slow follower removed from ISR', '// min.insync.replicas=2: needs 2 ISR', '// → NotEnoughReplicas if only 1'], tags: ['isr', 'lag', 'min-insync', 'replica'] },
        { id: 'consumer-lag', label: 'Consumer Lag Buildup', icon: '📈', vizType: 'kafka', desc: 'Consumer slower than producer. Lag grows. Old offsets at risk when retention expires.', code: ['// Producer: 10k msg/s', '// Consumer: 2k msg/s', '// Lag: +8k/s', '// retention.ms hit → messages lost'], tags: ['lag', 'offset', 'retention', 'consumer-slow'] },
      ],
      situations: [
        { id: 'exactly-once', label: 'Exactly-Once Semantics', icon: '1️⃣', vizType: 'kafka', desc: 'Idempotent producer + transactional consumer. Atomic produce+commit offset.', code: ['props.put("enable.idempotence", "true")', 'props.put("transactional.id", "txn-1")', 'producer.initTransactions()', 'producer.beginTransaction()'], tags: ['exactly-once', 'idempotent', 'transactions', 'eos'] },
      ],
      exceptions: [
        { id: 'leader-election', label: 'Leader Election', icon: '👑', vizType: 'kafka', desc: 'Leader broker fails → controller elects new leader from ISR. Unavailable during election.', code: ['// Leader: broker 1 fails', '// Controller: selects from ISR', '// New leader: broker 2', '// Clients: reconnect'], tags: ['leader-election', 'controller', 'broker-failure'] },
        { id: 'duplicate-messages', label: 'At-Least-Once Duplicates', icon: '🔁', vizType: 'kafka', desc: 'Consumer processes, crashes before commit. On restart, reprocesses from last committed offset.', code: ['// Process message', '// CRASH before commitSync()', '// Restart: rewind to last committed offset', '// Message processed AGAIN → duplicate'], tags: ['at-least-once', 'duplicate', 'offset-commit', 'idempotent'] },
      ],
    },
  },

  {
    id: 'kubernetes',
    label: 'Kubernetes',
    icon: '☸️',
    color: 'blue',
    desc: 'Pod scheduling, HPA, rolling deployments, failure recovery — k8s flows and edge cases.',
    scenarios: {
      concurrency: [
        { id: 'pod-scheduling', label: 'Pod Scheduling Flow', icon: '📅', vizType: 'kubernetes', desc: 'API server → etcd → scheduler filter+score → kubelet → container runtime.', code: ['# kubectl apply deployment.yaml', '# etcd: desired state stored', '# Scheduler: filter nodes, score, bind', '# Kubelet: pull image, start container'], tags: ['scheduler', 'pod', 'kubelet', 'filter-score'] },
        { id: 'hpa-scale', label: 'HPA Scale-Out', icon: '📈', vizType: 'kubernetes', desc: 'metrics-server → HPA controller computes desired replicas → scales Deployment.', code: ['# CPU > 70% avg', '# HPA: desired = ceil(current * CPU/target)', '# → scale Deployment replicas', '# → new pods scheduled'], tags: ['hpa', 'autoscaler', 'metrics', 'replicas'] },
      ],
      edgeCases: [
        { id: 'crashloop', label: 'CrashLoopBackOff', icon: '💥', vizType: 'kubernetes', desc: 'Container exits repeatedly. k8s restarts with exponential backoff. OOMKilled, misconfiguration.', code: ['# Pod: CrashLoopBackOff', '# Restart: 10s 20s 40s 80s 5m', '# kubectl logs <pod> --previous', '# Check: OOMKilled, missing env, bad cmd'], tags: ['crashloop', 'backoff', 'oomkilled', 'restart'] },
        { id: 'pending-pod', label: 'Pod Pending — Unschedulable', icon: '⏳', vizType: 'kubernetes', desc: 'No node satisfies resource requests / nodeSelector / taints. Pod stuck Pending.', code: ['# Events: 0/3 nodes available', '# 2 Insufficient memory', '# 1 node(s) had taint...', '# Fix: add node or adjust requests'], tags: ['pending', 'unschedulable', 'resource-requests', 'taints'] },
      ],
      situations: [
        { id: 'rolling-deploy', label: 'Rolling Deployment', icon: '🔄', vizType: 'kubernetes', desc: 'Gradual pod replacement using maxSurge/maxUnavailable. readinessProbe gates traffic.', code: ['strategy: RollingUpdate', 'maxSurge: 1', 'maxUnavailable: 0', '# New pod Ready → old pod deleted'], tags: ['rolling', 'deployment', 'ready', 'surge'] },
        { id: 'service-discovery', label: 'Service Discovery & DNS', icon: '🔍', vizType: 'kubernetes', desc: 'Pod → ClusterIP Service → kube-proxy iptables rules → backend pod. DNS via CoreDNS.', code: ['# svc.namespace.svc.cluster.local', '# CoreDNS resolves → ClusterIP', '# kube-proxy: DNAT to pod IP', '# Load-balanced across Endpoints'], tags: ['service', 'dns', 'coredns', 'kube-proxy'] },
      ],
      exceptions: [
        { id: 'oomkilled', label: 'OOMKilled', icon: '🔴', vizType: 'kubernetes', desc: 'Container exceeds memory limit. Kernel OOM killer terminates process. Pod restarts.', code: ['# Container: memory > limits.memory', '# Kernel OOM killer: SIGKILL', '# Exit code: 137 (128+SIGKILL)', '# Fix: increase limits or fix leak'], tags: ['oom', 'oomkilled', 'memory-limit', 'sigkill'] },
        { id: 'liveness-fail', label: 'Liveness Probe Failure', icon: '💔', vizType: 'kubernetes', desc: 'livenessProbe fails failureThreshold times → kubelet kills + restarts container.', code: ['livenessProbe:', '  httpGet: /healthz', '  initialDelaySeconds: 30', '  failureThreshold: 3', '# 3 failures → container restart'], tags: ['liveness', 'probe', 'restart', 'health'] },
      ],
    },
  },

  {
    id: 'systemdesign',
    label: 'System Design',
    icon: '🏗️',
    color: 'purple',
    desc: 'Load balancers, caches, CDN, Raft consensus — distributed system flows and failure modes.',
    scenarios: {
      concurrency: [
        { id: 'lb-round-robin', label: 'Load Balancer Round-Robin', icon: '⚖️', vizType: 'systemdesign', desc: 'Requests distributed evenly across backend servers. Weighted RR for heterogeneous capacity.', code: ['// RR: server1 → server2 → server3 → server1...', '// Weighted: server1(3x) server2(1x)', '// Sticky: hash(client_ip) % servers'], tags: ['load-balancer', 'round-robin', 'weighted', 'sticky'] },
        { id: 'cache-flow', label: 'Cache Read/Write Flow', icon: '⚡', vizType: 'systemdesign', desc: 'Cache-aside: app checks cache → miss → DB → populate. Write-through vs write-behind.', code: ['// Read: cache.get(key)', '// Hit: return', '// Miss: db.get(key) → cache.set(key, ttl)', '// Write-through: cache + db together'], tags: ['cache', 'cache-aside', 'write-through', 'ttl'] },
      ],
      edgeCases: [
        { id: 'cache-stampede', label: 'Cache Stampede', icon: '🐂', vizType: 'systemdesign', desc: 'Popular key expires → N requests simultaneously miss → DB overwhelmed. Fix: probabilistic early expiry.', code: ['// Key expires at T', '// N=1000 requests hit DB simultaneously', '// Fix: mutex lock on miss', '// Or: PER (probabilistic early refresh)'], tags: ['cache-stampede', 'thundering-herd', 'per', 'mutex'] },
        { id: 'split-brain', label: 'Split-Brain', icon: '🧠', vizType: 'systemdesign', desc: 'Network partition → two nodes both think they are leader → conflicting writes. CAP: choose CP or AP.', code: ['// Partition: DC1 ↔ DC2 lost', '// Both elect leaders', '// Both accept writes → conflict', '// Raft: only majority partition progresses'], tags: ['split-brain', 'partition', 'cap', 'consensus'] },
      ],
      situations: [
        { id: 'raft-election', label: 'Raft Leader Election', icon: '👑', vizType: 'systemdesign', desc: 'Leader heartbeat timeout → candidate requests votes → majority → new leader. Log catch-up.', code: ['// Follower: no heartbeat 150-300ms', '// → Candidate: send RequestVote', '// Majority votes → Leader', '// Leader: send AppendEntries heartbeats'], tags: ['raft', 'leader-election', 'heartbeat', 'quorum'] },
        { id: 'cdn-flow', label: 'CDN Edge Cache Flow', icon: '🌍', vizType: 'systemdesign', desc: 'Client → nearest PoP → cache hit serves directly, miss → origin pull → cache + serve.', code: ['// DNS: resolve to nearest PoP', '// PoP: cache hit → 2ms serve', '// Cache miss → origin pull', '// Cache-Control: max-age=86400'], tags: ['cdn', 'pop', 'cache-hit', 'origin-pull'] },
      ],
      exceptions: [
        { id: 'circuit-breaker', label: 'Circuit Breaker', icon: '🔌', vizType: 'systemdesign', desc: 'Closed → failures exceed threshold → Open (fail-fast) → Half-Open (probe) → Closed.', code: ['// Closed: pass requests through', '// 5 failures in 10s → Open', '// Open: immediate fail (no call)', '// After 30s → Half-Open: try 1 req'], tags: ['circuit-breaker', 'open', 'half-open', 'fail-fast'] },
        { id: 'cascading-failure', label: 'Cascading Failure', icon: '🌊', vizType: 'systemdesign', desc: 'Service A slow → B timeouts pile up → B OOM → C overwhelmed → full outage.', code: ['// A: latency spike 5s', '// B: threads exhaust waiting for A', '// B: OOM → restart loop', '// C: retry storms hit A/B', '// Fix: timeouts, circuit breakers, bulkheads'], tags: ['cascading', 'timeout', 'bulkhead', 'retry-storm'] },
      ],
    },
  },
];
