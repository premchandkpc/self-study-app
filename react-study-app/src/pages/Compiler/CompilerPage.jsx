import { useNavigate } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import CompilerTemplate from '../../components/templates/CompilerTemplate/CompilerTemplate';
import Button from '../../components/shared/Button/Button';
import Card from '../../components/shared/Card/Card';
import styles from './CompilerPage.module.css';

export default function CompilerPage() {
  const navigate = useNavigate();
  const examples = [
    {
      name: 'Two Sum',
      code: `function twoSum(nums, target) {
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (complement in map) {
      return [map[complement], i];
    }
    map[nums[i]] = i;
  }
  return [];
}`
    },
    {
      name: 'Fibonacci',
      code: `function fib(n) {
  if (n <= 1) return n;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}`
    },
    {
      name: 'Reverse String',
      code: `function reverseString(s) {
  let left = 0, right = s.length - 1;
  const arr = s.split('');
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left++;
    right--;
  }
  return arr.join('');
}`
    }
  ];

  return (
    <SimulationProvider>
      <div className={styles.page}>
        <div className={styles.header}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
          <div className={styles.meta}>
            <span className={styles.icon}>⚙️</span>
            <div>
              <h1 className={styles.title}>Code Compiler</h1>
              <p className={styles.sub}>Paste any JavaScript function and step through execution frame-by-frame. Watch variables, scope, and the call stack evolve in real-time.</p>
            </div>
          </div>
        </div>

        <div className={styles.guide}>
          <div className={styles.guideSection}>
            <h3 className={styles.guideTitle}>🎯 How to Use</h3>
            <ol className={styles.guideList}>
              <li>Paste a JavaScript function in the editor</li>
              <li>Click "Run" to execute step-by-step</li>
              <li>Watch the call stack, local variables, and return values</li>
              <li>Trace through control flow: loops, recursion, conditionals</li>
            </ol>
          </div>

          <div className={styles.guideSection}>
            <h3 className={styles.guideTitle}>💡 What You'll Learn</h3>
            <ul className={styles.guideList}>
              <li>How the call stack works and function frames are pushed/popped</li>
              <li>Variable scope: local, block, and function scope</li>
              <li>Execution order: how control flow affects variable values</li>
              <li>Memory: reference vs value for objects and arrays</li>
              <li>Closures: how inner functions capture outer scope</li>
            </ul>
          </div>

          <div className={styles.guideSection}>
            <h3 className={styles.guideTitle}>📋 Quick Examples</h3>
            <div className={styles.examplesGrid}>
              {examples.map((ex, i) => (
                <Card
                  key={i}
                  variant="default"
                  hoverable
                  className={styles.exampleCard}
                  onClick={() => {
                    const textarea = document.querySelector('textarea');
                    if (textarea) {
                      textarea.value = ex.code;
                      textarea.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }}
                >
                  <div className={styles.exampleName}>{ex.name}</div>
                  <pre className={styles.exampleCode}>{ex.code.substring(0, 80)}...</pre>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <CompilerTemplate />
      </div>
    </SimulationProvider>
  );
}
