/**
 * Snapshot tests for code instrumentation.
 * Critical: walkStmt is high-degree hub node (58 edges, untested).
 * Catch regressions in step injection.
 */

import { instrumentFunction } from '../instrument';

describe('Code Instrumentation', () => {
  describe('instrumentFunction', () => {
    it('instruments simple variable declaration', () => {
      const code = 'let x = 5;';
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
      expect(result).toContain('__s');
      expect(result).toContain('__step__');
    });

    it('instruments assignment expression', () => {
      const code = 'let x = 5; x = 10;';
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
      expect(result).toContain('x');
    });

    it('instruments for loop', () => {
      const code = `
        const arr = [1, 2, 3];
        for (let i = 0; i < arr.length; i++) {
          arr[i] *= 2;
        }
      `;
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
      expect(result).toContain('__step__');
    });

    it('instruments return statement', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
      `;
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
      expect(result).toContain('__result');
    });

    it('handles destructuring patterns', () => {
      const code = 'const { x, y } = obj;';
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
    });

    it('handles array patterns', () => {
      const code = 'const [a, b] = arr;';
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
    });

    it('preserves code semantics', () => {
      const code = 'let result = 0; for (let i = 0; i < 5; i++) { result += i; } result;';
      const instrumented = instrumentFunction(code);

      // Should not throw
      expect(() => {
        new Function(instrumented);  
      }).not.toThrow();
    });
  });
});
