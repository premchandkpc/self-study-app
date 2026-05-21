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
  topicContent: {
    concept: [
      { title: 'What is Docker Compose in simple terms?', content: 'Docker Compose lets you define and run multi-container applications with a single YAML file. Instead of running multiple `docker run` commands manually, you write one configuration file that describes every service, their dependencies, networks, and volumes. Compose starts everything in the right order, creates networks automatically, and manages the entire application lifecycle as a single unit.' },
      { title: 'How Docker Compose works — core mechanics', content: 'Compose reads a docker-compose.yml file, builds a dependency graph from `depends_on` directives, and starts services in topological order (dependencies first). It creates a default shared network, assigns DNS names matching service names, and runs configurable health checks before declaring services ready. `docker compose up` orchestrates network creation, container startup, volume mounting, and health check polling into a single command.' },
      { title: 'Deep — internals & architecture', content: 'Compose converts YAML into a directed acyclic graph of service dependencies and walks it topologically so a service starts only after its dependencies are satisfied. When `condition: service_healthy` is set, Compose polls the container health status via the Docker API — the service blocks in starting state until the HEALTHCHECK exits with code 0. Compose creates a default network named `<project>_default`, attaches all services, and registers container names in Docker\'s embedded DNS (127.0.0.11), enabling service discovery by name. The Compose CLI uses the Docker Compose API (v2) which is a Go implementation that replaced the legacy Python docker-compose v1.' },
    ],
    why: [
      'Always use `condition: service_healthy` on `depends_on` — without it, Compose only waits for container creation, not for the service inside to be ready. Your application will crash on startup as it tries to connect to a database that is still initializing.',
      'Use environment variable interpolation (`${VARIABLE:-default}`) in docker-compose.yml to reuse the same file across dev, staging, CI, and production. This avoids maintaining multiple YAML files that differ only by ports, image tags, or replica counts.',
      'Split configuration with multiple Compose files: `docker-compose.yml` for base config and `docker-compose.override.yml` for development-specific overrides (volume mounts, debug ports, profile-specific services). Compose automatically merges override files, keeping production config clean.',
    ],
    interview: [
      { q: 'How does Compose determine the order in which services start?', a: 'Compose parses `depends_on` directives from all services and builds a directed acyclic graph of dependencies. It then performs a topological sort and starts services in order from least-dependent to most-dependent. With `condition: service_healthy`, Compose does not proceed to the dependent service until the dependency\'s Docker HEALTHCHECK exits 0. Without a health condition, Compose only waits for the container to be running (created + started), not for the application inside to be ready. Compose does not wait for dependencies of dependencies to be fully healthy before starting intermediate services — each service blocks only on its immediate declared dependencies.', followUps: ['What happens if a service declares a circular dependency?', 'Can you use depends_on with restart policies?', 'How does Compose handle services with no dependencies?'] },
      { q: 'What is the difference between `depends_on` and the legacy `links` configuration?', a: '`depends_on` is purely a startup ordering directive — it controls the sequence in which services start but does not create any network connectivity or environment variables. `links` (now legacy) connected containers by adding hostname entries and injecting connection environment variables. Modern Compose replaces links entirely with user-defined bridge networks: all services on the same Compose network can resolve each other by service name via Docker DNS, making links unnecessary. The `links` feature still works for backward compatibility but is deprecated in favor of networks.', followUps: ['Does `depends_on` create any network connectivity between services?', 'How does Compose networking work when no networks key is specified?', 'Can you use both networks and links in the same Compose file?'] },
      { q: 'How does Compose implement environment variable interpolation and .env file resolution?', a: 'Compose substitutes `${VARIABLE}` or `${VARIABLE:-default}` syntax in the YAML file with values resolved from multiple sources in a specific precedence: shell environment variables take highest priority, followed by variables from the `.env` file in the project directory. Compose also supports `${VARIABLE:?error}` syntax to fail with a custom error message if a required variable is missing. Variable substitution applies to all string values in the YAML but not to keys or structure. The `.env` file is automatically loaded by `docker compose up` but not by `docker compose run` — for run commands you must pass `--env-file` explicitly or use `-e` flags.', followUps: ['Can you use multiple .env files in Compose?', 'How does variable substitution work with array values like ports or environment?', 'Does `docker stack deploy` support .env files?'] },
    ],
    gotcha: [
      '`depends_on` without `condition: service_healthy` only checks container creation, not application readiness. Your app container will start, fail to connect to the database, crash, and rely entirely on `restart: always` to eventually succeed. This adds minutes to startup time and generates error noise in logs.',
      'Compose does not restart crashed services unless `restart: unless-stopped` or `restart: always` is explicitly configured. Without a restart policy, a crashed service stays permanently down until you manually run `docker compose up -d`, potentially causing silent service degradation.',
      'Port mappings in Compose are published to the host by default — unlike `docker run` where `-p` must be explicit. A postgres service with `ports: ["5432:5432"]` exposes the database to the entire local network, not just to other services. Use the `expose` key (ports without host binding) for inter-service-only communication.',
      'The `.env` file is loaded automatically by `docker compose up` but NOT by `docker compose run`, `docker compose build`, or `docker compose exec`. This inconsistency causes confusing behavior where commands work with `up` but fail with `run`, especially in CI scripts and development workflows.',
    ],
    tradeoffs: [
      { pro: 'A single declarative YAML file defines the entire application stack including services, networks, volumes, environment variables, and dependencies — ensuring reproducible environments across developer machines, CI pipelines, and staging servers.', con: 'Compose is not designed for production orchestration — it lacks rolling updates, auto-scaling, self-healing, service mesh integration, and load balancing that production systems like Kubernetes or Docker Swarm provide.' },
      { pro: 'Health checks with `condition: service_healthy` prevent race conditions by ensuring services start only after their dependencies are truly ready, eliminating the most common source of startup failures in multi-service applications.', con: 'Sequential health check evaluation adds linear startup time — a chain of 5 services each with a 10-second health check adds 50 seconds to total startup, which impacts CI pipeline duration and development iteration speed.' },
      { pro: 'Compose profiles (`--profile`) allow selective service startup, enabling different operational modes (debug tools, monitoring, cron jobs, one-time migrations) without maintaining separate Compose files for each scenario.', con: 'Profiles can create confusing partial-stack states — a profiled service with unmet dependencies when its profile is inactive fails silently without clear error messages, and engineers may not realize the service is missing until runtime failures occur.' },
    ],
  },
};
