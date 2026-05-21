import { useState } from 'react';
import styles from './CanvasTemplate.module.css';

const TABS = [
  { key: 'notes', label: 'Design Notes', icon: '\uD83D\uDCDD' },
  { key: 'code', label: 'Code', icon: '\uD83D\uDCBB' },
  { key: 'tradeoffs', label: 'Tradeoffs', icon: '\u2696\uFE0F' },
  { key: 'practices', label: 'Best Practices', icon: '\u2705' },
];

export default function CanvasPanels({ activeScenario }) {
  const [tab, setTab] = useState('notes');

  const codeNotes = activeScenario?.codeNotes || [];
  const codeBlock = activeScenario?.code || [];
  const tradeoffs = activeScenario?.tradeoffs || [];
  const practices = activeScenario?.bestPractices || [];

  const hasContent = codeNotes.length > 0 || codeBlock.length > 0 || tradeoffs.length > 0 || practices.length > 0;
  if (!hasContent) return null;

  const visibleTabs = TABS.filter(t => {
    if (t.key === 'notes') return codeNotes.length > 0;
    if (t.key === 'code') return codeBlock.length > 0;
    if (t.key === 'tradeoffs') return tradeoffs.length > 0;
    if (t.key === 'practices') return practices.length > 0;
    return false;
  });

  return (
    <div className={styles.contentSection}>
      <div className={styles.contentTabs}>
        {visibleTabs.map(t => (
          <button key={t.key}
            className={`${styles.contentTab} ${tab === t.key ? styles.contentTabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.contentBody}>
        {tab === 'notes' && codeNotes.length > 0 && (
          <div className={styles.notesGrid}>
            {codeNotes.map((note, i) => (
              <div key={i} className={styles.noteCard}>
                <div className={styles.noteCardHeader}>
                  <span className={styles.noteCardDot} />
                  <strong className={styles.noteCardTitle}>{note.title}</strong>
                </div>
                <p className={styles.noteCardContent}>{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'code' && codeBlock.length > 0 && (
          <pre className={styles.codeBlock}>
            <code>{codeBlock.join('\n')}</code>
          </pre>
        )}

        {tab === 'tradeoffs' && tradeoffs.length > 0 && (
          <div className={styles.tradeoffsGrid}>
            {tradeoffs.map((t, i) => (
              <div key={i} className={styles.tradeoffCard}>
                <div className={styles.tradeoffSide}>
                  <span className={styles.tradeoffLabel}>Pro</span>
                  <p className={styles.tradeoffText}>{t.pro}</p>
                </div>
                <div className={styles.tradeoffDivider} />
                <div className={styles.tradeoffSide}>
                  <span className={styles.tradeoffLabel}>Con</span>
                  <p className={styles.tradeoffText}>{t.con}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'practices' && practices.length > 0 && (
          <ul className={styles.practicesList}>
            {practices.map((p, i) => (
              <li key={i} className={styles.practiceItem}>
                <span className={styles.practiceCheck}>{'\u2713'}</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
