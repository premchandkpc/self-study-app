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
      { title: 'ELI5 — Kid-friendly analogy', content: 'Producer-consumer is like a bakery conveyor belt with 5 spots. Baker (producer) puts cakes on the belt. Customer (consumer) takes cakes off. If the belt is full, the baker waits. If the belt is empty, the customer waits. A supervisor makes sure only one person touches the belt at a time (mutex). Two counters track empty spots and full spots (semaphores).' },
      { title: 'Core — How it works', content: 'Bounded buffer problem uses three synchronization primitives: mutex (mutual exclusion on buffer), empty semaphore (counts empty slots, initially N), full semaphore (counts full slots, initially 0). Producer: wait(empty) → lock(mutex) → write → unlock(mutex) → post(full). Consumer: wait(full) → lock(mutex) → read → unlock(mutex) → post(empty).' },
    ],
    why: ['Producer-consumer is the fundamental pattern for data pipelines, message queues, streaming systems (Kafka, RabbitMQ), and OS pipes. Understanding it unlocks all producer/consumer architectures.'],
    interview: [
      { question: 'What happens if you swap the order of sem_wait and mutex_lock in the producer-consumer solution?', answer: 'If a producer locks the mutex first, then waits on empty, it holds the mutex while blocked. The consumer cannot acquire the mutex (since producer holds it) and thus cannot consume to free empty slots. This creates a DEADLOCK: all producers and consumers are blocked. The correct order is sem_wait first, then mutex_lock — wait outside the critical section.', followUps: ['What about swapping mutex_unlock and sem_post order?', 'Does the same deadlock risk apply to the consumer?'] },
      { question: 'How would you implement a multi-consumer, multi-producer ring buffer without condition variables?', answer: 'Use 3 semaphores: empty (counts free slots), full (counts occupied slots), and a binary mutex for buffer access. Multiple producers all compete on empty/mutex. Multiple consumers all compete on full/mutex. The ring buffer wraps around using modulo (head and tail pointers). This is the most efficient solution and is lock-free in some implementations (like LMAX Disruptor).', followUps: ['How does the Disruptor differ from this?', 'What is a SPSC queue and how does it avoid synchronization?'] },
    ],
    gotcha: ['Using a single semaphore (instead of empty + full) is incorrect — it does not distinguish between empty and full states. Producer might try to write to a full buffer, or consumer read from an empty one.', 'The buffer size N must be strictly less than the semaphore initial values to avoid ambiguity between empty and full states. Classic off-by-one error: if you use N slots and initialize empty=N, the producer can fill all N slots, but the consumer sees full=0 and empty=N — indistinguishable from initial state.'],
    tradeoffs: [
      { pro: 'Semaphore-based — correct, simple, works for any N producers/consumers', con: 'contention on mutex in high-throughput scenarios, two syscalls per item' },
      { pro: 'Lock-free ring buffer (Disruptor) — ultra-low latency, no contention', con: 'complex, single-producer assumption usually, memory ordering subtlety' },
    ],
  },
};
