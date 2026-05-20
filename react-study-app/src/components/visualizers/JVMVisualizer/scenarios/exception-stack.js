import { snap } from '@/core/utils/scenarioShared';

function buildExceptionStackSteps() {
  const steps = [];

  const s = {
    callStack: [
      { method: 'main', line: 5, localVars: {} },
      { method: 'a', line: 8, localVars: {} },
      { method: 'b', line: 12, localVars: {} },
      { method: 'c', line: 18, localVars: {} },
    ],
    exception: null,
    caught: false,
    events: [],
    metrics: { framesPopped: 0, handlersChecked: 0, depth: 4 },
    vars: { topFrame: 'c:18', action: 'normal execution', exceptionType: '-' },
  };

  snap(steps, s, 'Normal call stack: main() → a() → b() → c(). Each frame has local vars, operand stack, and return address.', 1);

  s.callStack[3].localVars = { obj: 'null' };
  s.callStack[3].line = 18;
  s.exception = { type: 'NullPointerException', message: 'Cannot invoke "Object.toString()" because obj is null', thrownAt: 'c:line:18' };
  s.caught = false;
  s.events.push({ msg: 'c() dereferences null obj → NullPointerException', type: 'error' });
  s.vars = { topFrame: 'c:18', action: 'EXCEPTION THROWN', exceptionType: 'NullPointerException' };
  snap(steps, s, 'c() calls obj.toString() where obj=null. JVM creates NullPointerException. Now JVM searches for handler — starts with current method (c).', 2);

  s.callStack.pop();
  s.metrics.framesPopped = 1;
  s.events.push({ msg: 'c() no handler → pop frame → check b()', type: 'info' });
  s.vars = { topFrame: 'b:12', action: 'unwinding', exceptionType: 'NullPointerException' };
  snap(steps, s, 'c() has no try-catch. JVM unwinds: pops c\'s frame. Checks b(). Before unwinding, any finally blocks in c() would execute.', 3);

  s.callStack.pop();
  s.metrics.framesPopped = 2;
  s.events.push({ msg: 'b() no handler → pop frame → check a()', type: 'info' });
  s.vars = { topFrame: 'a:8', action: 'unwinding', exceptionType: 'NullPointerException' };
  snap(steps, s, 'b() also has no handler. Unwind again — pop b frame. Finally blocks execute during unwinding (before frame is actually popped).', 4);

  s.callStack.pop();
  s.metrics.framesPopped = 3;
  s.events.push({ msg: 'a() has try-catch → CATCH!', type: 'ok' });
  s.caught = true;
  s.vars = { topFrame: 'a:8', action: 'CAUGHT', exceptionType: 'NullPointerException' };
  snap(steps, s, 'a() has try-catch(NullPointerException). JVM matches handler. Stack unwinding stops. Control transfers to catch block. remaining stack: main→a.', 5);

  s.callStack = [{ method: 'main', line: 5, localVars: {} }];
  s.exception = null;
  s.caught = false;
  s.metrics.framesPopped = 4;
  s.metrics.handlersChecked = 3;
  s.events.push({ msg: 'a() finishes, returns to main()', type: 'info' });
  s.events.push({ msg: 'try-with-resources: AutoCloseable.close() called in reverse order even on exception', type: 'info' });
  s.events.push({ msg: 'addSuppressed() chains suppressed exceptions', type: 'ok' });
  s.vars = { topFrame: 'main:5', action: 'resumed', exceptionType: 'handled' };
  snap(steps, s, 'Exception handled. a() continues in catch block. Stack trace printed includes all popped frames. try-with-resources calls close() on resources. Suppressed exceptions attached via Throwable.addSuppressed(). Creating exception is expensive — JVM fills in stack trace (fillInStackTrace).', 6);

  return steps;
}

const EXCEPTION_CODE = [
  'void a() {',
  '  try {',
  '    b();',
  '  } catch (NullPointerException e) {',
  '    // handler found here',
  '    e.printStackTrace();',
  '  }',
  '}',
  '',
  'void b() { c(); }  // no handler — unwinds',
  '',
  'void c() {',
  '  Object obj = null;',
  '  obj.toString();   // ← NullPointerException',
  '}',
  '',
  '// Checked: IOException, SQLException — must catch/throws',
  '// Unchecked: RuntimeException, NPE, AIOOBE — may ignore',
  '',
  '// try-with-resources:',
  '//   try (FileReader r = new FileReader("f")) {',
  '//     // r.close() called automatically',
  '//   }',
  '//   suppressed exceptions via addSuppressed()',
  '',
  '// Performance: exception creation is slow',
  '//   fillInStackTrace() walks the frame stack',
];

