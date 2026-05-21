import CodeEditor from 'react-simple-code-editor';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import styles from './SyntaxEditor.module.css';

export default function SyntaxEditor({ code, onChange, language = 'javascript' }) {
  return (
    <CodeEditor
      value={code}
      onValueChange={onChange}
      highlight={(code) => {
        try {
          return hljs.highlight(code, { language, ignoreIllegals: true }).value;
        } catch (e) {
          return code;
        }
      }}
      className={styles.editor}
      textareaClassName={styles.textarea}
      preClassName={styles.pre}
      padding={12}
      style={{
        fontFamily: 'Monaco, Menlo, "Courier New", monospace',
        fontSize: '13px',
        lineHeight: '1.5',
      }}
      textareaId="code-editor"
    />
  );
}
