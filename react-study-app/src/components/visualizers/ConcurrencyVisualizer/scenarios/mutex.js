import { snap } from '@/core/utils/scenarioShared';

function buildMutexSteps() {
  const steps = [];

  const s = {
    threads: [
      { id: 'T1', state: 'new', holds: null },
      { id: 'T2', state: 'new', holds: null },
      { id: 'T3', state: 'new', holds: null },
    ],
    mutex: { owner: null, queue: [] },
    events: [],
    metrics: { locked: 0, blocked: 0, woken: 0 },
    vars: { mutexOwner: 'none', blockedQueue: [], lockState: 'unlocked' },
  };

  snap(steps, s, 'Three threads ready. Mutex is unlocked. They will contend for lock ownership.', 1);

  s.threads[0].state = 'running';
  s.threads[0].holds = 'mutex';
  s.mutex.owner = 'T1';
  s.mutex.queue = [];
  s.events.push({ msg: 'pthread_mutex_lock() — T1', type: 'info' });
  s.events.push({ msg: 'T1 acquired mutex', type: 'ok' });
  s.metrics.locked = 1;
  s.vars = { mutexOwner: 'T1', blockedQueue: [], lockState: 'locked' };
  snap(steps, s, 'T1 calls pthread_mutex_lock() → mutex free → T1 acquires lock. T1 enters critical section.', 2);

  s.threads[1].state = 'running';
  s.events.push({ msg: 'pthread_mutex_lock() — T2', type: 'warn' });
  s.events.push({ msg: 'mutex held by T1 — T2 BLOCKED', type: 'warn' });
  s.mutex.queue = ['T2'];
  s.threads[1].state = 'blocked';
  s.metrics.blocked = 1;
  s.vars = { mutexOwner: 'T1', blockedQueue: ['T2'], lockState: 'locked' };
  snap(steps, s, 'T2 tries pthread_mutex_lock() → mutex held by T1 → T2 moves to BLOCKED state and enqueues.', 3);

  s.threads[2].state = 'running';
  s.events.push({ msg: 'pthread_mutex_lock() — T3', type: 'warn' });
  s.events.push({ msg: 'mutex held by T1 — T3 BLOCKED', type: 'warn' });
  s.mutex.queue = ['T2', 'T3'];
  s.threads[2].state = 'blocked';
  s.metrics.blocked = 2;
  s.vars = { mutexOwner: 'T1', blockedQueue: ['T2', 'T3'], lockState: 'locked' };
  snap(steps, s, 'T3 also tries to lock → blocked. Queue: T2 → T3. Both waiting for mutex.', 4);

  s.threads[0].state = 'running';
  s.threads[0].holds = null;
  s.mutex.owner = null;
  s.events.push({ msg: 'pthread_mutex_unlock() — T1', type: 'info' });
  s.events.push({ msg: 'T1 released mutex', type: 'ok' });
  s.vars = { mutexOwner: 'none', blockedQueue: ['T2', 'T3'], lockState: 'unlocked' };
  snap(steps, s, 'T1 calls pthread_mutex_unlock() → mutex free. Next waiter will be woken.', 5);

  const woken = s.mutex.queue.shift();
  s.threads[1].state = 'running';
  s.threads[1].holds = 'mutex';
  s.mutex.owner = woken;
  s.metrics.woken = 1;
  s.events.push({ msg: `${woken} woken — acquired mutex`, type: 'ok' });
  s.vars = { mutexOwner: woken, blockedQueue: ['T3'], lockState: 'locked' };
  snap(steps, s, `T2 dequeued and woken → acquires mutex → enters critical section. T3 still blocked. Priority inversion risk if T3 has higher priority.`, 6);

  return steps;
}

const MUTEX_CODE = [
  'pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;',
  '',
  'void* worker(void* arg) {',
  '  pthread_mutex_lock(&mutex);   // acquire — may block',
  '  // critical section',
  '  printf("thread %d in CS\\n", *(int*)arg);',
  '  pthread_mutex_unlock(&mutex); // release — wake waiter',
  '  return NULL;',
  '}',
  '',
  '// spinlock: busy-waits until lock free',
  '// mutex:   puts thread to sleep, OS reschedules',
  '// recursive mutex: same thread can lock multiple times',
  '// priority inversion: low-priority holds lock high needs',
];

