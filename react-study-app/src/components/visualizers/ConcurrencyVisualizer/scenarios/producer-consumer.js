import { snap } from '@/core/utils/scenarioShared';

function buildPCCSteps() {
  const steps = [];

  const s = {
    buffer: [
      { slot: 0, state: 'empty', data: '' },
      { slot: 1, state: 'empty', data: '' },
      { slot: 2, state: 'empty', data: '' },
      { slot: 3, state: 'empty', data: '' },
      { slot: 4, state: 'empty', data: '' },
    ],
    producer: { pos: 0, state: 'idle' },
    consumer: { pos: 0, state: 'idle' },
    mutex: { owner: null },
    empty: { count: 5 },
    full: { count: 0 },
    events: [],
    metrics: { produced: 0, consumed: 0, fullSlots: 0 },
    vars: { bufState: 'empty', prodPos: 0, consPos: 0, emptyCount: 5, fullCount: 0 },
  };

  snap(steps, s, 'Bounded buffer (5 slots) ready. Producer writes items, consumer reads them. Semaphores: empty=5, full=0.', 1);

  s.producer.state = 'running';
  s.empty.count = 4;
  s.buffer[0] = { slot: 0, state: 'full', data: 'A' };
  s.producer.pos = 1;
  s.events.push({ msg: 'Producer: sem_wait(empty) → 5→4', type: 'info' });
  s.events.push({ msg: 'Producer: mutex lock → write A → unlock', type: 'ok' });
  s.metrics.produced = 1;
  s.metrics.fullSlots = 1;
  s.vars = { bufState: 'A at slot 0', prodPos: 1, consPos: 0, emptyCount: 4, fullCount: 0 };
  snap(steps, s, 'Producer: wait(empty) → empty--, lock mutex, writes "A" at slot 0, unlock, post(full) → full++.', 2);

  s.producer.state = 'running';
  s.empty.count = 3;
  s.buffer[1] = { slot: 1, state: 'full', data: 'B' };
  s.producer.pos = 2;
  s.events.push({ msg: 'Producer: sem_wait(empty) → 4→3', type: 'info' });
  s.events.push({ msg: 'Producer: write B → sem_post(full)', type: 'ok' });
  s.metrics.produced = 2;
  s.metrics.fullSlots = 2;
  s.vars = { bufState: 'A,B at slots 0,1', prodPos: 2, consPos: 0, emptyCount: 3, fullCount: 0 };
  snap(steps, s, 'Producer writes "B" at slot 1. Buffer: [A, B, _, _, _].', 3);

  s.consumer.state = 'running';
  s.full.count = 1;
  s.buffer[0] = { slot: 0, state: 'empty', data: '' };
  s.consumer.pos = 1;
  s.events.push({ msg: 'Consumer: sem_wait(full) → 2→1', type: 'info' });
  s.events.push({ msg: 'Consumer: read A → sem_post(empty)', type: 'ok' });
  s.metrics.consumed = 1;
  s.metrics.fullSlots = 1;
  s.vars = { bufState: 'B at slot 1', prodPos: 2, consPos: 1, emptyCount: 3, fullCount: 1 };
  snap(steps, s, 'Consumer: wait(full) → full--, lock mutex, reads "A" from slot 0, unlock, post(empty) → empty++. Slot 0 freed.', 4);

  s.producer.state = 'running';
  s.empty.count = 2;
  s.buffer[2] = { slot: 2, state: 'full', data: 'C' };
  s.producer.pos = 3;
  s.events.push({ msg: 'Producer: sem_wait(empty) → 3→2', type: 'info' });
  s.events.push({ msg: 'Producer: write C', type: 'ok' });
  s.metrics.produced = 3;
  s.metrics.fullSlots = 2;
  s.vars = { bufState: 'B,C at slots 1,2', prodPos: 3, consPos: 1, emptyCount: 2, fullCount: 1 };
  snap(steps, s, 'Producer writes "C" at slot 2. Ring buffer advances.', 5);

  s.consumer.state = 'running';
  s.full.count = 0;
  s.buffer[1] = { slot: 1, state: 'empty', data: '' };
  s.consumer.pos = 2;
  s.events.push({ msg: 'Consumer: sem_wait(full) → 2→0', type: 'info' });
  s.events.push({ msg: 'Consumer: read B → sem_post(empty)', type: 'ok' });
  s.metrics.consumed = 2;
  s.metrics.fullSlots = 1;
  s.vars = { bufState: 'C at slot 2', prodPos: 3, consPos: 2, emptyCount: 2, fullCount: 0 };
  snap(steps, s, 'Consumer reads "B" from slot 1. Buffer: [_, _, C, _, _].', 6);

  s.producer.state = 'running';
  s.empty.count = 1;
  s.buffer[3] = { slot: 3, state: 'full', data: 'D' };
  s.producer.pos = 4;
  s.empty.count = 0;
  s.buffer[4] = { slot: 4, state: 'full', data: 'E' };
  s.producer.pos = 0;
  s.events.push({ msg: 'Producer: write D, then E', type: 'ok' });
  s.events.push({ msg: 'Buffer full — 5/5 slots occupied', type: 'warn' });
  s.metrics.produced = 5;
  s.metrics.fullSlots = 3;
  s.vars = { bufState: 'C,D,E at slots 2,3,4', prodPos: 0, consPos: 2, emptyCount: 0, fullCount: 0 };
  snap(steps, s, 'Producer fills remaining slots: D at 3, E at 4. Buffer full (5/5). Producer would block on next write.', 7);

  s.consumer.state = 'running';
  s.consumer.pos = 3;
  s.buffer[2] = { slot: 2, state: 'empty', data: '' };
  s.consumer.pos = 4;
  s.buffer[3] = { slot: 3, state: 'empty', data: '' };
  s.consumer.pos = 0;
  s.buffer[4] = { slot: 4, state: 'empty', data: '' };
  s.consumer.state = 'idle';
  s.empty.count = 5;
  s.full.count = 0;
  s.events.push({ msg: 'Consumer: reads C, D, E', type: 'ok' });
  s.events.push({ msg: 'All items consumed. Buffer empty.', type: 'ok' });
  s.metrics.consumed = 5;
  s.metrics.fullSlots = 0;
  s.vars = { bufState: 'empty', prodPos: 0, consPos: 0, emptyCount: 5, fullCount: 0 };
  snap(steps, s, 'Consumer drains buffer: reads C, D, E in order. All 5 items consumed. Producer can write again. Classic bounded buffer solved with 2 semaphores + 1 mutex.', 8);

  return steps;
}

