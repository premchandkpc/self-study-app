import { snap } from '@/core/utils/scenarioShared';

function buildClassloaderSteps() {
  const steps = [];

  const s = {
    classFiles: [
      { name: 'App.class', loaded: false },
      { name: 'String.class', loaded: false },
      { name: 'HashMap.class', loaded: false },
      { name: 'com.example.MyService.class', loaded: false },
    ],
    classloaders: [
      { name: 'Bootstrap', loadedClasses: [] },
      { name: 'Platform', loadedClasses: [] },
      { name: 'System', loadedClasses: [] },
    ],
    delegation: [],
    events: [],
    metrics: { loaded: 0, loaders: 3, delegationChain: 0 },
    vars: { currentLoader: 'Bootstrap', targetClass: 'App.class', status: 'loading' },
  };

  snap(steps, s, 'JVM starts. Classloaders initialized: Bootstrap, Platform, System. Request to load App.class arrives.', 1);

  s.delegation.push({ from: 'System', to: 'Platform', result: 'delegating' });
  s.events.push({ msg: 'System ClassLoader: delegate to parent Platform', type: 'info' });
  s.metrics.delegationChain = 1;
  s.vars = { currentLoader: 'System', targetClass: 'App.class', status: 'delegating up' };
  snap(steps, s, 'System ClassLoader receives loadClass("App.class"). Parent-delegation: System → Platform.', 2);

  s.delegation.push({ from: 'Platform', to: 'Bootstrap', result: 'delegating' });
  s.events.push({ msg: 'Platform ClassLoader: delegate to Bootstrap', type: 'info' });
  s.metrics.delegationChain = 2;
  s.vars = { currentLoader: 'Platform', targetClass: 'App.class', status: 'delegating up' };
  snap(steps, s, 'Platform delegates to Bootstrap ClassLoader. Bootstrap checks rt.jar, core libs.', 3);

  s.delegation.push({ from: 'Bootstrap', to: 'Platform', result: 'not found, delegate down' });
  s.events.push({ msg: 'Bootstrap: App.class not in rt.jar — delegate back', type: 'info' });
  s.vars = { currentLoader: 'Bootstrap', targetClass: 'App.class', status: 'not found' };
  snap(steps, s, 'Bootstrap does not find App.class (it is not a core Java class). Returns null → delegation falls back to Platform.', 4);

  s.delegation.push({ from: 'Platform', to: 'System', result: 'not found, delegate down' });
  s.events.push({ msg: 'Platform: App.class not in extension libs — delegate to System', type: 'info' });
  s.vars = { currentLoader: 'Platform', targetClass: 'App.class', status: 'not found' };
  snap(steps, s, 'Platform also does not find it. Delegation chain unwinds back to System ClassLoader.', 5);

  s.classFiles[0].loaded = true;
  s.classloaders[2].loadedClasses.push('App.class');
  s.events.push({ msg: 'System ClassLoader: found! Loading App.class', type: 'ok' });
  s.events.push({ msg: 'Link phase: verify → prepare → resolve', type: 'ok' });
  s.metrics.loaded = 1;
  s.vars = { currentLoader: 'System', targetClass: 'App.class', status: 'loaded' };
  snap(steps, s, 'System ClassLoader finds and loads App.class. Link phase: verify bytecode → prepare static fields → resolve symbolic references. After linking, class initialization runs (static initializers).', 6);

  return steps;
}

const CLASSLOADER_CODE = [
  '// Parent-delegation model',
  'ClassLoader system = ClassLoader.getSystemClassLoader();',
  'Class<?> clazz = system.loadClass("com.example.MyService");',
  '',
  '// Delegation order:',
  '//   System → Platform → Bootstrap',
  '//   Bootstrap checks rt.jar, core libs',
  '//   Platform checks extension libs',
  '//   System checks classpath',
  '//   If not found → ClassNotFoundException',
  '',
  '// Custom ClassLoader pattern:',
  '//   class HotSwapLoader extends ClassLoader {',
  '//     @Override',
  '//     public Class<?> loadClass(String name) {',
  '//       // break delegation for hot-reload',
  '//     }',
  '//   }',
  '',
  '// Load → Link (verify → prepare → resolve) → Init',
  '// UnsupportedClassVersionError = major.minor mismatch',
];

