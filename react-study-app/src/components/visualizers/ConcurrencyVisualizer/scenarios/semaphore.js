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
      { title: 'ELI5 — Kid-friendly analogy', content: 'A semaphore is like a valet parking lot with 10 spaces. When a car arrives (sem_wait), if there is space, the count goes down and the car parks. When full (count=0), cars must wait at the gate. When a car leaves (sem_post), the count goes up and the next waiting car parks. Unlike a bathroom key (mutex), multiple cars can park simultaneously.' },
      { title: 'Core — How it works', content: 'A counting semaphore maintains an integer count representing available permits. sem_wait: if count > 0, decrement and continue. If count = 0, block the thread. sem_post: increment count and wake a blocked thread if any. Unlike a mutex, semaphores have no ownership — any thread can post. Binary semaphore (max=1) allows one thread at a time, like a mutex but without ownership semantics.' },
    ],
    why: ['Semaphores are used for resource pools (DB connection pool, thread pool), signaling between threads (producer-consumer), and controlling access to finite resources. They are more general than mutexes.'],
    interview: [
      { question: 'What is the difference between a binary semaphore and a mutex?', answer: 'Mutex has ownership: only the thread that locked can unlock. This enables priority inheritance and deadlock detection. Binary semaphore has no ownership — any thread can post. Mutex is for mutual exclusion on shared data. Semaphore is for signaling / resource counting. Semaphore can be used for producer-consumer where a producer posts and consumer waits.', followUps: ['Can a semaphore be used as a mutex?', 'Why does pthread differentiate mutex and semaphore?'] },
      { question: 'What are the classic synchronization problems that use semaphores?', answer: 'Producer-Consumer (bounded buffer): 3 semaphores (empty, full, mutex). Readers-Writers: semaphore for write access, count of readers. Dining Philosophers: semaphore per chopstick. Barrier: semaphore + counter. Semaphores provide the primitives to solve all these — but ordering and deadlock prevention require careful design.', followUps: ['How is the Dining Philosophers problem solved?', 'What is the difference between sem_wait and pthread_cond_wait?'] },
    ],
    gotcha: ['Sem_post from interrupt handlers: sem_post is signal-safe and can be called from signal handlers / ISRs. This enables one pattern where an ISR signals a waiting thread. But sem_wait is NOT signal-safe.', 'Missing sem_post causes permanent blocking (thread waits forever). This is harder to debug than a mutex deadlock because there is no ownership record — you cannot trivially see which thread should have posted.'],
    tradeoffs: [
      { pro: 'Semaphore — flexible: signaling, counting, no ownership', con: 'no ownership tracking, harder to debug (who should post?)' },
      { pro: 'Mutex — ownership enforced, priority inheritance, simpler semantics', con: 'less flexible, only mutual exclusion, no signaling' },
    ],
  },
};
