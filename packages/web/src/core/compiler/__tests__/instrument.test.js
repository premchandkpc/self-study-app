import { instrumentFunction } from '../instrument';

describe('Code Instrumentation', () => {
  describe('instrumentFunction', () => {
    it('instruments simple variable declaration', () => {
      const code = 'function solve() { let x = 5; }';
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
      expect(result.code).toContain('__s');
      expect(result.code).toContain('__step__');
    });

    it('instruments assignment expression', () => {
      const code = 'function solve() { let x = 5; x = 10; }';
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
      expect(result.code).toContain('x');
    });

    it('instruments for loop', () => {
      const code = `
        function solve() {
          const arr = [1, 2, 3];
          for (let i = 0; i < arr.length; i++) {
            arr[i] *= 2;
          }
        }
      `;
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
      expect(result.code).toContain('__step__');
    });

    it('instruments return statement', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
      `;
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
      expect(result.code).toContain('__result');
    });

    it('handles destructuring patterns', () => {
      const code = 'function solve(obj) { const { x, y } = obj; }';
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
    });

    it('handles array patterns', () => {
      const code = 'function solve(arr) { const [a, b] = arr; }';
      const result = instrumentFunction(code);
      expect(result).toMatchSnapshot();
    });

    it('preserves code semantics', () => {
      const code = 'function solve() { let result = 0; for (let i = 0; i < 5; i++) { result += i; } return result; }';
      const instrumented = instrumentFunction(code);

      expect(() => {
        new Function(instrumented.code);
      }).not.toThrow();
    });
  });
});
