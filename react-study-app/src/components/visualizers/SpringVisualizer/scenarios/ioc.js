import { snap } from '@/core/utils/scenarioShared';

function item(value, state = 'idle') { return { value: String(value), state }; }
function baseState(label) {
  return { collectionType: 'spring', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const IOC_SCENARIOS = [
  {
    id: 'ioc-lifecycle', label: 'Bean Lifecycle', icon: '🔄',
    category: 'ioc', collectionType: 'spring',
    code: [
      '@Component',
      'public class MyBean implements InitializingBean {',
      '    @Autowired private Dependency dep;',
      '    @PostConstruct void init() { /* 5. init */ }',
      '    public void business() { /* 7. ready */ }',
      '    @PreDestroy void cleanup() { /* 8. destroy */ }',
      '}',
      '',
      '// Spring calls: constructor → DI → Aware →',
      '// postProcessBeforeInit → init → postProcessAfterInit → ready',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Full Bean Lifecycle — Instantiation to Destruction');
      s.stages = [
        { op: '1. Instantiate', type: 'phase', items: [], active: false },
        { op: '2. Populate Properties', type: 'phase', items: [], active: false },
        { op: '3. Aware Callbacks', type: 'phase', items: [], active: false },
        { op: '4. postProcessBeforeInit', type: 'phase', items: [], active: false },
        { op: '5. afterPropertiesSet / init', type: 'phase', items: [], active: false },
        { op: '6. postProcessAfterInit', type: 'phase', items: [], active: false },
        { op: '7. READY for use', type: 'phase', items: [], active: false },
      ];
      snap(steps, s, 'Spring Bean lifecycle: 6 phases before bean is ready. Managed by the IoC container (BeanFactory/ApplicationContext). Every Spring bean goes through this.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('MyBean', 'new')];
      s.opsLog.push({ msg: 'Constructor: MyBean() called via reflection', type: 'ok' });
      snap(steps, s, 'Phase 1: Spring instantiates the bean via Constructor (reflection). Default or arg-based constructor. Bean exists in memory but has no dependencies yet.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('MyBean{dep=✔}', 'active')];
      s.opsLog.push({ msg: 'DI: @Autowired Dependency dep injected', type: 'ok' });
      snap(steps, s, 'Phase 2: Spring populates properties — field injection (@Autowired), setter injection, or constructor args. Dependencies resolved and injected. Circular deps detected here.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('beanName="myBean"', 'active')];
      s.opsLog.push({ msg: 'BeanNameAware: setBeanName("myBean")', type: 'ok' });
      snap(steps, s, 'Phase 3: If bean implements *Aware interfaces (BeanNameAware, ApplicationContextAware, etc), Spring calls the setter. beanName, factory, classloader, etc available now.', 3);

      s.stages[2].active = false;
      [3, 4].forEach(i => {
        s.stages[i].active = true;
        s.stages[i].items = [item('BeanPostProcessor', i === 3 ? 'active' : 'new')];
        s.opsLog.push({ msg: i === 3 ? 'postProcessBeforeInit: wrap/alter bean' : 'init: @PostConstruct then InitializingBean', type: 'ok' });
        snap(steps, s, i === 3
          ? 'Phase 4: BeanPostProcessor.postProcessBeforeInitialization — custom logic before init. Used by AOP, @Autowired, etc to wrap beans. Can return proxy instead of original bean.'
          : 'Phase 5: @PostConstruct method (if annotated) → afterPropertiesSet() (if InitializingBean) → init-method (if XML/@Bean(initMethod)).', i === 3 ? 4 : 5);
        s.stages[i].active = false;
      });

      s.stages[5].active = true;
      s.stages[5].items = [item('MyBean (ready)', 'new')];
      s.opsLog.push({ msg: 'postProcessAfterInit: final wrapping', type: 'ok' });
      snap(steps, s, 'Phase 6: BeanPostProcessor.postProcessAfterInitialization. Final step before bean goes into service. AOP creates proxy here if needed.', 6);

      s.stages[5].active = false; s.stages[6].active = true;
      s.stages[6].items = [item('MyBean (in use)', 'new')];
      s.opsLog.push({ msg: 'Bean ready — stored in singleton cache (DefaultSingletonBeanRegistry)', type: 'ok' });
      s.result = 'MyBean is ready for dependency injection into other beans.';
      snap(steps, s, 'Phase 7: Bean fully initialized. Stored in singleton pool (singletonObjects map). Ready for injection into other beans. On context close: @PreDestroy → DisposableBean.destroy() → destroy-method.', 7);
      return steps;
    },
  },
  {
    id: 'ioc-circular', label: 'Circular Dependency', icon: '🔁',
    category: 'ioc', collectionType: 'spring',
    code: [
      '@Component',
      'public class A {',
      '    @Autowired private B b;',
      '    public void doA() { b.doB(); }',
      '}',
      '',
      '@Component',
      'public class B {',
      '    @Autowired private A a;',
      '    public void doB() { a.doA(); }',
      '}',
      '// Spring resolves via 3-tier cache & early-exposure',
      '// Constructor injection → BeanCurrentlyInCreationException!',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Circular Dependency — Spring 3-Tier Cache Resolution');
      s.stages = [
        { op: '1. Create A', type: 'phase', items: [], active: false },
        { op: '2. Inject B → needs B', type: 'phase', items: [], active: false },
        { op: '3. Create B', type: 'phase', items: [], active: false },
        { op: '4. Inject A → resolve from cache!', type: 'phase', items: [], active: false },
        { op: '5. Cache: singletonObjects', type: 'phase', items: [], active: false },
      ];
      snap(steps, s, 'Circular dependency: A→B→A. Spring handles setter/field injection via 3-tier cache: singletonObjects (fully baked), earlySingletonObjects (partially), singletonFactories (exposed before DI). Constructor injection FAILS.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('A() constructor', 'new')];
      s.opsLog.push({ msg: 'Creating A: constructor called, bean partially initialized', type: 'ok' });
      snap(steps, s, 'Spring starts creating A. Constructor runs. A is partially initialized — exposed via singletonFactory (lazy reference, not full bean).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('needs B', 'active')];
      s.opsLog.push({ msg: 'A needs B → Spring must resolve B first', type: 'warn' });
      snap(steps, s, 'Spring sees @Autowired B b in A. Must resolve B before completing A. If constructor injection: BeanCurrentlyInCreationException thrown immediately!', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('B() constructor', 'new')];
      s.opsLog.push({ msg: 'Creating B: constructor called', type: 'ok' });
      snap(steps, s, 'Spring starts creating B. B is partially initialized. Early reference exposed via singletonFactory tier-3 cache.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('B injects A → found in earlySingletonObjects!', 'new')];
      s.opsLog.push({ msg: 'B needs A → check cache: found! A is in earlySingletonObjects', type: 'ok' });
      snap(steps, s, 'B needs A. Spring checks 1) singletonObjects — not found. 2) earlySingletonObjects — not found. 3) singletonFactories — FOUND! A\'s ObjectFactory invoked, producing early A reference. This early reference injected into B. B completes initialization.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('A (full)'), item('B (full)')];
      s.opsLog.push({ msg: 'A completes after B done → singletonObjects filled', type: 'ok' });
      s.opsLog.push({ msg: 'Constructor injection: no early exposure → circular dep FAILS', type: 'warn' });
      s.result = 'A ← → B resolved via 3-tier cache (setter/field injection only!)';
      snap(steps, s, 'B complete → A can now finish post-processing. Both beans in singletonObjects. Note: Constructor injection + circular dependency = BeanCurrentlyInCreationException (constructor runs BEFORE early exposure). Fix: @Lazy on one side, or use setter/field injection.', 5);
      return steps;
    },
  },
  {
    id: 'ioc-scopes', label: 'Bean Scopes', icon: '🎯',
    category: 'ioc', collectionType: 'spring',
    code: [
      '@Component @Scope("singleton")  // default — 1 per context',
      '@Component @Scope("prototype")  // new each injection',
      '@Component @Scope("request")    // 1 per HTTP request',
      '@Component @Scope("session")    // 1 per HTTP session',
      '@Component @Scope("application")// 1 per ServletContext',
      '',
      '// Singleton: proxies NOT created',
      '// Prototype: lazy-init, full lifecycle NOT managed',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Bean Scopes: Singleton vs Prototype vs Request vs Session');
      s.stages = [
        { op: 'Singleton (default)', type: 'scope', items: [], active: false },
        { op: 'Prototype', type: 'scope', items: [], active: false },
        { op: 'Request', type: 'scope', items: [], active: false },
        { op: 'Session', type: 'scope', items: [], active: false },
      ];
      snap(steps, s, 'Spring bean scopes control instance lifecycle. Singleton (default): 1 instance per IoC container. Prototype: new instance per injection/getBean. Web scopes: request/session/application.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('MyBean@123 (same)'), { value: '→ BeanA uses me', state: 'idle' }, { value: '→ BeanB uses me', state: 'idle' }];
      s.opsLog.push({ msg: 'Singleton: same instance for ALL injections', type: 'ok' });
      snap(steps, s, 'Singleton: bean created once, cached in singletonObjects map. Every injection gets SAME instance. Thread-safe concerns apply (shared mutable state!). Default scope for stateless beans (services, repositories).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('MyBean@456'), { value: '→ BeanA' }, item('MyBean@789'), { value: '→ BeanB' }];
      s.opsLog.push({ msg: 'Prototype: NEW instance for EACH injection', type: 'ok' });
      s.opsLog.push({ msg: 'Prototype: destroy() NOT called by Spring!', type: 'warn' });
      snap(steps, s, 'Prototype: new instance created on every getBean() or injection. Full lifecycle up to initialization, but Spring does NOT call destroy(). Caller must manage cleanup. Use for stateful beans.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('Request 1 → @123'), item('Request 2 → @456')];
      s.opsLog.push({ msg: 'Request: 1 bean per HTTP request thread', type: 'ok' });
      snap(steps, s, 'Request scope: 1 instance per HTTP request. Internally backed by request attributes. Must use proxyMode=ScopedProxyMode.TARGET_CLASS if injected into singleton. Thread-safe per-request state.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('Session: user=Alice'), item('Session: user=Bob')];
      s.opsLog.push({ msg: 'Session: 1 bean per HTTP session (per user)', type: 'ok' });
      snap(steps, s, 'Session scope: 1 instance per HTTP session (per user). Backed by session attributes. Login state, shopping cart — perfect use case. Same proxy requirement as request scope when injected into singleton.', 4);

      s.result = 'Singleton: 1 per context. Prototype: 1 per injection. Request: 1 per HTTP req. Session: 1 per user session.';
      snap(steps, s, 'Summary: Singleton (stateless services), Prototype (stateful workers), Request/Session (web-scoped with proxy). Singleton with prototype-field: use @Lookup or ObjectFactory<PrototypeBean> to get fresh instances.', 5);
      return steps;
    },
  },
  {
    id: 'ioc-profiles', label: '@Profile Activation', icon: '📋',
    category: 'ioc', collectionType: 'spring',
    code: [
      '@Profile("dev")',
      '@Bean DataSource devDs() { return new H2DataSource(); }',
      '',
      '@Profile("prod")',
      '@Bean DataSource prodDs() { return new MySQLDataSource(); }',
      '',
      '// application.properties: spring.profiles.active=dev',
      '// @Profile can be on @Component or @Configuration',
      '// Multiple: @Profile({"dev", "staging"})',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('@Profile — Environment-Specific Bean Activation');
      s.stages = [
        { op: 'All Beans Registered', type: 'phase', items: [item('DevDS'), item('ProdDS'), item('TestDS'), item('CommonService')], active: false },
        { op: 'Active Profiles: "dev"', type: 'phase', items: [], active: false },
        { op: 'ACTIVE Beans (dev)', type: 'phase', items: [], active: false },
      ];
      snap(steps, s, '@Profile activates beans only when specified profile(s) are active. Used for environment-specific configuration: dev vs test vs prod. Can be on @Component, @Configuration, or @Bean.', 0);

      s.stages[0].active = true;
      snap(steps, s, 'All beans registered in bean definitions: DevDS (profile=dev), ProdDS (profile=prod), TestDS (profile=test), CommonService (no profile → always active).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('spring.profiles.active=dev'), item('Also: spring.profiles.include=...')];
      snap(steps, s, 'Active profile set: "dev". Set via: application.properties (spring.profiles.active), environment variable (SPRING_PROFILES_ACTIVE), JVM arg (-Dspring.profiles.active=dev), or programmatically.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('DevDS (dev) ✔', 'new'), item('ProdDS (prod) ✘', 'filtered'), item('TestDS (test) ✘', 'filtered'), item('CommonService (always) ✔', 'new')];
      s.opsLog.push({ msg: 'DevDS: profile="dev" matches active → CREATED', type: 'ok' });
      s.opsLog.push({ msg: 'ProdDS: profile="prod" does NOT match → SKIPPED', type: 'warn' });
      s.opsLog.push({ msg: 'TestDS: profile="test" does NOT match → SKIPPED', type: 'warn' });
      s.opsLog.push({ msg: 'CommonService: no profile → ALWAYS created', type: 'ok' });
      s.result = 'Active=dev → DevDS + CommonService created. ProdDS and TestDS skipped.';
      snap(steps, s, 'Result: DevDS matches "dev" → instantiated. ProdDS ("prod") and TestDS ("test") skipped. CommonService (no profile restriction) always registered. @Profile works via ConditionEvaluator, evaluated during refresh().', 3);
      return steps;
    },
  },
];
