import { snap } from '@/core/utils/scenarioShared';

function buildSemaphoreSteps() {
  const steps = [];

  const s = {
    semaphore: { count: 2, max: 2, queue: [] },
    threads: [
      { id: 'T1', state: 'new', desc: 'wants resource' },
      { id: 'T2', state: 'new', desc: 'wants resource' },
      { id: 'T3', state: 'new', desc: 'wants resource' },
    ],
    events: [],
    metrics: { available: 2, waiting: 0, acquired: 0 },
    vars: { semCount: 2, waitingThreads: [], desc: '2 permits available' },
  };

  snap(steps, s, 'Counting semaphore initialized with 2 permits. 3 threads contend for 2 resources.', 1);

  s.threads[0].state = 'running';
  s.semaphore.count = 1;
  s.events.push({ msg: 'sem_wait() — T1', type: 'info' });
  s.events.push({ msg: 'T1 acquired permit (2→1)', type: 'ok' });
  s.metrics.acquired = 1;
  s.metrics.available = 1;
  s.vars = { semCount: 1, waitingThreads: [], desc: 'T1 holds permit' };
  snap(steps, s, 'T1 calls sem_wait() → count=2 ≥ 1 → decrement to 1. T1 enters critical section.', 2);

  s.threads[1].state = 'running';
  s.semaphore.count = 0;
  s.events.push({ msg: 'sem_wait() — T2', type: 'info' });
  s.events.push({ msg: 'T2 acquired permit (1→0)', type: 'ok' });
  s.metrics.acquired = 2;
  s.metrics.available = 0;
  s.vars = { semCount: 0, waitingThreads: [], desc: 'T2 holds last permit' };
  snap(steps, s, 'T2 calls sem_wait() → count=1 ≥ 1 → decrement to 0. All 2 permits in use.', 3);

  s.threads[2].state = 'waiting';
  s.semaphore.queue = ['T3'];
  s.events.push({ msg: 'sem_wait() — T3', type: 'warn' });
  s.events.push({ msg: 'count=0 — T3 BLOCKED', type: 'warn' });
  s.metrics.waiting = 1;
  s.vars = { semCount: 0, waitingThreads: ['T3'], desc: 'T3 blocked — no permits' };
  snap(steps, s, 'T3 calls sem_wait() → count=0 → blocks. T3 added to wait queue.', 4);

  s.threads[0].state = 'terminated';
  s.semaphore.count = 1;
  s.events.push({ msg: 'sem_post() — T1', type: 'info' });
  s.events.push({ msg: 'T1 released (0→1)', type: 'ok' });
  s.vars = { semCount: 1, waitingThreads: ['T3'], desc: 'T1 done — permit returned' };
  snap(steps, s, 'T1 calls sem_post() → count: 0→1. Wait queue has T3 — T3 will wake.', 5);

  s.semaphore.count = 0;
  s.semaphore.queue = [];
  s.threads[2].state = 'running';
  s.metrics.waiting = 0;
  s.metrics.acquired = 3;
  s.events.push({ msg: 'T3 woken — acquired permit', type: 'ok' });
  s.vars = { semCount: 0, waitingThreads: [], desc: 'T3 acquired returned permit' };
  snap(steps, s, 'T3 woken by sem_post(). T3 acquires permit. Binary semaphore (max=1) behaves like mutex but without ownership tracking.', 6);

  return steps;
}

const SEMAPHORE_CODE = [
  'sem_t pool;',
  'sem_init(&pool, 0, 2);  // count=2 permits',
  '',
  'void* worker(void* arg) {',
  '  sem_wait(&pool);       // acquire — block if 0',
  '  // use resource (DB conn, GPU, etc)',
  '  sem_post(&pool);       // release — wake waiter',
  '  return NULL;',
  '}',
  '',
  '// DB connection pool: max 10 conns',
  '// sem_init(&pool, 0, 10);',
  '// sem_wait → borrow, sem_post → return',
  '// Binary semaphore (max=1) vs mutex:',
  '//   mutex has ownership (same thread unlock)',
  '//   semaphore can be posted from any thread',
];

