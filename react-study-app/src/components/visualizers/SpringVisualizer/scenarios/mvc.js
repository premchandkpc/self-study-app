import { snap } from '@/core/utils/scenarioShared';

function item(value, state = 'idle') { return { value: String(value), state }; }
function baseState(label) {
  return { collectionType: 'spring', stages: [], result: null, opsLog: [], pipelineLabel: label };
}
export const MVC_SCENARIOS = [
  {
    id: 'mvc-request', label: 'Request Handling Flow', icon: '🌐',
    category: 'mvc', collectionType: 'spring',
    code: [
      '// 1. HTTP Request enters Tomcat',
      '// 2. Servlet container → DispatcherServlet',
      '// 3. DispatcherServlet.getHandlerAdapter() → HandlerExecutionChain',
      '// 4. Interceptor.preHandle() → Controller method',
      '// 5. Interceptor.postHandle() → ModelAndView',
      '// 6. ViewResolver resolves view name → View',
      '// 7. View.render(model, request, response) → HTML',
      '// 8. Interceptor.afterCompletion() → response sent',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Spring MVC Request Flow — DispatcherServlet Central');
      s.stages = [
        { op: '1. HTTP Request', type: 'entry', items: [item('GET /api/users')], active: false },
        { op: '2. DispatcherServlet', type: 'handler', items: [], active: false },
        { op: '3. HandlerMapping', type: 'handler', items: [], active: false },
        { op: '4. Interceptor.preHandle', type: 'handler', items: [], active: false },
        { op: '5. Controller', type: 'handler', items: [], active: false },
        { op: '6. Interceptor.postHandle', type: 'handler', items: [], active: false },
        { op: '7. ViewResolver + Render', type: 'handler', items: [], active: false },
        { op: '8. Interceptor.afterCompletion', type: 'handler', items: [], active: false },
      ];
      snap(steps, s, 'Spring MVC: Front Controller pattern. DispatcherServlet is the central servlet (Front Controller). All HTTP requests go through it. 8 steps from request to response.', 0);

      s.stages[0].active = true;
      snap(steps, s, 'HTTP GET /api/users arrives at Tomcat (or Jetty/Undertow). Servlet container maps to DispatcherServlet (configured in web.xml or auto-configured via DispatcherServletAutoConfiguration).', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('doService()'), item('doDispatch()')];
      s.opsLog.push({ msg: 'DispatcherServlet.doDispatch() invoked', type: 'ok' });
      snap(steps, s, 'DispatcherServlet.doDispatch() is called. Creates HttpServletRequest wrapper, checks multipart, then gets HandlerExecutionChain for the request.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('HandlerMapping.getHandler()'), item('→ @RequestMapping(method=GET, path=/api/users)')];
      s.opsLog.push({ msg: 'RequestMappingHandlerMapping matches GET /api/users', type: 'ok' });
      snap(steps, s, 'HandlerMapping returns HandlerExecutionChain: handler (Controller method) + list of interceptors. RequestMappingHandlerMapping checks @RequestMapping annotations. Also: SimpleUrlHandlerMapping, BeanNameUrlHandlerMapping.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('LoggingInterceptor.preHandle ✔'), item('SecurityInterceptor.preHandle ✔')];
      s.opsLog.push({ msg: 'preHandle: logging, security checks pass', type: 'ok' });
      s.opsLog.push({ msg: 'preHandle returning false = request ABORTED!', type: 'warn' });
      snap(steps, s, 'Interceptor.preHandle() runs in order. If any returns false, request stops immediately (no controller). Used for: auth checks, logging, rate limiting, CSRF validation.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('UserController.getUsers()'), item('→ returns List<User>')];
      s.opsLog.push({ msg: 'Controller processes request, returns ModelAndView/@ResponseBody', type: 'ok' });
      snap(steps, s, 'Controller method executes. HandlerAdapter.invokeHandlerMethod() → argument resolvers process @RequestParam, @PathVariable, @RequestBody → method returns ModelAndView or @ResponseBody (message converter).', 5);

      s.stages[4].active = false; s.stages[5].active = true;
      s.stages[5].items = [item('LoggingInterceptor.postHandle ✔')];
      s.opsLog.push({ msg: 'postHandle: can modify ModelAndView', type: 'ok' });
      snap(steps, s, 'Interceptor.postHandle() runs in reverse order. Can modify ModelAndView (add attributes, change view name). NOT called for @ResponseBody (null ModelAndView). @ExceptionHandler exceptions escape this step.', 6);

      s.stages[5].active = false; s.stages[6].active = true;
      s.stages[6].items = [item('ViewResolver → JSON View'), item('MappingJackson2HttpMessageConverter')];
      s.opsLog.push({ msg: 'ViewResolver resolves view; or MessageConverter writes @ResponseBody', type: 'ok' });
      snap(steps, s, 'If ModelAndView: ViewResolver resolves view name to View (InternalResourceView, ThymeleafView, FreeMarkerView). View.render() generates HTML. If @ResponseBody: HttpMessageConverter writes object to response (MappingJackson2HttpMessageConverter → JSON).', 7);

      s.stages[6].active = false; s.stages[7].active = true;
      s.stages[7].items = [item('HTTP 200 OK + JSON body')];
      s.opsLog.push({ msg: 'afterCompletion: cleanup (logs, MDC clear, metrics)', type: 'ok' });
      s.result = 'Response sent to client. Flow complete.';
      snap(steps, s, 'Interceptor.afterCompletion() runs in reverse order after view render. Always called (even if exception). Used for cleanup: MDC clear, request-scoped attribute cleanup, timing metrics. Response committed by this point.', 8);
      return steps;
    },
  },
  {
    id: 'mvc-rest', label: 'REST API Flow', icon: '🔌',
    category: 'mvc', collectionType: 'spring',
    code: [
      '@RestController',
      '@RequestMapping("/api/users")',
      'public class UserController {',
      '    @GetMapping("/{id}")',
      '    public User getUser(@PathVariable Long id) {',
      '        return userService.findById(id);',
      '    }',
      '}',
      '// @RestController = @Controller + @ResponseBody on every method',
      '// Content negotiation: Accept header → selects MessageConverter',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('REST API: @RestController + @ResponseBody + MessageConverter');
      s.stages = [
        { op: 'GET /api/users/42', type: 'entry', items: [], active: false },
        { op: '@PathVariable id=42', type: 'handler', items: [], active: false },
        { op: 'Controller → User object', type: 'handler', items: [], active: false },
        { op: 'MessageConverter → JSON', type: 'handler', items: [], active: false },
        { op: 'HTTP 200 + JSON body', type: 'exit', items: [], active: false },
      ];
      snap(steps, s, '@RestController = @Controller + @ResponseBody. Every method return value goes directly to HttpMessageConverter — NO ModelAndView, NO ViewResolver. Content negotiation based on Accept header.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('GET /api/users/42'), item('Accept: application/json')];
      snap(steps, s, 'Request: GET /api/users/42 with Accept: application/json header. Content negotiation begins.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('@PathVariable Long id = 42')];
      s.opsLog.push({ msg: 'PathVariableResolver extracts 42 from URI template', type: 'ok' });
      snap(steps, s, 'HandlerAdapter invokes method. Argument resolvers: @PathVariable extracts {id}=42, @RequestParam parses query params, @RequestBody deserializes request body, @RequestHeader reads headers.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('User{id=42, name="Alice", email="alice@ex.com"}')];
      s.opsLog.push({ msg: 'Controller returns User object (POJO)', type: 'ok' });
      snap(steps, s, 'Controller returns User object. Since @RestController, Spring knows to write this to response body via MessageConverter. No ModelAndView wrapping.', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('MappingJackson2HttpMessageConverter'), item('→ {"id":42,"name":"Alice","email":"alice@ex.com"}')];
      s.opsLog.push({ msg: 'Content negotiation: Accept=application/json → Jackson converter chosen', type: 'ok' });
      s.opsLog.push({ msg: 'Also supported: XML (Jaxb2), Protobuf, YAML', type: 'ok' });
      snap(steps, s, 'MessageConverter selection: iterates registered converters. Requested content type (Accept header) vs converter supported types. MappingJackson2HttpMessageConverter supports application/json. Converts User to JSON string.', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('HTTP/1.1 200 OK'), item('Content-Type: application/json'), item('{"id":42,"name":"Alice","email":"alice@ex.com"}')];
      s.opsLog.push({ msg: 'ResponseEntityExceptionHandler handles errors globally', type: 'ok' });
      s.result = 'REST response sent. No view rendering involved.';
      snap(steps, s, 'Final response: HTTP 200 OK with Content-Type: application/json. Body = JSON serialized User object. No ViewResolver, no JSP, no Thymeleaf. Pure data API. Errors: @ControllerAdvice + @ExceptionHandler for consistent error JSON.', 5);
      return steps;
    },
  },
  {
    id: 'mvc-exception', label: 'Exception Handler', icon: '⚠️',
    category: 'mvc', collectionType: 'spring',
    code: [
      '@ControllerAdvice',
      'public class GlobalExceptionHandler {',
      '    @ExceptionHandler(ResourceNotFoundException.class)',
      '    @ResponseStatus(HttpStatus.NOT_FOUND)',
      '    public ErrorResponse handleNotFound(RNF ex) {',
      '        return new ErrorResponse(404, ex.getMessage());',
      '    }',
      '}',
      '// @ControllerAdvice = global @ExceptionHandler, @InitBinder, @ModelAttribute',
      '// Order: local @ExceptionHandler → @ControllerAdvice → DefaultHandlerExceptionResolver',
    ],
    language: 'Java',
    build() {
      const steps = []; const s = baseState('Exception Handler: @ControllerAdvice + @ExceptionHandler');
      s.stages = [
        { op: 'Controller throws', type: 'handler', items: [], active: false },
        { op: 'Local @ExceptionHandler', type: 'handler', items: [], active: false },
        { op: '@ControllerAdvice (global)', type: 'handler', items: [], active: false },
        { op: 'DefaultHandlerExceptionResolver', type: 'handler', items: [], active: false },
        { op: 'Error Response', type: 'exit', items: [], active: false },
      ];
      snap(steps, s, 'Exception handling order: 1) Local @ExceptionHandler in controller → 2) @ControllerAdvice global handler → 3) DefaultHandlerExceptionResolver (Spring internals) → 4) Container error page / 500.', 0);

      s.stages[0].active = true;
      s.stages[0].items = [item('UserController.getUser(99)'), item('→ throws ResourceNotFoundException("User 99 not found")')];
      s.opsLog.push({ msg: 'Controller method throws exception during execution', type: 'warn' });
      snap(steps, s, 'Controller.getUser(99) throws ResourceNotFoundException (custom RuntimeException). Exception propagates up from handler adapter.', 1);

      s.stages[0].active = false; s.stages[1].active = true;
      s.stages[1].items = [item('No @ExceptionHandler in UserController')];
      s.opsLog.push({ msg: 'No local handler → check @ControllerAdvice', type: 'warn' });
      snap(steps, s, 'Spring looks for @ExceptionHandler inside the same controller class. If not found, proceeds to @ControllerAdvice. Local handler takes priority over global.', 2);

      s.stages[1].active = false; s.stages[2].active = true;
      s.stages[2].items = [item('GlobalExceptionHandler.handleNotFound()')];
      s.opsLog.push({ msg: 'Found! @ExceptionHandler(ResourceNotFoundException.class) matches', type: 'ok' });
      snap(steps, s, '@ControllerAdvice GlobalExceptionHandler.handleNotFound() matches. Method parameter type matches exception. Can access exception details. Most specific handler wins (polymorphic dispatch).', 3);

      s.stages[2].active = false; s.stages[3].active = true;
      s.stages[3].items = [item('@ResponseStatus(HttpStatus.NOT_FOUND)'), item('→ HTTP 404')];
      s.opsLog.push({ msg: 'Handler returns ErrorResponse → 404 JSON', type: 'ok' });
      snap(steps, s, 'Handler returns ErrorResponse {status:404, message:"User 99 not found"}. @ResponseStatus sets HTTP 404. Response body via MessageConverter (same as @ResponseBody).', 4);

      s.stages[3].active = false; s.stages[4].active = true;
      s.stages[4].items = [item('HTTP 404'), item('{"status":404,"message":"User 99 not found"}')];
      s.result = '404 response sent to client. Clean error JSON.';
      snap(steps, s, 'Final: HTTP 404 with clean JSON error body. Without handler: 500 Internal Server Error with stack trace (not production-safe). Best practice: @ControllerAdvice for each exception type with appropriate HTTP status.', 5);
      return steps;
    },
  },
];