const PC_CODE = [
  '#define N 5',
  'sem_t empty;  // counts empty slots',
  'sem_t full;   // counts full slots',
  'pthread_mutex_t mutex;',
  'char buffer[N];',
  '',
  'void* producer(void* arg) {',
  '  for (;;) {',
  '    char item = produce();',
  '    sem_wait(&empty);        // dec empty slots',
  '    pthread_mutex_lock(&mutex);',
  '    buffer[prod_pos] = item; // write',
  '    prod_pos = (prod_pos+1) % N;',
  '    pthread_mutex_unlock(&mutex);',
  '    sem_post(&full);         // inc full slots',
  '  }',
  '}',
  '',
  'void* consumer(void* arg) {',
  '  for (;;) {',
  '    sem_wait(&full);         // dec full slots',
  '    pthread_mutex_lock(&mutex);',
  '    char item = buffer[cons_pos]; // read',
  '    cons_pos = (cons_pos+1) % N;',
  '    pthread_mutex_unlock(&mutex);',
  '    sem_post(&empty);        // inc empty slots',
  '    consume(item);',
  '  }',
  '}',
];

export default {
  id: 'producer-consumer',
  label: 'Producer-Consumer',
  icon: '\uD83D\uDCE6',
  build: buildPCCSteps,
  code: PC_CODE,
  language: 'C',
  metrics: [
    { key: 'produced', label: 'Produced', max: 8, color: 'var(--node-active)' },
    { key: 'consumed', label: 'Consumed', max: 8, color: 'var(--pod-running)' },
    { key: 'fullSlots', label: 'Full Slots', max: 5, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'What is the producer-consumer problem in simple terms?', content: 'The producer-consumer problem models a bakery where a baker (producer) puts cakes on a conveyor belt (bounded buffer) and a customer (consumer) takes them off. If the belt is full, the baker must wait. If the belt is empty, the customer must wait. Only one person can touch the belt at a time. This is the classic synchronization problem underlying all message queues, data pipelines, and streaming systems.' },
      { title: 'How producer-consumer works — core mechanics', content: 'The bounded buffer uses three primitives: a mutex for exclusive access to the buffer, an empty semaphore (initialized to N, the buffer size) counting free slots, and a full semaphore (initialized to 0) counting occupied slots. The producer calls wait(empty) → lock(mutex) → write to buffer → unlock(mutex) → post(full). The consumer calls wait(full) → lock(mutex) → read from buffer → unlock(mutex) → post(empty). The semaphore operations guarantee that producers block when full and consumers block when empty, while the mutex ensures buffer integrity.' },
      { title: 'Deep — internals & architecture', content: 'The order of sem_wait and mutex_lock is critical for deadlock avoidance: sem_wait must happen BEFORE mutex_lock. If reversed, a producer waiting on empty while holding the mutex prevents the consumer from posting to empty (since the consumer needs the mutex to consume), creating a circular wait. The buffer uses modular arithmetic: the producer advances a write index and the consumer advances a read index, both modulo N. This creates a ring buffer that never requires shifting elements. The LMAX Disruptor extends this to a lock-free pattern using sequence barriers and memory barriers instead of OS primitives for ultra-low-latency trading systems.' },
    ],
    why: [
      'Producer-consumer is the fundamental pattern for data pipelines, message queues (Kafka, RabbitMQ), streaming systems, and OS pipes. Understanding it unlocks the architecture of virtually all producer/consumer systems in distributed and concurrent computing.',
      'The bounded buffer pattern appears in every level of computing: OS pipes, network packet buffers, audio/video capture buffers, database replication logs, and Kafka topic partitions. The same three-primitive solution applies at every scale.',
      'The producer-consumer problem teaches the most important lesson in concurrent programming: resource ordering matters. The sem_wait before mutex_lock rule generalizes to a broader principle — never hold a lock while waiting for a resource.',
    ],
    interview: [
      { q: 'What happens if you swap the order of sem_wait and mutex_lock in the producer-consumer solution?', a: 'If a producer locks the mutex first, then waits on the empty semaphore, it holds the mutex while blocked. The consumer cannot acquire the mutex (since the producer holds it) and thus cannot consume items to free empty slots. This creates a deadlock: the producer waits for empty (cannot get it because the consumer cannot consume), and the consumer waits for the mutex (cannot get it because the producer holds it). The correct order is sem_wait first, then mutex_lock — always wait outside the critical section. Swapping mutex_unlock and sem_post order is safe because the mutex is released before waking the consumer.', followUps: ['Does the same deadlock risk apply symmetrically to the consumer side?', 'What about the order of mutex_unlock and sem_post — does it matter?'] },
      { q: 'How would you implement a bounded buffer with multiple producers and multiple consumers?', a: 'The same three-semaphore solution scales to multiple producers and multiple consumers. All producers compete on the empty semaphore and the mutex. All consumers compete on the full semaphore and the mutex. The ring buffer uses an atomic write index for producers (modulo N) and an atomic read index for consumers (modulo N). However, with high contention, the mutex becomes a bottleneck. The LMAX Disruptor avoids this by using a single-producer assumption with sequence barriers: the producer claims slots via atomic increment (no lock), writes data, and updates a sequence counter. Consumers read only when the sequence advances. No mutex or semaphore is needed.', followUps: ['How does the LMAX Disruptor achieve lock-free operation?', 'What is a single-producer single-consumer (SPSC) queue and how does it eliminate all synchronization?'] },
      { q: 'How does a POSIX pipe implement producer-consumer in the kernel?', a: 'A pipe in the Linux kernel uses a circular buffer (struct pipe_inode_info) with a linked list of pipe_buffer pages. The kernel uses wait queues for blocking: when a reader reads from an empty pipe, it calls pipe_wait and sleeps on the pipe\'s wait queue. When a writer writes data, it wakes any waiting readers via wake_up_interruptible. The reverse happens when a writer writes to a full pipe. No mutex is needed at this level because the kernel already holds the pipe\'s inode lock (i_mutex). The pipe\'s buffer size (PIPE_BUF, 4096 bytes on Linux) is guaranteed to be atomic for writes under this size, ensuring writes from multiple processes do not interleave.', followUps: ['How does pipe buffering differ from a generic bounded buffer?', 'What is PIPE_BUF and why does POSIX guarantee atomic writes only for sizes up to this limit?'] },
    ],
    gotcha: [
      'Using a single semaphore instead of separate empty and full semaphores is incorrect — it cannot distinguish between the buffer being empty and full. The producer might write to a full buffer, or the consumer might read from an empty one.',
      'The buffer size N must be strictly consistent with semaphore initial values. A classic off-by-one error: if the buffer has N slots and you initialize empty = N, the producer can fill all N slots, but the consumer sees full = 0 and empty = N — indistinguishable from the initial state. Empty + full must always equal N.',
      'Writing to a full buffer without blocking (e.g., dropping the oldest item) requires a different synchronization pattern: a producer must be able to post(full) without blocking. This requires a try-wait variant of the semaphore or a different approach like a lock-free ring buffer with atomic head/tail.',
      'Condition variable solutions must handle spurious wakeups by re-checking the buffer state in a while loop. Neglecting this is a common bug: a consumer might wake up to an empty buffer and read garbage or crash.',
    ],
    tradeoffs: [
      { pro: 'Semaphore-based bounded buffer is correct, simple to understand, and works for any number of producers and consumers. It uses well-known primitives (mutex + two counting semaphores) available on all POSIX systems.', con: 'High contention on the mutex in high-throughput scenarios — every item requires two syscalls (sem_wait and sem_post) plus mutex lock/unlock. Throughput is limited by OS scheduler overhead.' },
      { pro: 'Lock-free ring buffer (LMAX Disruptor) provides ultra-low latency by avoiding OS synchronization entirely. Uses atomic sequence counters and memory barriers. Achieves millions of operations per second on a single core.', con: 'Complex implementation with subtle memory ordering requirements. Usually assumes single-producer or single-consumer for lock-free operation. Sequence barriers and cache-line padding add complexity. Hard to verify correctness without formal tools.' },
      { pro: 'Condition variable approach (pthread_cond_t) with mutex is a natural fit when you need to wait for arbitrary buffer states (e.g., less than 10 items, more than 50% full). Broadcast wakes all waiters, enabling batch processing patterns.', con: 'Spurious wakeups require rechecking conditions in while loops. Broadcast can cause thundering herd where all consumers wake for one item. More verbose and error-prone than the semaphore approach for the basic bounded buffer.' },
    ],
  },
};