export default {
  id: 'exception-stack',
  label: 'Exception Unwinding',
  icon: '\u26A0\uFE0F',
  build: buildExceptionStackSteps,
  code: EXCEPTION_CODE,
  language: 'Java',
  metrics: [
    { key: 'framesPopped', label: 'Frames Popped', max: 5, color: 'var(--pod-crash)' },
    { key: 'handlersChecked', label: 'Handlers Checked', max: 5, color: 'var(--node-comparing)' },
    { key: 'depth', label: 'Stack Depth', max: 5, color: 'var(--node-active)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 - Domino Stack', content: 'Stack of plates (method calls). If bottom plate breaks, all plates above crash down. Each plate has a note saying "if plate breaks, catch it here." JVM checks each plate from top down until finding one that says "I catch this type of break."' },
      { title: 'Core - Stack Unwinding', content: 'When exception thrown, JVM walks call stack from current frame upward. Each frame has a handler table (stored in .class file). JVM checks each handler catch type against exception type. Match = jump to handler. No match = pop frame, repeat in caller. Finally blocks execute during pop.' },
      { title: 'Edge - try-with-resources', content: 'try-with-resources calls close() on each resource automatically (reverse order). If both try body AND close() throw, the close() exception is SUPPRESSED (added via addSuppressed()). Visible via getSuppressed(). Java 7+' },
      { title: 'Deep - Performance', content: "Exception creation slow because fillInStackTrace() walks frame stack. Avoid exception-for-control-flow in hot paths. Use null/optional/result types instead. JIT can optimize away traces with -XX:-OmitStackTraceInFastThrow. Checked exceptions must be caught/declared; unchecked propagate automatically." },
    ],
    why: [
      'Exception handling is a daily Java task - knowing stack unwinding mechanics helps debug complex trace output.',
      'try-with-resources suppressed exceptions cause silent resource cleanup failures if not inspected.',
      'Throwing exceptions in loops is 1000x slower than conditional checks - never use exceptions for control flow.',
    ],
    interview: [
      { question: 'What happens during stack unwinding?', answer: 'JVM walks call stack frames upward. Each frame has exception handler table. For each handler: check catch type vs exception type (instanceof). Match => jump to handler. No match => pop frame (runs finally), repeat. No handler in entire stack => thread terminates (printStackTrace to stderr).', followUps: ['When do finally blocks execute?', 'What if finally also throws?'] },
      { question: 'How does try-with-resources handle multiple exceptions?', answer: 'Resources closed in reverse declaration order. If try body + close() both throw => close() exception is suppressed (addSuppressed()). Inspect via getSuppressed(). Java 9: can reference effectively-final variables in try-with-resources.', followUps: ['Difference between suppressed and chained exceptions?', 'Can you recover suppressed exceptions?'] },
      { question: 'Checked vs unchecked - when to use which?', answer: 'Checked (Exception minus RuntimeException): recoverable conditions caller should handle - IOException. Unchecked (RuntimeException): programming bugs - NPE, IllegalArgumentException. Error: JVM-level - OutOfMemoryError, StackOverflowError. Clean code: checked for external failures, unchecked for contract violations.', followUps: ['Why do checked exceptions not roll back Spring transactions?', 'What is Exception chaining with initCause()?'] },
    ],
    gotcha: [
      'Finally block executes even if try has return - runs BEFORE return value returned. If finally also returns, it replaces try return value.',
      'try-with-resources: if both try and close() throw, close() exception is SUPPRESSED. Check getSuppressed().',
      'Exception in static initializer wraps in ExceptionInInitializerError. The class marked as unusable forever.',
      'fillInStackTrace() is expensive - override to lose trace for hot paths: throw new MyException() { public Throwable fillInStackTrace() { return this; } }',
      'Checked exceptions must be caught or declared - compile-time check, not runtime.',
    ],
    tradeoffs: [
      { pro: 'Clear error propagation - exceptions bubble up automatically', con: 'Slow - fillInStackTrace() walks entire stack. 1000x slower than conditional check.' },
      { pro: 'Checked exceptions enforce error handling at compile time', con: 'Overuse creates unreadable try-catch pyramids. Leads to swallowed exceptions.' },
      { pro: 'try-with-resources ensures deterministic cleanup', con: 'Suppressed exceptions mask real failures if getSuppressed() not inspected.' },
    ],
  },
};