export default {
  id: 'semaphore',
  label: 'Semaphore',
  icon: '\uD83D\uDEA6',
  build: buildSemaphoreSteps,
  code: SEMAPHORE_CODE,
  language: 'C',
  metrics: [
    { key: 'available', label: 'Permits', max: 2, color: 'var(--pod-running)' },
    { key: 'waiting', label: 'Waiting', max: 3, color: 'var(--node-comparing)' },
    { key: 'acquired', label: 'Acquired', max: 3, color: 'var(--node-active)' },
  ],
  topicContent: {
    concept: [
      { title: 'What is a semaphore in simple terms?', content: 'A semaphore is a counter that controls access to a shared resource. Think of it as a parking lot with a digital sign showing available spaces. When a car enters (sem_wait), the count decreases. When a car leaves (sem_post), the count increases. If the lot is full (count = 0), arriving cars wait at the gate. Unlike a mutex (which protects ONE thing), a semaphore can allow multiple concurrent users — like a parking lot with 10 spaces.' },
      { title: 'How semaphores work — core mechanics', content: 'A counting semaphore tracks an integer count of available permits. sem_wait (P operation): atomically decrements count if > 0, or blocks the calling thread if count = 0. sem_post (V operation): atomically increments count and wakes one waiting thread if any. The key difference from a mutex is that semaphores have no ownership — any thread can post to a semaphore, not just the thread that waited. A binary semaphore (max count = 1) behaves like a mutex for mutual exclusion but without ownership semantics.' },
      { title: 'Deep — internals & architecture', content: 'POSIX semaphores (sem_t) use a futex-based implementation on Linux. sem_wait attempts a userspace atomic decrement (CAS) — if the result is >= 0, the thread continues without a syscall. If the count was 0, the thread calls futex(FUTEX_WAIT) to sleep. sem_post atomically increments and calls futex(FUTEX_WAKE) if any thread was waiting. Named semaphores (sem_open) can synchronize across processes via shared memory. Unnamed semaphores (sem_init) work within a process or shared memory mapped between threads. The kernel maintains no ownership record — any thread can post at any time.' },
    ],
    why: [
      'Semaphores are the most general synchronization primitive — they can implement mutual exclusion, resource counting, and signaling between threads. Database connection pools, thread pools, and rate limiters all use counting semaphores to control access to finite resources.',
      'Semaphores enable the producer-consumer pattern, which is the foundation of message queues, streaming data pipelines, and pipe implementations. Understanding semaphores is essential for building any system that requires bounded buffering between producers and consumers.',
      'Semaphores are signal-safe and can be used in interrupt handlers and signal handlers for lightweight inter-thread signaling, unlike mutexes which cannot be used in such contexts. This makes them the primitive of choice for certain low-level synchronization patterns.',
    ],
    interview: [
      { q: 'What is the difference between a binary semaphore and a mutex?', a: 'A mutex has ownership — only the thread that locked it can unlock it. This enables important features like priority inheritance (preventing priority inversion), deadlock detection, and recursion (recursive mutex). A binary semaphore has no ownership — any thread can post, not just the one that waited. Mutexes are designed for mutual exclusion on shared data. Semaphores are designed for signaling and resource counting. You can use a binary semaphore for mutual exclusion, but you lose the safety guarantees. The pthreads library maintains separate types because they serve fundamentally different purposes with different safety properties.', followUps: ['Can a binary semaphore always be used as a mutex replacement?', 'Why does the C++ standard library have std::mutex but not std::binary_semaphore until C++20?'] },
      { q: 'How can semaphores be used to solve the producer-consumer problem?', a: 'The bounded buffer problem uses three synchronization primitives: a mutex for buffer access, an empty semaphore (initialized to N, the buffer size) counting free slots, and a full semaphore (initialized to 0) counting occupied slots. The producer waits on empty, locks the mutex, writes to the buffer, unlocks, and posts to full. The consumer waits on full, locks the mutex, reads from the buffer, unlocks, and posts to empty. The ordering matters: sem_wait must happen BEFORE mutex_lock to prevent deadlock. If the producer locked the mutex first, it could block on empty while holding the mutex, preventing the consumer from consuming to free slots.', followUps: ['How does the ordering of sem_wait and mutex_lock relate to deadlock?', 'How would you implement a multi-consumer multi-producer ring buffer using semaphores?'] },
      { q: 'What is the Dining Philosophers problem and how do semaphores solve it?', a: 'Five philosophers sit at a round table with five chopsticks — one between each pair. Each philosopher must pick up two chopsticks to eat. The problem illustrates deadlock (if every philosopher picks up the left chopstick simultaneously, none can get the right) and starvation. A semaphore-based solution assigns one mutex per chopstick. Deadlock is prevented by using a semaphore limiting the number of philosophers who can start eating (e.g., 4 for 5 philosophers) or by requiring an asymmetric grab order (some pick left-first, others right-first). An even simpler approach is to make the fork pickup atomic using a single mutex.', followUps: ['What are the tradeoffs of the different Dining Philosophers solutions?', 'How does the resource hierarchy solution compare to the semaphore limit solution?'] },
    ],
    gotcha: [
      'Sem_post is signal-safe and can be called from signal handlers and ISRs. This enables a pattern where an interrupt handler signals a waiting thread. However, sem_wait is NOT signal-safe and must never be called from a signal handler.',
      'Missing sem_post causes permanent blocking — a thread waits forever on sem_wait. This is harder to debug than a mutex deadlock because there is no ownership record. You cannot trivially see which thread should have called sem_post — the producer might be stuck elsewhere.',
      'Initializing a semaphore to a value larger than the available resources can lead to oversubscription. For example, initializing a connection pool semaphore to 20 when only 15 connections are available causes crashes when 16 threads try to use connections simultaneously.',
      'POSIX semaphores on Linux (sem_t) have a maximum value of SEM_VALUE_MAX (typically INT_MAX). Exceeding this via repeated sem_post without matching sem_wait causes undefined behavior or returns -1 with errno EOVERFLOW.',
    ],
    tradeoffs: [
      { pro: 'Semaphores are flexible — they support signaling, counting, and mutual exclusion. They are signal-safe and process-shared capable (named semaphores). Counting semaphores elegantly manage resource pools and bounded buffers.', con: 'No ownership tracking makes debugging harder — you cannot determine which thread should have posted. No priority inheritance means binary semaphore mutual exclusion can cause priority inversion. Harder to reason about than mutexes.' },
      { pro: 'Mutexes provide enforced ownership with priority inheritance support, making them safer for real-time systems. Recursive mutexes prevent self-deadlock. Deadlock detection tools work better with ownership tracking.', con: 'Less flexible than semaphores — only mutual exclusion, no signaling or counting. Not signal-safe. Only works within a process (unless using robust or process-shared mutexes, which have different semantics).' },
      { pro: 'Condition variables (pthread_cond_t) paired with mutexes provide more expressive synchronization than semaphores — you can wait for arbitrary conditions, use broadcast to wake all waiters, and avoid the signaling pitfalls of sem_post.', con: 'More verbose than semaphores (need mutex + condition variable pair). The spurious wakeup requirement (pthread_cond_wait can return without being signaled) adds complexity. Broadcast with many waiters causes thundering herd problems.' },
    ],
  },
};
