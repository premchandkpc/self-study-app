import microservices from './scenarios/microservices.js';
import distributedTracing from './scenarios/distributed-tracing.js';
import observability from './scenarios/observability.js';
import resiliencePatterns from './scenarios/resilience-patterns.js';
import serviceDiscovery from './scenarios/service-discovery.js';
import configManagement from './scenarios/config-management.js';

export const SCENARIOS = [
  microservices,
  distributedTracing,
  observability,
  resiliencePatterns,
  serviceDiscovery,
  configManagement,
];
