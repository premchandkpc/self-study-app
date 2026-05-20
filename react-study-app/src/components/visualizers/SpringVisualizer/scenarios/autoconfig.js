import { snap } from '@/core/utils/scenarioShared';

function item(value, state = 'idle') { return { value: String(value), state }; }
function baseState(label) {
  return { collectionType: 'spring', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const AUTOCONFIG_SCENARIOS = [
  {
    id: 'auto-conditional', label: '@Conditional Annotations', icon: '🎛️',
    category: 'autoconfig', collectionType: 'spring',
    code: [
      '@ConditionalOnClass(name = "org.h2.Driver")',
      '@ConditionalOnMissingBean(DataSource.class)',
      '@ConditionalOnProperty(name = "app.feature.x.enabled", havingValue = "true")',
      '@ConditionalOnWebApplication',
      '@ConditionalOnExpression("${app.feature.enabled:true}")',
      '',
      '// Combined: ALL conditions must match (AND)',
      '// @Conditional meta-annotation — custom conditions possible',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('@Conditional* Annotations — Conditional Bean Registration');
      s.stages = [
        { op: 'Bean Definition', type: 'phase', items: [item('DataSourceAutoConfiguration')], active: false },
        { op: 'Check: @ConditionalOnClass', type: 'check', items: [], active: false },
        { op: 'Check: @ConditionalOnMissingBean', type: 'check', items: [], active: false },
        { op: 'Check: @ConditionalOnProperty', type: 'check', items: [], active: false },
        { op: 'Result: Bean Registered?', type: 'result', items: [], active: false },
      ];
      snap(steps, s, 'Spring Boot auto-configuration uses @Conditional to decide which beans to create. Conditions checked at ApplicationContext.refresh() time. All conditions must pass (AND logic).', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('DataSourceAutoConfiguration')];
      snap(steps, s, 'Bean definition loaded via spring.factories (auto-configuration imports). DataSourceAutoConfiguration meta-annotated with multiple @Conditional checks.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('@ConditionalOnClass(H2DataSource.class)'), item('H2 on classpath? YES ✓')];
      s.opsLog.push({ msg: '@ConditionalOnClass: H2 jar detected on classpath → PASS', type: 'ok' });
      s.opsLog.push({ msg: '@ConditionalOnMissingClass: inverse', type: 'ok' });
      snap(steps, s, 'ConditionalOnClass checks if H2 is on classpath via Class.forName("org.h2.Driver"). If H2 NOT present → condition FAILS → entire DataSourceAutoConfiguration skipped. This is how Boot adapts to different DB drivers.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('@ConditionalOnMissingBean(DataSource.class)'), item('User defined a custom DataSource? NO ✓')];
      s.opsLog.push({ msg: '@ConditionalOnMissingBean: no custom DataSource found → auto-configure', type: 'ok' });
      snap(steps, s, 'ConditionalOnMissingBean: only creates bean if user has NOT defined one. User\'s @Bean DataSource takes priority. This is the "opt-out" mechanism — user can override any auto-configured bean by defining their own.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('@ConditionalOnProperty("spring.datasource.url")'), item('spring.datasource.url=jdbc:h2:mem:test ✓')];
      s.opsLog.push({ msg: '@ConditionalOnProperty: spring.datasource.url is set → PASS', type: 'ok' });
      snap(steps, s, 'ConditionalOnProperty checks application properties. havingValue = specific value match. matchIfMissing = true (pass if property absent). Prefix-based matching (spring.datasource.url set = datasource should be configured).', 4);

      s.stages[1].active = false; s.stages[2].active = false; s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('ALL conditions PASS → DataSource bean CREATED ✓')];
      s.opsLog.push({ msg: 'All 3 conditions pass → H2 DataSource auto-configured', type: 'ok' });
      s.opsLog.push({ msg: 'If ANY condition fails → ENTIRE config class skipped', type: 'warn' });
      s.result = 'DataSource auto-configured. Conditions: OnClass(H2) ✓, OnMissingBean(user) ✓, OnProperty(url) ✓';
      snap(steps, s, 'All conditions pass → DataSource beans registered (DataSource, JdbcTemplate, DataSourceTransactionManager). Any single condition fails → entire auto-configuration class is SKIPPED. This is how Spring Boot enables/disables features based on classpath, properties, and existing beans.', 5);
      return steps;
    },
  },
  {
    id: 'auto-boot', label: 'Spring Boot Startup', icon: '🚀',
    category: 'autoconfig', collectionType: 'spring',
    code: [
      '@SpringBootApplication  // = @Configuration + @EnableAutoConfiguration + @ComponentScan',
      'public class Application {',
      '    public static void main(String[] args) {',
      '        SpringApplication.run(Application.class, args);',
      '    }',
      '}',
      '',
      '// Startup phases:',
      '// 1. SpringApplication.run() → determine app type',
      '// 2. ApplicationContext creation',
      '// 3. Bean definition loading (auto-config)',
      '// 4. ApplicationContext.refresh()',
      '// 5. CommandLineRunners / ApplicationRunners',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Spring Boot Startup — From main() to Ready');
      s.stages = [
        { op: '1. SpringApplication.run()', type: 'phase', items: [], active: false },
        { op: '2. Determine App Type + Banners', type: 'phase', items: [], active: false },
        { op: '3. Create ApplicationContext', type: 'phase', items: [], active: false },
        { op: '4. Load Bean Definitions', type: 'phase', items: [], active: false },
        { op: '5. refresh() → Bean Lifecycle', type: 'phase', items: [], active: false },
        { op: '6. Runners execute', type: 'phase', items: [], active: false },
        { op: '7. READY', type: 'phase', items: [], active: false },
      ];
      snap(steps, s, 'Spring Boot startup: SpringApplication.run() orchestrates everything. 7 phases from invocation to fully running application.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('SpringApplication.run(Application.class, args)')];
      snap(steps, s, 'Phase 1: SpringApplication.run() called. Determines if it should start a web app or standalone (via ClassUtils: does javax.servlet.Servlet exist?). Creates a StopWatch for startup metrics.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('App type: SERVLET (Tomcat)'), item('Print banner'), item('Initialize failure analyzers')];
      snap(steps, s, 'Phase 2: App type determined (SERVLET/REACTIVE/NONE). Banner printed (ASCII art). FailureAnalyzers registered (for friendly error messages). Initializers + Listeners loaded from spring.factories.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('AnnotationConfigServletWebServerApplicationContext')];
      s.opsLog.push({ msg: 'ApplicationContext created: AnnotationConfigServletWebServerApplicationContext', type: 'ok' });
      snap(steps, s, 'Phase 3: ApplicationContext created (AnnotationConfigServletWebServerApplicationContext for web, AnnotationConfigApplicationContext for standalone). BeanFactory created (DefaultListableBeanFactory).', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('@ComponentScan → @Components'), item('@EnableAutoConfiguration → spring.factories'), item('→ 150+ auto-config classes loaded as strings')];
      s.opsLog.push({ msg: '@SpringBootApplication scans package + loads 150+ auto-config classes', type: 'ok' });
      snap(steps, s, 'Phase 4: Bean definitions loaded. @ComponentScan discovers @Components/@Services/@Repositories. @EnableAutoConfiguration loads AutoConfiguration.imports (spring.factories) — 130+ auto-config classes. Each evaluated via @Conditional. Bean definitions registered in BeanFactory.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('BeanFactory.postProcessBeanDefinitionRegistry'), item('BeanPostProcessor registration'), item('MessageSource, ApplicationEventMulticaster'), item('Bean initialization (singleton pre-instantiation)')];
      s.opsLog.push({ msg: 'refresh(): bean lifecycle begins — singletons initialized', type: 'ok' });
      snap(steps, s, 'Phase 5: refresh() — the core of Spring. BeanFactoryPostProcessors run (config changes). BeanPostProcessors registered. MessageSource + EventMulticaster created. All non-lazy singleton beans instantiated. Embedded web server started (Tomcat on port 8080).', 5);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('CommandLineRunner.run()'), item('ApplicationRunner.run()'), item('@PostConstruct on beans')];
      s.opsLog.push({ msg: 'Runners execute after context fully initialized', type: 'ok' });
      snap(steps, s, 'Phase 6: After refresh(), callRunners() iterates CommandLineRunner + ApplicationRunner beans. @Ordered controls sequence. Used for: data seeding, cache warming, queue listener startup, health check initialization.', 6);

      s.stages[5].active = false; s.stages[6].active = true;
      s.stages[6].items = [item('Applicaton is READY'), item('Tomcat started on port 8080'), item('Accepting HTTP requests')];
      s.opsLog.push({ msg: 'SpringApplication.run() returns ApplicationContext → app is LIVE', type: 'ok' });
      s.result = 'Application ready in ~2-5 seconds (depending on beans).';
      snap(steps, s, 'Phase 7: SpringApplication.run() returns ApplicationContext. App is fully initialized: Tomcat accepting HTTP, MessageSource ready, all beans initialized. Startup time logged: "Started Application in 2.143 seconds (JVM running for 2.456)".', 7);
      return steps;
    },
  },
];
