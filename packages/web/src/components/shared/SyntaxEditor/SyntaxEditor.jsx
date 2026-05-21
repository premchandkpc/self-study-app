import { useRef, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import styles from './SyntaxEditor.module.css';

export default function SyntaxEditor({ code, onChange, language = 'javascript' }) {
  const preRef = useRef(null);

  useEffect(() => {
    if (preRef.current && code) {
      try {
        const highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
        preRef.current.innerHTML = highlighted;
      } catch (e) {
        preRef.current.textContent = code;
      }
    }
  }, [code, language]);

  return (
    <div className={styles.container}>
      <textarea
        className={styles.textarea}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        spellCheck="false"
      />
      <pre className={styles.pre} ref={preRef}><code>{code}</code></pre>
    </div>
  );
}