export default {
  id: 'classloader',
  label: 'Classloader',
  icon: '\uD83D\uDCDA',
  build: buildClassloaderSteps,
  code: CLASSLOADER_CODE,
  language: 'Java',
  metrics: [
    { key: 'loaded', label: 'Loaded', max: 5, color: 'var(--pod-running)' },
    { key: 'loaders', label: 'Loaders', max: 4, color: 'var(--node-active)' },
    { key: 'delegationChain', label: 'Delegations', max: 5, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — 3 Librarians', content: 'Junior librarian asks manager, who asks chief. If chief has book, passes down. Nobody duplicates a book chief already has.' },
      { title: 'Core — Delegation Model', content: 'ClassLoader loads .class -> Class objects. Delegation: child asks parent FIRST. Bootstrap CL (native C++) loads java.lang.*. Platform CL loads modules. Application CL loads classpath. Prevents shadowing java.lang.String.' },
      { title: 'Edge — Custom Loaders', content: 'Custom CLs enable hot-reload (Tomcat WAR isolation), plugin systems (OSGi), test isolation. Thread Context ClassLoader (TCCL): Spring/JNDI use it to load plugins across CL boundaries. ClassCastException when two CLs load the same class — different Class objects even for same bytecode.' },
      { title: 'Deep — Phases', content: 'Loading (read .class bytes) -> Verification (bytecode safety) -> Preparation (static field alloc, zero-init) -> Resolution (symbolic refs -> direct pointers) -> Initialization (run static initializers, thread-safe, happens once).' },
    ],
    why: [
      'ClassLoader understanding essential for diagnosing ClassNotFoundException, NoClassDefFoundError, ClassCastException in Spring/Tomcat/OSGi.',
      'Hot-reload and plugin isolation architectures built on custom class loaders.',
      'Metaspace leaks from ClassLoader references are a common production issue in app servers.',
    ],
    interview: [
      { question: 'Why does delegation model point to parent first?', answer: 'Security + consistency. Bootstrap CL loads java.lang.Object, String, etc. If app CL loaded first, buggy code could substitute its own String. By delegating up, trusted copy always wins. Same class identity = same ClassCastException prevention.', followUps: ['Can you break delegation model?', 'When would you break it intentionally?'] },
      { question: 'How does Tomcat isolate deployed WARs?', answer: 'Each WAR gets own WebAppClassLoader that INVERTS delegation: loads WEB-INF/classes FIRST before asking parent. Two WARs can use different versions of same library. Shared catalina CL loads Tomcat internals — never delegated to WARs.', followUps: ['What causes ClassCastException between WARs?', 'Why does Tomcat cause Metaspace leaks?'] },
      { question: 'Explain ClassLoader memory leak in app servers.', answer: 'Each redeployment creates new WebAppClassLoader. Old CL should be GCd, but ANY live reference to a class loaded by old CL keeps entire old CL + all its classes in Metaspace. Culprits: static fields, ThreadLocals in pooled threads, JDBC driver registration, logging MDC.', followUps: ['How to detect CL leaks?', 'What is -XX:MaxMetaspaceSize?'] },
    ],
    gotcha: [
      'ClassCastException from loading same class with two CLs — Class identity = (name, ClassLoader). Two CLs loading Foo.class produce incompatible Class objects.',
      'NoClassDefFoundError (not ClassNotFoundException): class found at compile, missing at runtime — different classpath, failed static initializer, or wrong CL.',
      'Static initializers run once per ClassLoader, not per JVM. New CL = re-run static init. Side effects in static init (opening files, threads) repeat on each reload.',
      'ThreadLocal leak in pooled threads: ThreadLocal set by WAR A persists after reload — old CL references kept alive.',
      'TCCL should always be restored in finally block — framework code may permanently change it.',
      'Parallel class loading: Java 7+ supports parallel-capable loaders. Old synchronized loadClass() can deadlock with circular dependencies.',
    ],
    tradeoffs: [
      { pro: 'Security: parent-first prevents shadowing of JDK classes', con: 'Complexity: multi-CL environments cause subtle ClassCastExceptions' },
      { pro: 'Isolation: custom CLs enable WAR isolation, plugin sandboxing, hot-reload', con: 'Memory: each CL namespace holds its own class metadata in Metaspace' },
      { pro: 'Namespace separation: same class name in two CLs = two independent classes', con: 'TCCL: implicit thread state — easy to forget to restore' },
    ],
  },
};
