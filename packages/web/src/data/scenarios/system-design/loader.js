export async function loadSystemDesignScenarios() {
  const lb = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/lb.js').then(m => m.default);
  const cache = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/cache.js').then(m => m.default);
  const cdn = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/cdn.js').then(m => m.default);
  const rateLimiter = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/rate-limiter.js').then(m => m.default);
  const sharding = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/sharding.js').then(m => m.default);
  const replication = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/replication.js').then(m => m.default);
  const messageQueue = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/message-queue.js').then(m => m.default);
  const raft = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/raft.js').then(m => m.default);
  const uber = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/uber.js').then(m => m.default);
  const uberArch = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/uber-architecture.js').then(m => m.default);
  const uberFailures = await import('../../../features/system-design/general/SystemDesignVisualizer/scenarios/uber-failures.js').then(m => m.default);
  return [lb, cache, cdn, rateLimiter, sharding, replication, messageQueue, raft, uber, uberArch, uberFailures];
}
