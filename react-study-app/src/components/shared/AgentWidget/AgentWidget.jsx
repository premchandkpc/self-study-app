import { useState, useRef, useEffect } from 'react';
import Button from '../Button/Button';
import { LoadingDots } from '../Loading/Loading';
import styles from './AgentWidget.module.css';

const KNOWLEDGE_BASE = {
  java:          '☕ **Java**: Strongly typed, JVM-based. Key topics: GC (G1, ZGC), synchronized, volatile, thread pool, CompletableFuture, Stream API.',
  jvm:           '🔧 **JVM**: Class loading → bytecode verification → JIT compilation. Heap: Eden → Survivor → Old Gen. GC roots mark live objects, sweep dead.',
  gc:            '🗑️ **GC**: Minor GC (Eden), Major GC (Old Gen), Full GC (stop-the-world). G1 divides heap into regions. ZGC targets <1ms pauses.',
  go:            '🐹 **Go**: Goroutines are M:N threads (m goroutines on n OS threads). Channels for CSP communication. GC: concurrent tri-color mark-sweep.',
  goroutine:     '⚡ **Goroutines**: ~2KB stack, grows dynamically. Go scheduler (GPM: Goroutine-Processor-Machine). Work stealing between Ps.',
  kafka:         '📨 **Kafka**: Append-only partitioned log. Producers write to leaders. Consumers track offsets. ISR = in-sync replicas. Lag = unconsumed messages.',
  partition:     '📦 **Partitions**: Unit of parallelism in Kafka. Each partition is a sorted, immutable sequence. One leader, N-1 followers in ISR.',
  kubernetes:    '☸️ **Kubernetes**: Control plane (API server, etcd, scheduler, controller manager). Worker nodes run kubelet + kube-proxy. Pods = smallest unit.',
  pod:           '🫛 **Pod**: One or more containers sharing network namespace + storage. Ephemeral — ReplicaSet ensures desired count.',
  microservices: '🔧 **Microservices**: Decompose by bounded context. Each service owns its data. Communicate via REST/gRPC/events. Key patterns: saga, circuit breaker, CQRS.',
  redis:         '⚡ **Redis**: In-memory key-value. Single-threaded event loop. Persistence: RDB (snapshots) or AOF (append-only file). Pub/Sub, Lua scripts, streams.',
  sql:           '🗄️ **SQL**: MVCC for concurrent reads without locks. Index types: B-tree (range), Hash (equality), GiST (geometry). EXPLAIN ANALYZE to find slow queries.',
  docker:        '🐳 **Docker**: Union FS layers (each instruction = layer). cgroups for resource limits, namespaces for isolation. Multi-stage builds reduce image size.',
  grpc:          '🔌 **gRPC**: HTTP/2 multiplexing + protobuf serialization. Bidirectional streaming. Service mesh (Envoy) handles retries, circuit breaking, mTLS.',
  rest:          '🌐 **REST**: Stateless, resource-based, HTTP verbs (GET/POST/PUT/DELETE). Idempotency matters for PUT/DELETE. Use ETag for cache validation.',
  bfs:           '🕸️ **BFS**: Explores level by level using a queue. O(V+E) time, O(V) space. Use for shortest path in unweighted graphs.',
  dfs:           '🔄 **DFS**: Explores depth-first using stack/recursion. O(V+E) time. Use for cycle detection, topological sort, connected components.',
  array:         '📊 **Arrays**: Sliding window O(n), two-pointer O(n), prefix sum O(1) query. Binary search O(log n). Kadane\'s algorithm for max subarray.',
};

function getReply(msg) {
  const lower = msg.toLowerCase();
  for (const [key, reply] of Object.entries(KNOWLEDGE_BASE)) {
    if (lower.includes(key)) return reply;
  }
  return `🤖 No specific knowledge for "${msg}". Try: java, jvm, gc, kafka, kubernetes, go, goroutine, redis, bfs, dfs, array, docker, grpc.`;
}

export default function AgentWidget({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState([
    { role: 'agent', text: '👋 Ask me about any topic: Java, Kafka, K8s, Go, DSA, Redis…' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    setTimeout(() => {
      const reply = getReply(text);
      setMessages((prev) => [...prev, { role: 'agent', text: reply }]);
      setLoading(false);
    }, 600 + Math.random() * 400);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className={`${styles.widget} ${open ? styles.open : ''}`}>
      {/* TOGGLE BUTTON */}
      <button
        className={styles.toggle}
        onClick={() => { setOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 100); }}
        aria-label="Toggle agent"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* PANEL */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.headerIcon}>🤖</span>
            <div>
              <div className={styles.headerTitle}>Study Agent</div>
              <div className={styles.headerSub}>Ask anything</div>
            </div>
            <div className={styles.onlineDot} title="Ready" />
          </div>

          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${styles[`msg-${msg.role}`]}`}>
                <span className={styles.msgText}>{msg.text}</span>
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles['msg-agent']}`}>
                <LoadingDots />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={styles.inputArea}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about Java, Kafka, K8s…"
              disabled={loading}
            />
            <Button variant="primary" size="sm" onClick={send} disabled={!input.trim() || loading}>
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
