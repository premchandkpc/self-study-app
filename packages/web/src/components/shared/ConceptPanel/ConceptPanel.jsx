import styles from './ConceptPanel.module.css';

const SECTIONS = {
  flows:          { icon: '🔄', label: 'Flow',              color: 'var(--node-visited)' },
  functional:     { icon: '✅', label: 'Functional',        color: 'var(--node-active)' },
  nonFunctional:  { icon: '⚡', label: 'Non-Functional',    color: 'var(--text-accent)' },
  cost:           { icon: '💰', label: 'Cost / Budget',     color: 'var(--node-blocked)' },
  whys:           { icon: '💡', label: 'Why',               color: 'var(--kafka-producer)' },
  edgeCases:      { icon: '🔲', label: 'Edge Cases',        color: 'var(--node-comparing)' },
  tools:          { icon: '🔧', label: 'Tools Used',        color: 'var(--text-secondary)' },
  breakpoints:    { icon: '⚠️', label: 'Breakpoints',       color: 'var(--text-warn)' },
  tricky:         { icon: '🧩', label: 'Tricky Points',     color: 'var(--pod-crash)' },
  critical:       { icon: '🚨', label: 'Critical Cares',    color: 'var(--pod-crash)' },
  concept:        { icon: '📖', label: 'Concept',           color: 'var(--node-active)' },
  analogy:        { icon: '🧒', label: 'Analogy',           color: 'var(--kafka-producer)' },
  failure:        { icon: '⚡', label: 'Failure Scenarios', color: 'var(--pod-crash)' },
  interview:      { icon: '💬', label: 'Interview Q&A',     color: 'var(--text-accent)' },
  gotcha:         { icon: '⚠️', label: 'Gotchas',           color: 'var(--text-warn)' },
};

export default function ConceptPanel({ concepts }) {
  if (!concepts) return null;

  const entries = Object.entries(SECTIONS)
    .filter(([key]) => concepts[key]?.length);

  if (!entries.length) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>📋</span>
        <span className={styles.headerTitle}>Concepts</span>
      </div>
      <div className={styles.body}>
        {entries.map(([key, meta]) => (
          <ConceptCard key={key} section={meta} items={concepts[key]} sectionKey={key} />
        ))}
      </div>
    </div>
  );
}

function ConceptCard({ section, items, sectionKey }) {
  const isRich = sectionKey === 'interview' || sectionKey === 'failure' || sectionKey === 'concept';

  if (isRich) {
    return (
      <div className={styles.card} style={{ '--accent': section.color }}>
        <div className={styles.cardBar} style={{ background: section.color }} />
        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>{section.icon}</span>
            <span className={styles.cardLabel}>{section.label}</span>
          </div>
          {sectionKey === 'concept' && (
            <div className={styles.cardList}>
              {items.map((item, i) => (
                <div key={i} className={styles.cardRichItem}>
                  <strong>{item.title || `Level ${i + 1}`}</strong>
                  <p>{item.content || item}</p>
                </div>
              ))}
            </div>
          )}
          {sectionKey === 'failure' && (
            <div className={styles.cardList}>
              {items.map((item, i) => (
                <div key={i} className={styles.cardRichItem}>
                  <strong style={{ color: 'var(--pod-crash)' }}>
                    {typeof item === 'string' ? item : (item.scenario || item.name)}
                  </strong>
                  {item.cause && <p><em>Cause:</em> {item.cause}</p>}
                  {item.impact && <p><em>Impact:</em> {item.impact}</p>}
                  {item.fix && <p><em>Fix:</em> {item.fix}</p>}
                </div>
              ))}
            </div>
          )}
          {sectionKey === 'interview' && (
            <div className={styles.cardList}>
              {items.map((item, i) => (
                <div key={i} className={styles.cardRichItem}>
                  {typeof item === 'string' ? (
                    <p>{item}</p>
                  ) : (
                    <>
                      <strong>Q: {item.question}</strong>
                      {item.answer && <p>{item.answer}</p>}
                      {item.followUps?.length > 0 && (
                        <p style={{ opacity: 0.7, fontSize: '0.9em' }}>
                          Follow-ups: {item.followUps.join(' · ')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card} style={{ '--accent': section.color }}>
      <div className={styles.cardBar} style={{ background: section.color }} />
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>{section.icon}</span>
          <span className={styles.cardLabel}>{section.label}</span>
        </div>
        <ul className={styles.cardList}>
          {items.map((item, i) => (
            <li key={i} className={styles.cardItem}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
