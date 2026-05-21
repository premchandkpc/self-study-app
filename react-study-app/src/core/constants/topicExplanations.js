export const TOPIC_EXPLANATIONS = {
  dsa: {
    overview: `Data Structures & Algorithms form the foundation of efficient software. Every system relies on choosing the right data structure for the job and implementing algorithms that scale.`,

    subtopics: {
      Arrays: {
        explanation: `Arrays are contiguous memory blocks storing fixed-size elements. Direct index access is O(1), but insertion/deletion requires shifting elements O(n). Key techniques: sliding window for subarray problems, prefix sums for range queries, two pointers for sorted arrays.`,
        useCases: ['Searching & sorting', 'Dynamic arrays (ArrayList)', 'Cache-friendly sequential access'],
        realWorld: 'YouTube: Video recommendations use arrays to store candidate videos, sorted by relevance score.',
        complexity: { access: 'O(1)', search: 'O(n)', insert: 'O(n)', delete: 'O(n)' }
      },
      'TwoPointers': {
        explanation: `Two pointers approach uses multiple pointers moving through data to solve problems without nested loops. Works on sorted arrays. Examples: finding pairs that sum to target, removing duplicates, container with most water.`,
        useCases: ['Sorted array problems', 'Palindrome checking', 'Merging sorted arrays'],
        realWorld: 'Instagram: Finding overlapping time periods when users were online simultaneously.',
        complexity: { time: 'O(n)', space: 'O(1)' }
      },
      'BinarySearch': {
        explanation: `Divides search space in half each iteration achieving O(log n) search time. Requires sorted data. Critical for: finding elements, counting occurrences, finding boundaries, rotated arrays.`,
        useCases: ['Searching sorted data', 'Finding insertion position', 'Range queries'],
        realWorld: 'WhatsApp: Finding message within billions of messages by timestamp.',
        complexity: { time: 'O(log n)', space: 'O(1)' }
      },
      'PrefixSum': {
        explanation: `Preprocesses array to enable O(1) range sum queries. Build prefix array where prefix[i] = sum of elements [0...i]. Query: sum(l, r) = prefix[r+1] - prefix[l]. Space-time tradeoff: O(n) preprocessing, O(1) queries.`,
        useCases: ['Range sum queries', '2D matrix sums', 'Continuous subarray problems'],
        realWorld: 'YouTube Analytics: Computing total watch time across any date range instantly.',
        complexity: { preprocess: 'O(n)', query: 'O(1)' }
      },
      'LinkedList': {
        explanation: `Nodes with data + pointer to next node. Insert/delete at known position is O(1), but access is O(n). No cache locality. Use when: frequent middle insertions, variable size unknown, or when array resizing is expensive.`,
        useCases: ['LRU cache implementation', 'Graph adjacency lists', 'Undo/redo stacks'],
        realWorld: 'Uber: Driver location history as linked list for efficient recent-track lookups.',
        complexity: { access: 'O(n)', insert: 'O(1)', delete: 'O(1)' }
      },
      'Graphs': {
        explanation: `Vertices + edges represent relationships. Directed vs undirected, weighted vs unweighted. BFS for shortest path (unweighted), DFS for connectivity/cycles, Dijkstra for shortest path (weighted). Representation: adjacency list vs matrix.`,
        useCases: ['Social networks', 'Route finding', 'Recommendation systems', 'Dependency resolution'],
        realWorld: 'Instagram: Friend graph for feed generation, suggestions using graph traversal.',
        complexity: { bfs: 'O(V+E)', dfs: 'O(V+E)', dijkstra: 'O((V+E) log V)' }
      },
      'Trees': {
        explanation: `Acyclic graphs with parent-child hierarchy. BST maintains order: left < parent < right. Height affects operation complexity. Balanced trees (AVL, Red-Black) maintain O(log n) height. Traversals: inorder (sorted), preorder (prefix), postorder (cleanup).`,
        useCases: ['Sorted data with fast insert/delete', 'File systems', 'Database indexes', 'Expression parsing'],
        realWorld: 'YouTube: B-trees in database indexes for video metadata lookups.',
        complexity: { bst: 'O(log n) avg, O(n) worst', balanced: 'O(log n) guaranteed' }
      },
      'DP': {
        explanation: `Break problem into overlapping subproblems, store results to avoid recomputation. Two approaches: top-down (memoization) with recursion, bottom-up (tabulation) with iteration. Fibonacci, coin change, knapsack, LCS are classic examples.`,
        useCases: ['Optimization problems', 'Longest sequences', 'Cost minimization', 'Path problems'],
        realWorld: 'Uber: Computing cheapest route considering traffic patterns (cost DP).',
        complexity: { space: 'O(subproblems)', time: 'O(subproblems × work per problem)' }
      },
      'Strings': {
        explanation: `KMP algorithm finds pattern in text O(n+m). Trie stores strings as tree for fast prefix search. Hashing strings enables O(1) comparison. Rolling hash for substring matching. Palindrome checks: expand-around-center or manacher algorithm.`,
        useCases: ['Pattern matching', 'Autocomplete', 'Spell checking', 'Text editing'],
        realWorld: 'Instagram: Hashtag autocomplete using trie, pattern matching for content filtering.',
        complexity: { kmp: 'O(n+m)', trie: 'O(m) search' }
      },
      'HashMaps': {
        explanation: `Hash function maps keys to indices in O(1) average case. Collisions handled by chaining or open addressing. Load factor determines resizing. Critical for: deduplication, frequency counting, grouping, caching.`,
        useCases: ['Deduplication', 'Counting frequencies', 'Grouping', 'Caching', 'Two-sum problems'],
        realWorld: 'WhatsApp: Hash table for storing user accounts, message deduplication, cache for frequently accessed chats.',
        complexity: { avg: 'O(1)', worst: 'O(n)' }
      },
    }
  },

  java: {
    overview: `Java runtime is complex: JVM manages memory, garbage collection handles cleanup, threads enable concurrency. Understanding internals crucial for performance optimization and debugging.`,

    subtopics: {
      'JVM': {
        explanation: `Just-In-Time compilation interprets bytecode initially, then compiles hot code paths to native machine code. Execution happens in stack frames: each method call pushes frame with local variables, operand stack, method reference. Heap stores all objects, managed by garbage collector.`,
        useCases: ['Cross-platform execution', 'Memory management', 'Runtime optimization'],
        realWorld: 'Uber backend written in Java, JVM optimizes ride-matching algorithm execution dynamically.',
        complexity: { compile: 'O(1) threshold-dependent', execution: 'O(1) after JIT' }
      },
      'GC': {
        explanation: `Garbage Collection automatically frees unused memory. Mark-Sweep: mark reachable objects, sweep unreachable. Generational GC: most objects die young, optimize young generation collection. STW (Stop-The-World) pauses all threads during collection, affecting latency.`,
        useCases: ['Memory management', 'Preventing memory leaks', 'Latency tuning'],
        realWorld: 'YouTube: Tuning GC pause times to keep video streaming latency under 50ms.',
        complexity: { pause: 'Proportional to live objects', throughput: '95%+ achievable' }
      },
      'Threads': {
        explanation: `Threads share process memory, enabling concurrent execution. Context switching: OS saves/restores thread state. Synchronization needed for shared data access. Thread states: new → runnable → running → blocked/waiting → terminated.`,
        useCases: ['Concurrent request handling', 'Background tasks', 'Responsive UI'],
        realWorld: 'WhatsApp: Thread pool handles incoming messages concurrently, each connection on separate thread.',
        complexity: { switch: 'Microseconds', pool: 'O(threads) memory' }
      },
      'Locks': {
        explanation: `Mutex (mutual exclusion) ensures only one thread executes critical section. Deadlock: circular waiting for locks. Lock ordering prevents deadlock: always acquire locks in same order. Java ReentrantLock more flexible than synchronized keyword.`,
        useCases: ['Protecting shared state', 'Preventing race conditions', 'Coordinating threads'],
        realWorld: 'Instagram: Locks protect user database updates when multiple services modify same user profile.',
        complexity: { acquire: 'O(1)', contention: 'Microseconds to milliseconds depending' }
      },
      'Collections': {
        explanation: `ArrayList: dynamic array, O(1) append amortized. LinkedList: pointer-based, O(1) insert/delete but O(n) access. HashMap uses hash table, O(1) lookup avg case. ConcurrentHashMap for thread-safe access without full table locks.`,
        useCases: ['Data storage', 'Thread-safe caching', 'Ordered collections'],
        realWorld: 'Uber: ConcurrentHashMap stores active driver locations, updated by thousands of threads simultaneously.',
        complexity: { arraylist: 'O(n) search', hashmap: 'O(1) avg' }
      },
    }
  },

  kubernetes: {
    overview: `Container orchestration platform automates deployment, scaling, and management. Pods are smallest unit, Services provide networking, Controllers ensure desired state.`,

    subtopics: {
      'Pods': {
        explanation: `Smallest deployable unit containing one or more containers sharing network namespace (same IP). Sidecar pattern: main app + supporting container (logging, metrics). Init containers run before app containers. Pod lifecycle: pending → running → succeeded/failed.`,
        useCases: ['Containerized apps', 'Sidecar logging', 'Tightly-coupled services'],
        realWorld: 'YouTube: Each pod runs video transcoding container + monitoring sidecar.',
        complexity: { startup: '100-500ms', scaling: 'Per pod instance' }
      },
      'Deployments': {
        explanation: `Manages replica pods, rolling updates, and rollbacks. Desired state: "I want 3 replicas of this image". Rolling update: gradually replace old pods with new ones, maintaining availability. Canary: test new version on subset before full rollout.`,
        useCases: ['Stateless app deployment', 'Zero-downtime updates', 'Scaling', 'Rollback capability'],
        realWorld: 'Instagram: Deploy new feed algorithm to 10% of users first (canary), monitor metrics, then 100%.',
        complexity: { update: 'O(replicas) time', downtime: 'Zero with proper config' }
      },
      'Services': {
        explanation: `Stable networking abstraction over ephemeral pods. ClusterIP: internal only. NodePort: expose on node IP. LoadBalancer: cloud provider LB. Service discovery: DNS automatically resolves service name to pod IPs, updating as pods scale.`,
        useCases: ['Pod networking', 'Load balancing', 'Service discovery', 'Exposing apps'],
        realWorld: 'Uber: "driver-location-service" DNS resolves to all driver-tracking pods automatically.',
        complexity: { discovery: 'O(1) DNS', routing: 'O(1) kube-proxy' }
      },
      'HPA': {
        explanation: `Horizontal Pod Autoscaler monitors metrics (CPU, memory, custom) and adjusts replica count. Scales up when load high, scales down when low. Works with Metrics Server for metric collection. Min/max replicas prevent thrashing.`,
        useCases: ['Automatic scaling', 'Cost optimization', 'Handling traffic spikes'],
        realWorld: 'YouTube: HPA scales video upload processor pods 10x during evening peak hours, scales down at night.',
        complexity: { latency: '30-60 seconds', scaling: 'Exponential backoff' }
      },
    }
  },

  kafka: {
    overview: `Distributed event streaming platform. Brokers store partitioned topics. Producers publish messages, consumers subscribe. Strong ordering per partition, distributed replication for fault tolerance.`,

    subtopics: {
      'Partitions': {
        explanation: `Topics divided into independent partitions, each stored on different brokers. Producer chooses partition via key hash or round-robin. Consumer reads partition linearly maintaining order. Scaling: more partitions = more parallelism but more coordination overhead.`,
        useCases: ['Parallel processing', 'Ordered event streams', 'Distributed queuing'],
        realWorld: 'WhatsApp: Message topic with 100 partitions, messages from user hashed to same partition maintaining conversation order.',
        complexity: { partition: 'O(1) produce', parallelism: 'O(partitions)' }
      },
      'Consumer Groups': {
        explanation: `Multiple consumers subscribe to same topic, each gets subset of partitions. Group coordinates: only one consumer per partition. Rebalancing: when consumer joins/leaves, partitions redistributed. Offset: tracks message position, enables restart from last processed.`,
        useCases: ['Scaling consumers', 'Multiple services subscribing same topic', 'Fault tolerance'],
        realWorld: 'Instagram: Feed generation service has 5 consumers in group, each handles 20 partitions of post topic.',
        complexity: { rebalance: 'Seconds', offset: 'O(1) lookup' }
      },
      'ISR': {
        explanation: `In-Sync Replicas: set of replicas that have caught up with leader. Producer waits for ISR acknowledgment before considering message committed. Min ISR guarantees: if min.insync.replicas=2, need 2 in-sync before ACK. Leader failure: new leader chosen from ISR.`,
        useCases: ['Durability guarantees', 'Fault tolerance', 'Preventing data loss'],
        realWorld: 'Uber: Trip events need ISR=2 before confirming ride booking to guarantee no lost payment data.',
        complexity: { commit: 'Network latency × ISR size', failover: 'Milliseconds' }
      },
      'Lag': {
        explanation: `Consumer lag: difference between latest offset in partition and consumer's committed offset. High lag indicates slow consumers or backed-up producers. Monitoring lag detects processing issues. Dead Letter Queue for messages that fail repeatedly.`,
        useCases: ['Performance monitoring', 'Debugging slowness', 'Alert thresholds'],
        realWorld: 'YouTube: Monitor lag of notification consumer, if lag > 1M messages, page on-call engineer.',
        complexity: { monitor: 'O(partitions)', alert: 'Real-time' }
      },
    }
  },

  'system-design': {
    overview: `Design scalable systems supporting millions of users. Uber ride-hailing demonstrates: distributed payments, real-time matching, geospatial queries, message queuing.`,

    casestudies: {
      Uber: {
        components: [
          { name: 'API Gateway', desc: 'Route requests to services, rate limiting, auth validation' },
          { name: 'Rider Service', desc: 'User accounts, ride history, preferences' },
          { name: 'Driver Service', desc: 'Driver profiles, vehicle info, ratings' },
          { name: 'Matching Engine', desc: 'Algorithm to match riders with nearby drivers' },
          { name: 'Redis Cache', desc: 'Cache driver locations, active rides, hot data' },
          { name: 'Pricing Service', desc: 'Calculate fare based on distance, surge pricing' },
          { name: 'Payment Service', desc: 'Process payments, charge user cards' },
          { name: 'Trip Service', desc: 'Store trip details, route, timestamps' },
          { name: 'Notification Service', desc: 'Send driver/rider notifications via push/email' },
          { name: 'Kafka', desc: 'Event streaming for async processing' },
          { name: 'PostgreSQL', desc: 'Durable storage for user/trip data' },
          { name: 'Geospatial DB', desc: 'Query drivers near location (radius search)' },
        ],
        flow: [
          '1. Rider opens app, requests ride',
          '2. Request hits API Gateway, routed to Rider Service',
          '3. Matching Engine queries Redis for nearby drivers, runs matching algorithm',
          '4. Pricing Service calculates fare estimate',
          '5. Show rider list of available drivers',
          '6. Rider selects driver, Payment Service pre-authorizes card',
          '7. Event published to Kafka: RideAccepted',
          '8. Notification Service sends both driver & rider push notifications',
          '9. Trip Service stores trip record in PostgreSQL',
          '10. During trip: driver app sends location updates, driver-location-service updates Redis every 5 seconds',
          '11. After drop-off: final fare calculated, payment charged',
          '12. Trip Service updates trip status: completed'
        ],
        challenges: [
          'Real-time matching at scale (1M+ concurrent users)',
          'Geospatial queries for "drivers near me"',
          'Exactly-once payment processing',
          'Handling driver/rider disconnects gracefully',
          'Surge pricing algorithm fairness',
          'Database consistency across payment systems'
        ]
      },
      WhatsApp: {
        components: [
          { name: 'Auth Service', desc: 'Phone number verification, session management' },
          { name: 'Messaging Service', desc: 'Store/retrieve messages, delivery guarantees' },
          { name: 'WebSocket Server', desc: 'Push messages to connected clients in real-time' },
          { name: 'Message Queue', desc: 'Buffer offline messages until user reconnects' },
          { name: 'User Service', desc: 'User profiles, contacts, status updates' },
          { name: 'Group Service', desc: 'Group creation, member management, group chat' },
          { name: 'Media Service', desc: 'Upload/download photos, videos, documents' },
          { name: 'Encryption', desc: 'End-to-end encryption for all messages' },
        ],
        flow: [
          '1. User authenticates with phone number OTP',
          '2. App establishes WebSocket connection to messaging server',
          '3. User types message, sends to recipient',
          '4. Message stored in database with unique ID',
          '5. If recipient online: message pushed via WebSocket in <100ms',
          '6. If recipient offline: message queued, delivered when reconnects',
          '7. Delivery receipt sent back to sender',
          '8. Group messages replicated to all group members',
          '9. Media messages stored separately with compression/thumbnail generation'
        ],
        challenges: [
          'Handling 100B+ messages per day across 2B+ users',
          'Sub-100ms message delivery latency',
          'Offline message queueing for days/weeks',
          'Group messaging consistency',
          'End-to-end encryption overhead',
          'Media deduplication (same photo sent by multiple users)'
        ]
      },
      Instagram: {
        components: [
          { name: 'User Service', desc: 'Profiles, follow/unfollow relationships' },
          { name: 'Post Service', desc: 'Create/delete posts, metadata storage' },
          { name: 'Feed Service', desc: 'Generate personalized feed for each user' },
          { name: 'Like Service', desc: 'Track likes, count, like notifications' },
          { name: 'Comment Service', desc: 'Store comments, reply threads' },
          { name: 'Media Service', desc: 'Upload/resize photos, video transcoding' },
          { name: 'Search Service', desc: 'Search users, hashtags, locations' },
          { name: 'Cache Layer', desc: 'Cache feed, user profiles, trending posts' },
        ],
        flow: [
          '1. User uploads photo',
          '2. Media Service creates thumbnails (4 sizes)',
          '3. Post Service stores post metadata (caption, location, timestamp)',
          '4. Event published: PostCreated',
          '5. Feed Service updates followers\' feeds asynchronously',
          '6. Followers see post in feed within seconds',
          '7. User opens feed: served from cache (hot data)',
          '8. User likes post: Like Service increments counter, sends notification',
          '9. User comments: Comment Service stores with threading',
          '10. Real-time updates pushed via WebSocket to post author'
        ],
        challenges: [
          'Feed generation for 500M+ daily active users',
          'Handling 500K+ posts per second at peak',
          'Real-time notification delivery',
          'Duplicate media deduplication',
          'Hashtag indexing and trending calculation',
          'Comment thread consistency'
        ]
      },
      YouTube: {
        components: [
          { name: 'Upload Service', desc: 'Accept videos, initiate transcoding' },
          { name: 'Transcoding Service', desc: 'Convert video to multiple qualities (1080p, 720p, 480p, 360p)' },
          { name: 'Video Metadata Service', desc: 'Title, description, tags, categories' },
          { name: 'Search & Recommendation', desc: 'Full-text search, personalized recommendations' },
          { name: 'Streaming Service', desc: 'Serve video chunks at correct quality' },
          { name: 'Ad Service', desc: 'Select relevant ads, track impressions' },
          { name: 'Analytics Service', desc: 'Track views, watch time, engagement' },
          { name: 'Cache Layer', desc: 'CDN caches popular videos at edge' },
        ],
        flow: [
          '1. Creator uploads video (can be GB size)',
          '2. Upload Service stores in distributed storage (S3 equivalent)',
          '3. Transcoding job queued (could take hours for 4K)',
          '4. Multiple transcoders work in parallel (sharding by video size)',
          '5. Video indexed in Search Service',
          '6. Recommendations engine processes video features',
          '7. Viewer searches/browses, sees recommendations from cache',
          '8. Viewer clicks video, Streaming Service serves from CDN',
          '9. Adaptive bitrate: stream automatically adjusts quality based on bandwidth',
          '10. Ad Service selects most relevant ads (context + user history)',
          '11. Analytics Service tracks: views, watch time, retention, engagement'
        ],
        challenges: [
          '2B+ hours watched daily - need efficient storage/delivery',
          'Transcoding pipeline: 500 hours uploaded per minute',
          'Video search with 800M+ videos',
          'Personalized recommendations at scale',
          'Ad relevance and revenue optimization',
          'Content moderation at scale',
          'Live streaming with sub-5 second latency'
        ]
      }
    }
  },

  microservices: {
    overview: `Decompose monolith into independent services. Each service owns its data, communicates via APIs. Enables independent scaling, deployment, and technology choices.`,

    subtopics: {
      'Circuit Breaker': {
        explanation: `Prevents cascading failures: if downstream service fails, open circuit (fail fast without calling), after timeout try again (half-open), if succeed close circuit. Protects system from overload and enables graceful degradation.`,
        useCases: ['Resilience to failures', 'Preventing cascading failures', 'Fast failure signaling'],
        realWorld: 'Uber: If payment service is slow, circuit breaker returns fallback (charge later) instead of blocking rider.',
        complexity: { states: '3 (closed, open, half-open)', timeout: 'Configurable seconds' }
      },
      'Service Discovery': {
        explanation: `Client needs to find which server handles service. DNS-based: service name resolves to current IP list (updates automatically as services scale). Heartbeat: service registers alive status, removed after N missed heartbeats.`,
        useCases: ['Finding service instances', 'Load balancing across instances', 'Scaling visibility'],
        realWorld: 'WhatsApp: Message service discovers 1000 available message handlers via DNS or consul.',
        complexity: { discovery: 'O(1) DNS', propagation: '100ms latency' }
      },
      'API Gateway': {
        explanation: `Single entry point for all client requests. Handles: routing to services, authentication, rate limiting, request/response transformation, logging. Aggregates responses from multiple services for client convenience.`,
        useCases: ['Unified interface', 'Cross-cutting concerns', 'Client decoupling'],
        realWorld: 'Instagram: API Gateway routes photo upload to media service, creates post via post service, updates feed.',
        complexity: { latency: 'Single hop', throughput: 'Millions req/sec with proper scaling' }
      },
      'Event-Driven': {
        explanation: `Services emit events when state changes. Other services subscribe and react asynchronously. Kafka/RabbitMQ handle event transport. Enables loose coupling, but adds complexity: ordering, idempotency, eventual consistency.`,
        useCases: ['Decoupling services', 'Async processing', 'Complex workflows'],
        realWorld: 'YouTube: Video upload emits event, triggering transcoding, thumbnail generation, recommendation update independently.',
        complexity: { latency: '100ms-seconds', consistency: 'Eventual' }
      },
    }
  },

  aws: {
    overview: `Cloud platform for building scalable systems. EC2 for compute, S3 for storage, RDS for databases, Lambda for serverless. Pay-as-you-go model enables rapid scaling.`,

    subtopics: {
      'Lambda': {
        explanation: `Serverless compute: write function, deploy, AWS handles scaling/servers. Cold start: first invocation slow (initialization), subsequent warm starts fast. Billed per 100ms execution time. Perfect for event-driven, variable-load workloads.`,
        useCases: ['Image processing', 'API backends', 'Scheduled tasks', 'Event processing'],
        realWorld: 'YouTube: Process video uploads with Lambda, scales from 0 to 10K concurrent automatically.',
        complexity: { cold_start: '100-1000ms', warm: '10ms', cost: 'Pay per 100ms' }
      },
      'RDS': {
        explanation: `Managed relational database (PostgreSQL, MySQL, Aurora). Handles backups, patches, replication. Read replicas for read scaling. Multi-AZ for high availability: synchronous replication to standby, auto-failover on primary failure.`,
        useCases: ['Transactional data', 'Complex queries', 'ACID guarantees'],
        realWorld: 'Uber: Orders (rides) stored in RDS with read replicas for queries, multi-AZ for resilience.',
        complexity: { read_replica: 'O(1) reads', failover: '30-60 seconds' }
      },
      'S3': {
        explanation: `Object storage: store any file (photos, videos, documents). Unlimited storage, pay per GB stored. Versioning: keep multiple versions. CloudFront CDN delivers content from edge locations worldwide.`,
        useCases: ['File storage', 'Static hosting', 'Data backup', 'Media distribution'],
        realWorld: 'Instagram: User photos stored in S3, served via CloudFront (cached at 200+ edge locations).',
        complexity: { latency: '10-100ms', availability: '99.99%' }
      },
    }
  },

  concurrency: {
    overview: `Multiple threads accessing shared resources simultaneously. Race conditions, deadlocks, data corruption possible. Synchronization primitives protect critical sections.`,

    subtopics: {
      'Mutex': {
        explanation: `Mutual exclusion lock: only one thread in critical section at a time. Lock owner must release (or code bugs). Contention: if many threads wait, queue forms. Spin lock: thread loops checking lock (CPU waste, useful for microsecond locks).`,
        useCases: ['Protecting shared state', 'Counter increments', 'Complex data structure updates'],
        realWorld: 'Uber: Mutex protects active ride count when multiple request handlers decrement simultaneously.',
        complexity: { acquire: 'O(1)', contention: '0-100μs' }
      },
      'Semaphore': {
        explanation: `Counter-based synchronization. Binary semaphore (0/1): like mutex. Counting semaphore (n): up to n threads enter. Producer-consumer: semaphores track empty/full buffer slots, coordinate producers/consumers.`,
        useCases: ['Producer-consumer', 'Resource pooling', 'Limiting concurrency'],
        realWorld: 'WhatsApp: Semaphore limits message processing threads to 100 (connection pool size).',
        complexity: { wait: 'Block on counter=0', signal: 'Wake one waiter' }
      },
      'Producer-Consumer': {
        explanation: `Producer creates items, puts in bounded buffer. Consumer takes items from buffer. If buffer full: producer waits. If buffer empty: consumer waits. Semaphores coordinate: empty=n (all slots empty), full=0 (no full slots).`,
        useCases: ['Decoupling producers/consumers', 'Work queues', 'Rate limiting'],
        realWorld: 'YouTube: Upload queue has max 1000 videos. Transcoders (consumers) take from queue, uploaders wait if full.',
        complexity: { throughput: 'Limited by buffer size × producer/consumer speed' }
      },
    }
  },

  sorting: {
    overview: `Sorting algorithms rearrange elements in order. Choosing right algorithm matters: O(n²) sorts slow for 1M items, while O(n log n) handles it easily. Stability matters: preserves relative order of equal elements.`,

    subtopics: {
      'Bubble Sort': {
        explanation: `Simple but slow: repeatedly swap adjacent elements if out of order. O(n²) time always. Optimized: stop if no swaps occur (nearly sorted data). Teaching tool: shows comparison & swap visualizations.`,
        useCases: ['Teaching', 'Nearly sorted data'],
        realWorld: 'Educational visualizations only - never used in production.',
        complexity: { time: 'O(n²)', space: 'O(1)', stable: 'Yes' }
      },
      'Merge Sort': {
        explanation: `Divide-and-conquer: split array, recursively sort halves, merge results. O(n log n) guaranteed. Requires O(n) extra space for merging. Stable: equal elements maintain order.`,
        useCases: ['Sorting linked lists', 'External sorting', 'When stable sort needed'],
        realWorld: 'Java Arrays.sort() for objects uses merge sort variant.',
        complexity: { time: 'O(n log n)', space: 'O(n)', stable: 'Yes' }
      },
      'Quick Sort': {
        explanation: `Divide-and-conquer with partitioning: pick pivot, partition into smaller/larger, recursively sort. O(n log n) average, O(n²) worst (bad pivot). In-place: O(log n) space for recursion. Cache-friendly.`,
        useCases: ['General sorting', 'Quickselect (find kth element)'],
        realWorld: 'Most popular: Java primitives, C qsort, Python sorted() use variants.',
        complexity: { time: 'O(n log n) avg, O(n²) worst', space: 'O(log n)', stable: 'No' }
      },
      'Heap Sort': {
        explanation: `Build max heap, repeatedly extract root (largest). O(n log n) guaranteed, in-place. Not stable. Heap invariant: parent >= children. Selection by extracting k times gives top-k in O(n log k) time.`,
        useCases: ['Top-k selection', 'Priority queues', 'When guaranteed O(n log n) needed'],
        realWorld: 'Top-k items from stream using min-heap of size k.',
        complexity: { time: 'O(n log n)', space: 'O(1)', stable: 'No' }
      },
    }
  },

  database: {
    overview: `Databases store persistent data with ACID guarantees: Atomicity (all-or-nothing), Consistency (valid state), Isolation (concurrent access), Durability (survives failures).`,

    subtopics: {
      'B-Tree': {
        explanation: `Multi-way tree for disk-based indexing. Each node holds multiple keys, branching to children. Balanced: all leaves at same depth O(log n). Range queries scan leaves efficiently. Most database indexes use B-Tree variants (B+ Tree).`,
        useCases: ['Database indexes', 'File system allocation', 'Range queries'],
        realWorld: 'PostgreSQL, MySQL use B-Tree for indexes on disk.',
        complexity: { search: 'O(log n)', range_scan: 'O(k) where k=results', insert: 'O(log n)' }
      },
      'Query Planning': {
        explanation: `Optimizer chooses execution plan: full table scan vs index scan, join order, join algorithm. Cost estimation: cardinality (rows matching), I/O cost, CPU cost. Bad plan causes query to run hours instead of milliseconds.`,
        useCases: ['Query optimization', 'Index selection', 'Performance tuning'],
        realWorld: 'EXPLAIN shows plan; ANALYZE gathers statistics for cost estimation.',
        complexity: { planning: 'Seconds for complex queries', execution: 'Varies wildly' }
      },
      'Transactions': {
        explanation: `ACID transactions guarantee consistency even with failures. Isolation levels: Read Uncommitted (dirty reads), Read Committed (locks until commit), Repeatable Read (snapshot isolation), Serializable (true serializability). Locking & MVCC implement isolation.`,
        useCases: ['Money transfers', 'Critical updates', 'Consistency guarantees'],
        realWorld: 'Bank transfer: debit account + credit account in single transaction, all-or-nothing.',
        complexity: { locking: 'Microseconds-milliseconds', mvcc: 'No blocking reads' }
      },
      'Joins': {
        explanation: `Combine rows from multiple tables: nested loop (slow, O(n*m)), hash join (O(n+m), good for large tables), sort-merge join (O(n log n + m log m), good for pre-sorted). Index join if index available.`,
        useCases: ['Combining related data', 'Complex queries'],
        realWorld: 'SELECT users.name FROM users JOIN orders WHERE orders.user_id = users.id',
        complexity: { nested_loop: 'O(n*m)', hash: 'O(n+m)', sort_merge: 'O(n log n)' }
      },
    }
  },

  redis: {
    overview: `In-memory data store for caching and real-time data. Blazingly fast (microseconds), but limited by RAM. Data types: strings, lists, sets, hashes, sorted sets. Pub/Sub for messaging.`,

    subtopics: {
      'Data Types': {
        explanation: `String: key→value, O(1) get/set. List: linked list, O(1) push/pop head/tail. Set: unique elements, O(1) add/contains. Hash: object-like, O(1) field access. Sorted Set: ordered by score, O(log n) add/remove, O(1) score access.`,
        useCases: ['Session cache', 'Rate limiting counters', 'Leaderboards (sorted set)', 'User profiles (hash)'],
        realWorld: 'Uber: Driver locations cached in Redis as geo hash with expiration.',
        complexity: { string: 'O(1)', list: 'O(1) ops', set: 'O(1) avg', zset: 'O(log n)' }
      },
      'Pub/Sub': {
        explanation: `Publish-Subscribe messaging: publishers send to channels, subscribers receive. Channels identified by string name. Loose coupling: pub doesn't know subs. Fire-and-forget: message lost if no subscribers.`,
        useCases: ['Real-time notifications', 'Event distribution', 'Broadcasting'],
        realWorld: 'Instagram: User sends message, published to room channel, all connected users subscribe & receive in <100ms.',
        complexity: { publish: 'O(subscribers)', subscribe: 'O(1) per sub' }
      },
      'Cluster': {
        explanation: `Redis Cluster: hash-slot based sharding. 16384 slots, each node owns subset. Hash slot = CRC16(key) % 16384. Node failure: remaining nodes own slots if quorum available. Slave replication within cluster.`,
        useCases: ['Scaling beyond single server RAM', 'High availability', 'Distributed caching'],
        realWorld: 'YouTube: Redis cluster stores 100B+ key-values across 1000+ nodes.',
        complexity: { redirect: 'Client redirected to correct node', failover: 'Seconds' }
      },
      'Pipelining': {
        explanation: `Send multiple commands in batch without waiting for responses. Reduces round trips: 1000 commands in 1 network call instead of 1000 calls. Server executes sequentially, returns all results. Huge throughput boost.`,
        useCases: ['Bulk operations', 'High throughput', 'Background jobs'],
        realWorld: 'Analytics: increment 100K counters in single pipeline call.',
        complexity: { throughput: '100x improvement', latency: 'Same per-command' }
      },
    }
  },

  docker: {
    overview: `Container platform: package app + dependencies in image, run anywhere. Lightweight VM: own filesystem, network, process space. Enables reproducible deployments.`,

    subtopics: {
      'Image Layers': {
        explanation: `Dockerfile commands create layers: FROM (base), RUN (execute), COPY (add files), EXPOSE (port). Each layer is cached: changing RUN command only rebuilds from that line onward. Union filesystem combines layers: READ-ONLY + read-write container layer.`,
        useCases: ['Reproducible builds', 'Efficient caching', 'Minimal images'],
        realWorld: 'Uber: Multi-stage build: compile in builder image, copy binary to tiny runtime image (50MB vs 500MB).',
        complexity: { build: 'Seconds with cache', layer: 'Each is separate file' }
      },
      'Container Lifecycle': {
        explanation: `Docker events: create → start → running → pause/unpause → stop → remove. Init process (PID 1) handles signals. ENTRYPOINT: command to run, CMD: default args. Graceful shutdown: app should handle SIGTERM.`,
        useCases: ['App orchestration', 'Signal handling', 'Cleanup on exit'],
        realWorld: 'Web server: ENTRYPOINT nginx, on SIGTERM flush logs & exit.',
        complexity: { startup: '10-100ms', signal_to_exit: '<1s' }
      },
      'Networking': {
        explanation: `Bridge network (default): each container gets IP on bridge subnet, containers talk by IP. Port mapping: map container port to host port (e.g., 8080→80). Host network: container shares host IP & ports.`,
        useCases: ['Inter-container communication', 'Port mapping', 'Multi-container apps'],
        realWorld: 'Docker-compose: web service on port 8000, nginx reverse proxy maps 80 to container 8000.',
        complexity: { DNS: 'Automatic service discovery by name', latency: '<1ms' }
      },
      'Compose': {
        explanation: `docker-compose.yml defines multi-container app: services (containers), networks, volumes (persistent storage). Single command: docker-compose up starts all. Dependency ordering: web depends_on db, waits for db first.`,
        useCases: ['Local development', 'Integration testing', 'Simple deployments'],
        realWorld: 'Dev environment: database + web + cache running together, matches production.',
        complexity: { startup: '5-20 seconds', management: 'Single YAML file' }
      },
    }
  },

  networking: {
    overview: `Networks connect computers: TCP reliable ordered delivery, UDP fast unreliable. HTTP protocols enable web. DNS resolves names to IPs. Load balancers distribute traffic.`,

    subtopics: {
      'TCP Handshake': {
        explanation: `3-way handshake: SYN (client sends, sequence=x), SYN-ACK (server responds, sequence=y, ack=x+1), ACK (client confirms, ack=y+1). Establishes sequence numbers for reliable delivery. Connection states: LISTEN → SYN_RCVD → ESTABLISHED → FIN_WAIT → TIME_WAIT.`,
        useCases: ['Connection establishment', 'Reliable communication', 'Flow control setup'],
        realWorld: 'Browser connecting to server: 3 packets before HTTP request can be sent.',
        complexity: { latency: 'RTT × 1.5', overhead: '3 packets' }
      },
      'HTTP': {
        explanation: `HTTP/1.1: persistent connections, request-response model, one request per connection at a time. HTTP/2: multiplexing (multiple streams in 1 connection), server push, binary framing. HTTP/3: QUIC protocol, faster connection setup.`,
        useCases: ['Web requests', 'APIs', 'Browser-server communication'],
        realWorld: 'Modern browsers use HTTP/2 multiplexing: request 100 resources in parallel on 1 connection.',
        complexity: { latency: '50-500ms depending on network', throughput: 'Limited by TCP window' }
      },
      'DNS': {
        explanation: `Domain Name System: resolves "youtube.com" to IP. Recursive query: client asks resolver, resolver queries root→TLD→authoritative. Caching: local cache, ISP cache, CloudFlare (8.8.8.8) public DNS. TTL controls expiration.`,
        useCases: ['Name resolution', 'Load balancing (round-robin DNS)', 'CDN routing'],
        realWorld: 'YouTube.com resolves to different IPs by geography: US→US CDN, India→India CDN.',
        complexity: { latency: '1-100ms (cached fast)', ttl: '5min-24hrs' }
      },
      'Load Balancer': {
        explanation: `Distributes traffic across servers: round-robin (rotate), least-connections (fewest current), weighted, IP-hash (same user→same server). Health checks: periodically test servers, remove unhealthy ones. Sticky sessions: session affinity.`,
        useCases: ['Scaling web servers', 'High availability', 'Request distribution'],
        realWorld: 'Uber: Load balancer distributes API requests across 1000 backend servers, removes unresponsive ones.',
        complexity: { latency: '<1ms', failover: 'Seconds after health check failure' }
      },
    }
  },

  os: {
    overview: `Operating System manages hardware: CPU scheduling, memory management, I/O. Efficiency critical: scheduling algorithm impacts responsiveness, memory allocation impacts performance.`,

    subtopics: {
      'Scheduler': {
        explanation: `CPU Scheduler decides which process runs next. FCFS (First-Come-First-Served): simple but poor responsiveness. Round-Robin: each process gets time slice (quantum), fairness but many context switches. Priority scheduling: high-priority tasks first.`,
        useCases: ['Fair CPU allocation', 'Responsiveness', 'Real-time guarantees'],
        realWorld: 'Linux CFS (Completely Fair Scheduler): aims equal CPU time for all processes.',
        complexity: { switch: '1-10 microseconds', fairness: 'Quantum-dependent' }
      },
      'Paging': {
        explanation: `Divide memory into pages (4KB), disk into swap. Demand paging: load page only when accessed. Page replacement: LRU (least recently used), FIFO, Second-Chance. Page fault: process blocks while page loaded (expensive ~10ms).`,
        useCases: ['Virtual memory', 'Memory overcommit', 'Protection (page boundaries)'],
        realWorld: 'Process thinks it has 1TB RAM, actually only 4GB available.',
        complexity: { fault: '10-100ms per fault', tlb_hit: 'Hardware cached, <1ns' }
      },
      'Virtual Memory': {
        explanation: `Each process has own address space (logical addresses). MMU (Memory Management Unit) translates to physical. Page table: logical page # → physical frame #. TLB: hardware cache of recent translations for speed.`,
        useCases: ['Process isolation', 'Memory protection', 'Overcommit', 'Relocation'],
        realWorld: 'Two processes with same virtual address 0x1000 map to different physical memory.',
        complexity: { translation: 'TLB <1ns, memory 100ns', overhead: 'Page table memory' }
      },
    }
  },

  ai: {
    overview: `Artificial Intelligence: Transformers revolutionized NLP. Attention mechanism allows words to attend to all other words simultaneously. Enables understanding context, relationships.`,

    subtopics: {
      'Transformer': {
        explanation: `Neural network architecture with encoder (processes input), decoder (generates output). Attention layers: each position "attends to" all other positions. Feed-forward layers: non-linearity. Positional encoding: encodes word order. Layer normalization: stabilizes training.`,
        useCases: ['Language modeling', 'Machine translation', 'Q&A systems'],
        realWorld: 'GPT-4: 1.7 trillion parameters, trained on text corpus, predicts next word.',
        complexity: { params: 'Billions-trillions', inference: '50-100ms per token' }
      },
      'Attention': {
        explanation: `Scaled dot-product attention: Query (Q), Key (K), Value (V). Score = softmax(Q · K^T / √d_k) · V. Multi-head: multiple attention heads in parallel for different representations. Self-attention: Q=K=V (same input), attends to itself.`,
        useCases: ['Capturing relationships', 'Long-range dependencies', 'Interpretability'],
        realWorld: 'Attention weights show which words influenced decision: "bank" attends to "river" not "money".',
        complexity: { time: 'O(n²) where n=sequence_length', memory: 'O(n²)' }
      },
      'Embeddings': {
        explanation: `Convert words/tokens to vectors: Word2Vec (skip-gram, CBOW), GloVe (global vectors), contextual (BERT/GPT embed word differently based on context). Semantic similarity: cosine distance between vectors. Vector arithmetic: king-man+woman ≈ queen.`,
        useCases: ['Semantic search', 'Similarity', 'Downstream tasks'],
        realWorld: 'YouTube: Video embeddings cluster similar videos, enables recommendations.',
        complexity: { dimension: '300-1536 typical', training: 'Hours on corpus' }
      },
    }
  },

  distributed: {
    overview: `Distributed Systems coordinate multiple machines: Raft for consensus, CAP theorem describes trade-offs. Handling failures, network partitions, eventual consistency is complex.`,

    subtopics: {
      'Raft': {
        explanation: `Consensus algorithm: leader elected, followers replicate log. Leader heartbeat: followers detect failure, elect new leader. Log entry replicated to majority before commitment. Strong leader: simplifies reasoning vs Paxos.`,
        useCases: ['Fault-tolerant consensus', 'Distributed databases', 'etcd/Consul'],
        realWorld: 'Kubernetes etcd: stores cluster state using Raft, survives minority node failures.',
        complexity: { election: '50-300ms', replication: 'Committed when quorum acks' }
      },
      'CAP Theorem': {
        explanation: `Consistency-Availability-Partition tolerance: can't have all 3. CP: sacrifice availability (lock until quorum responds). AP: sacrifice consistency (eventual consistency). Partitioned: CA impossible. Real systems: AP with quorum reads/writes.`,
        useCases: ['System design trade-offs', 'Consistency vs availability'],
        realWorld: 'Instagram: eventual consistency (eventual=hours) for feed (AP), strong consistency for payment (CP).',
        complexity: { tradeoff: 'Fundamental impossibility', design: 'Unavoidable choice' }
      },
      '2PC': {
        explanation: `Two-Phase Commit: coordinator asks participants to prepare (acquire locks, validate), then commit (write) or abort (rollback). Blocking: locks held during prepare phase. Slow for WAN (geographic). Rarely used; saga pattern preferred.`,
        useCases: ['Distributed transactions', 'ACID across systems'],
        realWorld: 'Bank transfer: debit service & credit service participate in 2PC to ensure both succeed or both fail.',
        complexity: { blocking: 'Locks held', latency: 'Seconds for WAN', failures: 'Complex recovery' }
      },
    }
  },
};
