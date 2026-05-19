import { snap } from '@/core/utils/scenarioShared';

function buildComposeSteps() {
  const steps = [];

  const makeService = (name, image, dependsOn = [], port = null) => ({
    name, image, dependsOn, port, status: 'pending', health: 'unknown', replicas: 0,
  });

  const s = {
    services: [
      makeService('postgres', 'postgres:15', [], 5432),
      makeService('redis', 'redis:7', [], 6379),
      makeService('backend', 'myapp-backend:1.0', ['postgres', 'redis'], 8000),
      makeService('frontend', 'myapp-frontend:1.0', ['backend'], 3000),
    ],
    events: [],
    metrics: { running: 0, pending: 4, healthy: 0 },
    vars: { service: 'postgres', depends: '', status: 'pending', healthCheck: 'pending' },
  };

  snap(steps, s, 'docker-compose up: Analyzing service dependency graph. Starting in order.', 1);

  // postgres starts first (no deps)
  s.services[0].status = 'starting';
  s.events.push({ msg: 'Starting postgres (no dependencies)', type: 'info' });
  s.vars = { service: 'postgres', depends: 'none', status: 'starting', healthCheck: 'pending' };
  snap(steps, s, 'postgres starts first — no dependencies. Database initializing.', 3);

  s.services[0].status = 'running';
  s.services[0].health = 'healthy';
  s.services[0].replicas = 1;
  s.metrics.running = 1;
  s.metrics.pending = 3;
  s.metrics.healthy = 1;
  s.events.push({ msg: 'postgres healthy — port 5432 ready', type: 'ok' });
  s.vars = { service: 'postgres', depends: 'none', status: 'running', healthCheck: 'passed' };
  snap(steps, s, 'postgres HEALTHY. Health check passed. Listening on 5432.', 4);

  // redis starts (no deps)
  s.services[1].status = 'starting';
  s.events.push({ msg: 'Starting redis (no dependencies)', type: 'info' });
  s.vars = { service: 'redis', depends: 'none', status: 'starting', healthCheck: 'pending' };
  snap(steps, s, 'redis starts in parallel with other no-dependency services.', 5);

  s.services[1].status = 'running';
  s.services[1].health = 'healthy';
  s.services[1].replicas = 1;
  s.metrics.running = 2;
  s.metrics.pending = 2;
  s.metrics.healthy = 2;
  s.events.push({ msg: 'redis healthy — port 6379 ready', type: 'ok' });
  s.vars = { service: 'redis', depends: 'none', status: 'running', healthCheck: 'passed' };
  snap(steps, s, 'redis HEALTHY. Both infrastructure services ready.', 6);

  // backend waits for deps
  s.services[2].status = 'waiting';
  s.events.push({ msg: 'backend: waiting for postgres, redis', type: 'warn' });
  s.vars = { service: 'backend', depends: 'postgres', status: 'waiting', healthCheck: 'pending' };
  snap(steps, s, 'backend waiting for dependencies: postgres + redis. depends_on health check.', 7);

  s.services[2].status = 'starting';
  s.events.push({ msg: 'backend: deps ready, starting', type: 'info' });
  snap(steps, s, 'Dependencies satisfied. backend container starting.', 8);

  s.services[2].status = 'running';
  s.services[2].health = 'healthy';
  s.services[2].replicas = 1;
  s.metrics.running = 3;
  s.metrics.pending = 1;
  s.metrics.healthy = 3;
  s.events.push({ msg: 'backend healthy — API on port 8000', type: 'ok' });
  s.vars = { service: 'backend', depends: 'postgres', status: 'running', healthCheck: 'passed' };
  snap(steps, s, 'backend HEALTHY. REST API serving on :8000. Connected to postgres + redis.', 9);

  // frontend
  s.services[3].status = 'starting';
  s.events.push({ msg: 'frontend: starting (backend ready)', type: 'info' });
  s.vars = { service: 'frontend', depends: 'backend', status: 'starting', healthCheck: 'pending' };
  snap(steps, s, 'frontend starts — backend dependency satisfied.', 11);

  s.services[3].status = 'running';
  s.services[3].health = 'healthy';
  s.services[3].replicas = 1;
  s.metrics.running = 4;
  s.metrics.pending = 0;
  s.metrics.healthy = 4;
  s.events.push({ msg: 'All services healthy!', type: 'ok' });
  s.vars = { service: 'frontend', depends: 'backend', status: 'running', healthCheck: 'passed' };
  snap(steps, s, 'All 4 services running and healthy. Stack ready at http://localhost:3000.', 13);

  return steps;
}

export const COMPOSE_CODE = [
  'version: "3.9"',
  'services:',
  '  postgres:',
  '    image: postgres:15',
  '    healthcheck:',
  '      test: ["CMD", "pg_isready"]',
  '',
  '  redis:',
  '    image: redis:7',
  '',
  '  backend:',
  '    image: myapp-backend:1.0',
  '    depends_on:',
  '      postgres: { condition: service_healthy }',
  '      redis:    { condition: service_started }',
  '    ports: ["8000:8000"]',
  '',
  '  frontend:',
  '    image: myapp-frontend:1.0',
  '    depends_on: [backend]',
  '    ports: ["3000:3000"]',
];

export default {
  id: 'compose',
  label: 'Docker Compose',
  icon: '🎼',
  build: buildComposeSteps,
  code: COMPOSE_CODE,
  language: 'yaml',
  metrics: [
    { key: 'running', label: 'Running',  max: 4, color: 'var(--pod-running)' },
    { key: 'pending', label: 'Pending',  max: 4, color: 'var(--node-comparing)', warn: 60, critical: 90 },
    { key: 'healthy', label: 'Healthy',  max: 4, color: 'var(--node-active)' },
  ],
};
