export async function loadSystemDesignScenarios() {
  const lb = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/lb.js').then(m => m.default);
  const cache = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/cache.js').then(m => m.default);
  const cdn = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/cdn.js').then(m => m.default);
  const rateLimiter = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/rate-limiter.js').then(m => m.default);
  const sharding = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/sharding.js').then(m => m.default);
  const replication = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/replication.js').then(m => m.default);
  const messageQueue = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/message-queue.js').then(m => m.default);
  const raft = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/raft.js').then(m => m.default);
  const uber = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/uber.js').then(m => m.default);
  const uberArch = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/uber-architecture.js').then(m => m.default);
  const uberFailures = await import('../../../components/visualizers/SystemDesignVisualizer/scenarios/uber-failures.js').then(m => m.default);
  return [lb, cache, cdn, rateLimiter, sharding, replication, messageQueue, raft, uber, uberArch, uberFailures];
}
