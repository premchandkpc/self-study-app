import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownContent.module.css';

function CodeBlock({ children, className, ...props }) {
  const isInline = !className;
  if (isInline) {
    return <code className={styles.inlineCode} {...props}>{children}</code>;
  }
  return (
    <pre className={styles.pre}>
      <code className={className} {...props}>{children}</code>
    </pre>
  );
}

export default function MarkdownContent({ children }) {
  if (!children) return null;
  return (
    <div className={styles.root}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
