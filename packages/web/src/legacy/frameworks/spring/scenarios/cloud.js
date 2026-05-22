import { snap } from '@/core/utils/scenarioShared';

function item(value, state = 'idle') { return { value: String(value), state }; }
function baseState(label) {
  return { collectionType: 'spring', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const CLOUD_SCENARIOS = [
  {
    id: 'cloud-circuitbreaker', label: 'Circuit Breaker', icon: '⚡',
    category: 'cloud', collectionType: 'spring',
    code: [
      '@CircuitBreaker(name = "userService", fallbackMethod = "fallback")',
      'public User getUser(String id) {',
      '    return restTemplate.getForObject(url, User.class);',
      '}',
      '',
      'public User fallback(String id, Throwable t) {',
      '    return User.builder().id(id).name("fallback").build();',
      '}',
      '// States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (probing)',
      '// Sliding window: count-based or time-based',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Circuit Breaker — Resilience4J: CLOSED → OPEN → HALF_OPEN');
      s.stages = [
        { op: 'CLOSED (normal)', type: 'state', items: [], active: false },
        { op: 'Failure threshold exceeded', type: 'transition', items: [], active: false },
        { op: 'OPEN (fast-fail)', type: 'state', items: [], active: false },
        { op: 'Wait duration elapsed', type: 'transition', items: [], active: false },
        { op: 'HALF_OPEN (probe)', type: 'state', items: [], active: false },
      ];
      snap(steps, s, 'Circuit Breaker prevents cascading failures. CLOSED: requests pass through. OPEN: requests fail fast (throw CallNotPermittedException). HALF_OPEN: limited requests probe if service recovered. Resilience4J is the Spring Cloud default (replaced Hystrix).', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('Requests flow normally'), item('Success: 95% (sliding window: 100 calls)')];
      s.opsLog.push({ msg: 'CLOSED: all requests pass to remote service', type: 'ok' });
      snap(steps, s, 'CLOSED state: requests pass through normally. Circuit breaker monitors failure rate over sliding window (count-based: last N calls, or time-based: last N seconds). Default: 50% failure rate, 100 calls minimum.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('Service starts failing...'), item('Failure rate: 60% > threshold 50%!')];
      s.opsLog.push({ msg: '⚠️ 60/100 calls failed → threshold exceeded!', type: 'warn' });
      snap(steps, s, 'Remote service degrades. Failure rate exceeds threshold (default 50%). Circuit breaker transitions to OPEN. This happens when: service down, timeouts, connection pool exhausted.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('Call → CallNotPermittedException'), item('Fallback: return cached/empty response')];
      s.opsLog.push({ msg: 'OPEN: requests blocked immediately. Fallback method invoked', type: 'ok' });
      s.opsLog.push({ msg: 'Benefits: prevents resource exhaustion, fast-fail', type: 'ok' });
      snap(steps, s, 'OPEN state: ALL requests immediately fail with CallNotPermittedException (no network call made). Fallback method called instead. Prevents thread pool exhaustion, connection pool starvation, and cascading timeouts.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('WaitDuration=60s elapsed...')];
      s.opsLog.push({ msg: 'Wait: circuit breaker waits (default 60s) before probing', type: 'ok' });
      snap(steps, s, 'After waitDurationInOpenState (default 60s), circuit breaker transitions to HALF_OPEN. Configurable: slidingWindowSize, minimumNumberOfCalls, failureRateThreshold, waitDurationInOpenState, permittedNumberOfCallsInHalfOpenState.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('Probe: 3 test requests'), item('All succeed → CLOSED'), item('Any fail → OPEN again')];
      s.opsLog.push({ msg: 'HALF_OPEN: probing with 3 requests... ALL SUCCESS → back to CLOSED!', type: 'ok' });
      s.opsLog.push({ msg: 'HALF_OPEN: probe fails → back to OPEN (another wait)', type: 'warn' });
      s.result = 'CLOSED → OPEN (60% fail) → WAIT 60s → HALF_OPEN (probe passes) → CLOSED';
      snap(steps, s, 'HALF_OPEN: limited requests permitted (default 3). If ALL succeed → back to CLOSED (normal). If ANY fail → back to OPEN (another wait). This prevents thundering herd — only small probe traffic hits recovering service.', 5);
      return steps;
    },
  },
  {
    id: 'cloud-discovery', label: 'Service Discovery', icon: '🔍',
    category: 'cloud', collectionType: 'spring',
    code: [
      '@SpringBootApplication',
      '@EnableDiscoveryClient  // (auto-configured in Boot)',
      'public class UserServiceApplication { }',
      '',
      '// Eureka Client registers with Eureka Server',
      '// Registration: service-id, host, port, health URL',
      '// Heartbeat every 30s (renew)',
      '// Client caches registry for resilience',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Service Discovery — Eureka Registration + Heartbeat + Discovery');
      s.stages = [
        { op: 'Service starts', type: 'phase', items: [], active: false },
        { op: 'Register with Eureka', type: 'action', items: [], active: false },
        { op: 'Heartbeat (renew)', type: 'phase', items: [], active: false },
        { op: 'Client discovers', type: 'action', items: [], active: false },
        { op: 'Eureka evicts', type: 'phase', items: [], active: false },
      ];
      snap(steps, s, 'Spring Cloud Netflix Eureka: services register with Eureka Server. Clients query registry to find service instances. Enables dynamic scaling and location transparency. @EnableDiscoveryClient auto-configured via spring-cloud-starter-netflix-eureka-client.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('UserService: user-service:8081'), item('OrderService: order-service:8082')];
      snap(steps, s, 'Service instances start up. Each has spring.application.name (service-id), server.port, and eureka.client.serviceUrl.defaultZone (Eureka server URL).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('InstanceInfo: user-service(192.168.1.5:8081)'), item('→ Registered in Eureka registry')];
      s.opsLog.push({ msg: 'Registration: POST /eureka/apps/USER-SERVICE', type: 'ok' });
      snap(steps, s, 'EurekaClient registers with Eureka Server via REST: POST /eureka/apps/{app-name}. Sends hostname, IP, port, health-check URL, metadata (version, zone, etc). Status: UP. Instance stored in registry map.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('Heartbeat every 30s'), item('LastRenewal updated')];
      s.opsLog.push({ msg: 'Renew: PUT /eureka/apps/USER-SERVICE/instance-id', type: 'ok' });
      s.opsLog.push({ msg: '30s interval (eureka.instance.leaseRenewalIntervalInSeconds)', type: 'ok' });
      snap(steps, s, 'Heartbeat (Renew): every 30s, instance sends PUT request. Eureka updates lastRenewal timestamp. If server misses 3 heartbeats (90s by default), instance marked as LEASING_EXPIRED → evicted after eviction timer.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('ApiGateway: getInstances("user-service")'), item('→ returns [192.168.1.5:8081, 192.168.1.6:8081]')];
      s.opsLog.push({ msg: 'Discovery: GET /eureka/apps/USER-SERVICE → instance list', type: 'ok' });
      s.opsLog.push({ msg: 'Client-side load balancing: Ribbon/Spring Cloud LoadBalancer', type: 'ok' });
      snap(steps, s, 'Client (API Gateway, other services) calls DiscoveryClient.getInstances("user-service"). Eureka returns ALL UP instances. Client caches registry locally (30s cache refresh). LoadBalancer picks one instance (ribbon: round-robin, weighted, etc).', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('user-service:8081 goes DOWN'), item('3 missed heartbeats → EVICTED')];
      s.opsLog.push({ msg: '⏰ 3 missed renewals → EvictionTask removes instance', type: 'warn' });
      s.opsLog.push({ msg: 'Client cache: stale until next registry fetch (30s max)', type: 'warn' });
      s.result = 'Services discover each other via Eureka. Down instances evicted after missed heartbeats.';
      snap(steps, s, 'Eviction: if service stops (no shutdown hook), heartbeats stop. After 90s (3×30), Eureka eviction timer removes instance from registry. Client may have stale cache for up to 30s (cacheRefreshInterval). Self-preservation mode: stops eviction if >85% renewals missing (network partition protection).', 5);
      return steps;
    },
  },
  {
    id: 'cloud-config', label: 'Config Refresh / Bus', icon: '🔄',
    category: 'cloud', collectionType: 'spring',
    code: [
      '@RefreshScope',
      '@Component',
      'public class MyConfig {',
      '    @Value("${app.feature.enabled:false}")',
      '    private boolean featureEnabled;',
      '    // Refreshes on /actuator/refresh without restart!',
      '}',
      '',
      '// POST /actuator/refresh → rebinds @RefreshScope beans',
      '// Spring Cloud Bus: broadcasts refresh to ALL instances via message broker',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Config Refresh: @RefreshScope + Spring Cloud Bus');
      s.stages = [
        { op: 'App started with config', type: 'phase', items: [], active: false },
        { op: 'Config changes in Git', type: 'action', items: [], active: false },
        { op: 'POST /actuator/refresh', type: 'action', items: [], active: false },
        { op: '@RefreshScope beans rebind', type: 'action', items: [], active: false },
        { op: 'Cloud Bus broadcast', type: 'action', items: [], active: false },
      ];
      snap(steps, s, '@RefreshScope allows bean property refresh without restart. POST /actuator/refresh triggers Environment rebind. Spring Cloud Bus broadcasts refresh event to ALL instances via message broker (RabbitMQ, Kafka).', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('app.feature.enabled=false (from Git repo)'), item('MyConfig.featureEnabled = false')];
      snap(steps, s, 'Application started with app.feature.enabled=false. Property sourced from Spring Cloud Config Server (backend: Git, Vault, JDBC). MyConfig bean has this value cached.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('Git commit: app.feature.enabled=true')];
      snap(steps, s, 'Config changes in Git repository: app.feature.enabled changed to true. Config Server picks up latest, but application still running with OLD value (false). No automatic reload.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('POST /actuator/refresh → Environment refreshed')];
      s.opsLog.push({ msg: 'Actuator: refresh endpoint triggered', type: 'ok' });
      snap(steps, s, 'POST /actuator/refresh triggers: 1) Environment is updated from Config Server. 2) ContextRefresher.refresh() called. 3) PropertySource updated with new values. 4) @RefreshScope destroyed → beans recreated on next access.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('@RefreshScope: destroy MyConfig'), item('Next access: MyConfig with featureEnabled=true')];
      s.opsLog.push({ msg: '@RefreshScope: bean destroyed. Lazy-recreated with new properties', type: 'ok' });
      s.opsLog.push({ msg: 'NOT @RefreshScope beans: keep OLD values → restart needed!', type: 'warn' });
      snap(steps, s, '@RefreshScope beans destroyed and recreated lazily. Next injection/get gets new bean with updated properties. Non-@RefreshScope beans keep old values — need full restart. @ConfigurationProperties classes are NOT auto-refreshed unless also @RefreshScope.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('Bus: Instance-1 refresh → RabbitMQ → Instance-2,3,4 refresh')];
      s.opsLog.push({ msg: 'POST /actuator/busrefresh → broadcast to ALL instances', type: 'ok' });
      s.opsLog.push({ msg: 'Single instance refresh: POST /actuator/busrefresh/instance-2', type: 'ok' });
      snap(steps, s, 'Spring Cloud Bus: POST /actuator/busrefresh sends message to message broker (RabbitMQ/Kafka). ALL instances listening consume the message and refresh their context. Destination filter: POST /actuator/busrefresh/{destination} targets specific instance/service. Zero-downtime config update across fleet!', 5);

      s.result = 'Config refreshed without restart. @RefreshScope beans rebind. Bus broadcasts to fleet.';
      snap(steps, s, 'Full flow: Git commit → Config Server → POST /actuator/busrefresh → Bus message → all instances refresh → @RefreshScope beans recreate with new values. No instance restart needed. For @Value fields: use @RefreshScope. For @ConfigurationProperties: use @RefreshScope or re-read from Environment.', 6);
      return steps;
    },
  },
];
