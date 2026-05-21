import { snap } from '@/core/utils/scenarioShared';

function item(value, state = 'idle') { return { value: String(value), state }; }
function baseState(label) {
  return { collectionType: 'spring', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const AOP_SCENARIOS = [
  {
    id: 'aop-proxy', label: 'Proxy Types: JDK vs CGLIB', icon: '🎭',
    category: 'aop', collectionType: 'spring',
    code: [
      '// JDK Dynamic Proxy: target MUST implement interface',
      '//   Proxy.newProxyInstance(classLoader, interfaces, handler)',
      '',
      '// CGLIB Proxy: subclass-based, no interface needed',
      '//   Enhancer.create(superclass, callback)',
      '',
      '// Spring Boot 2+: CGLIB by default (@EnableAspectJAutoProxy)',
      '// Performance: JDK proxy ~ method reflection, CGLIB ~ subclass override',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('JDK Proxy vs CGLIB — Proxy Creation & Invocation');
      s.stages = [
        { op: 'Target Bean', type: 'phase', items: [], active: false },
        { op: 'Has Interface?', type: 'decision', items: [], active: false },
        { op: 'JDK Proxy', type: 'proxy', items: [], active: false },
        { op: 'CGLIB Proxy', type: 'proxy', items: [], active: false },
        { op: 'Method Invocation', type: 'phase', items: [], active: false },
      ];
      snap(steps, s, 'Spring AOP creates proxies. JDK: for interface-implementing beans. CGLIB: for classes without interfaces. Boot 2+ defaults to CGLIB (proxyTargetClass=true). Performance: JDK uses reflection (InvocationHandler), CGLIB uses subclass method override (faster).', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('UserService'), { value: 'implements UserServiceInterface', state: 'idle' }];
      snap(steps, s, 'Target bean: UserService implements UserServiceInterface. Spring checks: does bean have interfaces? YES → JDK proxy candidate. NO → CGLIB (subclass).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('YES → JDK Dynamic Proxy')];
      snap(steps, s, 'JDK path: UserService implements interface(s). Spring creates Proxy.newProxyInstance using InvocationHandler that intercepts methods.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('UserServiceInterface proxy = Proxy.newProxyInstance(...)')];
      s.opsLog.push({ msg: 'JDK Proxy: only interface methods can be intercepted', type: 'ok' });
      s.opsLog.push({ msg: 'LIMITATION: non-interface methods NOT proxied', type: 'warn' });
      snap(steps, s, 'JDK Proxy created. Proxy implements UserServiceInterface ONLY. Any public method NOT on the interface bypasses proxy. Bean inside container receives proxy reference, not real object.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('CGLIB: UserService$$EnhancerByCGLIB extends UserService')];
      s.opsLog.push({ msg: 'CGLIB: ALL public/protected methods proxied (including non-interface)', type: 'ok' });
      s.opsLog.push({ msg: 'LIMITATION: final methods CANNOT be overridden → no proxy', type: 'warn' });
      snap(steps, s, 'CGLIB proxy: Creates subclass via bytecode generation. Intercepts ALL public/protected methods (not just interface). No interface needed. Spring Boot 2+ defaults to CGLIB. Final methods: cannot be proxied (cannot be overridden).', 4);

      s.stages[2].active = false; s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('@Transactional → proxy.invoke() → advice chain → target')];
      s.opsLog.push({ msg: 'Invocation: proxy intercepts → advice chain executes → proceed() → target method', type: 'ok' });
      s.result = 'JDK Proxy (interface) vs CGLIB (subclass). Both delegate to target via advice chain.';
      snap(steps, s, 'Method invocation: caller calls proxy.method(). Proxy intercepts via MethodInterceptor (CGLIB) or InvocationHandler (JDK). Runs advice chain (@Before, @Around, @After), then target method via reflection/MethodProxy.invoke().', 5);
      return steps;
    },
  },
  {
    id: 'aop-advice', label: 'Advice Chain Order', icon: '⛓️',
    category: 'aop', collectionType: 'spring',
    code: [
      '@Around("execution(* service.*(..))")',
      'public Object around(ProceedingJoinPoint pjp) {',
      '    // 1. @Around starts (before proceed)',
      '    System.out.println("Around: before");',
      '    Object result = pjp.proceed(); // → next advice or target',
      '    // 4. @Around resumes (after proceed)',
      '    System.out.println("Around: after");',
      '    return result;',
      '}',
      '',
      '// Order: @Around before → @Before → target → @AfterReturning → @After → @Around after',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Advice Chain: @Around → @Before → Target → @AfterReturning → @After');
      s.stages = [
        { op: '1. @Around (before)', type: 'advice', items: [], active: false },
        { op: '2. @Before', type: 'advice', items: [], active: false },
        { op: '3. Target Method', type: 'target', items: [], active: false },
        { op: '4. @AfterReturning / @AfterThrowing', type: 'advice', items: [], active: false },
        { op: '5. @After (finally)', type: 'advice', items: [], active: false },
        { op: '6. @Around (after)', type: 'advice', items: [], active: false },
      ];
      snap(steps, s, 'Advice execution order around a method. @Around wraps everything. @Before runs before. @AfterReturning after success. @AfterThrowing after exception. @After runs finally. Multiple advices: ordered by @Order or Ordered interface.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('Around: start transaction, timers, security')];
      s.opsLog.push({ msg: '@Around: pjp.proceed() called — blocks, goes to next', type: 'ok' });
      snap(steps, s, '@Around advice starts. Common uses: start transaction, get DB connection, start timer, check auth. Then calls pjp.proceed() which goes to next interceptor in chain.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('Before: log entry, validate args')];
      s.opsLog.push({ msg: '@Before: method args valid, log "entering method"', type: 'ok' });
      snap(steps, s, '@Before runs. Cannot block method execution (no ProceedingJoinPoint). Used for: logging, validation, security checks. If exception thrown here → skips to @AfterThrowing + @After.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('businessMethod() executing...')];
      s.opsLog.push({ msg: 'Target method executes via reflection/MethodProxy', type: 'ok' });
      snap(steps, s, 'Target method runs. Actual business logic. If success → @AfterReturning. If exception → @AfterThrowing.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('AfterReturning: log result, audit'), item('OR AfterThrowing: log error, send alert')];
      s.opsLog.push({ msg: '@AfterReturning: result=42 — logging return value', type: 'ok' });
      s.opsLog.push({ msg: '@AfterThrowing: if exception occurred instead', type: 'warn' });
      snap(steps, s, 'AfterReturning: runs on success. Can access return value (returning parameter). AfterThrowing: runs on exception. Can access exception (throwing parameter). These are MUTUALLY exclusive.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('After: cleanup resources (finally-like)')];
      s.opsLog.push({ msg: '@After: release resources, close streams (always runs)', type: 'ok' });
      snap(steps, s, '@After = finally block. Always executes regardless of success/exception. Used for cleanup: close DB connections, release file handles, clear thread-local state.', 5);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('Around: after proceed() — commit/rollback')];
      s.opsLog.push({ msg: 'Around: commit transaction, stop timer, return result', type: 'ok' });
      snap(steps, s, '@Around resumes after pjp.proceed() returns. Commit transaction, stop timer, log duration. Returns result to caller (or wraps it). @Around is the MOST powerful — controls full lifecycle.', 6);

      s.result = 'Advice chain complete. @Around → @Before → Target → @AfterReturning → @After → @Around.';
      snap(steps, s, 'Full chain: @Around(before)→@Before→target→@AfterReturning→@After→@Around(after). Exception path: @Around(before)→@Before→target→@AfterThrowing→@After→@Around(after) rethrowing exception.', 7);
      return steps;
    },
  },
  {
    id: 'aop-transactional', label: '@Transactional Proxy', icon: '📦',
    category: 'aop', collectionType: 'spring',
    code: [
      '@Service',
      'public class UserService {',
      '    @Transactional',
      '    public void createUser(User u) {',
      '        userRepo.save(u);',
      '        emailService.sendWelcome(u.getEmail());',
      '    }',
      '    public void nonTxMethod() { /* no transaction */ }',
      '}',
      '// @Transactional creates a proxy that wraps method in tx',
      '// Proxy: begin tx → method → commit/rollback → close tx',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('@Transactional: Proxy-managed Transaction');
      s.stages = [
        { op: 'caller.createUser(u)', type: 'entry', items: [], active: false },
        { op: '@Transactional Proxy', type: 'proxy', items: [], active: false },
        { op: 'TransactionManager.begin()', type: 'tx', items: [], active: false },
        { op: 'Target: userRepo.save(u)', type: 'target', items: [], active: false },
        { op: 'Commit or Rollback', type: 'tx', items: [], active: false },
        { op: 'TransactionManager.end()', type: 'tx', items: [], active: false },
      ];
      snap(steps, s, '@Transactional on method/class makes Spring create a proxy that intercepts the method. Proxy: begins tx before method, commits after success, rolls back on RuntimeException/Error. Does NOT rollback on checked exceptions by default.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('userService.createUser(alice)')];
      snap(steps, s, 'Caller (another bean, controller, or test) calls userService.createUser(). But the injected reference is the AOP PROXY, not the real UserService. Crucial for self-invocation problems.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('PROXY intercepts createUser()'), item('→ checks @Transactional')];
      s.opsLog.push({ msg: 'Proxy detects @Transactional on createUser', type: 'ok' });
      snap(steps, s, 'Proxy intercepts method call. Checks if method has @Transactional. YES → begins transaction management. @Transactional on class = applies to ALL public methods. NO → just calls target method directly (proxy pass-through for non-Tx methods).', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('DataSourceTransactionManager.getTransaction()'), item('→ Connection.setAutoCommit(false)'), item('→ tx = new TransactionStatus()')];
      s.opsLog.push({ msg: 'TransactionManager begins: create/join tx based on propagation', type: 'ok' });
      snap(steps, s, 'TransactionManager (JpaTransactionManager, DataSourceTransactionManager, etc) creates tx. Gets/reuses Connection. Sets autoCommit=false. Creates TransactionStatus (holds tx state). Propagation behavior determined now.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('userRepo.save(alice) ✔'), item('emailService.sendWelcome(alice@ex.com) ✔')];
      s.opsLog.push({ msg: 'Save + email sent under same transaction', type: 'ok' });
      snap(steps, s, 'Target method executes within transaction. Both userRepo.save() and emailService.sendWelcome() use same Connection (bound to thread via TransactionSynchronizationManager). Hibernate/JDBC operations participate in tx.', 4);

      s.stages[3].active = false; s.stages[3].items = []; s.stages[3].active = false;
      s.stages[4].active = true;
      s.stages[4].items = [item('SUCCESS → commit'), item('RUNTIME EXCEPTION → rollback')];
      s.opsLog.push({ msg: 'No exception → TransactionManager.commit()', type: 'ok' });
      s.opsLog.push({ msg: 'RuntimeException → TransactionManager.rollback()', type: 'warn' });
      s.opsLog.push({ msg: 'Checked exception → COMMITS (default)!', type: 'warn' });
      snap(steps, s, 'After target method: SUCCESS → commit(). RUNTIME EXCEPTION/ERROR → rollback(). CHECKED EXCEPTION → commits by default! Override with rollbackFor = {SpecificCheckedException.class}. Note: checked exceptions are "expected" per Spring design.', 5);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('Connection: autoCommit(true) → return to pool')];
      s.opsLog.push({ msg: 'TransactionManager.cleanup(): reset Connection, clear ThreadLocal', type: 'ok' });
      snap(steps, s, 'Transaction ends. Connection reset (autoCommit=true), returned to pool. TransactionSynchronizationManager clears thread-bound resources. After commit: triggers (afterCommit, afterCompletion).', 6);

      s.result = 'Transaction complete. proxy.begin() → method() → proxy.commit()/rollback().';
      snap(steps, s, 'Self-invocation problem: createUser() calls nonTxMethod() internally = NO proxy (this.method() bypasses proxy). Fix: inject self (@Autowired UserService self) or move @Transactional to separate bean. @Transactional on private methods: ignored (proxy cannot intercept).', 7);
      return steps;
    },
  },
  {
    id: 'aop-selfinvoke', label: 'Self-Invocation Problem', icon: '🔄',
    category: 'aop', collectionType: 'spring',
    code: [
      '@Service',
      'public class UserService {',
      '    @Transactional',
      '    public void createUser(User u) {',
      '        saveUser(u);  // ← THIS bypasses proxy!',
      '    }',
      '',
      '    @Transactional(propagation=REQUIRES_NEW)',
      '    public void saveUser(User u) {',
      '        repo.save(u);',
      '    }',
      '}',
      '// ⚠️ saveUser() runs in SAME tx as createUser(), NOT REQUIRES_NEW!',
      '// Fix: @Autowired UserService self; self.saveUser(u);',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Self-Invocation: this.method() bypasses proxy entirely');
      s.stages = [
        { op: 'caller.createUser(u)', type: 'entry', items: [], active: false },
        { op: 'PROXY intercepts createUser', type: 'proxy', items: [], active: false },
        { op: 'TX begins (PROPAGATION_REQUIRED)', type: 'tx', items: [], active: false },
        { op: 'createUser → this.saveUser(u)', type: 'target', items: [], active: false },
        { op: 'this.saveUser() — PROXY BYPASSED!', type: 'warning', items: [], active: false },
      ];
      snap(steps, s, 'Self-invocation: method A in same class calls method B. "this" is the REAL object, not the proxy. @Transactional, @Cacheable, @Secured on method B are IGNORED. The most common Spring AOP pitfall.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('Controller: userService.createUser(u)')];
      snap(steps, s, 'External call: Controller calls userService.createUser(u). userService is the PROXY → works correctly.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('PROXY.createUser() → begin TX → target.createUser()')];
      s.opsLog.push({ msg: 'Proxy intercepts createUser, creates TX', type: 'ok' });
      snap(steps, s, 'Proxy intercepts createUser(). Creates transaction (PROPAGATION_REQUIRED). Then proceeds to target method.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('TX active for createUser()')];
      s.opsLog.push({ msg: 'Transaction bound to thread via TransactionSynchronizationManager', type: 'ok' });
      snap(steps, s, 'Transaction is active. Thread-bound via TransactionSynchronizationManager. All subsequent JDBC operations within this thread participate in the same transaction.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('createUser() calls this.saveUser(u)')];
      snap(steps, s, 'Inside createUser(), it calls this.saveUser(u). "this" = raw UserService instance, NOT the proxy.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('this.saveUser() — expects REQUIRES_NEW'), item('BUT runs in parent TX! @Transactional IGNORED!')];
      s.opsLog.push({ msg: '❌ this.saveUser() — @Transactional(PROPAGATION_REQUIRES_NEW) IGNORED!', type: 'error' });
      s.opsLog.push({ msg: 'saveUser runs in SAME transaction as createUser. rollbackBothOnError', type: 'warn' });
      snap(steps, s, 'this.saveUser() invokes the method directly on the target object — proxy is bypassed entirely. @Transactional(REQUIRES_NEW) on saveUser is NOT applied. Both methods share the same transaction. Violates the intended REQUIRES_NEW semantics.', 5);

      s.result = 'Fix: @Autowired UserService self; self.saveUser(u); — go through proxy!';
      s.opsLog.push({ msg: 'Fix 1: @Autowired UserService self; self.saveUser(u)', type: 'ok' });
      s.opsLog.push({ msg: 'Fix 2: Move @Transactional methods to separate bean', type: 'ok' });
      s.opsLog.push({ msg: 'Fix 3: Use TransactionTemplate programmatically', type: 'ok' });
      snap(steps, s, 'Solutions: 1) Self-inject (@Autowired UserService self) and call self.saveUser() — goes through proxy. 2) Separate into different beans — proxy wrapping each. 3) TransactionTemplate for programmatic control. 4) AspectJ weaving (compile-time, not proxy-based).', 6);
      return steps;
    },
  },
];
