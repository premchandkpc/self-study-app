import { useState } from 'react';
import styles from './TopicContentSection.module.css';

export default function TopicContentSection({ topicContent }) {
  const [show, setShow] = useState(false);
  const tc = topicContent;
  if (!tc) return null;

  return (
    <div className={styles.section}>
      <button className={styles.toggle} onClick={() => setShow(!show)}>
        {show ? '▾' : '▸'} Topic Content
      </button>
      {show && (
        <div className={styles.body}>
          {tc.concept && (
            <div className={styles.block}>
              <h4>Concept</h4>
              {tc.concept.map((c, i) => (
                <div key={i} className={styles.item}>
                  <strong>{c.title}</strong>
                  <p>{c.content}</p>
                </div>
              ))}
            </div>
          )}
          {tc.why && (
            <div className={styles.block}>
              <h4>Why It Matters</h4>
              <ul>{tc.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {tc.gotcha && (
            <div className={`${styles.block} ${styles.gotchaBlock}`}>
              <h4>Gotchas</h4>
              <ul>{tc.gotcha.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </div>
          )}
          {tc.interview && (
            <div className={styles.block}>
              <h4>Interview Q&A</h4>
              {tc.interview.map((q, i) => (
                <div key={i} className={styles.qaItem}>
                  <strong>Q: {q.question}</strong>
                  <p>{q.answer}</p>
                  {q.followUps?.length > 0 && (
                    <small>Follow-ups: {q.followUps.join(' · ')}</small>
                  )}
                </div>
              ))}
            </div>
          )}
          {tc.tradeoffs && (
            <div className={styles.block}>
              <h4>Trade-offs</h4>
              {tc.tradeoffs.map((t, i) => (
                <div key={i} className={styles.tradeItem}>
                  <span className={styles.pro}>✓ {t.pro}</span>
                  <span className={styles.con}>✗ {t.con}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
