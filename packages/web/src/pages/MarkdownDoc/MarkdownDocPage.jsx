import { useReducer, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DOC_MAP } from '../../core/constants/docs';
import Button from '../../components/shared/Button/Button';
import Loading from '../../components/shared/Loading/Loading';
import styles from './MarkdownDocPage.module.css';

export default function MarkdownDocPage() {
  const { doc } = useParams();
  const navigate = useNavigate();
  const docInfo = DOC_MAP[doc];

  const [state, dispatch] = useReducer(
    (s, a) => {
      switch (a.type) {
        case 'load': return { ...s, loading: true, error: null };
        case 'done': return { content: a.content, loading: false, error: null };
        case 'fail': return { ...s, loading: false, error: a.error };
        case 'missing': return { content: '', loading: false, error: 'Document not found' };
        default: return s;
      }
    },
    { content: '', loading: true, error: null }
  );

  useEffect(() => {
    if (!docInfo) { dispatch({ type: 'missing' }); return; }
    dispatch({ type: 'load' });
    fetch(docInfo.file)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        return res.text();
      })
      .then((text) => dispatch({ type: 'done', content: text }))
      .catch((err) => dispatch({ type: 'fail', error: err.message }));
  }, [doc, docInfo]);

  const { content, loading, error } = state;

  if (!docInfo) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p>Document not found: {doc}</p>
          <Button variant="secondary" onClick={() => navigate('/systemdesign')}>← Back to System Design</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
        <div className={styles.meta}>
          <span className={styles.icon}>{docInfo.icon}</span>
          <div>
            <h1 className={styles.title}>{docInfo.title}</h1>
            <p className={styles.desc}>Full deep dive document</p>
          </div>
        </div>
      </div>

      <div className={styles.toc}>
        <strong>Jump to:</strong>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</button>
        <button onClick={() => {
          const h2 = document.querySelector('h2');
          if (h2) h2.scrollIntoView({ behavior: 'smooth' });
        }}>First section</button>
      </div>

      {loading && <Loading label="Loading document..." />}
      {error && (
        <div className={styles.error}>
          <p>Failed to load document: {error}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>← Back</Button>
        </div>
      )}
      {content && (
        <div className={styles.docContent}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
              h2: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
              h3: ({ children }) => <h4 className={styles.h4}>{children}</h4>,
              p: ({ children }) => <p className={styles.p}>{children}</p>,
              ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
              ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
              li: ({ children }) => <li className={styles.li}>{children}</li>,
              code: ({ children, className, ...props }) => {
                const isInline = !className;
                return isInline
                  ? <code className={styles.inlineCode} {...props}>{children}</code>
                  : <pre className={styles.pre}><code className={styles.codeBlock} {...props}>{children}</code></pre>;
              },
              table: ({ children }) => <div className={styles.tableWrap}><table className={styles.table}>{children}</table></div>,
              th: ({ children }) => <th className={styles.th}>{children}</th>,
              td: ({ children }) => <td className={styles.td}>{children}</td>,
              hr: () => <hr className={styles.hr} />,
              blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
              strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
