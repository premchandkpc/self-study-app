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
      { title: 'ELI5 — Kid-friendly analogy', content: 'A mutex is like a single-occupancy bathroom with a key. Only one person can use it at a time (critical section). Everyone else must wait in line (blocked queue). When the person finishes, they hand the key to the next person in line. If someone tries to enter and there\'s no key, they wait nicely (sleep), not banging on the door (busy-wait).' },
      { title: 'Core — How it works', content: 'A mutex (mutual exclusion) ensures only one thread enters a critical section at a time. pthread_mutex_lock: if unlocked, acquire and continue. If locked, thread is put to sleep (blocked) and added to a wait queue. When the owner calls unlock, the kernel wakes the next waiter. Mutexes have ownership: only the locking thread can unlock.' },
    ],
    why: ['Mutexes prevent race conditions on shared data. Without them, concurrent increments to a counter can lose updates (read-modify-write race). Every production multithreaded application uses mutexes (or atomics) for data protection.'],
    interview: [
      { question: 'What is the difference between a mutex and a spinlock?', answer: 'Mutex: thread sleeps when lock is contended → OS context switch (expensive, ~1μs). Good for long critical sections. Spinlock: thread busy-waits (loops checking the lock). Good for very short critical sections (< context switch cost). Spinlocks waste CPU but avoid scheduler overhead. Mutex yields the CPU to other threads.', followUps: ['When should you use a spinlock instead of a mutex?', 'What is a hybrid mutex?'] },
      { question: 'What is priority inversion and how is it solved?', answer: 'A low-priority thread holds a mutex that a high-priority thread needs. Medium-priority threads preempt the low-priority thread, so the high-priority thread is blocked indefinitely. Solution: priority inheritance — when the high-priority thread tries to lock, the low-priority thread temporarily inherits its priority, preventing medium-priority preemption.', followUps: ['How does pthread handle priority inheritance?', 'What is priority ceiling protocol?'] },
    ],
    gotcha: ['Mutex ownership is enforced by the OS — a thread trying to unlock a mutex it does not own causes undefined behavior (often a crash). This differs from semaphores where any thread can post.', 'Deadlock: T1 locks A → waits for B. T2 locks B → waits for A. Neither progresses. Prevention: lock ordering (always acquire in the same order), try_lock with backoff, or lock hierarchies.'],
    tradeoffs: [
      { pro: 'Mutex — efficient waiting (no CPU burn), ownership tracking', con: 'OS context switch overhead, more expensive than spinlock for short CS' },
      { pro: 'Spinlock — low overhead for short CS, no context switch', con: 'wastes CPU when contended, no ownership, risk of priority inversion' },
    ],
  },
};
