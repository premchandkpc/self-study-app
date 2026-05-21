import { snap } from '@/core/utils/scenarioShared';

function buildAsyncioSteps() {
  const steps = [];
  const coro = (id, fn, state = 'pending') => ({ id, fn, state, awaitingOn: null, result: null });

  const s = {
    eventLoop: { running: false, queue: [], ioCallbacks: [] },
    coroutines: [
      coro('main',    'main()'),
      coro('fetch1',  'fetch(url1)'),
      coro('fetch2',  'fetch(url2)'),
      coro('process', 'process(data)'),
    ],
    output: [],
    events: [],
    metrics: { tasks: 0, completed: 0, ioWaiting: 0 },
  };

  snap(steps, s, 'asyncio: single-threaded concurrency. Event loop runs coroutines cooperatively. No GIL issues!', 1);

  // Create tasks
  s.eventLoop.running = true;
  s.coroutines[0].state = 'running';
  s.eventLoop.queue = ['fetch1', 'fetch2'];
  s.metrics.tasks = 3;
  s.events.push({ type: 'ok', msg: 'asyncio.run(main()) → event loop starts' });
  snap(steps, s, 'main() creates two tasks: asyncio.create_task(fetch(url1)), asyncio.create_task(fetch(url2)).', 2);

  // fetch1 starts, awaits
  s.coroutines[1].state = 'running'; s.coroutines[1].awaitingOn = 'HTTP GET url1';
  s.eventLoop.queue = ['fetch2'];
  s.eventLoop.ioCallbacks = ['url1: waiting...'];
  s.metrics.ioWaiting = 1;
  s.events.push({ type: 'info', msg: 'fetch1: await session.get(url1) → suspends, yields control' });
  snap(steps, s, 'fetch1 hits "await session.get(url1)". Suspends itself, returns control to event loop.', 3);

  // fetch2 starts while fetch1 waits
  s.coroutines[2].state = 'running'; s.coroutines[2].awaitingOn = 'HTTP GET url2';
  s.eventLoop.queue = [];
  s.eventLoop.ioCallbacks = ['url1: waiting...', 'url2: waiting...'];
  s.metrics.ioWaiting = 2;
  s.events.push({ type: 'ok', msg: 'Event loop picks fetch2. Both I/O requests in-flight simultaneously!' });
  snap(steps, s, 'Event loop starts fetch2 while fetch1 waits. Two HTTP requests in-flight — no threads needed!', 4);

  // url1 responds
  s.coroutines[1].state = 'done'; s.coroutines[1].awaitingOn = null; s.coroutines[1].result = '{"data":1}';
  s.eventLoop.ioCallbacks = ['url2: waiting...'];
  s.eventLoop.queue = ['process'];
  s.metrics.ioWaiting = 1; s.metrics.completed = 1;
  s.events.push({ type: 'ok', msg: 'url1 response arrives → fetch1 resumes, queues process task' });
  snap(steps, s, 'OS notifies event loop: url1 data ready. fetch1 resumes. Response queued for processing.', 5);

  // process + fetch2 complete
  s.coroutines[2].state = 'done'; s.coroutines[2].result = '{"data":2}';
  s.coroutines[3].state = 'running';
  s.eventLoop.ioCallbacks = [];
  s.output.push('Processed: {"data":1}');
  s.output.push('Processed: {"data":2}');
  s.metrics.completed = 3;
  s.events.push({ type: 'ok', msg: 'fetch2 done, process runs, all tasks complete.' });
  snap(steps, s, 'Both fetches complete. Total time ≈ max(t1, t2), not t1+t2. Async I/O is efficient.', 6);

  return steps;
}

const ASYNCIO_CODE = [
  'import asyncio, aiohttp',
  '',
  'async def fetch(session, url):',
  '  async with session.get(url) as r:',
  '    return await r.json()  # yields control',
  '',
  'async def main():',
  '  async with aiohttp.ClientSession() as s:',
  '    t1 = asyncio.create_task(fetch(s, url1))',
  '    t2 = asyncio.create_task(fetch(s, url2))',
  '    r1, r2 = await asyncio.gather(t1, t2)',
  '',
  'asyncio.run(main())',
];

export default {
  id: 'asyncio',
  label: 'asyncio',
  icon: '⚡',
  build: buildAsyncioSteps,
  code: ASYNCIO_CODE,
  language: 'Python',
  layout: 'asyncio',
  metrics: [
    { key: 'tasks',     label: 'Tasks',     max: 5, color: 'var(--node-default)' },
    { key: 'completed', label: 'Completed', max: 5, color: 'var(--pod-running)' },
    { key: 'ioWaiting', label: 'I/O Wait',  max: 5, color: 'var(--node-comparing)' },
  ],
};
