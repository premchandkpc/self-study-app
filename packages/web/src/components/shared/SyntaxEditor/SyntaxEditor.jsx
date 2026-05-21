import { useRef, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import styles from './SyntaxEditor.module.css';

export default function SyntaxEditor({ code, onChange, language = 'javascript' }) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);

  useEffect(() => {
    if (preRef.current) {
      try {
        const highlighted = hljs.highlight(code || '', { language, ignoreIllegals: true }).value;
        preRef.current.innerHTML = highlighted;
      } catch (e) {
        preRef.current.textContent = code;
      }
    }
  }, [code, language]);

  const handleScroll = (e) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  return (
    <div className={styles.container}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        spellCheck="false"
      />
      <pre className={styles.pre} ref={preRef}><code>{code}</code></pre>
    </div>
  );
}