export default {
  id: 'mutex',
  label: 'Mutex',
  icon: '\uD83D\uDD12',
  build: buildMutexSteps,
  code: MUTEX_CODE,
  language: 'C',
  metrics: [
    { key: 'locked', label: 'Locked', max: 3, color: 'var(--pod-running)' },
    { key: 'blocked', label: 'Blocked', max: 3, color: 'var(--pod-crash)' },
    { key: 'woken', label: 'Woken', max: 3, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'What is a mutex in simple terms?', content: 'A mutex (mutual exclusion) is like a key to a single-occupancy bathroom. Only one person can be inside at a time. If someone is inside and you try to enter, you wait in line nicely (the OS puts your thread to sleep) rather than banging on the door (busy-waiting). When the person leaves, they hand the key to the next person in line. Mutexes prevent race conditions by ensuring only one thread accesses shared data at a time.' },
      { title: 'How mutex works — core mechanics', content: 'A thread calls pthread_mutex_lock(&mutex). If the mutex is unlocked, the thread acquires it immediately and continues into the critical section. If it is locked by another thread, the calling thread is removed from the CPU (put to sleep) and added to a wait queue associated with the mutex. When the owning thread calls pthread_mutex_unlock, the kernel wakes the next waiting thread, which then acquires the lock and continues. Mutexes enforce ownership — only the thread that locked the mutex can unlock it.' },
      { title: 'Deep — internals & architecture', content: 'Linux mutexes (futex-based) use a two-phase approach: attempt an atomic compare-and-swap (CAS) in userspace. If the lock is uncontended, acquisition happens in userspace with no syscall. If contended, the thread calls futex(FUTEX_WAIT) to sleep in the kernel. A futex word in userspace tracks the lock state (0 = unlocked, 1 = locked, 2 = contended). On unlock, if the state was contended, futex(FUTEX_WAKE) wakes one waiter. Pthreads supports PTHREAD_PRIO_INHERIT and PTHREAD_PRIO_PROTECT protocols to handle priority inversion via the kernel\'s rt-mutex implementation.' },
    ],
    why: [
      'Mutexes prevent race conditions on shared data. Without them, concurrent increments to a counter can lose updates (read-modify-write race). Every production multithreaded application uses mutexes or atomics for data protection.',
      'Mutexes with priority inheritance are essential in real-time systems (automotive, robotics) where priority inversion could cause missed deadlines. The Mars Pathfinder (1997) famously experienced priority inversion leading to system resets.',
      'Pthreads mutex is the lowest-level, most portable synchronization primitive on POSIX systems. Understanding mutex behavior (ownership, error checking, recursive, adaptive) is fundamental to writing correct multithreaded C/C++ code.',
    ],
    interview: [
      { q: 'What is the difference between a mutex and a spinlock?', a: 'A mutex puts the calling thread to sleep when the lock is contended, incurring an OS context switch (about 1μs). This is efficient when the critical section is long because the CPU can do other work. A spinlock causes the thread to busy-wait in a tight loop checking the lock value. Spinlocks are good for very short critical sections where the context switch cost would exceed the spin time. Spinlocks waste CPU cycles but have low overhead when uncontended. Mutexes have ownership tracking (same thread must lock and unlock). Spinlocks have no ownership — any thread can unlock, which is useful in interrupt contexts.', followUps: ['When should you use a spinlock instead of a mutex in production?', 'What is a hybrid mutex that spins briefly before sleeping?'] },
      { q: 'What is priority inversion and how is it solved?', a: 'Priority inversion occurs when a low-priority thread holds a mutex that a high-priority thread needs. If medium-priority threads are also runnable, they preempt the low-priority thread, preventing it from releasing the mutex — so the high-priority thread is blocked indefinitely by medium-priority threads. The solution is priority inheritance: when the high-priority thread tries to lock, the low-priority thread temporarily inherits its priority, preventing medium-priority preemption. Once the low-priority thread releases the mutex, its priority drops back. Pthreads supports this via PTHREAD_PRIO_INHERIT protocol on the mutex attribute.', followUps: ['How does pthread enable priority inheritance via mutex attributes?', 'What is the priority ceiling protocol and how does it differ from inheritance?'] },
      { q: 'What is a deadlock and how can you prevent it?', a: 'A deadlock occurs when two or more threads each hold a lock that the other needs, causing all to block forever. For example, T1 locks mutex A then waits for B, while T2 locks mutex B then waits for A. Prevention strategies: lock ordering (always acquire locks in a globally consistent order), lock try-lock with backoff (pthread_mutex_trylock, release and retry if acquisition fails), lock hierarchy (assign numerical levels and never lock a lower level while holding a higher one), and deadlock detection (lock-order checkers in the kernel, thread state analysis).', followUps: ['How does the Dining Philosophers problem illustrate deadlock?', 'How does std::lock in C++ help prevent deadlock when locking multiple mutexes?'] },
    ],
    gotcha: [
      'Mutex ownership is enforced by the OS — a thread trying to unlock a mutex it does not own causes undefined behavior (often a crash or assertion failure on debug builds). This differs from semaphores where any thread can post, leading to confusion when switching between the two.',
      'Deadlock is not always obvious: T1 locks A → waits for B. T2 locks B → waits for A. Neither progresses. Prevention requires lock ordering (always acquire in the same order across all threads), try_lock with backoff, or lock hierarchies.',
      'Recursive mutex (PTHREAD_MUTEX_RECURSIVE) allows the same thread to lock the same mutex multiple times without deadlocking. However, it is slower than non-recursive and can mask design issues where lock granularity is wrong.',
      'Mutex destruction (pthread_mutex_destroy) while threads may still be waiting is undefined behavior. A destroyed mutex with waiters can cause use-after-free of kernel resources in some implementations.',
    ],
    tradeoffs: [
      { pro: 'Mutexes provide efficient waiting by putting threads to sleep, no CPU waste while contended, ownership tracking prevents accidental unlocks, and priority inheritance prevents inversion in real-time systems.', con: 'OS context switch overhead (about 1μs) makes mutexes more expensive than spinlocks for very short critical sections. Cannot be used in interrupt handlers because sleeping is not allowed.' },
      { pro: 'Spinlocks have very low overhead for short critical sections (no context switch), they work in interrupt context (with IRQ saving), and they are simple to implement with atomic instructions.', con: 'Busy-waiting wastes CPU cycles when contended, no ownership tracking makes debugging harder, and priority inversion is a significant risk in preemptible kernels without the inheritance support that mutexes provide.' },
      { pro: 'Read-write locks (pthread_rwlock_t) allow multiple concurrent readers and exclusive writers. They improve concurrency for read-heavy workloads like database lookups, configuration caches, and reference-counted structures.', con: 'Writer starvation is possible under high reader contention. The rwlock itself has higher overhead than a plain mutex. Performance degrades on NUMA systems because reader count updates cause cache line bouncing across sockets.' },
    ],
  },
};
