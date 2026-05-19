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
          <ConceptCard key={key} section={meta} items={concepts[key]} />
        ))}
      </div>
    </div>
  );
}

function ConceptCard({ section, items }) {
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
