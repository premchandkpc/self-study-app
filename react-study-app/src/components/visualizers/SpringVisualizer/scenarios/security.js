import { snap } from '@/core/utils/scenarioShared';

function item(value, state = 'idle') { return { value: String(value), state }; }
function baseState(label) {
  return { collectionType: 'spring', stages: [], result: null, opsLog: [], pipelineLabel: label };
}

export const SECURITY_SCENARIOS = [
  {
    id: 'sec-filterchain', label: 'Security Filter Chain', icon: '🔗',
    category: 'security', collectionType: 'spring',
    code: [
      '// SecurityFilterChain: ordered list of filters',
      '// DefaultSecurityFilterChain order:',
      '//   BasicAuthenticationFilter → UsernamePasswordAuthFilter → ExceptionTranslationFilter → FilterSecurityInterceptor',
      '// Custom: SecurityFilterChain bean with securityMatcher + filter list',
      '@Bean',
      'SecurityFilterChain filterChain(HttpSecurity http) {',
      '    return http',
      '        .authorizeHttpRequests(auth -> auth',
      '            .requestMatchers("/api/**").authenticated()',
      '            .anyRequest().permitAll()',
      '        )',
      '        .build();',
      '}',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('SecurityFilterChain — Filter pipeline for request security');
      s.stages = [
        { op: 'HTTP Request', type: 'entry', items: [item('GET /api/orders')], active: false },
        { op: 'SecurityFilterChain', type: 'chain', items: [], active: false },
        { op: 'Auth Filters', type: 'filters', items: [], active: false },
        { op: 'ExceptionTranslationFilter', type: 'filter', items: [], active: false },
        { op: 'FilterSecurityInterceptor', type: 'filter', items: [], active: false },
        { op: 'Controller', type: 'target', items: [], active: false },
      ];
      snap(steps, s, 'SecurityFilterChain contains ordered Security Filters. Each filter decides: 1) Proceed to next filter, 2) Return response (authenticate), 3) Throw exception (auth failed). Spring Security auto-configures default chain.', 0);

      s.stages[0].active = true;
      snap(steps, s, 'HTTP GET /api/orders arrives at servlet container. Before reaching DispatcherServlet, request goes through servlet filters. SpringSecurityFilterChain is registered as a servlet filter (DelegatingFilterProxy).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('Check: does path /api/** match?')];
      s.opsLog.push({ msg: 'SecurityFilterChain matches /api/** — entering chain', type: 'ok' });
      snap(steps, s, 'FilterChainProxy iterates SecurityFilterChain beans. First chain that matches request path is used. /api/** matches → filters applied. Public paths ( /login, /css/**, /health) typically skip.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('BasicAuthenticationFilter: check Authorization header'), item('UsernamePasswordAuthenticationFilter: form login')];
      s.opsLog.push({ msg: 'Auth filters extract credentials from request', type: 'ok' });
      s.opsLog.push({ msg: 'No auth header → AnonymousAuthenticationFilter creates anonymous token', type: 'warn' });
      snap(steps, s, 'Authentication filters run in order: BasicAuthenticationFilter (extracts Basic Auth header), UsernamePasswordAuthenticationFilter (extracts form login), BearerTokenAuthenticationFilter (JWT/OAuth2). Each populates SecurityContextHolder with Authentication token.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('ExceptionTranslationFilter: catches auth exceptions')];
      s.opsLog.push({ msg: 'ExceptionTranslationFilter catches AuthenticationException → 401', type: 'ok' });
      s.opsLog.push({ msg: 'AccessDeniedException → 403 (or redirect to login)', type: 'ok' });
      snap(steps, s, 'ExceptionTranslationFilter wraps ALL exceptions from downstream. AuthenticationException → 401 Unauthorized (or redirect to /login). AccessDeniedException → 403 Forbidden. This filter translates Spring Security exceptions to HTTP responses.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('FilterSecurityInterceptor: @PreAuthorize, .authenticated(), .hasRole()')];
      s.opsLog.push({ msg: 'Interceptor checks: is user authenticated? has ROLE_USER?', type: 'ok' });
      s.opsLog.push({ msg: 'NOT authenticated → throws AuthenticationException', type: 'warn' });
      s.opsLog.push({ msg: 'No permission → throws AccessDeniedException', type: 'warn' });
      snap(steps, s, 'FilterSecurityInterceptor is the LAST filter. It enforces authorization: requiresAuthenticated? hasAuthority? hasRole? Uses AccessDecisionManager / AuthorizationManager. If not authenticated → AuthenticationException. If no authority → AccessDeniedException. If pass → proceed to servlet.', 5);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('GET /api/orders → 200 OK')];
      s.opsLog.push({ msg: 'All security checks pass → request reaches Controller', type: 'ok' });
      s.result = 'Request passed through SecurityFilterChain. Authenticated + Authorized.';
      snap(steps, s, 'Security chain complete. Authenticated user, with required role, can access resource. Response goes back through filters in reverse order. Clear SecurityContextHolder (ThreadLocal) in finally block.', 6);
      return steps;
    },
  },
  {
    id: 'sec-authflow', label: 'Authentication Flow', icon: '🔐',
    category: 'security', collectionType: 'spring',
    code: [
      '// Authentication flow:',
      '// 1. AuthFilter creates UsernamePasswordAuthenticationToken',
      '// 2. AuthenticationManager.authenticate(token)',
      '// 3. ProviderManager iterates AuthenticationProviders',
      '// 4. DaoAuthenticationProvider calls UserDetailsService.loadUserByUsername()',
      '// 5. PasswordEncoder matches password',
      '// 6. Returns fully-populated Authentication → SecurityContext',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Authentication Flow — Filter → Manager → Provider → UserDetailsService');
      s.stages = [
        { op: 'Login Request', type: 'entry', items: [item('POST /login user=alice pass=***')], active: false },
        { op: 'AuthFilter → Credentials', type: 'filter', items: [], active: false },
        { op: 'AuthenticationManager', type: 'manager', items: [], active: false },
        { op: 'AuthenticationProvider', type: 'provider', items: [], active: false },
        { op: 'UserDetailsService', type: 'service', items: [], active: false },
        { op: 'SecurityContext', type: 'context', items: [], active: false },
      ];
      snap(steps, s, 'Authentication from login to SecurityContext. Key interfaces: AuthenticationManager.authenticate() (single method), AuthenticationProvider (supports + authenticate), UserDetailsService (loads user from DB/LDAP/in-memory).', 0);

      s.stages[0].active = true;
      snap(steps, s, 'User submits login form or sends Basic Auth header. UsernamePasswordAuthenticationFilter intercepts. Extracts username+password into UsernamePasswordAuthenticationToken (unauthenticated — principal=username, credentials=password).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('UsernamePasswordAuthenticationToken'), item('principal="alice", credentials="***"')];
      snap(steps, s, 'Filter creates unauthenticated token (isAuthenticated=false). Calls AuthenticationManager.authenticate(token).', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('ProviderManager.authenticate()')];
      s.opsLog.push({ msg: 'ProviderManager iterates through registered providers', type: 'ok' });
      snap(steps, s, 'ProviderManager (default AuthenticationManager implementation) iterates its AuthenticationProviders. Each provider: supports(authenticationToken) → returns true/false. First matching provider does authenticate().', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('DaoAuthenticationProvider.authenticate()')];
      s.opsLog.push({ msg: 'DaoAuthenticationProvider supports UsernamePasswordAuthenticationToken → YES', type: 'ok' });
      snap(steps, s, 'DaoAuthenticationProvider supports the token type. It calls retrieveUser() which delegates to UserDetailsService. Also checks UserDetails.isAccountNonLocked(), isEnabled(), etc.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('UserDetailsService.loadUserByUsername("alice")'), item('→ UserDetails{password=$2a$10$..., roles=[USER, ADMIN]}')];
      s.opsLog.push({ msg: 'UserDetailsService loads user from DB (or memory, LDAP)', type: 'ok' });
      snap(steps, s, 'UserDetailsService.loadUserByUsername("alice") returns UserDetails (from DB, in-memory, LDAP, etc). Contains: password (Bcrypt hash), authorities (roles), status flags (active, locked, expired).', 5);

      s.stages[4].active = false; s.stages[4].items = [item('PasswordEncoder.matches(rawPassword, encodedPassword)')];
      s.opsLog.push({ msg: 'PasswordEncoder.matches() → comparing password hash', type: 'ok' });
      snap(steps, s, 'DaoAuthenticationProvider uses PasswordEncoder to check: matches(rawPassword from request, encodedPassword from UserDetails). BCryptPasswordEncoder recommended. Matching fails → BadCredentialsException (never "wrong username" — prevents user enumeration).', 5);

      s.stages[4].active = false;
      s.stages[5].active = true;
      s.stages[5].items = [item('UsernamePasswordAuthenticationToken (authenticated)'), item('principal=UserDetails, authorities=[ROLE_USER, ROLE_ADMIN]'), item('SecurityContextHolder.getContext().setAuthentication(auth)')];
      s.opsLog.push({ msg: 'Authentication set in SecurityContextHolder (ThreadLocal)', type: 'ok' });
      s.result = 'Alice authenticated. SecurityContext populated. ROLE_USER + ROLE_ADMIN granted.';
      snap(steps, s, 'Successful authentication: DaoAuthenticationProvider returns fully-populated UsernamePasswordAuthenticationToken (authenticated=true, principal=UserDetails, authorities=from DB). ProviderManager returns it. Filter sets SecurityContextHolder.getContext().setAuthentication(auth). Session may be created (if configured).', 6);
      return steps;
    },
  },
  {
    id: 'sec-jwt', label: 'JWT Auth Flow', icon: '🪪',
    category: 'security', collectionType: 'spring',
    code: [
      '// JWT Authentication: STATELESS — no HttpSession',
      '// 1. Login: username/password → returns JWT token',
      '// 2. Client stores JWT (localStorage, cookie)',
      '// 3. Every request includes Authorization: Bearer <token>',
      '// 4. OncePerRequestFilter parses JWT → sets SecurityContext',
      '// 5. FilterSecurityInterceptor authorizes via JWT claims',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('JWT Authentication — Stateless Bearer Token Flow');
      s.stages = [
        { op: '1. POST /login', type: 'step', items: [item('username+password')], active: false },
        { op: '2. Server validates', type: 'step', items: [], active: false },
        { op: '3. Issue JWT', type: 'step', items: [], active: false },
        { op: '4. Client stores JWT', type: 'step', items: [], active: false },
        { op: '5. BearerTokenFilter', type: 'step', items: [], active: false },
        { op: '6. Authorized Request', type: 'step', items: [], active: false },
      ];
      snap(steps, s, 'JWT = JSON Web Token. Three parts: header.payload.signature. Stateless auth — no session, no server-side state. Token carries all user info (claims). Verify with signature (HMAC or RSA).', 0);

      s.stages[0].active = true;
      snap(steps, s, 'Step 1: Client POSTs to /login with username + password (or OAuth2 provider). Spring Security UsernamePasswordAuthenticationFilter or custom filter handles it.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('AuthManager → UserDetailsService → PasswordEncoder'), item('→ SUCCESS')];
      s.opsLog.push({ msg: 'Credentials validated via standard auth flow', type: 'ok' });
      snap(steps, s, 'Step 2: Server validates credentials: AuthenticationManager → DaoAuthenticationProvider → UserDetailsService → PasswordEncoder.matches(). On success, server knows user is who they claim.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('JWT: header={"alg":"HS256","typ":"JWT"}'), item('JWT: payload={"sub":"alice","roles":"ROLE_USER","exp":1748000000,"iat":1747000000}'), item('JWT: signature=HMACSHA256(base64url(header)+"."+base64url(payload), secret)')];
      s.opsLog.push({ msg: 'JWT created: header.payload.signature', type: 'ok' });
      s.opsLog.push({ msg: 'Claims: subject=alice, roles=ROLE_USER, exp=72 hours', type: 'ok' });
      snap(steps, s, 'Step 3: Server creates JWT. Header: algorithm + type. Payload/claims: sub (subject/username), roles, exp (expiration), iat (issued at). Signature: HMAC-SHA256(header + "." + payload, serverSecret). Secret only known to server.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('localStorage: jwt=eyJhbGciOiJIUzI1NiJ9...')];
      snap(steps, s, 'Step 4: Client receives JWT, stores it (localStorage, sessionStorage, cookie, or memory). No HttpSession created. JWT is self-contained — server does NOT track sessions.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('BearerTokenAuthenticationFilter'), item('extracts JWT from Authorization: Bearer <token>'), item('Validates signature + exp + claims')];
      s.opsLog.push({ msg: 'Filter: parse JWT → validate signature → extract auth', type: 'ok' });
      s.opsLog.push({ msg: 'Expired JWT → 401. Invalid signature → 401. Missing JWT → anonymous', type: 'warn' });
      snap(steps, s, 'Step 5: Every subsequent request includes Authorization: Bearer <JWT>. OncePerRequestFilter extracts JWT header. Parses token, verifies HMAC signature, checks expiration (exp claim). Creates UsernamePasswordAuthenticationToken from JWT claims. Sets SecurityContext.', 5);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('GET /api/orders → FilterSecurityInterceptor checks ROLE_USER'), item('→ 200 OK with data')];
      s.opsLog.push({ msg: 'JWT auth: stateless. No session lookup. O(1) verification.', type: 'ok' });
      s.result = 'Stateless JWT auth. No session. Token-validated every request.';
      snap(steps, s, 'Step 6: FilterSecurityInterceptor authorizes via JWT claims (roles, authorities). If valid → proceed to controller. No session lookup = horizontally scalable. JWT disadvantages: no token revocation (except expiry), large token size.', 6);
      return steps;
    },
  },
  {
    id: 'sec-method', label: 'Method Security', icon: '🛡️',
    category: 'security', collectionType: 'spring',
    code: [
      '@EnableMethodSecurity  // Spring Security 6+',
      'public class SecurityConfig { }',
      '',
      '@Service',
      'public class OrderService {',
      '    @PreAuthorize("hasRole(\'ADMIN\')")',
      '    public void cancelOrder(Long id) { }',
      '',
      '    @PostAuthorize("returnObject.owner == authentication.name")',
      '    public Order getOrder(Long id) { }',
      '',
      '    @Secured("ROLE_USER")  // legacy',
      '    public void listOrders() { }',
      '}',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Method Security: @PreAuthorize, @PostAuthorize, @Secured');
      s.stages = [
        { op: 'call cancelOrder(42)', type: 'entry', items: [], active: false },
        { op: 'AOP Proxy intercepts', type: 'proxy', items: [], active: false },
        { op: '@PreAuthorize check', type: 'check', items: [], active: false },
        { op: 'hasRole("ADMIN")?', type: 'decision', items: [], active: false },
        { op: 'Target method', type: 'target', items: [], active: false },
        { op: '@PostAuthorize', type: 'check', items: [], active: false },
      ];
      snap(steps, s, '@EnableMethodSecurity enables method-level annotations (Spring Security 6+ replaces @EnableGlobalMethodSecurity). @PreAuthorize: before method. @PostAuthorize: after method (check return value). @Secured: legacy, simpler role check.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('orderService.cancelOrder(42)')];
      snap(steps, s, 'Caller invokes orderService.cancelOrder(42). The injected bean is a CGLIB/JDK proxy created by Spring Security\'s AuthorizationManagerBeforeMethodInterceptor.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('PROXY: MethodInterceptor.intercept()')];
      s.opsLog.push({ msg: 'AOP proxy intercepts cancelOrder call', type: 'ok' });
      snap(steps, s, 'Proxy intercepts. MethodSecurityInterceptor (or AuthorizationManagerBeforeMethodInterceptor) intercepts the call. Checks @PreAuthorize annotation on method.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('@PreAuthorize("hasRole(\'ADMIN\')")')];
      snap(steps, s, 'Proxy reads @PreAuthorize SpEL expression: hasRole(\'ADMIN\'). Calls MethodSecurityExpressionHandler to evaluate the expression. Uses SecurityContextHolder to get current Authentication.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('Current Auth: alice [ROLE_USER]')];
      s.opsLog.push({ msg: '❌ hasRole("ADMIN") → false! alice has ROLE_USER only', type: 'error' });
      s.opsLog.push({ msg: '→ AccessDeniedException (403)', type: 'error' });
      snap(steps, s, 'Expression evaluation: authentication.getAuthorities() contains ROLE_ADMIN? NO — alice only has ROLE_USER. hasRole() checks for ROLE_ prefix. Result: FALSE. Proxy throws AccessDeniedException. Method NOT executed.', 4);

      s.stages[3].items = [item('Current Auth: bob [ROLE_ADMIN]')];
      s.stages[3].active = true;
      s.opsLog.push({ msg: '✓ hasRole("ADMIN") → true! bob is admin', type: 'ok' });
      snap(steps, s, 'If current user is bob (ROLE_ADMIN): hasRole("ADMIN") → TRUE. Proxy proceeds to next interceptor or target method.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('cancelOrder(42) executing...'), item('orderRepository.deleteById(42)')];
      s.opsLog.push({ msg: 'Method executes: order cancelled successfully', type: 'ok' });
      snap(steps, s, 'Target method executes (only if PreAuthorize passes). Business logic runs: orderRepository.deleteById(42).', 5);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('@PostAuthorize("returnObject.owner == authentication.name")')];
      s.opsLog.push({ msg: '@PostAuthorize checks return value against current user', type: 'ok' });
      s.opsLog.push({ msg: 'Used for: data-level security — can user access THIS record?', type: 'ok' });
      snap(steps, s, '@PostAuthorize runs AFTER method executes, BEFORE return. Can access returnObject (SpEL). Example: @PostAuthorize("returnObject.owner == authentication.name") ensures user can only read their own data. Throws AccessDeniedException if check fails — caller never sees the object.', 6);

      s.result = '@PreAuthorize before method. @PostAuthorize after method. Both can block access.';
      snap(steps, s, 'Summary: @PreAuthorize gates method entry (common: role check, IP whitelist, rate limit). @PostAuthorize gates method exit (uncommon: data-level per-entity auth). @Secured simpler but less flexible. @EnableMethodSecurity(jsr250Enabled=true) enables @RolesAllowed.', 7);
      return steps;
    },
  },
];
